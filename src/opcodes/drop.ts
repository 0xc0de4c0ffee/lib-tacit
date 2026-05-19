// T_DROP (0x2B) — Lock existing supply into a public-claim pool.
// Standard shape (per_claim > 0):
//   T_DROP(1) || asset_id(32) || cap_amount_LE(8) || per_claim_LE(8) ||
//   merkle_root(32) || expiry_height_LE(4) || ticker_len(1) || ticker(tlen) ||
//   decimals(1) || asset_input_count(1) || kernel_sig(64)
// Reclaim shape (per_claim = 0 sentinel; SPEC §5.12.1):
//   T_DROP(1) || asset_id(32) || cap_amount_LE(8) || per_claim_LE(8)=0 ||
//   reclaim_drop_id(32) || reclaim_sig(64) || cap_blinding(32)
// SPEC §5.12

import { Opcode } from '../constants/opcodes.js';
import { TICKER_MAX_LEN, DECIMALS_MAX } from '../constants/limits.js';
import { ByteWriter, u64LE, readU64LE } from '../envelope/payload.js';

// --- Standard drop shape ---

export interface CDropInput {
  assetId: Uint8Array;
  capAmount: bigint;
  perClaim: bigint;
  merkleRoot: Uint8Array;
  expiryHeight: number;
  ticker?: string | null;
  decimals?: number;
  assetInputCount: number;
  kernelSig: Uint8Array;
}

export interface CDropOutput {
  kind: 'cdrop';
  assetId: Uint8Array;
  capAmount: bigint;
  perClaim: bigint;
  merkleRoot: Uint8Array;
  expiryHeight: number;
  ticker: string | null;
  decimals: number;
  assetInputCount: number;
  kernelSig: Uint8Array;
}

// --- Reclaim shape (SPEC §5.12.1) ---

export interface CDropReclaimInput {
  assetId: Uint8Array;
  capAmount: bigint;
  reclaimDropId: Uint8Array; // 32 bytes
  reclaimSig: Uint8Array;    // 64 bytes BIP-340
  capBlinding: Uint8Array;   // 32 bytes, non-zero
}

export interface CDropReclaimOutput {
  kind: 'cdrop-reclaim';
  assetId: Uint8Array;
  capAmount: bigint;
  reclaimDropId: Uint8Array;
  reclaimSig: Uint8Array;
  capBlinding: Uint8Array;
}

export type DecodedDrop = CDropOutput | CDropReclaimOutput;

// --- Standard drop encoder ---

export function encodeCDrop(input: CDropInput): Uint8Array {
  const cap = BigInt(input.capAmount);
  const per = BigInt(input.perClaim);
  if (cap <= 0n || cap >= (1n << 64n)) throw new Error('cap_amount out of u64');
  if (per <= 0n || per >= (1n << 64n)) throw new Error('per_claim out of u64');
  if (cap % per !== 0n) throw new Error('cap_amount must be divisible by per_claim');
  if (input.merkleRoot.length !== 32) throw new Error('merkle_root must be 32 bytes');
  if (!Number.isInteger(input.expiryHeight) || input.expiryHeight < 0 || input.expiryHeight > 0xffffffff) {
    throw new Error('expiry_height out of range');
  }
  const dec = input.decimals ?? 0;
  if (dec < 0 || dec > DECIMALS_MAX) throw new Error('decimals 0–8');
  if (input.assetInputCount < 1 || input.assetInputCount > 16) throw new Error('asset_input_count 1–16');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');

  const tk = input.ticker ? new TextEncoder().encode(input.ticker) : new Uint8Array(0);
  if (tk.length > TICKER_MAX_LEN) throw new Error('ticker too long');

  const w = new ByteWriter();
  w.u8(Opcode.T_DROP);
  w.push(input.assetId);
  w.push(u64LE(cap));
  w.push(u64LE(per));
  w.push(input.merkleRoot);
  w.u32(input.expiryHeight);
  w.u8(tk.length);
  w.push(tk);
  w.u8(dec);
  w.u8(input.assetInputCount);
  w.push(input.kernelSig);
  return w.out();
}

