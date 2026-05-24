import { concatBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import { N_BITS } from '../constants/limits.js';
import { u64LE, readU64LE } from '../envelope/payload.js';
import { bytesToPoint } from '../crypto/pedersen.js';

// --- Slot Mint (0x43) ---

export interface SlotMintInput {
  networkTag: number;
  assetId: Uint8Array;
  denomination: bigint;
  recipientCommit: Uint8Array;
  leafHash: Uint8Array;
  paymentAssetId: Uint8Array;
  paymentAmount: bigint;
  minterPubkey: Uint8Array;
  minterSig: Uint8Array;
  kBtcXOnly: Uint8Array;
  encryptedNote: Uint8Array | null;
}

export interface SlotMintOutput {
  kind: 'slot-mint';
  networkTag: number;
  assetId: Uint8Array;
  denomination: bigint;
  recipientCommit: Uint8Array;
  leafHash: Uint8Array;
  paymentAssetId: Uint8Array;
  paymentAmount: bigint;
  minterPubkey: Uint8Array;
  minterSig: Uint8Array;
  kBtcXOnly: Uint8Array;
  encryptedNote: Uint8Array | null;
}

export function encodeSlotMint(input: SlotMintInput): Uint8Array {
  const nt = input.networkTag & 0xff;
  if (nt > 2) throw new Error('network_tag must be 0|1|2');
  if (input.assetId.length !== 32) throw new Error('asset_id 32 bytes');
  if (input.recipientCommit.length !== 33) throw new Error('recipient_commit 33 bytes');
  if (input.leafHash.length !== 32) throw new Error('leaf_hash 32 bytes');
  if (input.paymentAssetId.length !== 32) throw new Error('payment_asset_id 32 bytes');
  if (input.minterPubkey.length !== 33) throw new Error('minter_pubkey 33 bytes');
  if (input.minterSig.length !== 64) throw new Error('minter_sig 64 bytes');
  if (input.kBtcXOnly.length !== 32) throw new Error('k_btc_xonly 32 bytes');
  const d = BigInt(input.denomination);
  if (d <= 0n || d >= (1n << BigInt(N_BITS))) throw new Error('denomination out of range');
  const pAmt = BigInt(input.paymentAmount);
  if (pAmt < 0n || pAmt >= (1n << BigInt(N_BITS))) throw new Error('payment_amount out of range');

  const parts: Uint8Array[] = [
    new Uint8Array([Opcode.T_SLOT_MINT, nt]),
    input.assetId,
    u64LE(d),
    input.recipientCommit,
    input.leafHash,
    input.paymentAssetId,
    u64LE(pAmt),
    input.minterPubkey,
    input.minterSig,
    input.kBtcXOnly,
  ];

  if (input.encryptedNote !== null) {
    if (input.encryptedNote.length !== 122) {
      throw new Error('encryptedNote must be a 122-byte Uint8Array (or null)');
    }
    parts.push(new Uint8Array([0x01]), input.encryptedNote);
  }
  return concatBytes(...parts);
}

export function decodeSlotMint(payload: Uint8Array): SlotMintOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_SLOT_MINT) return null;
  if (payload.length !== 276 && payload.length !== 399) return null;

  let p = 1;
  const networkTag = payload[p]!; p += 1;
  if (networkTag > 2) return null;

  const assetId = payload.slice(p, p + 32); p += 32;
  const denomination = readU64LE(payload, p); p += 8;
  if (denomination <= 0n || denomination >= (1n << BigInt(N_BITS))) return null;

  const recipientCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(recipientCommit); } catch { return null; }

  const leafHash = payload.slice(p, p + 32); p += 32;
  const paymentAssetId = payload.slice(p, p + 32); p += 32;
  const paymentAmount = readU64LE(payload, p); p += 8;
  if (paymentAmount >= (1n << BigInt(N_BITS))) return null;

  const minterPubkey = payload.slice(p, p + 33); p += 33;
  const minterSig = payload.slice(p, p + 64); p += 64;
  const kBtcXOnly = payload.slice(p, p + 32); p += 32;

  let encryptedNote: Uint8Array | null = null;
  if (payload.length === 399) {
    if (payload[p] !== 0x01) return null;
    encryptedNote = payload.slice(p + 1, p + 1 + 122);
  }

  return {
    kind: 'slot-mint',
    networkTag, assetId, denomination,
    recipientCommit, leafHash,
    paymentAssetId, paymentAmount,
    minterPubkey, minterSig,
    kBtcXOnly,
    encryptedNote,
  };
}

