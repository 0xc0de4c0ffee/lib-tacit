// BIP-352 silent payments for plain Bitcoin sats.
// Reference: tacit-specs/dapp/tacit.js lines 4371-4484.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { SECP_N } from '../constants/limits.js';
import { G, ZERO, bytes32ToBigint, bytesToPoint, bigintToBytes32, modN } from './pedersen.js';
import { reverseBytes } from '../transaction/utils.js';
import { aggregateStealthEligibleInputPubkeys } from './stealth.js';
import type { ClassifiedStealthInput } from './stealth.js';

// --- Bech32m helpers (BIP-350) ---

const BECH32M_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32M_CONST = 0x2bc830a3;

function bech32mPolymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk ^= GEN[i]!;
    }
  }
  return chk;
}

function bech32mExpandHrp(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >>> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}

function bech32mConvertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const v of data) {
    if (v < 0 || (v >>> fromBits) !== 0) throw new Error('invalid convertBits input');
    acc = (acc << fromBits) | v;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >>> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('invalid padding');
  }
  return ret;
}

// --- BIP-352 constants ---

export const BIP352_HRP_BY_NETWORK: Record<string, string> = {
  mainnet: 'sp',
  signet: 'tsp',
};

export interface SilentPaymentAddress {
  hrp: string;
  network: string;
  version: number;
  scanPub: Uint8Array;
  spendPub: Uint8Array;
}

// --- Tagged hash (SHA256(SHA256(tag) || SHA256(tag) || data)) ---

function taggedHash(tag: string, data: Uint8Array, data2?: Uint8Array): Uint8Array {
  const tagHash = sha256(new TextEncoder().encode(tag));
  const input = data2 ? concatBytes(tagHash, tagHash, data, data2) : concatBytes(tagHash, tagHash, data);
  return sha256(input);
}

// --- 4-byte big-endian ---

function u32be(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, false);
  return b;
}

// --- Outpoint serialization (txid_LE + vout_LE) ---

export function bip352OutpointBytes(txidHexDisplay: string, vout: number): Uint8Array {
  const txidLE = reverseBytes(hexToBytes(txidHexDisplay));
  const voutLE = new Uint8Array(4);
  new DataView(voutLE.buffer).setUint32(0, vout >>> 0, true);
  return concatBytes(txidLE, voutLE);
}

// --- Smallest outpoint (lexicographic, 36-byte each) ---

export function bip352SmallestOutpoint(outpoints: Uint8Array[]): Uint8Array {
  if (!outpoints.length) throw new Error('no outpoints');
  let best = outpoints[0]!;
  for (let i = 1; i < outpoints.length; i++) {
    const o = outpoints[i]!;
    for (let j = 0; j < 36; j++) {
      if (o[j]! < best[j]!) { best = o; break; }
      if (o[j]! > best[j]!) break;
    }
  }
  return best;
}

// --- Tagged hash export (BIP-352 context) ---

export function bip352TaggedHash(tag: string, data: Uint8Array, data2?: Uint8Array): Uint8Array {
  return taggedHash(tag, data, data2);
}

// --- Decode silent payment address (sp1... / tsp1...) ---

export function decodeSilentPaymentAddress(addr: string): SilentPaymentAddress | null {
  if (typeof addr !== 'string' || addr.length < 14 || addr.length > 130) return null;
  const lower = addr.toLowerCase();
  const upper = addr.toUpperCase();
  if (addr !== lower && addr !== upper) return null;
  const sep = lower.lastIndexOf('1');
  if (sep < 1 || sep + 7 > lower.length) return null;
  const hrp = lower.slice(0, sep);
  let network: string | null = null;
  for (const [k, v] of Object.entries(BIP352_HRP_BY_NETWORK)) {
    if (hrp === v) { network = k; break; }
  }
  if (!network) return null;
  const d5: number[] = [];
  for (let i = sep + 1; i < lower.length; i++) {
    const idx = BECH32M_ALPHABET.indexOf(lower[i]!);
    if (idx === -1) return null;
    d5.push(idx);
  }
  if (bech32mPolymod(bech32mExpandHrp(hrp).concat(d5)) !== BECH32M_CONST) return null;
  const data5 = d5.slice(0, d5.length - 6);
  if (data5.length < 1) return null;
  const version = data5[0]!;
  if (version !== 0) return null;
  let payload: Uint8Array;
  try {
    payload = new Uint8Array(bech32mConvertBits(data5.slice(1), 5, 8, false));
  } catch {
    return null;
  }
  if (payload.length !== 66) return null;
  const scanPub = payload.slice(0, 33);
  const spendPub = payload.slice(33, 66);
  try {
    bytesToPoint(scanPub);
    bytesToPoint(spendPub);
  } catch {
    return null;
  }
  return { hrp, network, version, scanPub, spendPub };
}

// --- Sender computes silent payment output (BIP-352 §3.2) ---

