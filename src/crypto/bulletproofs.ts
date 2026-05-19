// Bulletproofs aggregated range proofs (Bünz et al. 2017, §3 IPA + §4.3).
// This is a direct TypeScript port of ref/tests/bulletproofs.mjs — the same
// math that powers the in-dapp prover/verifier.
//
// n = 64 bits, m ∈ {1, 2, 4, 8} aggregation.
// Pippenger MSM with signed-digit windowed buckets.
// Batch verification with random linear combination.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import {
  G, H, ZERO, modN,
  pedersenCommit, pointToBytes, bytesToPoint,
  bigintToBytes32, bytes32ToBigint,
  safeMult,
} from './pedersen.js';
import { msm } from './msm.js';
import {
  BP_MAX_M,
  BP_MAX_NM,
  N_BITS,
  BP_AGG_CAPS,
} from '../constants/limits.js';
import {
  GENERATOR_BP_G_DOMAIN,
  GENERATOR_BP_H_DOMAIN,
  GENERATOR_BP_Q_DOMAIN,
  BP_TRANSCRIPT_DOMAIN,
} from '../constants/domains.js';

const te = new TextEncoder();

// Local SECP_N for modInvReal and randomScalar (independent of pedersen.ts import path)
const SECP_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const SECP_N_MINUS_2 = SECP_N - 2n;

// --- Field helpers ---
function modInvReal(a: bigint): bigint {
  let x = modN(a);
  if (x === 0n) throw new Error('modInv(0)');
  let res = 1n, base = x, exp = SECP_N_MINUS_2;
  while (exp > 0n) {
    if (exp & 1n) res = (res * base) % SECP_N;
    base = (base * base) % SECP_N;
    exp >>= 1n;
  }
  return res;
}

// --- Vector ops over secp256k1 scalar field ---
function vecScalarMul(v: bigint[], s: bigint): bigint[] {
  return v.map(x => modN(x * s));
}
function vecAdd(a: bigint[], b: bigint[]): bigint[] {
  return a.map((x, i) => modN(x + b[i]!));
}
function vecHadamard(a: bigint[], b: bigint[]): bigint[] {
  return a.map((x, i) => modN(x * b[i]!));
}
function vecInner(a: bigint[], b: bigint[]): bigint {
  return a.reduce((s, x, i) => modN(s + x * b[i]!), 0n);
}
function vecOnes(n: number): bigint[] {
  return new Array(n).fill(1n);
}
function vecPow(x: bigint, n: number): bigint[] {
  const r = new Array<bigint>(n);
  let p = 1n;
  for (let i = 0; i < n; i++) { r[i] = p; p = modN(p * x); }
  return r;
}
function batchInv(xs: bigint[]): bigint[] {
  const n = xs.length;
  if (n === 0) return [];
  const partial = new Array<bigint>(n);
  partial[0] = modN(xs[0]!);
  for (let i = 1; i < n; i++) partial[i] = modN(partial[i - 1]! * xs[i]!);
  let inv = modInvReal(partial[n - 1]!);
  const out = new Array<bigint>(n);
  for (let i = n - 1; i >= 0; i--) {
    out[i] = i === 0 ? inv : modN(inv * partial[i - 1]!);
    inv = modN(inv * xs[i]!);
  }
  return out;
}

// --- BP generator derivation ---
function bpHashToCurve(domain: string, idx: number): secp.ProjectivePoint {
  const idxLE = new Uint8Array(4);
  new DataView(idxLE.buffer).setUint32(0, idx >>> 0, true);
  for (let counter = 0; counter < 256; counter++) {
    const seed = sha256(concatBytes(te.encode(domain), idxLE, new Uint8Array([counter])));
    const candidate = concatBytes(new Uint8Array([0x02]), seed);
    try {
      const p = secp.ProjectivePoint.fromHex(secp.etc.bytesToHex(candidate));
      if (!p.equals(ZERO)) return p;
    } catch { /* continue */ }
  }
  throw new Error(`bp generator failed: ${domain}#${idx}`);
}

let _BP_GVEC: secp.ProjectivePoint[] | null = null;
let _BP_HVEC: secp.ProjectivePoint[] | null = null;
let _BP_Q: secp.ProjectivePoint | null = null;