// --- Slot Burn (0x44) ---

export interface SlotBurnInput {
  networkTag: number;
  assetId: Uint8Array;
  denomination: bigint;
  merkleRoot: Uint8Array;
  nullifierHash: Uint8Array;
  recipientCommitment: Uint8Array;
  rLeaf: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export interface SlotBurnOutput {
  kind: 'slot-burn';
  networkTag: number;
  assetId: Uint8Array;
  denomination: bigint;
  merkleRoot: Uint8Array;
  nullifierHash: Uint8Array;
  recipientCommitment: Uint8Array;
  rLeaf: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeSlotBurn(input: SlotBurnInput): Uint8Array {
  const nt = input.networkTag & 0xff;
  if (nt > 2) throw new Error('network_tag must be 0|1|2');
  if (input.assetId.length !== 32) throw new Error('asset_id 32 bytes');
  if (input.merkleRoot.length !== 32) throw new Error('merkle_root 32 bytes');
  if (input.nullifierHash.length !== 32) throw new Error('nullifier_hash 32 bytes');
  if (input.recipientCommitment.length !== 33) throw new Error('recipient_commitment 33 bytes');
  if (input.rLeaf.length !== 32) throw new Error('r_leaf 32 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash 32 bytes');
  if (input.proof.length === 0 || input.proof.length > 0xffff) throw new Error('proof len 1..65535');
  const d = BigInt(input.denomination);
  if (d <= 0n || d >= (1n << BigInt(N_BITS))) throw new Error('denomination out of range');

  const proofLen = new Uint8Array(2);
  new DataView(proofLen.buffer).setUint16(0, input.proof.length, true);

  return concatBytes(
    new Uint8Array([Opcode.T_SLOT_BURN, nt]),
    input.assetId,
    u64LE(d),
    input.merkleRoot,
    input.nullifierHash,
    input.recipientCommitment,
    input.rLeaf,
    input.bindHash,
    proofLen,
    input.proof,
  );
}

export function decodeSlotBurn(payload: Uint8Array): SlotBurnOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_SLOT_BURN) return null;

  const HEADER = 1 + 1 + 32 + 8 + 32 + 32 + 33 + 32 + 32 + 2;
  if (payload.length < HEADER) return null;

  let p = 1;
  const networkTag = payload[p]!; p += 1;
  if (networkTag > 2) return null;

  const assetId = payload.slice(p, p + 32); p += 32;
  const denomination = readU64LE(payload, p); p += 8;
  if (denomination <= 0n || denomination >= (1n << BigInt(N_BITS))) return null;

  const merkleRoot = payload.slice(p, p + 32); p += 32;
  const nullifierHash = payload.slice(p, p + 32); p += 32;
  const recipientCommitment = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(recipientCommitment); } catch { return null; }

  const rLeaf = payload.slice(p, p + 32); p += 32;
  const bindHash = payload.slice(p, p + 32); p += 32;

  const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true);
  p += 2;
  if (proofLen === 0) return null;
  if (p + proofLen !== payload.length) return null;
  const proof = payload.slice(p, p + proofLen);

  return {
    kind: 'slot-burn',
    networkTag, assetId, denomination,
    merkleRoot, nullifierHash, recipientCommitment, rLeaf, bindHash, proof,
  };
}

// --- Slot Rotate (0x45) ---

