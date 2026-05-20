// PRF-based passkey wallet — WebAuthn PRF extension derives a deterministic
// 32-byte secp256k1 private key from the user's biometric.
// Port of tacit-specs/dapp/prf-wallet.js (MIT).
//
// Browser-only: requires navigator.credentials and secure context (HTTPS/localhost).
// Falls back gracefully: isPasskeyAvailable() returns false outside browser/HTTP.
//
// NOTE: This file references DOM types not available in all runtimes.
// Import conditionally or check isPasskeyAvailable() before calling.

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

const enc = new TextEncoder();
export const PRF_SALT = sha256(enc.encode('tacit-prf-v1'));
export const PRF_MAP_KEY = 'tacit-prf-v1';
const SECP_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

function toB64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function fromB64(s: string): Uint8Array {
  s = s.replaceAll('-', '+').replaceAll('_', '/');
  if (s.length % 4) s += '='.repeat(4 - s.length % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Map a 32-byte PRF output deterministically into [1, N-1].
export function prfBytesToScalar(raw32: Uint8Array): Uint8Array {
  let n = 0n;
  for (const b of raw32) n = (n << 8n) | BigInt(b);
  if (n === 0n || n >= SECP_N) {
    const fallback = sha256(new Uint8Array([...raw32, ...enc.encode('tacit-prf-recovery')]));
    return prfBytesToScalar(fallback);
  }
  return raw32;
}

// --- Storage (localStorage-based, browser only) ---

export interface PrfEntry {
  credentialId: string;
  pubkey: string; // hex
  lastUsed?: number;
}

export interface PrfMap {
  [label: string]: PrfEntry;
}

function getStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadPrfMap(): PrfMap {
  const ls = getStorage();
  if (!ls) return {};
  try { return JSON.parse(ls.getItem(PRF_MAP_KEY) || '{}'); } catch { return {}; }
}

export function savePrfMap(m: PrfMap): void {
  const ls = getStorage();
  if (ls) ls.setItem(PRF_MAP_KEY, JSON.stringify(m));
}

export function clearPrfMap(): void {
  const ls = getStorage();
  if (ls) ls.removeItem(PRF_MAP_KEY);
}

// --- Registration ---

export async function prfRegister(label: string): Promise<{
  credentialId: string; priv: Uint8Array; pub: Uint8Array; pubHex: string;
}> {
  const name = label.trim();
  if (!name) throw new Error('label required');
  const nav = (typeof navigator !== 'undefined' ? navigator : null) as any;
  if (!nav?.credentials) {
    throw new Error('WebAuthn not available (not in browser or no secure context)');
  }
  const g = globalThis as any;
  const rpId = typeof g.window !== 'undefined' ? g.window.location.hostname : 'localhost';
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const publicKey = {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Tacit', id: rpId },
    user: { id: userId, name, displayName: name },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 } as const, { type: 'public-key', alg: -257 } as const],
    authenticatorSelection: { authenticatorAttachment: 'platform' as const, residentKey: 'required' as const, userVerification: 'required' as const },
    timeout: 60000,
    attestation: 'none' as const,
    extensions: { prf: { eval: { first: PRF_SALT } } },
  };
  const cred = await (nav.credentials as any).create({ publicKey });
  if (!cred) throw new Error('creation cancelled');
  const credentialId = toB64(cred.rawId);
  const prfOut = cred.getClientExtensionResults()?.prf;
  if (!prfOut?.results?.first) throw new Error('PRF not supported by this authenticator');
  const raw = prfOut.results.first;
  const priv = prfBytesToScalar(raw instanceof Uint8Array ? raw : new Uint8Array(raw));
  const pub = secp.getPublicKey(priv, true);
  return { credentialId, priv, pub, pubHex: secp.etc.bytesToHex(pub) };
}

// --- Login / authentication ---

export async function prfLogin({ credentialId }: { credentialId?: string } = {}): Promise<{
  credentialId: string; priv: Uint8Array; pub: Uint8Array; pubHex: string;
}> {
  const nav = (typeof navigator !== 'undefined' ? navigator : null) as any;
  if (!nav?.credentials) {
    throw new Error('WebAuthn not available');
  }
  const g = globalThis as any;
  const rpId = typeof g.window !== 'undefined' ? g.window.location.hostname : 'localhost';
  const rawId = credentialId ? fromB64(credentialId) : undefined;
  const prfExtension = { prf: { eval: { first: PRF_SALT } } };
  const publicKey: any = rawId
    ? {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId, userVerification: 'required', timeout: 60000,
        allowCredentials: [{ type: 'public-key', id: rawId }],
        extensions: prfExtension,
      }
    : {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId, userVerification: 'required', timeout: 60000,
        allowCredentials: [],
        extensions: prfExtension,
      };
  const cred = await (nav.credentials as any).get({ publicKey, mediation: 'optional' });
  if (!cred) throw new Error('no passkey selected');
  const gotId = toB64(cred.rawId);
  const prfExt = cred.getClientExtensionResults()?.prf || {};
  let results = prfExt.results;
  if (!results && prfExt.resultsByCredential) {
    results = (credentialId && prfExt.resultsByCredential[credentialId]) || prfExt.resultsByCredential[gotId];
  }
  if (!results?.first) throw new Error('PRF result not returned');
  const raw = results.first;
  const priv = prfBytesToScalar(raw instanceof Uint8Array ? raw : new Uint8Array(raw));
  const pub = secp.getPublicKey(priv, true);
  return { credentialId: gotId, priv, pub, pubHex: secp.etc.bytesToHex(pub) };
}

// --- Availability check ---

export function isPasskeyAvailable(): boolean {
  const g = globalThis as any;
  if (typeof g.window === 'undefined') return false;
  try { return g.window.isSecureContext && !!g.window.PublicKeyCredential; } catch { return false; }
}

// --- Restore preferred entry ---

export interface PrfRestoreEntry {
  label: string;
  credentialId: string;
  pubkey: string;
}

export function prfTryRestore(): PrfRestoreEntry | null {
  const map = loadPrfMap();
  const labels = Object.keys(map);
  if (!labels.length) return null;
  labels.sort((a, b) => (map[b]?.lastUsed || 0) - (map[a]?.lastUsed || 0));
  const lbl = labels[0]!;
  const entry = map[lbl]!;
  return { label: lbl, credentialId: entry.credentialId, pubkey: entry.pubkey };
}