export function bpGens(): { Gvec: secp.ProjectivePoint[]; Hvec: secp.ProjectivePoint[]; Q: secp.ProjectivePoint } {
  if (_BP_GVEC) return { Gvec: _BP_GVEC, Hvec: _BP_HVEC!, Q: _BP_Q! };
  _BP_GVEC = []; _BP_HVEC = [];
  for (let i = 0; i < BP_MAX_NM; i++) {
    _BP_GVEC.push(bpHashToCurve(GENERATOR_BP_G_DOMAIN, i));
    _BP_HVEC.push(bpHashToCurve(GENERATOR_BP_H_DOMAIN, i));
  }
  _BP_Q = bpHashToCurve(GENERATOR_BP_Q_DOMAIN, 0);
  return { Gvec: _BP_GVEC, Hvec: _BP_HVEC, Q: _BP_Q };
}

// --- Fiat-Shamir transcript ---
interface Transcript {
  append(label: string, bytes: Uint8Array): void;
  challenge(label: string): bigint;
}

function bpTranscript(): Transcript {
  const parts: Uint8Array[] = [];
  const u32le = (n: number): Uint8Array => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n >>> 0, true);
    return b;
  };
  const push = (labelBytes: Uint8Array, dataBytes: Uint8Array) => {
    parts.push(u32le(labelBytes.length));
    parts.push(labelBytes);
    parts.push(u32le(dataBytes.length));
    parts.push(dataBytes);
  };
  return {
    append(label, bytes) {
      push(te.encode(label), bytes);
    },
    challenge(label) {
      const labelBytes = te.encode(label);
      parts.push(u32le(labelBytes.length));
      parts.push(labelBytes);
      const h = sha256(concatBytes(...parts));
      parts.push(u32le(h.length));
      parts.push(h);
      let c = modN(bytes32ToBigint(h));
      if (c === 0n) {
        const h2 = sha256(concatBytes(h, new Uint8Array([0x01])));
        c = modN(bytes32ToBigint(h2));
        if (c === 0n) throw new Error('bp transcript: 0 challenge');
      }
      return c;
    },
  };
}

// --- IPA inner-product argument ---
function bpIpaProve(
  G_init: secp.ProjectivePoint[],
  H_init: secp.ProjectivePoint[],
  Q: secp.ProjectivePoint,
  a_init: bigint[],
  b_init: bigint[],
  transcript: Transcript,
) {
  let G_v = G_init.slice(), H_v = H_init.slice();
  let a = a_init.slice(), b = b_init.slice();
  const Lk: secp.ProjectivePoint[] = [], Rk: secp.ProjectivePoint[] = [];

  while (a.length > 1) {
    const n = a.length / 2;
    const a_lo = a.slice(0, n), a_hi = a.slice(n);
    const b_lo = b.slice(0, n), b_hi = b.slice(n);
    const G_lo = G_v.slice(0, n), G_hi = G_v.slice(n);
    const H_lo = H_v.slice(0, n), H_hi = H_v.slice(n);

    const c_L = vecInner(a_lo, b_hi);
    const c_R = vecInner(a_hi, b_lo);
    const L = msm(a_lo, G_hi).add(msm(b_hi, H_lo)).add(safeMult(Q, c_L));
    const R = msm(a_hi, G_lo).add(msm(b_lo, H_hi)).add(safeMult(Q, c_R));

    Lk.push(L); Rk.push(R);
    transcript.append('L', pointToBytes(L));
    transcript.append('R', pointToBytes(R));
    const u = transcript.challenge('u');
    const u_inv = modInvReal(u);

    const G_n: secp.ProjectivePoint[] = [];
    const H_n: secp.ProjectivePoint[] = [];
    const a_n: bigint[] = [];
    const b_n: bigint[] = [];

    for (let i = 0; i < n; i++) {
      G_n.push(G_lo[i]!.multiply(u_inv).add(G_hi[i]!.multiply(u)));
      H_n.push(H_lo[i]!.multiply(u).add(H_hi[i]!.multiply(u_inv)));
      a_n.push(modN(u * a_lo[i]! + u_inv * a_hi[i]!));
      b_n.push(modN(u_inv * b_lo[i]! + u * b_hi[i]!));
    }
    G_v = G_n; H_v = H_n; a = a_n; b = b_n;
  }

  return { L: Lk, R: Rk, a_final: a[0]!, b_final: b[0]! };
}