export interface SlotRotateInput {
  networkTag: number;
  assetId: Uint8Array;
  denomination: bigint;
  oldMerkleRoot: Uint8Array;
  oldNullifierHash: Uint8Array;
  oldRecipientCommitment: Uint8Array;
  oldRLeaf: Uint8Array;
  oldBindHash: Uint8Array;
  oldProof: Uint8Array;
  newRecipientCommit: Uint8Array;
  newLeafHash: Uint8Array;
  newKBtcXOnly: Uint8Array;
  paymentAssetId: Uint8Array;
  paymentAmount: bigint;
  oldOwnerPubkey: Uint8Array;
  oldOwnerSig: Uint8Array;
  encryptedNote: Uint8Array | null;
}

export interface SlotRotateOutput {
  kind: 'slot-rotate';
  networkTag: number;
  assetId: Uint8Array;
  denomination: bigint;
  oldMerkleRoot: Uint8Array;
  oldNullifierHash: Uint8Array;
  oldRecipientCommitment: Uint8Array;
  oldRLeaf: Uint8Array;
  oldBindHash: Uint8Array;
  oldProof: Uint8Array;
  newRecipientCommit: Uint8Array;
  newLeafHash: Uint8Array;
  newKBtcXOnly: Uint8Array;
  paymentAssetId: Uint8Array;
  paymentAmount: bigint;
  oldOwnerPubkey: Uint8Array;
  oldOwnerSig: Uint8Array;
  encryptedNote: Uint8Array | null;
}

export function encodeSlotRotate(input: SlotRotateInput): Uint8Array {
  const nt = input.networkTag & 0xff;
  if (nt > 2) throw new Error('network_tag must be 0|1|2');
  if (input.assetId.length !== 32) throw new Error('asset_id 32 bytes');
  if (input.oldMerkleRoot.length !== 32) throw new Error('old_merkle_root 32 bytes');
  if (input.oldNullifierHash.length !== 32) throw new Error('old_nullifier_hash 32 bytes');
  if (input.oldRecipientCommitment.length !== 33) throw new Error('old_recipient_commitment 33 bytes');
  if (input.oldRLeaf.length !== 32) throw new Error('old_r_leaf 32 bytes');
  if (input.oldBindHash.length !== 32) throw new Error('old_bind_hash 32 bytes');
  if (input.oldProof.length === 0 || input.oldProof.length > 0xffff) throw new Error('old_proof len 1..65535');
  if (input.newRecipientCommit.length !== 33) throw new Error('new_recipient_commit 33 bytes');
  if (input.newLeafHash.length !== 32) throw new Error('new_leaf_hash 32 bytes');
  if (input.newKBtcXOnly.length !== 32) throw new Error('new_k_btc_xonly 32 bytes');
  if (input.paymentAssetId.length !== 32) throw new Error('payment_asset_id 32 bytes');
  if (input.oldOwnerPubkey.length !== 33) throw new Error('old_owner_pubkey 33 bytes');
  if (input.oldOwnerSig.length !== 64) throw new Error('old_owner_sig 64 bytes');
  const d = BigInt(input.denomination);
  if (d <= 0n || d >= (1n << BigInt(N_BITS))) throw new Error('denomination out of range');
  const pAmt = BigInt(input.paymentAmount);
  if (pAmt < 0n || pAmt >= (1n << BigInt(N_BITS))) throw new Error('payment_amount out of range');

  const oldProofLen = new Uint8Array(2);
  new DataView(oldProofLen.buffer).setUint16(0, input.oldProof.length, true);

  const parts: Uint8Array[] = [
    new Uint8Array([Opcode.T_SLOT_ROTATE, nt]),
    input.assetId,
    u64LE(d),
    input.oldMerkleRoot,
    input.oldNullifierHash,
    input.oldRecipientCommitment,
    input.oldRLeaf,
    input.oldBindHash,
    oldProofLen,
    input.oldProof,
    input.newRecipientCommit,
    input.newLeafHash,
    input.newKBtcXOnly,
    input.paymentAssetId,
    u64LE(pAmt),
    input.oldOwnerPubkey,
    input.oldOwnerSig,
  ];

  if (input.encryptedNote !== null) {
    if (input.encryptedNote.length !== 122) {
      throw new Error('encryptedNote must be a 122-byte Uint8Array (or null)');
    }
    parts.push(new Uint8Array([0x01]), input.encryptedNote);
  }
  return concatBytes(...parts);
}

