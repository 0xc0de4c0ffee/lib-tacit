// T_AXFER_VAR_BPP (0x3D) — Variable-amount atomic settlement with Bulletproofs+.
// Drafted per SPEC-AXFER-BPP-AMENDMENT.

import { Opcode } from '../constants/opcodes.js';

export interface AXFERVarBPPInput {
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export interface AXFERVarBPPOutput {
  kind: 'axfer-var-bpp';
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export function encodeAXferVarBpp(input: AXFERVarBPPInput): Uint8Array {
  throw new Error('T_AXFER_VAR_BPP: not yet implemented');
}

export function decodeAXferVarBpp(payload: Uint8Array): AXFERVarBPPOutput | null {
  if (!payload || payload.length < 1) return null;
  if (payload[0] !== Opcode.T_AXFER_VAR_BPP) return null;
  return null;
}
