// Mimblewimble-style kernel signatures.
// The kernel sig proves Σout = Σin (conservation of supply) without
// revealing individual amounts. Signed under E' = ΣC_out - ΣC_in
// (for CXFER) or E' = ΣC_out + burned·H - ΣC_in (for BURN).
// SPEC §5.2, §5.4.

import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import * as secp from '@noble/secp256k1';
import {
  G, H, ZERO, modN, safeMult,
  pedersenCommit, pointToBytes, tryBytesToPoint,
  bigintToBytes32, bytes32ToBigint,
} from './pedersen.js';
import { signSchnorr, verifySchnorr } from './schnorr.js';
import { KERNEL_MSG_DOMAIN, MINT_MSG_DOMAIN, DROP_DOMAIN, DROP_RECLAIM_DOMAIN, OPENING_MSG_DOMAIN, DISCLOSURE_MSG_DOMAIN } from '../constants/domains.js';
import { reverseBytesHex } from '../transaction/utils.js';
import type { Outpoint } from '../interfaces/chain-client.js';

const te = new TextEncoder();

// ---- Kernel message hash ----
// Binds the kernel sig to a specific asset, specific input outpoints,
// and specific output commitments. burnedAmount defaults to 0 (CXFER path);
// non-zero for BURN path — the LE u64 suffix ensures paths can't replay.
export function computeKernelMsg(
  assetId: Uint8Array,
  inputOutpoints: Outpoint[],
  outputCommitments: Uint8Array[],
  burnedAmount: bigint = 0n,
): Uint8Array {
  if (assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (inputOutpoints.length > 0xff) throw new Error('input_count must fit in u8 (<=255)');
  if (outputCommitments.length > 0xff) throw new Error('output_count must fit in u8 (<=255)');

  const parts: Uint8Array[] = [
    te.encode(KERNEL_MSG_DOMAIN),
    assetId,
    new Uint8Array([inputOutpoints.length]),
  ];
  for (const op of inputOutpoints) {
    parts.push(reverseBytesHex(op.txid));
    const voutLE = new Uint8Array(4);
    new DataView(voutLE.buffer).setUint32(0, op.vout >>> 0, true);
    parts.push(voutLE);
  }
  parts.push(new Uint8Array([outputCommitments.length]));
  for (const c of outputCommitments) parts.push(c);

  // burnedAmount as 8-byte LE u64
  const burnLE = new Uint8Array(8);
  const view = new DataView(burnLE.buffer);
  view.setUint32(0, Number(burnedAmount & 0xffffffffn), true);
  view.setUint32(4, Number((burnedAmount >> 32n) & 0xffffffffn), true);
  parts.push(burnLE);

  return sha256(concatBytes(...parts));
}

// ---- Compute excess blinding for CXFER ----
export function computeCxferExcess(
  outBlindings: bigint[],
  inBlindings: bigint[],
): bigint {
  const outSum = outBlindings.reduce((s, x) => modN(s + x), 0n);
  const inSum = inBlindings.reduce((s, x) => modN(s + x), 0n);
  return modN(outSum - inSum);
}

// ---- Compute excess point E' = ΣC_out - ΣC_in (CXFER) ----
// Returns the ProjectivePoint E'. The caller can call .toRawBytes(true) on it.
export function computeExcessPoint(
  outCommitments: Uint8Array[],
  inCommitments: Uint8Array[],
  burnedAmount: bigint = 0n,
): secp.ProjectivePoint | null {
  let EPrime = ZERO;
  for (const c of outCommitments) {
    const p = tryBytesToPoint(c);
    if (!p) return null;
    EPrime = EPrime.add(p);
  }
  if (burnedAmount > 0n) {
    EPrime = EPrime.add(safeMult(H, burnedAmount));
  }
  for (const c of inCommitments) {
    const p = tryBytesToPoint(c);
    if (!p) return null;
    EPrime = EPrime.add(p.negate());
  }
  return EPrime;
}

// ---- Sign a kernel message ----
// Returns the 64-byte Schnorr signature. The "excess" is Σr_out - Σr_in.
export function signKernel(
  msg: Uint8Array,
  excess: bigint,
): Uint8Array {
  return signSchnorr(msg, bigintToBytes32(excess));
}

// ---- Verify a kernel signature ----
// Verifies the sig under E'.xonly() where E' is computed from commitments.
export function verifyKernel(
  sig64: Uint8Array,
  assetId: Uint8Array,
  inputOutpoints: Outpoint[],
  inputCommitments: Uint8Array[],
  outputCommitments: Uint8Array[],
  burnedAmount: bigint = 0n,
): boolean {
  if (sig64.length !== 64) return false;
  if (inputOutpoints.length !== inputCommitments.length) return false;

  const EPrime = computeExcessPoint(outputCommitments, inputCommitments, burnedAmount);
  if (!EPrime || EPrime.equals(ZERO)) return false;

  const xonly = EPrime.toRawBytes(true).slice(1);
  const msg = computeKernelMsg(assetId, inputOutpoints, outputCommitments, burnedAmount);
  return verifySchnorr(sig64, msg, xonly);
}

// ---- Mint authorization message (SPEC §5.3) ----
// Binds the issuer sig to (asset_id, commit_anchor, commitment, ct)
// so the envelope can't be replayed into a different commit/reveal pair.
export function computeMintMsg(
  assetId: Uint8Array,
  commitAnchor: Uint8Array,   // 36 bytes: txid_BE(32) || vout_LE(4)
  commitment: Uint8Array,     // 33 bytes compressed point
  encryptedAmount: Uint8Array, // 8 bytes
): Uint8Array {
  if (!commitAnchor || commitAnchor.length !== 36) {
    throw new Error('commit_anchor must be 36 bytes');
  }
  if (commitment.length !== 33) throw new Error('commitment must be 33 bytes');
  if (encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
  return sha256(concatBytes(
    te.encode(MINT_MSG_DOMAIN),
    assetId, commitAnchor, commitment, encryptedAmount,
  ));
}

// ---- DROP kernel message (SPEC §5.12) ----
export function dropKernelMsg(params: {
  assetId: Uint8Array;
  capAmount: bigint;
  perClaim: bigint;
  merkleRoot: Uint8Array;
  expiryHeight: number;
  assetInputCount: number;
  assetInputs: Outpoint[];
}): Uint8Array {
  const { assetId, capAmount, perClaim, merkleRoot, expiryHeight, assetInputCount, assetInputs } = params;
  if (assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (merkleRoot.length !== 32) throw new Error('merkle_root must be 32 bytes');
  if (assetInputs.length !== assetInputCount) throw new Error('assetInputs.length must equal assetInputCount');
  const capLE = new Uint8Array(8);
  new DataView(capLE.buffer).setBigUint64(0, capAmount, true);
  const perLE = new Uint8Array(8);
  new DataView(perLE.buffer).setBigUint64(0, perClaim, true);
  const expLE = new Uint8Array(4);
  new DataView(expLE.buffer).setUint32(0, expiryHeight >>> 0, true);
  const aicByte = new Uint8Array([assetInputCount & 0xff]);
  const inputsBytes: Uint8Array[] = [];
  for (const inp of assetInputs) {
    const txidBE = reverseBytesHex(inp.txid);
    const voutLE = new Uint8Array(4);
    new DataView(voutLE.buffer).setUint32(0, inp.vout >>> 0, true);
    inputsBytes.push(txidBE, voutLE);
  }
  return sha256(concatBytes(
    te.encode(DROP_DOMAIN), assetId, capLE, perLE, merkleRoot, expLE, aicByte, ...inputsBytes,
  ));
}

// ---- DROP reclaim message (SPEC §5.12.1) ----
export function dropReclaimMsg(params: {
  reclaimDropId: Uint8Array;
  assetId: Uint8Array;
  capAmount: bigint;
}): Uint8Array {
  const { reclaimDropId, assetId, capAmount } = params;
  if (reclaimDropId.length !== 32) throw new Error('reclaim_drop_id must be 32 bytes');
  if (assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  const capLE = new Uint8Array(8);
  new DataView(capLE.buffer).setBigUint64(0, capAmount, true);
  return sha256(concatBytes(te.encode(DROP_RECLAIM_DOMAIN), reclaimDropId, assetId, capLE));
}

// ---- Opening message (CETCH supply attestation, off-chain) ----
export function openingMsg(
  assetIdBytes: Uint8Array,
  txidHex: string,
  vout: number,
  amountBigint: bigint,
  blindingBytes: Uint8Array,
  ownerPubBytes: Uint8Array,
): Uint8Array {
  const txidBE = reverseBytesHex(txidHex);
  const voutLE = new Uint8Array(4);
  new DataView(voutLE.buffer).setUint32(0, vout >>> 0, true);
  const amountLE = new Uint8Array(8);
  new DataView(amountLE.buffer).setBigUint64(0, amountBigint, true);
  return sha256(concatBytes(te.encode(OPENING_MSG_DOMAIN), assetIdBytes, txidBE, voutLE, amountLE, blindingBytes, ownerPubBytes));
}

// ---- Selective disclosure message (off-chain) ----
export function disclosureMsg(
  assetIdBytes: Uint8Array,
  utxos: Outpoint[],
  thresholdBig: bigint,
  rangeproofBytes: Uint8Array,
  ownerPubBytes: Uint8Array,
): Uint8Array {
  const N = utxos.length;
  if (N > 0xffff) throw new Error('disclosure: too many utxos');
  const refsBytes = new Uint8Array(N * 36);
  for (let i = 0; i < N; i++) {
    refsBytes.set(reverseBytesHex(utxos[i]!.txid), i * 36);
    new DataView(refsBytes.buffer, refsBytes.byteOffset + i * 36 + 32, 4)
      .setUint32(0, utxos[i]!.vout >>> 0, true);
  }
  const nLE = new Uint8Array(2);
  new DataView(nLE.buffer).setUint16(0, N, true);
  const thresholdLE = new Uint8Array(8);
  new DataView(thresholdLE.buffer).setBigUint64(0, thresholdBig, true);
  return sha256(concatBytes(te.encode(DISCLOSURE_MSG_DOMAIN), assetIdBytes, nLE, refsBytes, thresholdLE, rangeproofBytes, ownerPubBytes));
}

// ---- Asset ID derivation ----
// asset_id = SHA256(reveal_txid_BE || reveal_vout_LE)
export function assetIdFor(etchTxidHex: string, etchVout: number): Uint8Array {
  const txidBE = reverseBytesHex(etchTxidHex);
  const voutLE = new Uint8Array(4);
  new DataView(voutLE.buffer).setUint32(0, etchVout >>> 0, true);
  return sha256(concatBytes(txidBE, voutLE));
}
