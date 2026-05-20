// Encrypted-at-rest private key — AES-GCM with PBKDF2-SHA256 key derivation.
// Port of tacit-specs/dapp/tacit.js lines 740-814 (MIT).
//
// Browser/Server: requires crypto.subtle (Web Crypto API).
// Available in: browsers, Node.js 19+, Bun, Deno.

import * as secp from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export const PBKDF2_ITER = 600000;
export const STORAGE_FORMAT_VERSION = 1;
const PBKDF2_ITER_MAX = 5_000_000;

async function deriveKDFKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const pwBytes = new TextEncoder().encode(passphrase);
  const baseKey = await (crypto.subtle as any).importKey(
    'raw', pwBytes, 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await (crypto.subtle as any).deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey, 256,
  );
  return new Uint8Array(bits);
}

// Encrypt a 32-byte private key with a passphrase.
export async function encryptPrivkey(
  privBytes: Uint8Array,
  passphrase: string,
): Promise<string> {
  if (privBytes.length !== 32) throw new Error('privkey must be 32 bytes');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBytes = await deriveKDFKey(passphrase, salt, PBKDF2_ITER);
  const aesKey = await (crypto.subtle as any).importKey(
    'raw', keyBytes, 'AES-GCM', false, ['encrypt'],
  );
  const ct = await (crypto.subtle as any).encrypt(
    { name: 'AES-GCM', iv }, aesKey, privBytes,
  );
  const pub = secp.getPublicKey(privBytes, true);

  return JSON.stringify({
    v: STORAGE_FORMAT_VERSION,
    kdf: 'pbkdf2',
    iter: PBKDF2_ITER,
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ct: bytesToHex(new Uint8Array(ct)),
    pub: bytesToHex(pub),
  });
}

// Read the public key from an encrypted blob without decrypting.
export function readBlobPub(blobJson: string): Uint8Array | null {
  try {
    const blob = JSON.parse(blobJson);
    if (blob.v !== STORAGE_FORMAT_VERSION) return null;
    if (typeof blob.pub !== 'string' || !/^0[23][0-9a-f]{64}$/.test(blob.pub)) return null;
    return hexToBytes(blob.pub);
  } catch { return null; }
}

// Decrypt a private key from its encrypted JSON blob.
export async function decryptPrivkey(
  blobJson: string,
  passphrase: string,
): Promise<Uint8Array> {
  let blob: any;
  try { blob = JSON.parse(blobJson); } catch { throw new Error('storage blob is malformed JSON'); }
  if (blob.v !== STORAGE_FORMAT_VERSION) throw new Error(`unsupported wallet format v${blob.v}`);
  if (blob.kdf !== 'pbkdf2') throw new Error(`unsupported kdf: ${blob.kdf}`);

  const iter = Number.isInteger(blob.iter) && blob.iter >= 100000
    ? Math.min(blob.iter, PBKDF2_ITER_MAX)
    : PBKDF2_ITER;
  const salt = hexToBytes(blob.salt);
  const iv = hexToBytes(blob.iv);
  const ct = hexToBytes(blob.ct);

  const keyBytes = await deriveKDFKey(passphrase, salt, iter);
  const aesKey = await (crypto.subtle as any).importKey(
    'raw', keyBytes, 'AES-GCM', false, ['decrypt'],
  );
  let ptBuf: ArrayBuffer;
  try {
    ptBuf = await (crypto.subtle as any).decrypt(
      { name: 'AES-GCM', iv }, aesKey, ct,
    );
  } catch {
    throw new Error('wrong passphrase or corrupted wallet data');
  }
  const priv = new Uint8Array(ptBuf);
  if (priv.length !== 32) throw new Error('decrypted blob is not a 32-byte privkey');
  return priv;
}

// Detect storage shape: returns 'plaintext', 'encrypted', or 'empty'.
export function storageShape(raw: string | null): 'plaintext' | 'encrypted' | 'empty' | 'unknown' {
  if (!raw) return 'empty';
  if (/^[0-9a-f]{64}$/.test(raw)) return 'plaintext';
  if (raw.startsWith('{')) return 'encrypted';
  return 'unknown';
}
