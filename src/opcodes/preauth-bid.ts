// T_PREAUTH_BID (0x5B) — Buyer-offline preauth bid.
// Drafted per SPEC-PREAUTH-BID-AMENDMENT §5.7.11.
// Wire format (from dapp/tacit.js encodePreauthBidPayload):
//   op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
//   recipientPubkey(33) || amount_LE(8) || blinding(32) || priceSats_LE(8) ||
//   kernelSig(64) || N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
//   rp_len(2) || rangeproof(rp_len)

import { Opcode } from '../constants/opcodes.js';
import { PREAUTH_BID_DOMAIN } from '../constants/domains.js';

export interface PreauthBidOutput {
  commitment: Uint8Array;
  encryptedAmount?: Uint8Array | null;
}

export interface PreauthBidInput {
  assetId: Uint8Array;
  assetInputCount: number;
  bidId: Uint8Array;              // 16 bytes
  recipientPubkey: Uint8Array;    // 33 bytes compressed
  amount: bigint;                 // tacit amount (hidden in Pedersen)
  blinding: Uint8Array;           // 32 bytes
  priceSats: bigint;              // sats price for one unit of tacit amount
  kernelSig: Uint8Array;          // 64 bytes BIP-340
  outputs: [PreauthBidOutput, PreauthBidOutput?];  // [recipient, change?]
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
  throw new Error('T_PREAUTH_BID encode: not yet implemented (drafted)');
}

export function decodePreauthBid(payload: Uint8Array): PreauthBidDecoded | null {
  if (!payload || payload.length < 1) return null;
  if (payload[0] !== Opcode.T_PREAUTH_BID) return null;
  return null; // decode not yet implemented
}