export function decodeSlotRotate(payload: Uint8Array): SlotRotateOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_SLOT_ROTATE) return null;

  const HEADER = 1 + 1 + 32 + 8;
  if (payload.length < HEADER + 32 + 32 + 33 + 32 + 32 + 2) return null;

  let p = 1;
  const networkTag = payload[p]!; p += 1;
  if (networkTag > 2) return null;

  const assetId = payload.slice(p, p + 32); p += 32;
  const denomination = readU64LE(payload, p); p += 8;
  if (denomination <= 0n || denomination >= (1n << BigInt(N_BITS))) return null;

  const oldMerkleRoot = payload.slice(p, p + 32); p += 32;
  const oldNullifierHash = payload.slice(p, p + 32); p += 32;
  const oldRecipientCommitment = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(oldRecipientCommitment); } catch { return null; }

  const oldRLeaf = payload.slice(p, p + 32); p += 32;
  const oldBindHash = payload.slice(p, p + 32); p += 32;

  const oldProofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true);
  p += 2;
  if (oldProofLen === 0) return null;

  const hostEnd = p + oldProofLen + 33 + 32 + 32 + 32 + 8 + 33 + 64;
  let encryptedNote: Uint8Array | null = null;
  if (payload.length === hostEnd) {
  } else if (payload.length === hostEnd + 1 + 122 && payload[hostEnd] === 0x01) {
    encryptedNote = payload.slice(hostEnd + 1, hostEnd + 1 + 122);
  } else {
    return null;
  }

  const oldProof = payload.slice(p, p + oldProofLen); p += oldProofLen;

  const newRecipientCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(newRecipientCommit); } catch { return null; }

  const newLeafHash = payload.slice(p, p + 32); p += 32;
  const newKBtcXOnly = payload.slice(p, p + 32); p += 32;
  const paymentAssetId = payload.slice(p, p + 32); p += 32;
  const paymentAmount = readU64LE(payload, p); p += 8;
  if (paymentAmount >= (1n << BigInt(N_BITS))) return null;

  const oldOwnerPubkey = payload.slice(p, p + 33); p += 33;
  const oldOwnerSig = payload.slice(p, p + 64); p += 64;

  return {
    kind: 'slot-rotate',
    networkTag, assetId, denomination,
    oldMerkleRoot, oldNullifierHash, oldRecipientCommitment, oldRLeaf, oldBindHash, oldProof,
    newRecipientCommit, newLeafHash, newKBtcXOnly,
    paymentAssetId, paymentAmount,
    oldOwnerPubkey, oldOwnerSig,
    encryptedNote,
  };
}

// --- Slot Split (0x46) ---

export interface SlotSplitOutputEntry {
  assetIdNew: Uint8Array;
  denomNew: bigint;
  newRecipientCommit: Uint8Array;
  newLeafHash: Uint8Array;
}

export interface SlotSplitInput {
  networkTag: number;
  assetIdOld: Uint8Array;
  denomOld: bigint;
  oldMerkleRoot: Uint8Array;
  oldNullifierHash: Uint8Array;
  oldRecipientCommitment: Uint8Array;
  oldRLeaf: Uint8Array;
  oldBindHash: Uint8Array;
  oldProof: Uint8Array;
  outputs: SlotSplitOutputEntry[];
  oldOwnerPubkey: Uint8Array;
  oldOwnerSig: Uint8Array;
  encryptedNotes: (Uint8Array | null)[] | null;
}