// --- Reclaim encoder (SPEC §5.12.1) ---

export function encodeCDropReclaim(input: CDropReclaimInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  const cap = BigInt(input.capAmount);
  if (cap <= 0n || cap >= (1n << 64n)) throw new Error('cap_amount out of u64');
  if (!input.reclaimDropId || input.reclaimDropId.length !== 32) throw new Error('reclaim_drop_id must be 32 bytes');
  if (!input.reclaimSig || input.reclaimSig.length !== 64) throw new Error('reclaim_sig must be 64 bytes');
  if (!input.capBlinding || input.capBlinding.length !== 32) throw new Error('cap_blinding must be 32 bytes');
  let bNonZero = false;
  for (let i = 0; i < 32; i++) if (input.capBlinding[i] !== 0) { bNonZero = true; break; }
  if (!bNonZero) throw new Error('cap_blinding must be non-zero');

  const w = new ByteWriter();
  w.u8(Opcode.T_DROP);
  w.push(input.assetId);
  w.push(u64LE(cap));
  w.push(u64LE(0n)); // per_claim = 0 sentinel
  w.push(input.reclaimDropId);
  w.push(input.reclaimSig);
  w.push(input.capBlinding);
  return w.out();
}

// --- Decoder (handles both standard and reclaim) ---

export function decodeCDrop(payload: Uint8Array): DecodedDrop | null {
  if (!payload) return null;
  if (payload.length < 152) return null;
  if (payload[0] !== Opcode.T_DROP) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;

  const capAmount = readU64LE(payload, p); p += 8;
  const perClaim = readU64LE(payload, p); p += 8;

  if (capAmount <= 0n || capAmount >= (1n << 64n)) return null;

  // Reclaim shape (per_claim = 0 sentinel)
  if (perClaim === 0n) {
    if (payload.length !== 1 + 32 + 8 + 8 + 32 + 64 + 32) return null;
    const reclaimDropId = payload.slice(p, p + 32); p += 32;
    const reclaimSig = payload.slice(p, p + 64); p += 64;
    const capBlinding = payload.slice(p, p + 32); p += 32;
    if (p !== payload.length) return null;
    let bNonZero = false;
    for (let i = 0; i < 32; i++) if (capBlinding[i] !== 0) { bNonZero = true; break; }
    if (!bNonZero) return null;
    return { kind: 'cdrop-reclaim', assetId, capAmount, reclaimDropId, reclaimSig, capBlinding };
  }

  // Standard drop shape
  if (perClaim >= (1n << 64n)) return null;
  if (capAmount % perClaim !== 0n) return null;

  const merkleRoot = payload.slice(p, p + 32); p += 32;

  const expLE = payload.slice(p, p + 4); p += 4;
  const ev = new DataView(expLE.buffer, expLE.byteOffset, 4);
  const expiryHeight = ev.getUint32(0, true);

  if (p + 1 > payload.length) return null;
  const tlen = payload[p]!; p += 1;
  if (tlen > TICKER_MAX_LEN) return null;
  if (p + tlen + 1 + 1 + 64 > payload.length) return null;

  let ticker: string | null = null;
  if (tlen > 0) {
    try { ticker = new TextDecoder('utf-8', { fatal: true }).decode(payload.slice(p, p + tlen)); } catch { return null; }
  }
  p += tlen;

  const decimals = payload[p]!; p += 1;
  if (decimals > DECIMALS_MAX) return null;

  const assetInputCount = payload[p]!; p += 1;
  if (assetInputCount < 1 || assetInputCount > 16) return null;

  const kernelSig = payload.slice(p, p + 64); p += 64;
  if (p !== payload.length) return null;

  return { kind: 'cdrop', assetId, capAmount, perClaim, merkleRoot, expiryHeight, ticker, decimals, assetInputCount, kernelSig };
}
