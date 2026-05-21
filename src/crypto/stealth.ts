// Stealth address primitives per SPEC-BLINDED-PUBKEY-AMENDMENT.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, bytesToHex } from '@noble/hashes/utils';
import { bech32m } from '@scure/base';
import { bytes32ToBigint, bigintToBytes32, randomScalar, bytesToPoint } from './pedersen.js';
import { SECP_N } from '../constants/limits.js';

const G = secp.ProjectivePoint.BASE;

export interface StealthKey {
  spendPub: Uint8Array;
  viewPub: Uint8Array;
}

export interface StealthAddress {
  address: string;
  spendPub: Uint8Array;
  viewPub: Uint8Array;
}

function ecdhSeed(myPriv: Uint8Array, theirPub: Uint8Array): Uint8Array {
  bytesToPoint(theirPub);
  const shared = secp.getSharedSecret(myPriv, theirPub);
  return sha256(shared.slice(1));
}

export function encodeStealthAddress(
  spendPub: Uint8Array,
  viewPub: Uint8Array,
  prefix: string = 'st',
): string {
  const data = concatBytes(spendPub, viewPub);
  const words = bech32m.toWords(data);
  return bech32m.encode(prefix, words, false);
}

export function decodeStealthAddress(
  address: string,
): { spendPub: Uint8Array; viewPub: Uint8Array } | null {
  try {
    const decoded = bech32m.decodeToBytes(address);
    if (decoded.bytes.length !== 66) return null;
    const spendPub = decoded.bytes.slice(0, 33);
    const viewPub = decoded.bytes.slice(33, 66);
    try {
      secp.ProjectivePoint.fromHex(bytesToHex(spendPub));
      secp.ProjectivePoint.fromHex(bytesToHex(viewPub));
    } catch {
      return null;
    }
    return { spendPub, viewPub };
  } catch {
    return null;
  }
}

export function stealthSharedSecret(
  recipientViewPub: Uint8Array,
  senderPriv: Uint8Array,
): Uint8Array {
  return ecdhSeed(senderPriv, recipientViewPub);
}

export function stealthSharedSecretRecipient(
  ephemPub: Uint8Array,
  recipientViewPriv: Uint8Array,
): Uint8Array {
  return ecdhSeed(recipientViewPriv, ephemPub);
}

export function stealthOneTimeAddress(
  sharedSecret: Uint8Array,
  recipientSpendPub: Uint8Array,
): Uint8Array {
  const tweak = bytes32ToBigint(sharedSecret) % SECP_N;
  const spendPt = secp.ProjectivePoint.fromHex(bytesToHex(recipientSpendPub));
  const otPt = spendPt.add(G.multiply(tweak));
  return otPt.toRawBytes(true);
}

export function generateStealthEphemKey(): { priv: Uint8Array; pub: Uint8Array } {
  const privBig = randomScalar();
  const priv = bigintToBytes32(privBig);
  const pub = G.multiply(privBig).toRawBytes(true);
  return { priv, pub };
}
