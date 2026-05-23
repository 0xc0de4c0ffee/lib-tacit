// Verified IPFS content fetching with @helia/verified-fetch + CID integrity.
//
// Always uses CIDv1 (base32, bafy...) as the canonical format internally.
// CIDv0 (Qm...) inputs are automatically converted to CIDv1.
//
// Unlike tacit-specs/dapp which uses raw HTTP gateways with client-side
// re-validation, this module uses @helia/verified-fetch for trustless,
// content-addressed retrieval via libp2p routing + trustless gateways.
//
// The fallback `ipfsFetchViaGateway` reimplements the tacit-specs pattern
// (multi-gateway with client-side CID check) for environments without
// full libp2p support. `ipfsCidMatches` is the shared CID verification
// used in both paths.

import { sha256 } from '@noble/hashes/sha256';
import { base58 } from '@scure/base';

const DEFAULT_GATEWAYS: string[] = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

const CID_V0_PREFIX = 0x12; // sha2-256 multihash code
const CID_V0_LENGTH = 0x20; // 32-byte digest
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

// Lazily-initialized singleton for @helia/verified-fetch.
let _verifiedFetch: import('@helia/verified-fetch').VerifiedFetch | null = null;
let _initPromise: Promise<void> | null = null;

export interface IpfsFetchResult {
  bytes: Uint8Array;
  cid: string;
  source: string;
}

export interface IpfsVerifiedFetchOpts {
  gateways?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
  preferGateway?: boolean; // skip helia, use direct gateway fetch
}

// ── CID helpers ──────────────────────────────────────────────────────────

function cidVersion(cid: string): 0 | 1 | null {
  if (cid.startsWith('Qm') && cid.length === 46) return 0;
  if (cid.startsWith('b') && cid.length > 32 && /^[a-z0-9]+$/.test(cid)) return 1;
  return null;
}

// Convert CIDv0 (Qm...) to CIDv1 (bafkrei...).
// CIDv0 = base58(multihash(0x12 0x20 + sha256(contents)))
// CIDv1 = multibase(b) + base32(cidv1(1) + raw-codec(0x55) + multihash(0x12 0x20 + sha256(contents)))
// Since we don't have the contents at conversion time, we reconstruct
// the CIDv1 from the CIDv0's embedded multihash bytes.
export function cidToV1(cid: string): string {
  if (cidVersion(cid) === 1) return cid;
  if (cidVersion(cid) !== 0) throw new Error(`not a valid CID: ${cid}`);
  // Decode the multihash from CIDv0
  const mh = base58.decode(cid);
  if (mh.length !== 34 || mh[0] !== CID_V0_PREFIX || mh[1] !== CID_V0_LENGTH) {
    throw new Error(`CIDv0 has unexpected multihash: ${cid}`);
  }
  // Build CIDv1 binary: version(1) + raw-codec(0x55) + multihash(34 bytes)
  // Then encode as base32 with 'b' prefix (lowercase, no padding).
  const digest = mh.slice(2, 34);
  const raw = new Uint8Array([1, 0x55, ...mh]);
  const b32 = 'abcdefghijklmnopqrstuvwxyz234567';
  // Encode raw bytes as base32 (unpadded)
  const data5: number[] = [];
  let acc = 0, bits = 0;
  for (const b of raw) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) { bits -= 5; data5.push((acc >>> bits) & 31); }
  }
  if (bits > 0) data5.push((acc << (5 - bits)) & 31);
  return 'b' + data5.map(v => b32[v]!).join('');
}

function verifyCidV0(cid: string, bytes: Uint8Array): boolean {
  const digest = sha256(bytes);
  const mh = new Uint8Array(34);
  mh[0] = CID_V0_PREFIX;
  mh[1] = CID_V0_LENGTH;
  mh.set(digest, 2);
  return base58.encode(mh) === cid;
}

function verifyCidV1(cid: string, bytes: Uint8Array): boolean {
  const b32 = 'abcdefghijklmnopqrstuvwxyz234567';
  const digest = sha256(bytes);
  try {
    const decoded = cid.startsWith('b') ? cid.slice(1) : cid;
    const data: number[] = [];
    for (const ch of decoded) {
      const idx = b32.indexOf(ch);
      if (idx === -1) return false;
      data.push(idx);
    }
    const out: number[] = [];
    let acc = 0, bits = 0;
    for (const v of data) { acc = (acc << 5) | v; bits += 5; if (bits >= 8) { bits -= 8; out.push((acc >>> bits) & 0xff); } }
    if (out.length < 36) return false;
    let pos = 1;
    while (pos < out.length && (out[pos]! & 0x80) !== 0) pos++;
    pos++;
    if (pos + 34 > out.length) return false;
    if (out[pos] !== 0x12 || out[pos + 1] !== 0x20) return false;
    for (let i = 0; i < 32; i++) if (out[pos + 2 + i] !== digest[i]!) return false;
    return true;
  } catch { return false; }
}

