// T_AXFER_VAR (0x37) — Variable-amount atomic settlement.
// N=2 exactly (recipient + maker change). asset_input_count=1.
// SPEC §5.7.9 / §5.7.6.1.
import { Opcode } from '../constants/opcodes.js';
import { ByteWriter } from '../envelope/payload.js';

export interface AXFERVarInput {
  assetId: Uint8Array;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export interface AXFERVarOutput {
  kind: 'axfer-var';
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export function encodeAXferVar(input: AXFERVarInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (input.outputs.length !== 2) throw new Error('T_AXFER_VAR outputs MUST be exactly 2 (recipient + maker change)');
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');
  const w = new ByteWriter();
  w.u8(Opcode.T_AXFER_VAR);
  w.push(input.assetId);
  w.u8(1); // asset_input_count = 1 (mandatory)
  w.push(input.kernelSig);
  w.u8(input.outputs.length);
  for (const o of input.outputs) {
    if (o.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
    if (o.encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
    w.push(o.commitment); w.push(o.encryptedAmount);
  }
  w.u16(input.rangeproof.length);
  w.push(input.rangeproof);
  return w.out();
}

export function decodeAXferVar(payload: Uint8Array): AXFERVarOutput | null {
  if (!payload || payload.length < 1 + 32 + 1 + 64 + 1 + (33 + 8) * 2 + 2) return null;
  if (payload[0] !== Opcode.T_AXFER_VAR) return null;
  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const assetInputCount = payload[p]!; p += 1;
  if (assetInputCount !== 1) return null; // T_AXFER_VAR: exactly 1 asset input
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (n !== 2) return null; // T_AXFER_VAR: exactly N=2
  const outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[] = [];
  for (let i = 0; i < n; i++) {
    if (p + 33 + 8 > payload.length) return null;
    outputs.push({
      commitment: payload.slice(p, p + 33),
      encryptedAmount: payload.slice(p + 33, p + 33 + 8),
    });
    p += 33 + 8;
  }
  if (p + 2 > payload.length) return null;
  const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + rpLen !== payload.length) return null;
  return { kind: 'axfer-var', assetId, assetInputCount, kernelSig, outputs, rangeproof: payload.slice(p, p + rpLen) };
}
