import { Opcode } from '../constants/opcodes.js';
import { concatBytes } from '@noble/hashes/utils';

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
  const { assetId, assetInputCount, kernelSig, outputs, rangeproof } = input;
  if (assetId.length !== 32) throw new Error('asset_id 32 bytes');
  if (!Number.isInteger(assetInputCount) || assetInputCount < 1 || assetInputCount > 255) {
    throw new Error('asset_input_count must be integer in [1, 255]');
  }
  if (!kernelSig || kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (![1, 2, 4, 8].includes(outputs.length)) throw new Error('outputs must be in {1,2,4,8}');
  if (rangeproof.length > 0xffff) throw new Error('rangeproof too large');
  const parts: Uint8Array[] = [
    new Uint8Array([Opcode.T_AXFER_BPP]),
    assetId,
    new Uint8Array([assetInputCount]),
    kernelSig,
    new Uint8Array([outputs.length]),
  ];
  for (const o of outputs) {
    if (o.commitment.length !== 33) throw new Error('commitment 33 bytes');
    if (!o.encryptedAmount || o.encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
    parts.push(o.commitment, o.encryptedAmount);
  }
  const rpLen = new Uint8Array(2);
  new DataView(rpLen.buffer).setUint16(0, rangeproof.length, true);
  parts.push(rpLen, rangeproof);
  return concatBytes(...parts);
}

export function decodeAXferBpp(payload: Uint8Array): AXFERBPPOutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 32 + 1 + 64 + 1 + (33 + 8) + 2) return null;
  if (payload[0] !== Opcode.T_AXFER_BPP) return null;
  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const assetInputCount = payload[p]!; p += 1;
  if (assetInputCount < 1) return null;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (![1, 2, 4, 8].includes(n)) return null;
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
  const rangeproof = payload.slice(p, p + rpLen);
  return { kind: 'axfer-bpp', assetId, assetInputCount, kernelSig, outputs, rangeproof };
}