// --- BP range proof: prove ---
export function bpRangeAggProve(
  values: bigint[],
  blindings: bigint[],
  nBits: number = N_BITS,
): { proof: Uint8Array; commitments: secp.ProjectivePoint[] } {
  const m = values.length;
  if (m !== blindings.length) throw new Error('values/blindings length mismatch');
  if (!BP_AGG_CAPS.includes(m as typeof BP_AGG_CAPS[number])) throw new Error(`unsupported m=${m}`);
  const nm = nBits * m;
  const { Gvec: Gfull, Hvec: Hfull, Q } = bpGens();
  const Gvec = Gfull.slice(0, nm), Hvec = Hfull.slice(0, nm);

  const V_pts: secp.ProjectivePoint[] = [];
  const a_L = new Array<bigint>(nm);
  for (let j = 0; j < m; j++) {
    const v = values[j]!;
    if (v < 0n || v >= (1n << BigInt(nBits))) throw new Error(`value[${j}]=${v} out of range`);
    V_pts.push(pedersenCommit(v, blindings[j]!));
    for (let i = 0; i < nBits; i++) a_L[j * nBits + i] = (v >> BigInt(i)) & 1n;
  }
  const a_R = a_L.map(x => modN(x - 1n));

  const alpha = randomScalar();
  let A = G.multiply(alpha).add(msm(a_L, Gvec)).add(msm(a_R, Hvec));

  const s_L = new Array<bigint>(nm), s_R = new Array<bigint>(nm);
  for (let i = 0; i < nm; i++) { s_L[i] = randomScalar(); s_R[i] = randomScalar(); }
  const rho = randomScalar();
  let S = G.multiply(rho).add(msm(s_L, Gvec)).add(msm(s_R, Hvec));

  const transcript = bpTranscript();
  transcript.append('domain', te.encode(BP_TRANSCRIPT_DOMAIN));
  transcript.append('n', new Uint8Array([nBits & 0xff]));
  transcript.append('m', new Uint8Array([m & 0xff]));
  for (const V of V_pts) transcript.append('V', pointToBytes(V));
  transcript.append('A', pointToBytes(A));
  transcript.append('S', pointToBytes(S));

  const y = transcript.challenge('y');
  const z = transcript.challenge('z');
  const ones_nm = vecOnes(nm);
  const z_neg = modN(-z);

  const l_const = vecAdd(a_L, vecScalarMul(ones_nm, z_neg));
  const l_X = s_L;
  const y_nm = vecPow(y, nm);
  const r_const_part1 = vecHadamard(y_nm, vecAdd(a_R, vecScalarMul(ones_nm, z)));

  const z_sq = modN(z * z);
  const zpow_2j = new Array<bigint>(m);
  { let p = z_sq; for (let j = 0; j < m; j++) { zpow_2j[j] = p; p = modN(p * z); } }
  const two_n = vecPow(2n, nBits);
  const r_const_part2 = new Array<bigint>(nm);
  for (let i = 0; i < nm; i++) {
    const j = (i / nBits) | 0;
    const k = i % nBits;
    r_const_part2[i] = modN(zpow_2j[j]! * two_n[k]!);
  }

  const r_const = vecAdd(r_const_part1, r_const_part2);
  const r_X = vecHadamard(y_nm, s_R);

  const t_1 = modN(vecInner(l_const, r_X) + vecInner(l_X, r_const));
  const t_2 = vecInner(l_X, r_X);

  const tau_1 = randomScalar();
  const tau_2 = randomScalar();
  const T_1 = safeMult(H, t_1).add(G.multiply(tau_1));
  const T_2 = safeMult(H, t_2).add(G.multiply(tau_2));

  transcript.append('T1', pointToBytes(T_1));
  transcript.append('T2', pointToBytes(T_2));
  const x = transcript.challenge('x');
  const x2 = modN(x * x);

  const l = vecAdd(l_const, vecScalarMul(l_X, x));
  const r = vecAdd(r_const, vecScalarMul(r_X, x));
  const t_hat = vecInner(l, r);

  let tau_x = modN(tau_1 * x + tau_2 * x2);
  for (let j = 0; j < m; j++) {
    tau_x = modN(tau_x + zpow_2j[j]! * modN(blindings[j]!));
  }
  const mu = modN(alpha + rho * x);

  transcript.append('t_hat', bigintToBytes32(t_hat));
  transcript.append('tau_x', bigintToBytes32(tau_x));
  transcript.append('mu', bigintToBytes32(mu));
  const w = transcript.challenge('w');

  const y_inv = modInvReal(y);
  const y_inv_pow = vecPow(y_inv, nm);
  const Hprime = Hvec.map((Hi, i) => Hi.multiply(modN(y_inv_pow[i]!)));
  const Q_ipa = Q.multiply(w);

  const ipa = bpIpaProve(Gvec, Hprime, Q_ipa, l, r, transcript);

  const buf: Uint8Array[] = [
    pointToBytes(A), pointToBytes(S), pointToBytes(T_1), pointToBytes(T_2),
    bigintToBytes32(t_hat), bigintToBytes32(tau_x), bigintToBytes32(mu),
  ];
  for (let k = 0; k < ipa.L.length; k++) {
    buf.push(pointToBytes(ipa.L[k]!));
    buf.push(pointToBytes(ipa.R[k]!));
  }
  buf.push(bigintToBytes32(ipa.a_final));
  buf.push(bigintToBytes32(ipa.b_final));

  return { proof: concatBytes(...buf), commitments: V_pts };
}

