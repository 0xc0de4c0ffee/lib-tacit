// T_BURN (0x25) — Any holder destroys part or all of their balance.
// Wire format: T_BURN(1) || asset_id(32) || burned_amount_LE(8) ||
//   kernel_sig(64) || N(1) || (C_i(33) || amount_ct_i(8))*N ||
//   [rp_len(2) || rangeproof(rp_len)]  (omitted if N=0)
// N ∈ {0, 1, 2, 4, 8}. Burn amount is public so observers audit supply reduction.
// SPEC §5.4

import { Opcode } from '../constants/opcodes.js';
import { BP_AGG_CAPS } from '../constants/limits.js';
import { ByteWriter, u64LE } from '../envelope/payload.js';

export interface Output {
  commitment: Uint8Array;
  encryptedAmount: Uint8Array;
}

export interface CBurnInput {
  assetId: Uint8Array;       // 32 bytes
  burnedAmount: bigint;      // u64, public
  kernelSig: Uint8Array;     // 64 bytes BIP-340
  outputs: Output[];         // change outputs (empty = full burn)
  rangeproof: Uint8Array;    // omitted if N=0
}

export interface CBurnOutput {
  kind: 'cburn';
  assetId: Uint8Array;
  burnedAmount: bigint;
  kernelSig: Uint8Array;
  outputs: Output[];
  rangeproof: Uint8Array;
}

const VALID_N_BURN: Set<number> = new Set([0, ...BP_AGG_CAPS]);
const N_BITS = 64;

export function encodeCBurn(input: CBurnInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.burnedAmount < 0n || input.burnedAmount >= (1n << BigInt(N_BITS))) {
    throw new Error('burned_amount out of u64 range');
  }
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (!VALID_N_BURN.has(input.outputs.length)) {
    throw new Error(`outputs.length must be in {0,1,2,4,8}, got ${input.outputs.length}`);
  }
  if (input.outputs.length > 0 && input.rangeproof.length > 0xffff) {
    throw new Error('rangeproof too large');
  }

  const w = new ByteWriter();
  w.u8(Opcode.T_BURN);
  w.push(input.assetId);
  w.push(u64LE(input.burnedAmount));
  w.push(input.kernelSig);
  w.u8(input.outputs.length);

  for (const o of input.outputs) {
    if (o.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
    if (!o.encryptedAmount || o.encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
    w.push(o.commitment);
    w.push(o.encryptedAmount);
  }

  if (input.outputs.length > 0) {
    w.u16(input.rangeproof.length);
    w.push(input.rangeproof);
  }

  return w.out();
}

export function decodeCBurn(payload: Uint8Array): CBurnOutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 32 + 8 + 64 + 1) return null;
  if (payload[0] !== Opcode.T_BURN) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;

  const burnedLE = payload.slice(p, p + 8); p += 8;
  const view = new DataView(burnedLE.buffer, burnedLE.byteOffset, 8);
  const burnedAmount = (BigInt(view.getUint32(4, true)) << 32n) | BigInt(view.getUint32(0, true));

  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (!VALID_N_BURN.has(n)) return null;

  const outputs: Output[] = [];
  for (let i = 0; i < n; i++) {
    if (p + 33 + 8 > payload.length) return null;
    const commitment = payload.slice(p, p + 33); p += 33;
    const encryptedAmount = payload.slice(p, p + 8); p += 8;
    outputs.push({ commitment, encryptedAmount });
  }

  let rangeproof = new Uint8Array(0);
  if (n > 0) {
    if (p + 2 > payload.length) return null;
    const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
    if (p + rpLen !== payload.length) return null;
    rangeproof = payload.slice(p, p + rpLen);
  } else {
    if (p !== payload.length) return null;
  }

  return { kind: 'cburn', assetId, burnedAmount, kernelSig, outputs, rangeproof };
}