export function senderComputeSilentPaymentOutput(opts: {
  inputPrivs: Uint8Array[];
  inputOutpoints: Uint8Array[];
  allInputOutpoints?: Uint8Array[];
  scanPub: Uint8Array;
  spendPub: Uint8Array;
  k?: number;
}): { xOnly: Uint8Array } {
  const { inputPrivs, inputOutpoints, allInputOutpoints, scanPub, spendPub, k = 0 } = opts;
  if (!Array.isArray(inputPrivs) || inputPrivs.length === 0) {
    throw new Error('inputPrivs must be non-empty');
  }
  if (!Array.isArray(inputOutpoints) || inputOutpoints.length !== inputPrivs.length) {
    throw new Error('inputOutpoints length must match inputPrivs');
  }
  const opsForSmallest = Array.isArray(allInputOutpoints) && allInputOutpoints.length > 0
    ? allInputOutpoints
    : inputOutpoints;
  let a = 0n;
  for (const p of inputPrivs) {
    if (!(p instanceof Uint8Array) || p.length !== 32) throw new Error('input priv must be 32 bytes');
    const d = bytes32ToBigint(p);
    if (d <= 0n || d >= SECP_N) throw new Error('input priv out of range');
    a = (a + d) % SECP_N;
  }
  if (a === 0n) throw new Error('aggregated priv sum is zero');
  const A_bytes = G.multiply(a).toRawBytes(true);
  const op_L = bip352SmallestOutpoint(opsForSmallest);
  const input_hash = taggedHash('BIP0352/Inputs', op_L, A_bytes);
  const ih = bytes32ToBigint(input_hash) % SECP_N;
  if (ih === 0n) throw new Error('input_hash mod N is zero');
  const scalar = (a * ih) % SECP_N;
  const ecdh_bytes = bytesToPoint(scanPub).multiply(scalar).toRawBytes(true);
  const t_k = taggedHash('BIP0352/SharedSecret', ecdh_bytes, u32be(k));
  const tBig = bytes32ToBigint(t_k) % SECP_N;
  if (tBig === 0n) throw new Error('shared secret tweak is zero');
  const P = bytesToPoint(spendPub).add(G.multiply(tBig));
  if (P.equals(ZERO)) throw new Error('output P is point at infinity');
  return { xOnly: P.toRawBytes(true).slice(1) };
}

// --- Bech32m checksum (BIP-350) ---

function bech32mChecksum(hrp: string, data: number[]): number[] {
  const v = bech32mExpandHrp(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const pm = bech32mPolymod(v) ^ BECH32M_CONST;
  const out: number[] = [];
  for (let i = 0; i < 6; i++) out.push((pm >>> (5 * (5 - i))) & 31);
  return out;
}

// --- Derive scan private key from spend private key (BIP-352 §3.1) ---

export function deriveSilentPaymentScanPriv(spendPriv: Uint8Array): Uint8Array {
  const h = taggedHash('BIP0352/ScanKey', spendPriv);
  const s = bytes32ToBigint(h) % SECP_N;
  if (s === 0n) throw new Error('scan priv derived zero');
  return bigintToBytes32(s);
}

// --- Derive scan+spend keypair (BIP-352 §3.1) ---

export function deriveSilentPaymentKeys(spendPriv: Uint8Array): {
  scanPriv: Uint8Array;
  scanPub: Uint8Array;
  spendPub: Uint8Array;
} {
  const scanPriv = deriveSilentPaymentScanPriv(spendPriv);
  const scanPub = secp.getPublicKey(scanPriv, true);
  const spendPub = secp.getPublicKey(spendPriv, true);
  return { scanPriv, scanPub, spendPub };
}

// --- Encode silent payment address (sp1... / tsp1...) ---

export function encodeSilentPaymentAddress(opts: {
  scanPub: Uint8Array;
  spendPub: Uint8Array;
  network: string;
}): string {
  const { scanPub, spendPub, network } = opts;
  const hrp = BIP352_HRP_BY_NETWORK[network];
  if (!hrp) throw new Error(`unknown network: ${network}`);
  const payload8 = new Uint8Array(66);
  payload8.set(scanPub, 0);
  payload8.set(spendPub, 33);
  const data5 = bech32mConvertBits(Array.from(payload8), 8, 5, true);
  data5.unshift(0);
  const chk = bech32mChecksum(hrp, data5);
  const combined = data5.concat(chk);
  let out = hrp + '1';
  for (const v of combined) out += BECH32M_ALPHABET[v]!;
  return out;
}

// --- Receiver scan result ---

export interface ReceiverScanResult {
  voutIndex: number;
  outputKey: Uint8Array;
}

// --- Receiver scans a tx for silent payments paying us (BIP-352 §3.3) ---

export function receiverScanTxForSilentPayments(opts: {
  classifiedInputs: ClassifiedStealthInput[];
  allInputOutpoints: Uint8Array[];
  outputs: { script: Uint8Array }[];
  scanPriv: Uint8Array;
  spendPub: Uint8Array;
}): ReceiverScanResult[] {
  const { classifiedInputs, allInputOutpoints, outputs, scanPriv, spendPub } = opts;
  const { aggregatePub } = aggregateStealthEligibleInputPubkeys(classifiedInputs);
  if (!aggregatePub) return [];
  const op_L = bip352SmallestOutpoint(allInputOutpoints);
  const inputHash = taggedHash('BIP0352/Inputs', op_L, aggregatePub);
  const ih = modN(bytes32ToBigint(inputHash));
  if (ih === 0n) throw new Error('input_hash mod N is zero');
  const A_sum = bytesToPoint(aggregatePub);
  const ecdhPt = A_sum.multiply(ih).multiply(modN(bytes32ToBigint(scanPriv)));
  const ecdhBytes = ecdhPt.toRawBytes(true).slice(1);
  const results: ReceiverScanResult[] = [];
  for (let v = 0; v < outputs.length; v++) {
    const script = outputs[v]!.script;
    if (script.length !== 34 || script[0] !== 0x51 || script[1] !== 0x20) continue;
    const outputKey = script.slice(2, 34);
    const tweak = taggedHash('BIP0352/SharedSecret', ecdhBytes, u32be(v));
    const t = modN(bytes32ToBigint(tweak));
    if (t === 0n) continue;
    const P = bytesToPoint(spendPub).add(G.multiply(t));
    const expected = P.toRawBytes(true).slice(1);
    if (expected.length === 32 && expected.every((b, i) => b === outputKey[i]!)) {
      results.push({ voutIndex: v, outputKey });
    }
  }
  return results;
}
