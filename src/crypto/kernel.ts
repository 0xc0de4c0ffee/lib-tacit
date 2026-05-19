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
  pedersenCommit, pointToBytes, bytesToPoint,
  bigintToBytes32, bytes32ToBigint,
} from './pedersen.js';
import { signSchnorr, verifySchnorr } from './schnorr.js';
import { KERNEL_MSG_DOMAIN, MINT_MSG_DOMAIN } from '../constants/domains.js';
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
): secp.ProjectivePoint {
  let EPrime = ZERO;
  for (const c of outCommitments) {
    EPrime = EPrime.add(bytesToPoint(c));
  }
  if (burnedAmount > 0n) {
    EPrime = EPrime.add(safeMult(H, burnedAmount));
  }
  for (const c of inCommitments) {
    EPrime = EPrime.add(bytesToPoint(c).negate());
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
  // Compute E'
  let EPrime = ZERO;
  for (const c of outputCommitments) {
    EPrime = EPrime.add(bytesToPoint(c));
  }
  if (burnedAmount > 0n) {
    EPrime = EPrime.add(safeMult(H, burnedAmount));
  }
  for (const c of inputCommitments) {
    EPrime = EPrime.add(bytesToPoint(c).negate());
  }

  // E' = 0 is invalid (degenerate kernel)
  if (EPrime.equals(ZERO)) return false;

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

// ---- Asset ID derivation ----
// asset_id = SHA256(reveal_txid_BE || reveal_vout_LE)
export function assetIdFor(etchTxidHex: string, etchVout: number): Uint8Array {
  const txidBE = reverseBytesHex(etchTxidHex);
  const voutLE = new Uint8Array(4);
  new DataView(voutLE.buffer).setUint32(0, etchVout >>> 0, true);
  return sha256(concatBytes(txidBE, voutLE));
}
