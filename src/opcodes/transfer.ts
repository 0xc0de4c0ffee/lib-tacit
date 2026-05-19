// CXFER (0x23) — Confidential transfer.
// Wire format: CXFER(1) || asset_id(32) || kernel_sig(64) || N(1) ||
//   (C_i(33) || amount_ct_i(8))*N || rp_len(2) || rangeproof(rp_len)
// N ∈ {1, 2, 4, 8}. Aggregated bulletproof covers all N outputs.
// SPEC §5.2

import { Opcode } from '../constants/opcodes.js';
import { BP_AGG_CAPS } from '../constants/limits.js';
import { ByteWriter } from '../envelope/payload.js';

export interface Output {
  commitment: Uint8Array;      // 33 bytes compressed point
  encryptedAmount: Uint8Array; // 8 bytes
}

export interface CXFERInput {
  assetId: Uint8Array;    // 32 bytes
  kernelSig: Uint8Array;  // 64 bytes BIP-340
  outputs: Output[];
  rangeproof: Uint8Array;
}

export interface CXFEROutput {
  kind: 'cxfer';
  assetId: Uint8Array;
  kernelSig: Uint8Array;
  outputs: Output[];
  rangeproof: Uint8Array;
}

const VALID_N: Set<number> = new Set(BP_AGG_CAPS);

export function encodeCXfer(input: CXFERInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (!VALID_N.has(input.outputs.length)) throw new Error(`outputs.length must be in {1,2,4,8}, got ${input.outputs.length}`);
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');

  const w = new ByteWriter();
  w.u8(Opcode.T_CXFER);
  w.push(input.assetId);
  w.push(input.kernelSig);
  w.u8(input.outputs.length);
  for (const o of input.outputs) {
    if (o.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
    if (!o.encryptedAmount || o.encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
    w.push(o.commitment);
    w.push(o.encryptedAmount);
  }
  w.u16(input.rangeproof.length);
  w.push(input.rangeproof);
  return w.out();
}

export function decodeCXfer(payload: Uint8Array): CXFEROutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 32 + 64 + 1 + (33 + 8) + 2) return null;
  if (payload[0] !== Opcode.T_CXFER) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (!VALID_N.has(n)) return null;

  const outputs: Output[] = [];
  for (let i = 0; i < n; i++) {
    if (p + 33 + 8 > payload.length) return null;
    const commitment = payload.slice(p, p + 33); p += 33;
    const encryptedAmount = payload.slice(p, p + 8); p += 8;
    outputs.push({ commitment, encryptedAmount });
  }

  if (p + 2 > payload.length) return null;
  const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + rpLen !== payload.length) return null;
  const rangeproof = payload.slice(p, p + rpLen);

  return { kind: 'cxfer', assetId, kernelSig, outputs, rangeproof };
}
