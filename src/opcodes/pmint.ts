// T_PMINT (0x28) — Permissionless mint event against a T_PETCH ancestor.
// Wire format: T_PMINT(1) || asset_id(32) || etch_txid(32) ||
//   commitment(33) || amount_LE(8) || blinding(32)
// No signature. (amount, blinding) are public — any chain reader audits cumulative supply.
// SPEC §5.9

import { Opcode } from '../constants/opcodes.js';
import { ByteWriter, u64LE } from '../envelope/payload.js';

export interface PMintInput {
  assetId: Uint8Array;
  etchTxid: Uint8Array;
  commitment: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;  // 32 bytes
}

export interface PMintOutput {
  kind: 'pmint';
  assetId: Uint8Array;
  etchTxid: Uint8Array;
  commitment: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
}

export function encodePMint(input: PMintInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.etchTxid.length !== 32) throw new Error('etch_txid must be 32 bytes');
  if (input.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
  if (input.amount <= 0n || input.amount >= (1n << 64n)) throw new Error('amount out of u64');
  if (input.blinding.length !== 32) throw new Error('blinding must be 32 bytes');

  const w = new ByteWriter();
  w.u8(Opcode.T_PMINT);
  w.push(input.assetId);
  w.push(input.etchTxid);
  w.push(input.commitment);
  w.push(u64LE(input.amount));
  w.push(input.blinding);
  return w.out();
}

export function decodePMint(payload: Uint8Array): PMintOutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 32 + 32 + 33 + 8 + 32) return null;
  if (payload[0] !== Opcode.T_PMINT) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const etchTxid = payload.slice(p, p + 32); p += 32;
  const commitment = payload.slice(p, p + 33); p += 33;

  const amtLE = payload.slice(p, p + 8); p += 8;
  const v = new DataView(amtLE.buffer, amtLE.byteOffset, 8);
  const amount = (BigInt(v.getUint32(4, true)) << 32n) | BigInt(v.getUint32(0, true));

  const blinding = payload.slice(p, p + 32); p += 32;
  if (p !== payload.length) return null;

  return { kind: 'pmint', assetId, etchTxid, commitment, amount, blinding };
}
