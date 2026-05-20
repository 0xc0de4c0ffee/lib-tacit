// T_AXFER (0x26) — Atomic OTC settlement (CXFER variant).
// Wire format: T_AXFER(1) || asset_id(32) || asset_input_count(1) ||
//   kernel_sig(64) || N(1) || (C_i(33) || amount_ct_i(8))*N || rp_len(2) || rangeproof
// SPEC §5.7

import { Opcode } from '../constants/opcodes.js';
import { BP_AGG_CAPS } from '../constants/limits.js';
import { ByteWriter } from '../envelope/payload.js';
import type { Output } from './transfer.js';

export interface AXFERInput {
  assetId: Uint8Array;
  assetInputCount: number;  // how many of vin[1..] are tacit asset inputs
  kernelSig: Uint8Array;
  outputs: Output[];
  rangeproof: Uint8Array;
}

export interface AXFEROutput {
  kind: 'axfer';
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: Output[];
  rangeproof: Uint8Array;
}

const VALID_N: Set<number> = new Set(BP_AGG_CAPS);

export function encodeAXfer(input: AXFERInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.assetInputCount < 1 || input.assetInputCount > 255) throw new Error('asset_input_count 1-255');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (!VALID_N.has(input.outputs.length)) throw new Error(`outputs must be in {1,2,4,8}`);
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');

  const w = new ByteWriter();
  w.u8(Opcode.T_AXFER);
  w.push(input.assetId);
  w.u8(input.assetInputCount);
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

export function decodeAXfer(payload: Uint8Array): AXFEROutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 32 + 1 + 64 + 1 + (33 + 8) + 2) return null;
  if (payload[0] !== Opcode.T_AXFER) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const assetInputCount = payload[p]!; p += 1;
  if (assetInputCount < 1 || assetInputCount > 255) return null;
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

  return { kind: 'axfer', assetId, assetInputCount, kernelSig, outputs, rangeproof };
}
