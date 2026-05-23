// T_AXFER_BPP (0x3C) — Atomic settlement with Bulletproofs+.
// Drafted per SPEC-AXFER-BPP-AMENDMENT.

import { Opcode } from '../constants/opcodes.js';

export interface AXFERBPPInput {
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export interface AXFERBPPOutput {
  kind: 'axfer-bpp';
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export function encodeAXferBpp(input: AXFERBPPInput): Uint8Array {
  throw new Error('T_AXFER_BPP: not yet implemented');
}

export function decodeAXferBpp(payload: Uint8Array): AXFERBPPOutput | null {
  if (!payload || payload.length < 1) return null;
  if (payload[0] !== Opcode.T_AXFER_BPP) return null;
  return null;
}
