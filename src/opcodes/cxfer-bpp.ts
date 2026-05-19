// T_CXFER_BPP (0x22) — Confidential transfer with Bulletproofs+ aggregated rangeproof.
// Byte-identical to T_CXFER (0x23) except for the opcode byte and the rangeproof
// uses Bulletproofs+ (~14% smaller witness). SPEC §5.21.
import { Opcode } from '../constants/opcodes.js';
import { BP_AGG_CAPS } from '../constants/limits.js';
import { ByteWriter } from '../envelope/payload.js';

const VALID_N: Set<number> = new Set(BP_AGG_CAPS);

export interface CXFERBPPInput {
  assetId: Uint8Array;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export interface CXFERBPPOutput {
  kind: 'cxfer-bpp';
  assetId: Uint8Array;
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[];
  rangeproof: Uint8Array;
}

export function encodeCXferBpp(input: CXFERBPPInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (!VALID_N.has(input.outputs.length)) throw new Error(`outputs must be in {1,2,4,8}`);
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');
  const w = new ByteWriter();
  w.u8(Opcode.T_CXFER_BPP);
  w.push(input.assetId);
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

export function decodeCXferBpp(payload: Uint8Array): CXFERBPPOutput | null {
  if (!payload || payload.length < 1 + 32 + 64 + 1 + (33 + 8) + 2) return null;
  if (payload[0] !== Opcode.T_CXFER_BPP) return null;
  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (!VALID_N.has(n)) return null;
  const outputs: { commitment: Uint8Array; encryptedAmount: Uint8Array }[] = [];
  for (let i = 0; i < n; i++) {
    if (p + 33 + 8 > payload.length) return null;
    const commitment = payload.slice(p, p + 33); p += 33;
    const encryptedAmount = payload.slice(p, p + 8); p += 8;
    outputs.push({ commitment, encryptedAmount });
  }
  if (p + 2 > payload.length) return null;
  const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + rpLen !== payload.length) return null;
  return { kind: 'cxfer-bpp', assetId, kernelSig, outputs, rangeproof: payload.slice(p, p + rpLen) };
}