export interface SlotSplitOutput {
  kind: 'slot-split';
  networkTag: number;
  assetIdOld: Uint8Array;
  denomOld: bigint;
  oldMerkleRoot: Uint8Array;
  oldNullifierHash: Uint8Array;
  oldRecipientCommitment: Uint8Array;
  oldRLeaf: Uint8Array;
  oldBindHash: Uint8Array;
  oldProof: Uint8Array;
  nOutputs: number;
  outputs: SlotSplitOutputEntry[];
  oldOwnerPubkey: Uint8Array;
  oldOwnerSig: Uint8Array;
  encryptedNotes: (Uint8Array | null)[] | null;
}

export function encodeSlotSplit(input: SlotSplitInput): Uint8Array {
  const nt = input.networkTag & 0xff;
  if (nt > 2) throw new Error('network_tag must be 0|1|2');
  if (input.assetIdOld.length !== 32) throw new Error('asset_id_old 32 bytes');
  if (input.oldMerkleRoot.length !== 32) throw new Error('old_merkle_root 32 bytes');
  if (input.oldNullifierHash.length !== 32) throw new Error('old_nullifier_hash 32 bytes');
  if (input.oldRecipientCommitment.length !== 33) throw new Error('old_recipient_commitment 33 bytes');
  if (input.oldRLeaf.length !== 32) throw new Error('old_r_leaf 32 bytes');
  if (input.oldBindHash.length !== 32) throw new Error('old_bind_hash 32 bytes');
  if (input.oldProof.length === 0 || input.oldProof.length > 0xffff) throw new Error('old_proof len 1..65535');
  if (!Array.isArray(input.outputs) || input.outputs.length < 2 || input.outputs.length > 16) {
    throw new Error('outputs must be an array of 2..16');
  }
  if (input.oldOwnerPubkey.length !== 33) throw new Error('old_owner_pubkey 33 bytes');
  if (input.oldOwnerSig.length !== 64) throw new Error('old_owner_sig 64 bytes');
  const d = BigInt(input.denomOld);
  if (d <= 0n || d >= (1n << BigInt(N_BITS))) throw new Error('denom_old out of range');

  const oldProofLen = new Uint8Array(2);
  new DataView(oldProofLen.buffer).setUint16(0, input.oldProof.length, true);

  const parts: Uint8Array[] = [
    new Uint8Array([Opcode.T_SLOT_SPLIT, nt]),
    input.assetIdOld,
    u64LE(d),
    input.oldMerkleRoot,
    input.oldNullifierHash,
    input.oldRecipientCommitment,
    input.oldRLeaf,
    input.oldBindHash,
    oldProofLen,
    input.oldProof,
    new Uint8Array([input.outputs.length & 0xff]),
  ];

  for (const o of input.outputs) {
    if (o.assetIdNew.length !== 32) throw new Error('output.assetIdNew must be 32 bytes');
    if (o.newRecipientCommit.length !== 33) throw new Error('output.newRecipientCommit must be 33 bytes');
    if (o.newLeafHash.length !== 32) throw new Error('output.newLeafHash must be 32 bytes');
    const dn = BigInt(o.denomNew);
    if (dn <= 0n || dn >= (1n << BigInt(N_BITS))) throw new Error('output denom_new out of range');
    parts.push(o.assetIdNew, u64LE(dn), o.newRecipientCommit, o.newLeafHash);
  }

  parts.push(input.oldOwnerPubkey, input.oldOwnerSig);

  if (input.encryptedNotes !== null) {
    if (!Array.isArray(input.encryptedNotes) || input.encryptedNotes.length !== input.outputs.length) {
      throw new Error('encryptedNotes must be an array of length === outputs.length (or null)');
    }
    const bitmapBytes = Math.ceil(input.outputs.length / 8);
    const bitmap = new Uint8Array(bitmapBytes);
    const notes: Uint8Array[] = [];
    for (let i = 0; i < input.encryptedNotes.length; i++) {
      const note = input.encryptedNotes[i];
      if (note === null) continue;
      if (note.length !== 122) {
        throw new Error(`encryptedNotes[${i}] must be null or a 122-byte Uint8Array`);
      }
      bitmap[Math.floor(i / 8)]! |= 1 << (i % 8);
      notes.push(note);
    }
    parts.push(bitmap, ...notes);
  }

  return concatBytes(...parts);
}

