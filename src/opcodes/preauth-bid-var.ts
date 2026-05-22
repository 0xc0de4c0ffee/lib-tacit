// T_PREAUTH_BID_VAR (0x5C) — Variable-amount preauth-bid (partial-fill).
// SPEC-PREAUTH-BID-VAR-AMENDMENT §5.7.12 (shipped).
// Wire format (from dapp/tacit.js encodePreauthBidVarPayload):
//   op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
//   recipientPubkey(33) || pricePerUnit_LE(8) || maxFill_LE(8) ||
//   fillIncrement_LE(8) || fillAmount_LE(8) || recipientBlinding(32) ||
//   refundScriptHash(20) || decimalsScale(1) || kernelSig(64) ||
//   N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
//   rp_len(2) || rangeproof(rp_len)

import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import { ByteWriter, readU64LE, u64LE } from '../envelope/payload.js';

const PREAUTH_BID_VAR_MAX_DECIMALS_SCALE = 32;

export interface PreauthBidVarOutput {
  commitment: Uint8Array;
  encryptedAmount?: Uint8Array;
}

export interface PreauthBidVarInput {
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  pricePerUnit: bigint;
  maxFill: bigint;
  fillIncrement: bigint;
  fillAmount: bigint;
  recipientBlinding: Uint8Array;
  refundScriptHash: Uint8Array;
  decimalsScale: number;
  kernelSig: Uint8Array;
  outputs: [PreauthBidVarOutput, PreauthBidVarOutput?];
  rangeproof: Uint8Array;
}

export interface PreauthBidVarDecoded {
  kind: 'preauth-bid-var';
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  pricePerUnit: bigint;
  maxFill: bigint;
  fillIncrement: bigint;
  fillAmount: bigint;
  recipientBlinding: Uint8Array;
  refundScriptHash: Uint8Array;
  decimalsScale: number;
  kernelSig: Uint8Array;
  outputs: PreauthBidVarOutput[];
  rangeproof: Uint8Array;
}

export function encodePreauthBidVar(input: PreauthBidVarInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (!Number.isInteger(input.assetInputCount) || input.assetInputCount < 1 || input.assetInputCount > 255) {
    throw new Error('asset_input_count must be integer in [1, 255]');
  }
  if (!input.bidId || input.bidId.length !== 16) throw new Error('bid_id must be 16 bytes');
  if (!input.recipientPubkey || input.recipientPubkey.length !== 33) throw new Error('recipient_pubkey must be 33 bytes');
  if (!input.recipientBlinding || input.recipientBlinding.length !== 32) throw new Error('recipient_blinding must be 32 bytes');
  if (!input.refundScriptHash || input.refundScriptHash.length !== 20) throw new Error('refund_script_hash must be 20 bytes');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (![1, 2].includes(input.outputs.length)) throw new Error('T_PREAUTH_BID_VAR outputs must be 1 (no seller change) or 2 (seller change)');
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');
  if (input.pricePerUnit <= 0n) throw new Error('price_per_unit must be positive');
  if (input.maxFill <= 0n) throw new Error('max_fill must be positive');
  if (input.fillIncrement <= 0n) throw new Error('fill_increment must be positive');
  if (input.fillAmount <= 0n) throw new Error('fill_amount must be positive');
  if (input.fillAmount > input.maxFill) throw new Error('fill_amount must be <= max_fill');
  if (!Number.isInteger(input.decimalsScale) || input.decimalsScale < 0 || input.decimalsScale > PREAUTH_BID_VAR_MAX_DECIMALS_SCALE) {
    throw new Error(`decimals_scale must be integer in [0, ${PREAUTH_BID_VAR_MAX_DECIMALS_SCALE}]`);
  }

  const w = new ByteWriter();
  w.u8(Opcode.T_PREAUTH_BID_VAR);
  w.push(input.assetId);
  w.u8(input.assetInputCount);
  w.push(input.bidId);
  w.push(input.recipientPubkey);
  w.u64(input.pricePerUnit);
  w.u64(input.maxFill);
  w.u64(input.fillIncrement);
  w.u64(input.fillAmount);
  w.push(input.recipientBlinding);
  w.push(input.refundScriptHash);
  w.u8(input.decimalsScale & 0xff);
  w.push(input.kernelSig);
  w.u8(input.outputs.length);

  if (input.outputs[0]!.commitment.length !== 33) throw new Error('output[0].commitment must be 33 bytes');
  w.push(input.outputs[0]!.commitment);

  if (input.outputs.length === 2) {
    const change = input.outputs[1]!;
    if (change.commitment.length !== 33) throw new Error('output[1].commitment must be 33 bytes');
    if (!change.encryptedAmount || change.encryptedAmount.length !== 8) {
      throw new Error('output[1].encrypted_amount must be 8 bytes');
    }
    w.push(change.commitment);
    w.push(change.encryptedAmount);
  }

  w.u16(input.rangeproof.length);
  w.push(input.rangeproof);
  return w.out();
}

