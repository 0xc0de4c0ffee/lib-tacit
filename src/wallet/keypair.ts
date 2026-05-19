// Wallet keypair management — generate, import, export.
// Pure functions, no storage/I/O. Consumers handle persistence.
// §2 defines the in-page privkey role.

import * as secp from '@noble/secp256k1';
import { bytesToHex } from '@noble/hashes/utils';

// Generate a fresh secp256k1 keypair.
export function generateKeypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  const pub = secp.getPublicKey(priv, true);
  return { priv, pub };
}

// Import a 64-hex private key.
export function importPrivkey(hex: string): { priv: Uint8Array; pub: Uint8Array } {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('privkey must be 64 hex chars');
  const priv = secp.etc.hexToBytes(hex.toLowerCase());
  if (priv.length !== 32) throw new Error('privkey must be 32 bytes');
  const pub = secp.getPublicKey(priv, true);
  return { priv, pub };
}

// Export private key as 64-hex string.
export function exportPrivkey(priv: Uint8Array): string {
  return bytesToHex(priv);
}

// Derive compressed pubkey (33 bytes, 02/03 prefix) from private key.
export function derivePubkey(priv: Uint8Array): Uint8Array {
  return secp.getPublicKey(priv, true);
}

// Derive x-only pubkey (32 bytes) from private key.
export function deriveXonlyPubkey(priv: Uint8Array): Uint8Array {
  const pub = secp.getPublicKey(priv, true);
  return pub.slice(1);
}

// Keypair types
export interface Keypair {
  priv: Uint8Array;
  pub: Uint8Array;
}
