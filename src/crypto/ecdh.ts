// ECDH-derived blinding factors and amount-encryption keystreams.
// All derivations use HMAC-SHA256 keyed by either:
//   - wallet privkey (self-derivations: change, etch supply)
//   - SHA256(ECDH shared secret x-coord) (peer-derivations: recipient)
// SPEC §3.5.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { concatBytes } from '@noble/hashes/utils';
import { bytes32ToBigint } from './pedersen.js';
import { SECP_N } from '../constants/limits.js';
import {
  BLIND_DOMAIN,
  CHANGE_DOMAIN,
  ETCH_BLIND_DOMAIN,
  ETCH_AMOUNT_DOMAIN,
  MINT_BLIND_DOMAIN,
  MINT_AMOUNT_DOMAIN,
  AMOUNT_DOMAIN,
  AMOUNT_SELF_DOMAIN,
} from '../constants/domains.js';

const te = new TextEncoder();

// Anchor = first_asset_input_txid_BE(32) || first_asset_input_vout_LE(4) = 36 bytes
export type Anchor = Uint8Array;

function voutLE(idx: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, idx >>> 0, true);
  return b;
}

function ecdhSeed(myPriv: Uint8Array, theirPubBytes: Uint8Array): Uint8Array {
  const shared = secp.getSharedSecret(myPriv, theirPubBytes);
  return sha256(shared.slice(1));
}

// ---- Recipient blinding (ECDH-derived) ----
export function deriveBlinding(
  myPriv: Uint8Array,
  theirPubBytes: Uint8Array,
  anchor: Anchor,
  voutIdx: number,
): bigint {
  const seed = ecdhSeed(myPriv, theirPubBytes);
  const out = hmac(sha256, seed, concatBytes(te.encode(BLIND_DOMAIN), anchor, voutLE(voutIdx)));
  return bytes32ToBigint(out) % SECP_N;
}

// ---- Change blinding (self-derived) ----
export function deriveChangeBlinding(
  myPriv: Uint8Array,
  anchor: Anchor,
  voutIdx: number,
): bigint {
  const out = hmac(sha256, myPriv, concatBytes(te.encode(CHANGE_DOMAIN), anchor, voutLE(voutIdx)));
  return bytes32ToBigint(out) % SECP_N;
}

// ---- Etch supply blinding (self-derived, no vout) ----
export function deriveEtchBlinding(
  myPriv: Uint8Array,
  anchor: Anchor,
): bigint {
  const out = hmac(sha256, myPriv, concatBytes(te.encode(ETCH_BLIND_DOMAIN), anchor));
  return bytes32ToBigint(out) % SECP_N;
}

// ---- Mint blinding (self-derived) ----
export function deriveMintBlinding(
  myPriv: Uint8Array,
  anchor: Anchor,
): bigint {
  const out = hmac(sha256, myPriv, concatBytes(te.encode(MINT_BLIND_DOMAIN), anchor));
  return bytes32ToBigint(out) % SECP_N;
}

// ---- Recipient amount keystream (ECDH-derived, 8 bytes) ----
export function deriveAmountKeystreamECDH(
  myPriv: Uint8Array,
  theirPubBytes: Uint8Array,
  anchor: Anchor,
  voutIdx: number,
): Uint8Array {
  const seed = ecdhSeed(myPriv, theirPubBytes);
  return hmac(sha256, seed, concatBytes(te.encode(AMOUNT_DOMAIN), anchor, voutLE(voutIdx))).slice(0, 8);
}

// ---- Self amount keystream (change, 8 bytes) ----
export function deriveAmountKeystreamSelf(
  myPriv: Uint8Array,
  anchor: Anchor,
  voutIdx: number,
): Uint8Array {
  return hmac(sha256, myPriv, concatBytes(te.encode(AMOUNT_SELF_DOMAIN), anchor, voutLE(voutIdx))).slice(0, 8);
}

// ---- Etch amount keystream (self-derived, 8 bytes) ----
export function deriveEtchAmountKeystream(
  myPriv: Uint8Array,
  anchor: Anchor,
): Uint8Array {
  return hmac(sha256, myPriv, concatBytes(te.encode(ETCH_AMOUNT_DOMAIN), anchor)).slice(0, 8);
}

// ---- Mint amount keystream (self-derived, 8 bytes) ----
export function deriveMintAmountKeystream(
  myPriv: Uint8Array,
  anchor: Anchor,
): Uint8Array {
  return hmac(sha256, myPriv, concatBytes(te.encode(MINT_AMOUNT_DOMAIN), anchor)).slice(0, 8);
}

// ---- XOR-OTP amount encryption / decryption ----
export function encryptAmount(amount: bigint, keystream8: Uint8Array): Uint8Array {
  if (amount < 0n || amount >= (1n << 64n)) throw new Error('amount out of u64 range');
  const ct = new Uint8Array(8);
  let n = amount;
  for (let i = 0; i < 8; i++) {
    ct[i] = Number(n & 0xffn) ^ keystream8[i]!;
    n >>= 8n;
  }
  return ct;
}

export function decryptAmount(ciphertext8: Uint8Array, keystream8: Uint8Array): bigint {
  let n = 0n;
  for (let i = 7; i >= 0; i--) {
    n = (n << 8n) | BigInt(ciphertext8[i]! ^ keystream8[i]!);
  }
  return n;
}
