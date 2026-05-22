import { hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import * as secp from '@noble/secp256k1';
import { bytesToHex } from '../../src/transaction/utils.js';

// Deterministic test key: 32 bytes of 0xaa
export const TEST_PRIVKEY = hexToBytes('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
export const TEST_PRIVKEY_HEX = bytesToHex(TEST_PRIVKEY);

// Lazy-derived pubkey
let _pub: Uint8Array | null = null;
export function getTestPubkey(): Uint8Array {
  if (!_pub) _pub = secp.getPublicKey(TEST_PRIVKEY, true);
  return _pub!;
}

export function getTestXonlyPubkey(): Uint8Array {
  return getTestPubkey().slice(1);
}

export function getTestPubkeyHex(): string {
  return bytesToHex(getTestPubkey());
}

// Deterministic "anchor" outpoint for tests
export const TEST_ANCHOR = new Uint8Array(36).fill(0xbb);

// Deterministic asset ID (SHA256 of anchor-like data)
export const TEST_ASSET_ID = sha256(new Uint8Array(36).fill(0xcc));

// Reusable zero-fill helper
export function zeroFill(n: number, v = 0): Uint8Array {
  return new Uint8Array(n).fill(v);
}
