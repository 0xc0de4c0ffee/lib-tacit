// BIP-340 Schnorr signature — in-house implementation matching the reference.
// Uses the @noble/secp256k1 curve but owns the BIP-340 tagged-hash and nonce
// derivation to keep implementation independent of noble's schnorr module.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import { G, modN, bigintToBytes32, bytes32ToBigint } from './pedersen.js';
import { SECP_N, SECP_P } from '../constants/limits.js';

function taggedHash(tag: string, ...msgs: Uint8Array[]): Uint8Array {
  const tagHash = sha256(new TextEncoder().encode(tag));
  return sha256(concatBytes(tagHash, tagHash, ...msgs));
}

function xor32(a: Uint8Array, b: Uint8Array): Uint8Array {
  const r = new Uint8Array(32);
  for (let i = 0; i < 32; i++) r[i] = a[i]! ^ b[i]!;
  return r;
}

// Sign a 32-byte message hash with a 32-byte private key.
// Returns a 64-byte signature (R_x || s).
export function signSchnorr(msgHash: Uint8Array, priv32: Uint8Array): Uint8Array {
  const dPrime = bytes32ToBigint(priv32);
  if (dPrime <= 0n || dPrime >= SECP_N) throw new Error('schnorr: invalid private key');

  const P = G.multiply(dPrime);
  const Pbytes = P.toRawBytes(true);
  const Px = Pbytes.slice(1);
  const d = (Pbytes[0] === 0x02) ? dPrime : (SECP_N - dPrime);

  const aux = crypto.getRandomValues(new Uint8Array(32));
  const t = xor32(bigintToBytes32(d), taggedHash('BIP0340/aux', aux));
  const rand = taggedHash('BIP0340/nonce', t, Px, msgHash);

  let kPrime = bytes32ToBigint(rand) % SECP_N;
  if (kPrime === 0n) throw new Error('schnorr: nonce was zero');

  const R = G.multiply(kPrime);
  const Rbytes = R.toRawBytes(true);
  const Rx = Rbytes.slice(1);
  const k = (Rbytes[0] === 0x02) ? kPrime : (SECP_N - kPrime);

  const e = bytes32ToBigint(taggedHash('BIP0340/challenge', Rx, Px, msgHash)) % SECP_N;
  const s = (k + e * d) % SECP_N;

  return concatBytes(Rx, bigintToBytes32(s));
}

// Verify a 64-byte signature against a 32-byte message hash and 32-byte x-only pubkey.
export function verifySchnorr(
  sig64: Uint8Array,
  msgHash: Uint8Array,
  pubXonly32: Uint8Array,
): boolean {
  if (sig64.length !== 64 || pubXonly32.length !== 32 || msgHash.length !== 32) return false;

  const Rx = sig64.slice(0, 32);
  const sBig = bytes32ToBigint(sig64.slice(32, 64));
  if (sBig >= SECP_N) return false;
  if (bytes32ToBigint(pubXonly32) >= SECP_P) return false;

  let P: secp.ProjectivePoint;
  try {
    P = secp.ProjectivePoint.fromHex('02' + secp.etc.bytesToHex(pubXonly32));
  } catch { return false; }

  const e = bytes32ToBigint(taggedHash('BIP0340/challenge', Rx, pubXonly32, msgHash)) % SECP_N;
  const R = G.multiply(sBig).add(P.multiply(e).negate());

  if (R.equals(secp.ProjectivePoint.ZERO)) return false;

  const Rb = R.toRawBytes(true);
  if (Rb[0] !== 0x02) return false;

  return secp.etc.bytesToHex(Rb.slice(1)) === secp.etc.bytesToHex(Rx);
}