export function decodeSlotSplit(payload: Uint8Array): SlotSplitOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_SLOT_SPLIT) return null;

  const FIXED_PRE_PROOF = 1 + 1 + 32 + 8 + 32 + 32 + 33 + 32 + 32 + 2;
  if (payload.length < FIXED_PRE_PROOF + 1 + 1 + 2 * 105 + 33 + 64) return null;

  let p = 1;
  const networkTag = payload[p]!; p += 1;
  if (networkTag > 2) return null;

  const assetIdOld = payload.slice(p, p + 32); p += 32;
  const denomOld = readU64LE(payload, p); p += 8;
  if (denomOld <= 0n || denomOld >= (1n << BigInt(N_BITS))) return null;

  const oldMerkleRoot = payload.slice(p, p + 32); p += 32;
  const oldNullifierHash = payload.slice(p, p + 32); p += 32;
  const oldRecipientCommitment = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(oldRecipientCommitment); } catch { return null; }

  const oldRLeaf = payload.slice(p, p + 32); p += 32;
  const oldBindHash = payload.slice(p, p + 32); p += 32;

  const oldProofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true);
  p += 2;
  if (oldProofLen === 0) return null;
  if (p + oldProofLen + 1 + 2 * 105 + 33 + 64 > payload.length) return null;

  const oldProof = payload.slice(p, p + oldProofLen); p += oldProofLen;

  const nOutputs = payload[p]!; p += 1;
  if (nOutputs < 2 || nOutputs > 16) return null;

  const hostEnd = p + nOutputs * 105 + 33 + 64;
  if (hostEnd > payload.length) return null;

  const outputs: SlotSplitOutputEntry[] = [];
  let sumDenomNew = 0n;
  for (let i = 0; i < nOutputs; i++) {
    const assetIdNew = payload.slice(p, p + 32); p += 32;
    const denomNew = readU64LE(payload, p); p += 8;
    if (denomNew <= 0n || denomNew >= (1n << BigInt(N_BITS))) return null;
    const newRecipientCommit = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(newRecipientCommit); } catch { return null; }
    const newLeafHash = payload.slice(p, p + 32); p += 32;
    sumDenomNew += denomNew;
    outputs.push({ assetIdNew, denomNew, newRecipientCommit, newLeafHash });
  }

  if (sumDenomNew > denomOld) return null;

  const oldOwnerPubkey = payload.slice(p, p + 33); p += 33;
  const oldOwnerSig = payload.slice(p, p + 64); p += 64;

  let encryptedNotes: (Uint8Array | null)[] | null = null;
  if (payload.length > p) {
    const bitmapBytes = Math.ceil(nOutputs / 8);
    if (p + bitmapBytes > payload.length) return null;
    const bitmap = payload.slice(p, p + bitmapBytes); p += bitmapBytes;
    if (nOutputs % 8 !== 0) {
      const lastByteMask = (1 << (nOutputs % 8)) - 1;
      if ((bitmap[bitmapBytes - 1]! & ~lastByteMask) !== 0) return null;
    }
    let notesCount = 0;
    for (let i = 0; i < bitmapBytes; i++) {
      let b = bitmap[i]!;
      while (b) { notesCount += b & 1; b >>>= 1; }
    }
    if (p + notesCount * 122 !== payload.length) return null;
    encryptedNotes = new Array(nOutputs).fill(null);
    for (let i = 0; i < nOutputs; i++) {
      const bit = (bitmap[Math.floor(i / 8)]! >> (i % 8)) & 1;
      if (bit) {
        encryptedNotes[i] = payload.slice(p, p + 122);
        p += 122;
      }
    }
  }

  return {
    kind: 'slot-split',
    networkTag, assetIdOld, denomOld,
    oldMerkleRoot, oldNullifierHash, oldRecipientCommitment, oldRLeaf, oldBindHash, oldProof,
    nOutputs, outputs,
    oldOwnerPubkey, oldOwnerSig,
    encryptedNotes,
  };
}

