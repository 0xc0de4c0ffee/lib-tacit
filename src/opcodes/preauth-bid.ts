// T_PREAUTH_BID (0x5B) — Buyer-offline preauth bid.
// SPEC-PREAUTH-BID-AMENDMENT §5.7.11 (shipped).
// Wire format (from dapp/tacit.js encodePreauthBidPayload):
//   op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
//   recipientPubkey(33) || amount_LE(8) || blinding(32) || priceSats_LE(8) ||
//   kernelSig(64) || N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
//   rp_len(2) || rangeproof(rp_len)

import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import { ByteWriter, readU64LE, u64LE } from '../envelope/payload.js';

export interface PreauthBidOutput {
  commitment: Uint8Array;
  encryptedAmount?: Uint8Array | null;
}

export interface PreauthBidInput {
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
  priceSats: bigint;
  kernelSig: Uint8Array;
  outputs: [PreauthBidOutput, PreauthBidOutput?];
  rangeproof: Uint8Array;
}

export interface PreauthBidDecoded {
  kind: 'preauth-bid';
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
  priceSats: bigint;
  kernelSig: Uint8Array;
  outputs: PreauthBidOutput[];
  rangeproof: Uint8Array;
}

export function encodePreauthBid(input: PreauthBidInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (!Number.isInteger(input.assetInputCount) || input.assetInputCount < 1 || input.assetInputCount > 255) {
    throw new Error('asset_input_count must be integer in [1, 255]');
  }
  if (!input.bidId || input.bidId.length !== 16) throw new Error('bid_id must be 16 bytes');
  if (!input.recipientPubkey || input.recipientPubkey.length !== 33) throw new Error('recipient_pubkey must be 33 bytes');
  if (!input.blinding || input.blinding.length !== 32) throw new Error('blinding must be 32 bytes');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (![1, 2].includes(input.outputs.length)) throw new Error('T_PREAUTH_BID outputs must be 1 (exact-fill) or 2 (seller change)');
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');

  const w = new ByteWriter();
  w.u8(Opcode.T_PREAUTH_BID);
  w.push(input.assetId);
  w.u8(input.assetInputCount);
  w.push(input.bidId);
  w.push(input.recipientPubkey);
  w.u64(input.amount);
  w.push(input.blinding);
  w.u64(input.priceSats);
  w.push(input.kernelSig);
  w.u8(input.outputs.length);

  const recipient = input.outputs[0]!;
  if (recipient.commitment.length !== 33) throw new Error('output[0].commitment must be 33 bytes');
  w.push(recipient.commitment);

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

export function decodePreauthBid(payload: Uint8Array): PreauthBidDecoded | null {
  if (!payload) return null;
  // Min size (N=1): op(1) + assetId(32) + assetInputCount(1) +
  //   inline(16+33+8+32+8=97) + kernelSig(64) + N(1) + C_recipient(33) + rp_len(2) = 231
  const MIN = 1 + 32 + 1 + 97 + 64 + 1 + 33 + 2;
  if (payload.length < MIN) return null;
  if (payload[0] !== Opcode.T_PREAUTH_BID) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const assetInputCount = payload[p]!; p += 1;
  if (assetInputCount < 1) return null;

  const bidId = payload.slice(p, p + 16); p += 16;
  const recipientPubkey = payload.slice(p, p + 33); p += 33;
  const amount = readU64LE(payload, p); p += 8;
  const blinding = payload.slice(p, p + 32); p += 32;
  const priceSats = readU64LE(payload, p); p += 8;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const n = payload[p]!; p += 1;
  if (n !== 1 && n !== 2) return null;

  const outputs: PreauthBidOutput[] = [];
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

  return {
    kind: 'preauth-bid',
    assetId, assetInputCount, bidId, recipientPubkey,
    amount, blinding, priceSats, kernelSig, outputs, rangeproof,
  };
}

export function computePreauthBidContextHash(params: {
  assetId: Uint8Array;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
  priceSats: bigint;
}): Uint8Array {
  if (params.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (params.bidId.length !== 16) throw new Error('bid_id must be 16 bytes');
  if (params.recipientPubkey.length !== 33) throw new Error('recipient_pubkey must be 33 bytes');
  if (params.blinding.length !== 32) throw new Error('blinding must be 32 bytes');

  return sha256(concatBytes(
    new TextEncoder().encode('tacit-preauth-bid-context-v1'),
    params.assetId,
    params.bidId,
    params.recipientPubkey,
    u64LE(params.amount),
    params.blinding,
    u64LE(params.priceSats),
  ));
}