// ── CID verification ─────────────────────────────────────────────────────

export function ipfsCidMatches(cid: string, bytes: Uint8Array): boolean {
  if (!cid || !bytes.length) return false;
  if (cid.startsWith('Qm') && cid.length === 46) return verifyCidV0(cid, bytes);
  if (cid.startsWith('b')) return verifyCidV1(cid, bytes);
  return false;
}

// ── @helia/verified-fetch integration ────────────────────────────────────

async function initVerifiedFetch(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const { createVerifiedFetch } = await import('@helia/verified-fetch');
      _verifiedFetch = await createVerifiedFetch({
        gateways: DEFAULT_GATEWAYS,
        routers: ['http://delegated-ipfs.dev'],
      });
    } catch (err) {
      _verifiedFetch = null;
      _initPromise = null;
      throw err;
    }
  })();
  return _initPromise;
}

// Fetch via @helia/verified-fetch (trustless, p2p + gateway routing).
async function fetchViaHelia(cid: string, signal?: AbortSignal): Promise<Uint8Array> {
  if (!_verifiedFetch) await initVerifiedFetch();
  const url = `ipfs://${cid}`;
  const resp = await _verifiedFetch!(url, { signal });
  if (!resp.ok) throw new Error(`helia fetch ${cid}: HTTP ${resp.status}`);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

// Fetch via HTTP gateway with fallback and client-side CID verification.
async function fetchViaGateway(
  cid: string,
  gateways: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const errors: { gateway: string; error: string }[] = [];
  for (const gw of gateways) {
    const url = `${gw}${cid}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
      const resp = await fetch(url, { signal: combinedSignal, cache: 'force-cache' });
      clearTimeout(timer);
      if (!resp.ok) { errors.push({ gateway: gw, error: `HTTP ${resp.status}` }); continue; }
      const reader = resp.body?.getReader();
      if (!reader) { errors.push({ gateway: gw, error: 'no readable body' }); continue; }
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_RESPONSE_BYTES) { errors.push({ gateway: gw, error: 'response too large' }); continue; }
        chunks.push(value);
      }
      let bytes: Uint8Array;
      if (chunks.length === 1) bytes = chunks[0]!;
      else { bytes = new Uint8Array(total); let off = 0; for (const c of chunks) { bytes.set(c, off); off += c.length; } }
      if (!ipfsCidMatches(cid, bytes)) {
        errors.push({ gateway: gw, error: 'CID mismatch — gateway substitution detected' });
        continue;
      }
      return bytes;
    } catch (err: any) {
      errors.push({ gateway: gw, error: err?.message ?? String(err) });
    }
  }
  const detail = errors.map(e => `  ${e.gateway}: ${e.error}`).join('\n');
  throw new Error(`all ${gateways.length} IPFS gateways failed for ${cid}:\n${detail}`);
}

// ── Public API ───────────────────────────────────────────────────────────

export async function ipfsFetchVerified(
  cid: string,
  opts: IpfsVerifiedFetchOpts = {},
): Promise<IpfsFetchResult> {
  const gateways = opts.gateways ?? DEFAULT_GATEWAYS;
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  const ver = cidVersion(cid);
  if (ver === null) throw new Error(`unrecognized CID format: ${cid}`);

  // Always canonicalize to CIDv1 for internal operations.
  const cidV1 = ver === 0 ? cidToV1(cid) : cid;

  let bytes: Uint8Array;
  let source: string;

  if (opts.preferGateway) {
    bytes = await fetchViaGateway(cid, gateways, timeoutMs, opts.signal);
    source = 'gateway';
  } else {
    // Try helia first, fall back to gateway.
    try {
      bytes = await fetchViaHelia(cidV1, opts.signal);
      source = 'helia';
    } catch {
      bytes = await fetchViaGateway(cid, gateways, timeoutMs, opts.signal);
      source = 'gateway';
    }
  }

  return { bytes, cid: cidV1, source };
}

export async function ipfsFetchBatch(
  cids: string[],
  opts: IpfsVerifiedFetchOpts = {},
): Promise<Map<string, Uint8Array>> {
  const results = await Promise.allSettled(cids.map(c => ipfsFetchVerified(c, opts)));
  const map = new Map<string, Uint8Array>();
  for (let i = 0; i < cids.length; i++) {
    const r = results[i]!;
    if (r.status === 'fulfilled') map.set(cids[i]!, r.value.bytes);
  }
  return map;
}
