// T_PREAUTH_BID_VAR (0x5C) — Variable-amount preauth-bid (partial-fill).
// Shipped per SPEC-PREAUTH-BID-VAR-AMENDMENT §5.7.12.
// Wire format (from dapp/tacit.js encodePreauthBidVarPayload):
//   op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
//   recipientPubkey(33) || minAmount_LE(8) || maxAmount_LE(8) ||
//   fillIncrement_LE(8) || senderBlinding(32) || pricePerUnit_LE(8) ||
//   decimalsScale(1) || K(2) || kernelSig(64) || N(1) ||
//   (C_recipient(33) || ct_change(8))? || rp_len(2) || rangeproof(rp_len)

import { Opcode } from '../constants/opcodes.js';

export interface PreauthBidVarInput {
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  minAmount: bigint;
  maxAmount: bigint;
  fillIncrement: bigint;
  senderBlinding: Uint8Array;
  pricePerUnit: bigint;
  decimalsScale: number;
  kSigs: Uint8Array[];
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount?: Uint8Array }[];
  rangeproof: Uint8Array;
}

export interface PreauthBidVarDecoded {
  kind: 'preauth-bid-var';
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;
  recipientPubkey: Uint8Array;
  minAmount: bigint;
  maxAmount: bigint;
  fillIncrement: bigint;
  senderBlinding: Uint8Array;
  pricePerUnit: bigint;
  decimalsScale: number;
  kSigs: Uint8Array[];
  kernelSig: Uint8Array;
  outputs: { commitment: Uint8Array; encryptedAmount?: Uint8Array }[];
  rangeproof: Uint8Array;
}

export function encodePreauthBidVar(input: PreauthBidVarInput): Uint8Array {
  throw new Error('T_PREAUTH_BID_VAR encode: not yet implemented');
}

export function decodePreauthBidVar(payload: Uint8Array): PreauthBidVarDecoded | null {
  if (!payload || payload.length < 1) return null;
  if (payload[0] !== Opcode.T_PREAUTH_BID_VAR) return null;
  return null;
}
