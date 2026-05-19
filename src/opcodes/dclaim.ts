// T_DCLAIM (0x2C) — Permissionless claim event against a T_DROP ancestor.
// Wire format: T_DCLAIM(1) || asset_id(32) || drop_reveal_txid(32) ||
//   commitment(33) || amount_LE(8) || blinding(32) ||
//   witness_len_LE(2) || witness(witness_len)
// SPEC §5.13

import { Opcode } from '../constants/opcodes.js';
import { ByteWriter, u64LE } from '../envelope/payload.js';

export interface CDClaimInput {
  assetId: Uint8Array;
  dropRevealTxid: Uint8Array; // 32 bytes BE-wire form
  commitment: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;       // 32 bytes
  witness?: Uint8Array | null; // optional merkle-gated witness
}

export interface CDClaimWitness {
  recipientPub: Uint8Array;    // 33 bytes compressed
  leafIndex: number;
  ethAddress: Uint8Array;      // 20 bytes
  ethSig: Uint8Array;          // 65 bytes
  proofPath: Uint8Array[];     // each 32 bytes
}

export interface CDClaimOutput {
  kind: 'cdclaim';
  assetId: Uint8Array;
  dropRevealTxid: Uint8Array;
  commitment: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
  witness: CDClaimWitness | null;
}

export function encodeCDClaim(input: CDClaimInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.dropRevealTxid.length !== 32) throw new Error('drop_reveal_txid must be 32 bytes');
  if (input.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
  const amt = BigInt(input.amount);
  if (amt <= 0n || amt >= (1n << 64n)) throw new Error('amount out of u64');
  if (input.blinding.length !== 32) throw new Error('blinding must be 32 bytes');

  const witnessBytes = input.witness ?? new Uint8Array(0);
  if (witnessBytes.length > 65535) throw new Error('witness too large');

  const w = new ByteWriter();
  w.u8(Opcode.T_DCLAIM);
  w.push(input.assetId);
  w.push(input.dropRevealTxid);
  w.push(input.commitment);
  w.push(u64LE(amt));
  w.push(input.blinding);
  w.u16(witnessBytes.length);
  w.push(witnessBytes);
  return w.out();
}

export function encodeCDClaimWitness(w: CDClaimWitness): Uint8Array {
  if (w.recipientPub.length !== 33) throw new Error('recipient_pub must be 33 bytes');
  if (w.recipientPub[0] !== 0x02 && w.recipientPub[0] !== 0x03) throw new Error('recipient_pub 02/03 prefix');
  if (!Number.isInteger(w.leafIndex) || w.leafIndex < 0 || w.leafIndex > 0xffffffff) throw new Error('leaf_index u32');
  if (w.ethAddress.length !== 20) throw new Error('eth_address must be 20 bytes');
  if (w.ethSig.length !== 65) throw new Error('eth_sig must be 65 bytes');
  if (w.proofPath.length > 32) throw new Error('proof_path too deep');

  const bw = new ByteWriter();
  bw.push(w.recipientPub);
  bw.u32(w.leafIndex);
  bw.push(w.ethAddress);
  bw.push(w.ethSig);
  bw.u8(w.proofPath.length);
  for (const s of w.proofPath) {
    if (s.length !== 32) throw new Error('proof_path entries must be 32 bytes');
    bw.push(s);
  }
  return bw.out();
}

export function decodeCDClaim(payload: Uint8Array): CDClaimOutput | null {
  if (!payload) return null;
  if (payload.length < 140) return null;
  if (payload[0] !== Opcode.T_DCLAIM) return null;

  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const dropRevealTxid = payload.slice(p, p + 32); p += 32;
  const commitment = payload.slice(p, p + 33); p += 33;

  const amtLE = payload.slice(p, p + 8); p += 8;
  const av = new DataView(amtLE.buffer, amtLE.byteOffset, 8);
  const amount = (BigInt(av.getUint32(4, true)) << 32n) | BigInt(av.getUint32(0, true));
  if (amount <= 0n || amount >= (1n << 64n)) return null;

  const blinding = payload.slice(p, p + 32); p += 32;
  // Blinding must be non-zero
  let bNonZero = false;
  for (let i = 0; i < 32; i++) if (blinding[i] !== 0) { bNonZero = true; break; }
  if (!bNonZero) return null;

  const wView = new DataView(payload.buffer, payload.byteOffset + p, 2);
  const witnessLen = wView.getUint16(0, true); p += 2;
  if (p + witnessLen !== payload.length) return null;

  const witnessBytes = payload.slice(p, p + witnessLen);

  let witness: CDClaimWitness | null = null;
  if (witnessLen > 0) {
    const headerSize = 33 + 4 + 20 + 65 + 1;
    if (witnessLen < headerSize) return null;
    let wp = 0;
    const recipientPub = witnessBytes.slice(wp, wp + 33); wp += 33;
    if (recipientPub[0] !== 0x02 && recipientPub[0] !== 0x03) return null;
    const liLE = new DataView(witnessBytes.buffer, witnessBytes.byteOffset + wp, 4);
    const leafIndex = liLE.getUint32(0, true); wp += 4;
    const ethAddress = witnessBytes.slice(wp, wp + 20); wp += 20;
    const ethSig = witnessBytes.slice(wp, wp + 65); wp += 65;
    const proofLen = witnessBytes[wp]!; wp += 1;
    if (proofLen > 32) return null;
    if (wp + proofLen * 32 !== witnessBytes.length) return null;
    const proofPath: Uint8Array[] = [];
    for (let i = 0; i < proofLen; i++) {
      proofPath.push(witnessBytes.slice(wp, wp + 32));
      wp += 32;
    }
    witness = { recipientPub, leafIndex, ethAddress, ethSig, proofPath };
  }

  return { kind: 'cdclaim', assetId, dropRevealTxid, commitment, amount, blinding, witness };
}
