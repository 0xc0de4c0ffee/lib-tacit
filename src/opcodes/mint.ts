// T_MINT (0x24) — Issuer mints additional supply on a mintable asset.
// Wire format: T_MINT(1) || asset_id(32) || etch_txid(32) ||
//   commitment(33) || amount_ct(8) || rp_len(2) || rangeproof(rp_len) ||
//   issuer_sig(64)
// Issuer sig is BIP-340 over `tacit-mint-v1 || asset_id || commit_anchor || C || ct`.
// SPEC §5.3

import { Opcode } from '../constants/opcodes.js';
import { ByteWriter } from '../envelope/payload.js';

export interface CMintInput {
  assetId: Uint8Array;       // 32 bytes
  etchTxid: Uint8Array;      // 32 bytes (BE-wire form)
  commitment: Uint8Array;    // 33 bytes compressed point
  encryptedAmount: Uint8Array; // 8 bytes
  rangeproof: Uint8Array;
  issuerSig: Uint8Array;     // 64 bytes BIP-340
}

export interface CMintOutput {
  kind: 'cmint';
  assetId: Uint8Array;
  etchTxid: Uint8Array;
  commitment: Uint8Array;
  encryptedAmount: Uint8Array;
  rangeproof: Uint8Array;
  issuerSig: Uint8Array;
}

export function encodeCMint(input: CMintInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.etchTxid.length !== 32) throw new Error('etch_txid must be 32 bytes');
  if (input.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
  if (!input.encryptedAmount || input.encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');
  if (!input.issuerSig || input.issuerSig.length !== 64) throw new Error('issuer_sig must be 64 bytes');

  const w = new ByteWriter();
  w.u8(Opcode.T_MINT);
  w.push(input.assetId);
  w.push(input.etchTxid);
  w.push(input.commitment);
  w.push(input.encryptedAmount);
  w.u16(input.rangeproof.length);
  w.push(input.rangeproof);
  w.push(input.issuerSig);
  return w.out();
}

export function decodeCMint(payload: Uint8Array): CMintOutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 32 + 32 + 33 + 8 + 2 + 64) return null;
  if (payload[0] !== Opcode.T_MINT) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const etchTxid = payload.slice(p, p + 32); p += 32;
  const commitment = payload.slice(p, p + 33); p += 33;
  const encryptedAmount = payload.slice(p, p + 8); p += 8;

  const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + rpLen + 64 > payload.length) return null;
  const rangeproof = payload.slice(p, p + rpLen); p += rpLen;
  const issuerSig = payload.slice(p, p + 64); p += 64;

  if (p !== payload.length) return null;
  return { kind: 'cmint', assetId, etchTxid, commitment, encryptedAmount, rangeproof, issuerSig };
}