function randomScalar(): bigint {
  while (true) {
    const x = bytes32ToBigint(crypto.getRandomValues(new Uint8Array(32)));
    if (x !== 0n && x < SECP_N) return x;
  }
}

// --- BP range proof: verify single ---
export function bpRangeAggVerify(
  V_pts: secp.ProjectivePoint[],
  proofBytes: Uint8Array,
  nBits: number = N_BITS,
): boolean {
  return bpRangeAggBatchVerify([{ commitments: V_pts, proof: proofBytes }], nBits);
}

// --- BP range proof: batch verify ---
interface VerifyItem {
  commitments: secp.ProjectivePoint[];
  proof: Uint8Array;
}

export function bpRangeAggBatchVerify(
  items: VerifyItem[],
  nBits: number = N_BITS,
): boolean {
  if (items.length === 0) return true;

  let maxNm = 0;
  const meta: { m: number; nm: number; log_nm: number }[] = [];

  for (const it of items) {
    const m = it.commitments.length;
    if (!BP_AGG_CAPS.includes(m as typeof BP_AGG_CAPS[number])) return false;
    const nm = nBits * m;
    const log_nm = Math.log2(nm);
    if (!Number.isInteger(log_nm)) return false;
    const expectedLen = 33 * 4 + 32 * 3 + log_nm * 33 * 2 + 32 * 2;
    if (it.proof.length !== expectedLen) return false;
    if (nm > maxNm) maxNm = nm;
    meta.push({ m, nm, log_nm });
  }

  const { Gvec: Gfull, Hvec: Hfull, Q } = bpGens();
  const Gvec = Gfull.slice(0, maxNm);
  const Hvec = Hfull.slice(0, maxNm);

  const aggG = new Array<bigint>(maxNm).fill(0n);
  const aggH = new Array<bigint>(maxNm).fill(0n);
  let aggQ = 0n, aggGcurve = 0n, aggHvalue = 0n;
  const extraScalars: bigint[] = [], extraPoints: secp.ProjectivePoint[] = [];

  for (let pIdx = 0; pIdx < items.length; pIdx++) {
    const it = items[pIdx]!;
    const { m, nm, log_nm } = meta[pIdx]!;
    const proofBytes = it.proof;
    const V_pts = it.commitments;

    let off = 0;
    let A: secp.ProjectivePoint, S: secp.ProjectivePoint, T_1: secp.ProjectivePoint, T_2: secp.ProjectivePoint;
    try {
      A   = bytesToPoint(proofBytes.slice(off, off + 33)); off += 33;
      S   = bytesToPoint(proofBytes.slice(off, off + 33)); off += 33;
      T_1 = bytesToPoint(proofBytes.slice(off, off + 33)); off += 33;
      T_2 = bytesToPoint(proofBytes.slice(off, off + 33)); off += 33;
    } catch { return false; }

    const t_hat = bytes32ToBigint(proofBytes.slice(off, off + 32)); off += 32;
    const tau_x = bytes32ToBigint(proofBytes.slice(off, off + 32)); off += 32;
    const mu    = bytes32ToBigint(proofBytes.slice(off, off + 32)); off += 32;

    const Lk: secp.ProjectivePoint[] = [], Rk: secp.ProjectivePoint[] = [];
    try {
      for (let k = 0; k < log_nm; k++) {
        Lk.push(bytesToPoint(proofBytes.slice(off, off + 33))); off += 33;
        Rk.push(bytesToPoint(proofBytes.slice(off, off + 33))); off += 33;
      }
    } catch { return false; }

    const a_final = bytes32ToBigint(proofBytes.slice(off, off + 32)); off += 32;
    const b_final = bytes32ToBigint(proofBytes.slice(off, off + 32)); off += 32;

    const transcript = bpTranscript();
    transcript.append('domain', te.encode(BP_TRANSCRIPT_DOMAIN));
    transcript.append('n', new Uint8Array([nBits & 0xff]));
    transcript.append('m', new Uint8Array([m & 0xff]));
    for (const V of V_pts) transcript.append('V', pointToBytes(V));
    transcript.append('A', pointToBytes(A));
    transcript.append('S', pointToBytes(S));
    const y = transcript.challenge('y');
    const z = transcript.challenge('z');
    transcript.append('T1', pointToBytes(T_1));
    transcript.append('T2', pointToBytes(T_2));
    const x = transcript.challenge('x');
    transcript.append('t_hat', bigintToBytes32(t_hat));
    transcript.append('tau_x', bigintToBytes32(tau_x));
    transcript.append('mu', bigintToBytes32(mu));
    const w = transcript.challenge('w');

    const u = new Array<bigint>(log_nm);
    for (let j = 0; j < log_nm; j++) {
      transcript.append('L', pointToBytes(Lk[j]!));
      transcript.append('R', pointToBytes(Rk[j]!));
      u[j] = transcript.challenge('u');
    }
    const u_inv = batchInv(u);
    const u_sq = u.map(uu => modN(uu * uu));
    const u_inv_sq = u_inv.map(uu => modN(uu * uu));

    const s = new Array<bigint>(nm);
    s[0] = u_inv.reduce((acc, v) => modN(acc * v), 1n);
    for (let i = 1; i < nm; i++) {
      const lsb = i & -i;
      const j_lsb = Math.log2(lsb) | 0;
      const j = log_nm - 1 - j_lsb;
      s[i] = modN(s[i ^ lsb]! * u_sq[j]!);
    }
    const s_inv = batchInv(s);

    const ones_nm = vecOnes(nm);
    const y_nm = vecPow(y, nm);
    const sum_y_nm = vecInner(ones_nm, y_nm);
    const sum_two_n = (1n << BigInt(nBits)) - 1n;
    const z_sq = modN(z * z);
    const z_minus_z2 = modN(z - z_sq);
    let zp = modN(z_sq * z);
    let delta = modN(z_minus_z2 * sum_y_nm);
    for (let j = 0; j < m; j++) {
      delta = modN(delta - zp * sum_two_n);
      zp = modN(zp * z);
    }

    const y_inv = modInvReal(y);
    const y_inv_pow = vecPow(y_inv, nm);
    const zpow_2j = new Array<bigint>(m);
    { let p = z_sq; for (let j = 0; j < m; j++) { zpow_2j[j] = p; p = modN(p * z); } }
    const two_n = vecPow(2n, nBits);

    const alpha = randomScalar();
    const beta  = randomScalar();
    const x2 = modN(x * x);

    aggHvalue = modN(aggHvalue + alpha * modN(t_hat - delta));
    aggGcurve = modN(aggGcurve + alpha * tau_x);
    extraScalars.push(modN(-alpha * x));    extraPoints.push(T_1);
    extraScalars.push(modN(-alpha * x2));   extraPoints.push(T_2);

    let zj = z_sq;
    for (let j = 0; j < m; j++) {
      extraScalars.push(modN(-alpha * zj));
      extraPoints.push(V_pts[j]!);
      zj = modN(zj * z);
    }

    extraScalars.push(beta);             extraPoints.push(A);
    extraScalars.push(modN(beta * x));   extraPoints.push(S);
    aggGcurve = modN(aggGcurve + beta * modN(-mu));
    aggQ = modN(aggQ + beta * modN(w * modN(t_hat - a_final * b_final)));

    for (let k = 0; k < log_nm; k++) {
      extraScalars.push(modN(beta * u_sq[k]!));     extraPoints.push(Lk[k]!);
      extraScalars.push(modN(beta * u_inv_sq[k]!)); extraPoints.push(Rk[k]!);
    }

    const minus_z = modN(-z);
    for (let i = 0; i < nm; i++) {
      const j = (i / nBits) | 0;
      const k = i % nBits;
      const s_G_i = minus_z;
      const s_H_i = modN(z + modN(zpow_2j[j]! * two_n[k]!) * y_inv_pow[i]!);
      const G_total = modN(s_G_i - a_final * s[i]!);
      const H_total = modN(s_H_i - b_final * modN(s_inv[i]! * y_inv_pow[i]!));
      aggG[i] = modN(aggG[i]! + beta * G_total);
      aggH[i] = modN(aggH[i]! + beta * H_total);
    }
  }

  const allScalars = [...aggG, ...aggH, aggQ, aggGcurve, aggHvalue, ...extraScalars];
  const allPoints  = [...Gvec, ...Hvec, Q, G, H, ...extraPoints];
  return msm(allScalars, allPoints).equals(ZERO);
}