// --- Slot Merge (0x47) ---

export interface SlotMergeInputEntry {
  assetIdOld: Uint8Array;
  denomOld: bigint;
  oldMerkleRoot: Uint8Array;
  oldNullifierHash: Uint8Array;
  oldRecipientCommitment: Uint8Array;
  oldRLeaf: Uint8Array;
  oldBindHash: Uint8Array;
  oldProof: Uint8Array;
}

export interface SlotMergeInput {
  networkTag: number;
  inputs: SlotMergeInputEntry[];
  assetIdNew: Uint8Array;
  denomNew: bigint;
  newRecipientCommit: Uint8Array;
  newLeafHash: Uint8Array;
  newOwnerPubkey: Uint8Array;
  newOwnerSig: Uint8Array;
  encryptedNote: Uint8Array | null;
}

export interface SlotMergeOutput {
  kind: 'slot-merge';
  networkTag: number;
  nInputs: number;
  inputs: SlotMergeInputEntry[];
  assetIdNew: Uint8Array;
  denomNew: bigint;
  newRecipientCommit: Uint8Array;
  newLeafHash: Uint8Array;
  newOwnerPubkey: Uint8Array;
  newOwnerSig: Uint8Array;
  encryptedNote: Uint8Array | null;
}

export function encodeSlotMerge(input: SlotMergeInput): Uint8Array {
  const nt = input.networkTag & 0xff;
  if (nt > 2) throw new Error('network_tag must be 0|1|2');
  if (!Array.isArray(input.inputs) || input.inputs.length < 2 || input.inputs.length > 16) {
    throw new Error('inputs must be an array of 2..16');
  }
  if (input.assetIdNew.length !== 32) throw new Error('asset_id_new 32 bytes');
  if (input.newRecipientCommit.length !== 33) throw new Error('new_recipient_commit 33 bytes');
  if (input.newLeafHash.length !== 32) throw new Error('new_leaf_hash 32 bytes');
  if (input.newOwnerPubkey.length !== 33) throw new Error('new_owner_pubkey 33 bytes');
  if (input.newOwnerSig.length !== 64) throw new Error('new_owner_sig 64 bytes');
  const dn = BigInt(input.denomNew);
  if (dn <= 0n || dn >= (1n << BigInt(N_BITS))) throw new Error('denom_new out of range');

  const parts: Uint8Array[] = [
    new Uint8Array([Opcode.T_SLOT_MERGE, nt]),
    new Uint8Array([input.inputs.length & 0xff]),
  ];

  for (const inp of input.inputs) {
    if (inp.assetIdOld.length !== 32) throw new Error('input.assetIdOld must be 32 bytes');
    if (inp.oldMerkleRoot.length !== 32) throw new Error('input.oldMerkleRoot must be 32 bytes');
    if (inp.oldNullifierHash.length !== 32) throw new Error('input.oldNullifierHash must be 32 bytes');
    if (inp.oldRecipientCommitment.length !== 33) throw new Error('input.oldRecipientCommitment must be 33 bytes');
    if (inp.oldRLeaf.length !== 32) throw new Error('input.oldRLeaf must be 32 bytes');
    if (inp.oldBindHash.length !== 32) throw new Error('input.oldBindHash must be 32 bytes');
    if (inp.oldProof.length === 0 || inp.oldProof.length > 0xffff) throw new Error('input.oldProof must be 1..65535 bytes');
    const d = BigInt(inp.denomOld);
    if (d <= 0n || d >= (1n << BigInt(N_BITS))) throw new Error('input denom_old out of range');
    const proofLen = new Uint8Array(2);
    new DataView(proofLen.buffer).setUint16(0, inp.oldProof.length, true);
    parts.push(
      inp.assetIdOld, u64LE(d),
      inp.oldMerkleRoot, inp.oldNullifierHash, inp.oldRecipientCommitment,
      inp.oldRLeaf, inp.oldBindHash,
      proofLen, inp.oldProof,
    );
  }

  parts.push(input.assetIdNew, u64LE(dn), input.newRecipientCommit, input.newLeafHash);
  parts.push(input.newOwnerPubkey, input.newOwnerSig);

  if (input.encryptedNote !== null) {
    if (input.encryptedNote.length !== 122) {
      throw new Error('encryptedNote must be a 122-byte Uint8Array (or null)');
    }
    parts.push(new Uint8Array([0x01]), input.encryptedNote);
  }

  return concatBytes(...parts);
}