export function decodePreauthBidVar(payload: Uint8Array): PreauthBidVarDecoded | null {
  if (!payload) return null;
  // Min size (N=1): op(1) + assetId(32) + assetInputCount(1) +
  //   inline(16+33+8+8+8+8+32+20+1=134) + kernelSig(64) + N(1) + C(33) + rp_len(2) = 268
  const MIN = 1 + 32 + 1 + 134 + 64 + 1 + 33 + 2;
  if (payload.length < MIN) return null;
  if (payload[0] !== Opcode.T_PREAUTH_BID_VAR) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const assetInputCount = payload[p]!; p += 1;
  if (assetInputCount < 1) return null;

  const bidId = payload.slice(p, p + 16); p += 16;
  const recipientPubkey = payload.slice(p, p + 33); p += 33;
  const pricePerUnit = readU64LE(payload, p); p += 8;
  const maxFill = readU64LE(payload, p); p += 8;
  const fillIncrement = readU64LE(payload, p); p += 8;
  const fillAmount = readU64LE(payload, p); p += 8;
  const recipientBlinding = payload.slice(p, p + 32); p += 32;
  const refundScriptHash = payload.slice(p, p + 20); p += 20;
  const decimalsScale = payload[p]!; p += 1;
  if (decimalsScale > PREAUTH_BID_VAR_MAX_DECIMALS_SCALE) return null;

  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (n !== 1 && n !== 2) return null;

  const outputs: PreauthBidVarOutput[] = [];
  if (p + 33 > payload.length) return null;
  outputs.push({ commitment: payload.slice(p, p + 33) }); p += 33;

  if (n === 2) {
    if (p + 33 + 8 > payload.length) return null;
    const commitment = payload.slice(p, p + 33); p += 33;
    const encryptedAmount = payload.slice(p, p + 8); p += 8;
    outputs.push({ commitment, encryptedAmount });
  }

  if (p + 2 > payload.length) return null;
  const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + rpLen !== payload.length) return null;
  const rangeproof = payload.slice(p, p + rpLen);

  if (fillAmount === 0n || fillAmount > maxFill) return null;

  return {
    kind: 'preauth-bid-var',
    assetId, assetInputCount,
    bidId, recipientPubkey,
    pricePerUnit, maxFill, fillIncrement, fillAmount,
    recipientBlinding, refundScriptHash, decimalsScale,
    kernelSig, outputs, rangeproof,
  };
}

export function computePreauthBidVarContextHash(params: {
  assetId: Uint8Array;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  pricePerUnit: bigint;
  maxFill: bigint;
  fillIncrement: bigint;
  fillAmount: bigint;
  refundScriptHash: Uint8Array;
  decimalsScale: number;
}): Uint8Array {
  if (params.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (params.bidId.length !== 16) throw new Error('bid_id must be 16 bytes');
  if (params.recipientPubkey.length !== 33) throw new Error('recipient_pubkey must be 33 bytes');
  if (params.refundScriptHash.length !== 20) throw new Error('refund_script_hash must be 20 bytes');
  if (!Number.isInteger(params.decimalsScale) || params.decimalsScale < 0 || params.decimalsScale > PREAUTH_BID_VAR_MAX_DECIMALS_SCALE) {
    throw new Error(`decimals_scale must be integer in [0, ${PREAUTH_BID_VAR_MAX_DECIMALS_SCALE}]`);
  }

  return sha256(concatBytes(
    new TextEncoder().encode('tacit-preauth-bid-var-context-v1'),
    params.assetId,
    params.bidId,
    params.recipientPubkey,
    u64LE(params.pricePerUnit),
    u64LE(params.maxFill),
    u64LE(params.fillIncrement),
    u64LE(params.fillAmount),
    params.refundScriptHash,
    new Uint8Array([params.decimalsScale & 0xff]),
  ));
}
