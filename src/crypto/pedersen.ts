// Pedersen commitments over secp256k1.
// C = amount·H + blinding·G where H is a NUMS generator with no known discrete log.
// SPEC §3.1, §3.2.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { bytesToHex, concatBytes } from '@noble/hashes/utils';
import { GENERATOR_H_DOMAIN } from '../constants/domains.js';
import { SECP_N } from '../constants/limits.js';

// Wire noble's sync HMAC helper (required by secp.getSharedSecret internals).
secp.etc.hmacSha256Sync = (k: Uint8Array, ...m: Uint8Array[]) =>
  hmac(sha256, k, secp.etc.concatBytes(...m));

const te = new TextEncoder();

// --- Field helpers ---
export const modN = (x: bigint): bigint => ((x % SECP_N) + SECP_N) % SECP_N;
export const modNBig = (x: bigint): bigint => modN(x);

// --- Bytes ↔ bigint ---
export function bigintToBytes32(n: bigint): Uint8Array {
  const m = modN(n);
  return secp.etc.hexToBytes(m.toString(16).padStart(64, '0'));
}
export function bytes32ToBigint(b: Uint8Array): bigint {
  return BigInt('0x' + bytesToHex(b));
}

// --- Point constants ---
export const G: secp.ProjectivePoint = secp.ProjectivePoint.BASE;
export const ZERO: secp.ProjectivePoint = secp.ProjectivePoint.ZERO;

// --- Point ↔ bytes ---
export function pointToBytes(P: secp.ProjectivePoint): Uint8Array {
  return P.toRawBytes(true);
}
export function bytesToPoint(b: Uint8Array): secp.ProjectivePoint {
  return secp.ProjectivePoint.fromHex(bytesToHex(b));
}
export function xonlyFromPoint(P: secp.ProjectivePoint): Uint8Array {
  return P.toRawBytes(true).slice(1);
}

// --- Safe multiply (0n scalar returns ZERO) ---
export function safeMult(P: secp.ProjectivePoint, s: bigint): secp.ProjectivePoint {
  const x = modN(s);
  return x === 0n ? ZERO : P.multiply(x);
}

// --- NUMS generator H ---
let _H: secp.ProjectivePoint | null = null;
export function getH(): secp.ProjectivePoint {
  if (_H) return _H;
  const seed = sha256(te.encode(GENERATOR_H_DOMAIN));
  for (let counter = 0; counter < 256; counter++) {
    const x = sha256(concatBytes(seed, new Uint8Array([counter])));
    const candidate = concatBytes(new Uint8Array([0x02]), x);
    try {
      const p = secp.ProjectivePoint.fromHex(bytesToHex(candidate));
      if (!p.equals(ZERO)) {
        _H = p;
        return p;
      }
    } catch { /* continue */ }
  }
  throw new Error('failed to derive NUMS H generator');
}
// Eagerly derive at module load so consumers importing `H` get a real point.
export const H: secp.ProjectivePoint = getH();

// --- Pedersen commitment ---
export function pedersenCommit(amount: bigint, blinding: bigint): secp.ProjectivePoint {
  const a = modN(amount);
  const r = modN(blinding);
  const aH = a === 0n ? ZERO : getH().multiply(a);
  const rG = r === 0n ? ZERO : G.multiply(r);
  return aH.add(rG);
}

// --- Verify Pedersen opening ---
export function pedersenVerify(
  commitment: secp.ProjectivePoint,
  amount: bigint,
  blinding: bigint,
): boolean {
  return pedersenCommit(amount, blinding).equals(commitment);
}

// --- Random scalar in [1, SECP_N-1] ---
export function randomScalar(): bigint {
  while (true) {
    const x = bytes32ToBigint(crypto.getRandomValues(new Uint8Array(32)));
    if (x !== 0n && x < SECP_N) return x;
  }
}