export function decodeSlotMerge(payload: Uint8Array): SlotMergeOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_SLOT_MERGE) return null;

  const PER_INPUT_FIXED = 32 + 8 + 32 + 32 + 33 + 32 + 32 + 2;
  const POST_INPUTS = 32 + 8 + 33 + 32 + 33 + 64;
  if (payload.length < 1 + 1 + 1 + 2 * (PER_INPUT_FIXED + 1) + POST_INPUTS) return null;

  let p = 1;
  const networkTag = payload[p]!; p += 1;
  if (networkTag > 2) return null;

  const nInputs = payload[p]!; p += 1;
  if (nInputs < 2 || nInputs > 16) return null;

  const inputs: SlotMergeInputEntry[] = [];
  let sumDenomOld = 0n;
  for (let i = 0; i < nInputs; i++) {
    if (p + PER_INPUT_FIXED + 1 + POST_INPUTS > payload.length) return null;

    const assetIdOld = payload.slice(p, p + 32); p += 32;
    const denomOld = readU64LE(payload, p); p += 8;
    if (denomOld <= 0n || denomOld >= (1n << BigInt(N_BITS))) return null;

    const oldMerkleRoot = payload.slice(p, p + 32); p += 32;
    const oldNullifierHash = payload.slice(p, p + 32); p += 32;
    const oldRecipientCommitment = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(oldRecipientCommitment); } catch { return null; }

    const oldRLeaf = payload.slice(p, p + 32); p += 32;
    const oldBindHash = payload.slice(p, p + 32); p += 32;

    const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true);
    p += 2;
    if (proofLen === 0) return null;
    if (p + proofLen + POST_INPUTS > payload.length) return null;

    const oldProof = payload.slice(p, p + proofLen); p += proofLen;
    sumDenomOld += denomOld;
    inputs.push({
      assetIdOld, denomOld, oldMerkleRoot, oldNullifierHash, oldRecipientCommitment,
      oldRLeaf, oldBindHash, oldProof,
    });
  }

  const hostEnd = p + POST_INPUTS;
  let encryptedNote: Uint8Array | null = null;
  if (payload.length === hostEnd) {
  } else if (payload.length === hostEnd + 1 + 122 && payload[hostEnd] === 0x01) {
    encryptedNote = payload.slice(hostEnd + 1, hostEnd + 1 + 122);
  } else {
    return null;
  }

  const assetIdNew = payload.slice(p, p + 32); p += 32;
  const denomNew = readU64LE(payload, p); p += 8;
  if (denomNew <= 0n || denomNew >= (1n << BigInt(N_BITS))) return null;

  const newRecipientCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(newRecipientCommit); } catch { return null; }

  const newLeafHash = payload.slice(p, p + 32); p += 32;
  if (sumDenomOld < denomNew) return null;

  const newOwnerPubkey = payload.slice(p, p + 33); p += 33;
  const newOwnerSig = payload.slice(p, p + 64); p += 64;

  return {
    kind: 'slot-merge',
    networkTag, nInputs, inputs,
    assetIdNew, denomNew, newRecipientCommit, newLeafHash,
    newOwnerPubkey, newOwnerSig,
    encryptedNote,
  };
}
