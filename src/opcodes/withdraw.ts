// T_WITHDRAW (0x2A) — Anonymous mint from a shielded pool.
// Produces a fresh tacit UTXO of the pool's denomination at vout[0],
// gated on a Groth16 proof of unspent leaf membership.
// SPEC §5.11.
import { Opcode } from '../constants/opcodes.js';
import { ByteWriter, u64LE } from '../envelope/payload.js';

export interface WithdrawInput {
  assetId: Uint8Array;             // 32 bytes
  denomination: bigint;
  merkleRoot: Uint8Array;          // 32 bytes
  nullifierHash: Uint8Array;       // 32 bytes Poseidon(ν)
  recipientCommitment: Uint8Array; // 33 bytes pedersenCommit(denom, r_leaf)
  rLeaf: Uint8Array;               // 32 bytes public blinding scalar
  bindHash: Uint8Array;            // 32 bytes SHA256 triple
  proof: Uint8Array;               // Groth16 proof (variable, ~256 bytes)
}

export interface WithdrawOutput {
  kind: 'withdraw';
  assetId: Uint8Array;
  denomination: bigint;
  merkleRoot: Uint8Array;
  nullifierHash: Uint8Array;
  recipientCommitment: Uint8Array;
  rLeaf: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeWithdraw(input: WithdrawInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.denomination <= 0n || input.denomination >= (1n << 64n)) throw new Error('denomination out of u64 range');
  if (!input.merkleRoot || input.merkleRoot.length !== 32) throw new Error('merkle_root must be 32 bytes');
  if (!input.nullifierHash || input.nullifierHash.length !== 32) throw new Error('nullifier_hash must be 32 bytes');
  if (!input.recipientCommitment || input.recipientCommitment.length !== 33) throw new Error('recipient_commitment must be 33 bytes');
  if (!input.rLeaf || input.rLeaf.length !== 32) throw new Error('r_leaf must be 32 bytes');
  if (!input.bindHash || input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (!input.proof || input.proof.length > 0xffff) throw new Error('proof too large');
  const w = new ByteWriter();
  w.u8(Opcode.T_WITHDRAW);
  w.push(input.assetId);
  w.push(u64LE(input.denomination));
  w.push(input.merkleRoot);
  w.push(input.nullifierHash);
  w.push(input.recipientCommitment);
  w.push(input.rLeaf);
  w.push(input.bindHash);
  w.u16(input.proof.length);
  w.push(input.proof);
  return w.out();
}

export function decodeWithdraw(payload: Uint8Array): WithdrawOutput | null {
  if (!payload) return null;
  // Minimum: opcode(1) + asset_id(32) + denom(8) + merkle_root(32) + nullifier_hash(32)
  //           + recipient_commit(33) + r_leaf(32) + bind_hash(32) + proof_len(2)
  const MIN_LEN = 1 + 32 + 8 + 32 + 32 + 33 + 32 + 32 + 2;
  if (payload.length < MIN_LEN) return null;
  if (payload[0] !== Opcode.T_WITHDRAW) return null;
  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const denomView = new DataView(payload.buffer, payload.byteOffset + p, 8);
  const denomination = denomView.getBigUint64(0, true); p += 8;
  const merkleRoot = payload.slice(p, p + 32); p += 32;
  const nullifierHash = payload.slice(p, p + 32); p += 32;
  const recipientCommitment = payload.slice(p, p + 33); p += 33;
  const rLeaf = payload.slice(p, p + 32); p += 32;
  const bindHash = payload.slice(p, p + 32); p += 32;
  if (denomination <= 0n || denomination >= (1n << 64n)) return null;
  if (p + 2 > payload.length) return null;
  const proofLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (proofLen === 0) return null;
  if (p + proofLen !== payload.length) return null;
  return {
    kind: 'withdraw', assetId, denomination, merkleRoot,
    nullifierHash, recipientCommitment, rLeaf, bindHash,
    proof: payload.slice(p, p + proofLen),
  };
}
