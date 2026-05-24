import { concatBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import { N_BITS } from '../constants/limits.js';
import { bytesToPoint } from '../crypto/pedersen.js';
import { ByteWriter, u64LE, readU64LE } from '../envelope/payload.js';

// === T_CBTC_TAC_DEPOSIT (0x49) — SPEC §5.36 ===
export interface CBtcTacDepositInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  slotDenomSats: bigint;
  bondAmountTAC: bigint;
  bondSourceOutpoint: Uint8Array;
  bondCommit: Uint8Array;
  depositorRecoveryCommit: Uint8Array;
  mintAmount: bigint;
  mintRecipientCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export interface CBtcTacDepositOutput {
  kind: 'cbtc-tac-deposit';
  networkTag: number;
  targetLeafHash: Uint8Array;
  slotDenomSats: bigint;
  bondAmountTAC: bigint;
  bondSourceOutpoint: Uint8Array;
  bondCommit: Uint8Array;
  depositorRecoveryCommit: Uint8Array;
  mintAmount: bigint;
  mintRecipientCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeCBtcTacDeposit(input: CBtcTacDepositInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  if (input.bondSourceOutpoint.length !== 36) throw new Error('bond_source_outpoint must be 36 bytes');
  if (input.bondCommit.length !== 33) throw new Error('bond_commit must be 33 bytes');
  if (input.depositorRecoveryCommit.length !== 33) throw new Error('depositor_recovery_commit must be 33 bytes');
  if (input.mintRecipientCommit.length !== 33) throw new Error('mint_recipient_commit must be 33 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (!input.proof || input.proof.length === 0 || input.proof.length > 0xffff) throw new Error('proof len 1..65535');
  if (input.slotDenomSats <= 0n || input.slotDenomSats >= (1n << BigInt(N_BITS))) throw new Error('slot_denom_sats out of range');
  if (input.bondAmountTAC <= 0n || input.bondAmountTAC >= (1n << BigInt(N_BITS))) throw new Error('bond_amount_TAC out of range');
  if (input.mintAmount <= 0n || input.mintAmount >= (1n << BigInt(N_BITS))) throw new Error('mint_amount out of range');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_DEPOSIT).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.push(u64LE(input.slotDenomSats));
  w.push(u64LE(input.bondAmountTAC));
  w.push(input.bondSourceOutpoint);
  w.push(input.bondCommit);
  w.push(input.depositorRecoveryCommit);
  w.push(u64LE(input.mintAmount));
  w.push(input.mintRecipientCommit);
  w.push(input.bindHash);
  w.u16(input.proof.length);
  w.push(input.proof);
  return w.out();
}

export function decodeCBtcTacDeposit(payload: Uint8Array): CBtcTacDepositOutput | null {
  if (!payload || payload.length < 227) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_DEPOSIT) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const slotDenomSats = readU64LE(payload, p); p += 8;
  if (slotDenomSats <= 0n || slotDenomSats >= (1n << BigInt(N_BITS))) return null;
  const bondAmountTAC = readU64LE(payload, p); p += 8;
  if (bondAmountTAC <= 0n || bondAmountTAC >= (1n << BigInt(N_BITS))) return null;
  const bondSourceOutpoint = payload.slice(p, p + 36); p += 36;
  const bondCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(bondCommit); } catch { return null; }
  const depositorRecoveryCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(depositorRecoveryCommit); } catch { return null; }
  const mintAmount = readU64LE(payload, p); p += 8;
  if (mintAmount <= 0n || mintAmount >= (1n << BigInt(N_BITS))) return null;
  if (mintAmount !== slotDenomSats) return null;
  const mintRecipientCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(mintRecipientCommit); } catch { return null; }
  const bindHash = payload.slice(p, p + 32); p += 32;
  const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (proofLen === 0 || p + proofLen !== payload.length) return null;
  const proof = payload.slice(p, p + proofLen);
  return { kind: 'cbtc-tac-deposit', networkTag, targetLeafHash, slotDenomSats, bondAmountTAC, bondSourceOutpoint, bondCommit, depositorRecoveryCommit, mintAmount, mintRecipientCommit, bindHash, proof };
}

// === T_CBTC_TAC_WITHDRAW (0x4A) — SPEC §5.37 ===
export interface CBtcTacWithdrawInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  burnNullifiers: Uint8Array[];
  burnCommits: Uint8Array[];
  burnAmount: bigint;
  insuranceClaimTAC: bigint;
  burnBalanceProof: Uint8Array;
  bondReturnCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export interface CBtcTacWithdrawOutput {
  kind: 'cbtc-tac-withdraw';
  networkTag: number;
  targetLeafHash: Uint8Array;
  burnCount: number;
  burnNullifiers: Uint8Array[];
  burnCommits: Uint8Array[];
  burnAmount: bigint;
  insuranceClaimTAC: bigint;
  burnBalanceProof: Uint8Array;
  bondReturnCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeCBtcTacWithdraw(input: CBtcTacWithdrawInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  const burnCount = input.burnNullifiers.length;
  if (burnCount < 1 || burnCount > 16) throw new Error('burn_nullifiers must be 1..16');
  if (input.burnCommits.length !== burnCount) throw new Error('burn_commits count must match burn_nullifiers');
  for (const n of input.burnNullifiers) if (n.length !== 32) throw new Error('each burn_nullifier must be 32 bytes');
  for (const c of input.burnCommits) if (c.length !== 33) throw new Error('each burn_commit must be 33 bytes');
  if (!input.burnBalanceProof || input.burnBalanceProof.length === 0 || input.burnBalanceProof.length > 0xffff) throw new Error('burn_balance_proof len 1..65535');
  if (input.bondReturnCommit.length !== 33) throw new Error('bond_return_commit must be 33 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (!input.proof || input.proof.length === 0 || input.proof.length > 0xffff) throw new Error('proof len 1..65535');
  if (input.burnAmount <= 0n || input.burnAmount >= (1n << BigInt(N_BITS))) throw new Error('burn_amount out of range');
  if (input.insuranceClaimTAC < 0n || input.insuranceClaimTAC >= (1n << BigInt(N_BITS))) throw new Error('insurance_claim_TAC out of range');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_WITHDRAW).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.u8(burnCount);
  for (const n of input.burnNullifiers) w.push(n);
  for (const c of input.burnCommits) w.push(c);
  w.push(u64LE(input.burnAmount));
  w.u16(input.burnBalanceProof.length);
  w.push(input.burnBalanceProof);
  w.push(u64LE(input.insuranceClaimTAC));
  w.push(input.bondReturnCommit);
  w.push(input.bindHash);
  w.u16(input.proof.length);
  w.push(input.proof);
  return w.out();
}

export function decodeCBtcTacWithdraw(payload: Uint8Array): CBtcTacWithdrawOutput | null {
  if (!payload || payload.length < 35) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_WITHDRAW) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const burnCount = payload[p]; p += 1;
  if (burnCount < 1 || burnCount > 16) return null;
  const fixedAfterArrays = 8 + 2 + 8 + 33 + 32 + 2;
  if (payload.length < p + burnCount * 32 + burnCount * 33 + fixedAfterArrays) return null;
  const burnNullifiers: Uint8Array[] = [];
  for (let i = 0; i < burnCount; i++) { burnNullifiers.push(payload.slice(p, p + 32)); p += 32; }
  const burnCommits: Uint8Array[] = [];
  for (let i = 0; i < burnCount; i++) {
    const c = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(c); } catch { return null; }
    burnCommits.push(c);
  }
  const burnAmount = readU64LE(payload, p); p += 8;
  if (burnAmount <= 0n || burnAmount >= (1n << BigInt(N_BITS))) return null;
  const bpLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (bpLen === 0 || payload.length < p + bpLen + 8 + 33 + 32 + 2) return null;
  const burnBalanceProof = payload.slice(p, p + bpLen); p += bpLen;
  const insuranceClaimTAC = readU64LE(payload, p); p += 8;
  if (insuranceClaimTAC >= (1n << BigInt(N_BITS))) return null;
  const bondReturnCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(bondReturnCommit); } catch { return null; }
  const bindHash = payload.slice(p, p + 32); p += 32;
  const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (proofLen === 0 || p + proofLen !== payload.length) return null;
  const proof = payload.slice(p, p + proofLen);
  return { kind: 'cbtc-tac-withdraw', networkTag, targetLeafHash, burnCount, burnNullifiers, burnCommits, burnAmount, insuranceClaimTAC, burnBalanceProof, bondReturnCommit, bindHash, proof };
}

// === T_CBTC_TAC_FORCE_CLOSE (0x4B) — SPEC §5.38 ===
export interface CBtcTacForceCloseInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  liquidatorPayoutPk: Uint8Array;
  ammSwapMinBtcOut: bigint;
  bindHash: Uint8Array;
}

export interface CBtcTacForceCloseOutput {
  kind: 'cbtc-tac-force-close';
  networkTag: number;
  targetLeafHash: Uint8Array;
  liquidatorPayoutPk: Uint8Array;
  ammSwapMinBtcOut: bigint;
  bindHash: Uint8Array;
}

export function encodeCBtcTacForceClose(input: CBtcTacForceCloseInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  if (input.liquidatorPayoutPk.length !== 33) throw new Error('liquidator_payout_pk must be 33 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (input.ammSwapMinBtcOut < 0n || input.ammSwapMinBtcOut >= (1n << BigInt(N_BITS))) throw new Error('amm_swap_min_BTC_out out of range');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_FORCE_CLOSE).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.push(input.liquidatorPayoutPk);
  w.push(u64LE(input.ammSwapMinBtcOut));
  w.push(input.bindHash);
  return w.out();
}

export function decodeCBtcTacForceClose(payload: Uint8Array): CBtcTacForceCloseOutput | null {
  if (!payload || payload.length !== 107) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_FORCE_CLOSE) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const liquidatorPayoutPk = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(liquidatorPayoutPk); } catch { return null; }
  const ammSwapMinBtcOut = readU64LE(payload, p); p += 8;
  if (ammSwapMinBtcOut >= (1n << BigInt(N_BITS))) return null;
  const bindHash = payload.slice(p, p + 32); p += 32;
  return { kind: 'cbtc-tac-force-close', networkTag, targetLeafHash, liquidatorPayoutPk, ammSwapMinBtcOut, bindHash };
}

// === T_CTAC_LIEN_CLAIM (0x4C) — SPEC §5.39 ===
export interface CTacLienClaimInput {
  networkTag: number;
  shareNullifiers: Uint8Array[];
  shareCommits: Uint8Array[];
  shareBurnAmount: bigint;
  shareBalanceProof: Uint8Array;
  claimTAC: bigint;
  recipientCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export interface CTacLienClaimOutput {
  kind: 'ctac-lien-claim';
  networkTag: number;
  shareCount: number;
  shareNullifiers: Uint8Array[];
  shareCommits: Uint8Array[];
  shareBurnAmount: bigint;
  shareBalanceProof: Uint8Array;
  claimTAC: bigint;
  recipientCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeCTacLienClaim(input: CTacLienClaimInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  const shareCount = input.shareNullifiers.length;
  if (shareCount < 1 || shareCount > 16) throw new Error('share_nullifiers must be 1..16');
  if (input.shareCommits.length !== shareCount) throw new Error('share_commits count must match share_nullifiers');
  for (const n of input.shareNullifiers) if (n.length !== 32) throw new Error('each share_nullifier must be 32 bytes');
  for (const c of input.shareCommits) if (c.length !== 33) throw new Error('each share_commit must be 33 bytes');
  if (!input.shareBalanceProof || input.shareBalanceProof.length === 0 || input.shareBalanceProof.length > 0xffff) throw new Error('share_balance_proof len 1..65535');
  if (input.recipientCommit.length !== 33) throw new Error('recipient_commit must be 33 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (!input.proof || input.proof.length === 0 || input.proof.length > 0xffff) throw new Error('proof len 1..65535');
  if (input.shareBurnAmount <= 0n || input.shareBurnAmount >= (1n << BigInt(N_BITS))) throw new Error('share_burn_amount out of range');
  if (input.claimTAC <= 0n || input.claimTAC >= (1n << BigInt(N_BITS))) throw new Error('claim_TAC out of range');
  const w = new ByteWriter();
  w.u8(Opcode.T_CTAC_LIEN_CLAIM).u8(input.networkTag & 0xff);
  w.u8(shareCount);
  for (const n of input.shareNullifiers) w.push(n);
  for (const c of input.shareCommits) w.push(c);
  w.push(u64LE(input.shareBurnAmount));
  w.u16(input.shareBalanceProof.length);
  w.push(input.shareBalanceProof);
  w.push(u64LE(input.claimTAC));
  w.push(input.recipientCommit);
  w.push(input.bindHash);
  w.u16(input.proof.length);
  w.push(input.proof);
  return w.out();
}

export function decodeCTacLienClaim(payload: Uint8Array): CTacLienClaimOutput | null {
  if (!payload || payload.length < 3) return null;
  if (payload[0] !== Opcode.T_CTAC_LIEN_CLAIM) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const shareCount = payload[p]; p += 1;
  if (shareCount < 1 || shareCount > 16) return null;
  if (payload.length < p + shareCount * 32 + shareCount * 33 + 8 + 2 + 8 + 33 + 32 + 2) return null;
  const shareNullifiers: Uint8Array[] = [];
  for (let i = 0; i < shareCount; i++) { shareNullifiers.push(payload.slice(p, p + 32)); p += 32; }
  const shareCommits: Uint8Array[] = [];
  for (let i = 0; i < shareCount; i++) {
    const c = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(c); } catch { return null; }
    shareCommits.push(c);
  }
  const shareBurnAmount = readU64LE(payload, p); p += 8;
  if (shareBurnAmount <= 0n || shareBurnAmount >= (1n << BigInt(N_BITS))) return null;
  const bpLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (bpLen === 0 || payload.length < p + bpLen + 8 + 33 + 32 + 2) return null;
  const shareBalanceProof = payload.slice(p, p + bpLen); p += bpLen;
  const claimTAC = readU64LE(payload, p); p += 8;
  if (claimTAC <= 0n || claimTAC >= (1n << BigInt(N_BITS))) return null;
  const recipientCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(recipientCommit); } catch { return null; }
  const bindHash = payload.slice(p, p + 32); p += 32;
  const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (proofLen === 0 || p + proofLen !== payload.length) return null;
  const proof = payload.slice(p, p + proofLen);
  return { kind: 'ctac-lien-claim', networkTag, shareCount, shareNullifiers, shareCommits, shareBurnAmount, shareBalanceProof, claimTAC, recipientCommit, bindHash, proof };
}

// === T_CTAC_LIEN_SPLIT (0x4F) — SPEC-CBTC-TAC-AMENDMENT §5.47 ===
export interface CTacLienSplitInput {
  networkTag: number;
  positionLeafHash: Uint8Array;
  sourceOutpoint: Uint8Array;
  outputAmounts: bigint[];
  outputBlindings: Uint8Array[];
  outputCommits: Uint8Array[];
  lienInheritIndex: number;
  depositorSig: Uint8Array;
  bindHash: Uint8Array;
}

export interface CTacLienSplitOutput {
  kind: 'ctac-lien-split';
  networkTag: number;
  positionLeafHash: Uint8Array;
  sourceOutpoint: Uint8Array;
  outputCount: number;
  outputAmounts: bigint[];
  outputBlindings: Uint8Array[];
  outputCommits: Uint8Array[];
  lienInheritIndex: number;
  depositorSig: Uint8Array;
  bindHash: Uint8Array;
}

export function encodeCTacLienSplit(input: CTacLienSplitInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.positionLeafHash.length !== 32) throw new Error('position_leaf_hash must be 32 bytes');
  if (input.sourceOutpoint.length !== 36) throw new Error('source_outpoint must be 36 bytes');
  const N = input.outputAmounts.length;
  if (N < 2 || N > 8) throw new Error('output_count must be 2..8');
  if (input.outputBlindings.length !== N || input.outputCommits.length !== N) throw new Error('output_blindings and output_commits must each have N entries');
  if (input.lienInheritIndex < 0 || input.lienInheritIndex >= N) throw new Error('lien_inherit_index out of range');
  if (input.depositorSig.length !== 64) throw new Error('depositor_sig must be 64 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  const w = new ByteWriter();
  w.u8(Opcode.T_CTAC_LIEN_SPLIT).u8(input.networkTag & 0xff);
  w.push(input.positionLeafHash);
  w.push(input.sourceOutpoint);
  w.u8(N);
  for (let i = 0; i < N; i++) {
    if (input.outputBlindings[i]!.length !== 32) throw new Error(`output_blindings[${i}] must be 32 bytes`);
    if (input.outputCommits[i]!.length !== 33) throw new Error(`output_commits[${i}] must be 33 bytes`);
    const a = input.outputAmounts[i]!;
    if (a === 0n || a >= (1n << BigInt(N_BITS))) throw new Error(`output_amounts[${i}] out of range`);
    w.push(u64LE(a));
    w.push(input.outputBlindings[i]!);
    w.push(input.outputCommits[i]!);
  }
  w.u8(input.lienInheritIndex);
  w.push(input.depositorSig);
  w.push(input.bindHash);
  return w.out();
}

export function decodeCTacLienSplit(payload: Uint8Array): CTacLienSplitOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_CTAC_LIEN_SPLIT) return null;
  if (payload.length < 1 + 1 + 32 + 36 + 1 + 2 * 73 + 1 + 64 + 32) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const positionLeafHash = payload.slice(p, p + 32); p += 32;
  const sourceOutpoint = payload.slice(p, p + 36); p += 36;
  const outputCount = payload[p]; p += 1;
  if (outputCount < 2 || outputCount > 8) return null;
  const expectedTail = outputCount * (8 + 32 + 33) + 1 + 64 + 32;
  if (payload.length !== p + expectedTail) return null;
  const outputAmounts: bigint[] = [];
  const outputBlindings: Uint8Array[] = [];
  const outputCommits: Uint8Array[] = [];
  for (let i = 0; i < outputCount; i++) {
    const amt = readU64LE(payload, p); p += 8;
    if (amt === 0n || amt >= (1n << BigInt(N_BITS))) return null;
    outputAmounts.push(amt);
    outputBlindings.push(payload.slice(p, p + 32)); p += 32;
    const c = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(c); } catch { return null; }
    outputCommits.push(c);
  }
  const lienInheritIndex = payload[p]; p += 1;
  if (lienInheritIndex >= outputCount) return null;
  const depositorSig = payload.slice(p, p + 64); p += 64;
  const bindHash = payload.slice(p, p + 32); p += 32;
  return { kind: 'ctac-lien-split', networkTag, positionLeafHash, sourceOutpoint, outputCount, outputAmounts, outputBlindings, outputCommits, lienInheritIndex, depositorSig, bindHash };
}

// === T_CBTC_TAC_DEPOSIT_ATOMIC (0x57) — SPEC §5.48 ===
export interface CBtcTacDepositAtomicInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  slotDenomSats: bigint;
  poolId: Uint8Array;
  deltaCbtcZk: bigint;
  deltaTac: bigint;
  shareAmount: bigint;
  cbtcZkInputOutpoint: Uint8Array;
  cbtcZkInputCommit: Uint8Array;
  tacInputOutpoint: Uint8Array;
  tacInputCommit: Uint8Array;
  lpShareCommit: Uint8Array;
  depositorRecoveryCommit: Uint8Array;
  mintAmount: bigint;
  mintRecipientCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export interface CBtcTacDepositAtomicOutput {
  kind: 'cbtc-tac-deposit-atomic';
  networkTag: number;
  targetLeafHash: Uint8Array;
  slotDenomSats: bigint;
  poolId: Uint8Array;
  deltaCbtcZk: bigint;
  deltaTac: bigint;
  shareAmount: bigint;
  cbtcZkInputOutpoint: Uint8Array;
  cbtcZkInputCommit: Uint8Array;
  tacInputOutpoint: Uint8Array;
  tacInputCommit: Uint8Array;
  lpShareCommit: Uint8Array;
  depositorRecoveryCommit: Uint8Array;
  mintAmount: bigint;
  mintRecipientCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeCBtcTacDepositAtomic(input: CBtcTacDepositAtomicInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  if (input.poolId.length !== 32) throw new Error('pool_id must be 32 bytes');
  if (input.cbtcZkInputOutpoint.length !== 36 || input.tacInputOutpoint.length !== 36) throw new Error('outpoints must be 36 bytes');
  if (input.cbtcZkInputCommit.length !== 33 || input.tacInputCommit.length !== 33) throw new Error('input commits must be 33 bytes');
  if (input.lpShareCommit.length !== 33) throw new Error('lp_share_commit must be 33 bytes');
  if (input.depositorRecoveryCommit.length !== 33) throw new Error('depositor_recovery_commit must be 33 bytes');
  if (input.mintRecipientCommit.length !== 33) throw new Error('mint_recipient_commit must be 33 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (!input.proof || input.proof.length === 0 || input.proof.length > 0xffff) throw new Error('proof len 1..65535');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_DEPOSIT_ATOMIC).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.push(u64LE(input.slotDenomSats));
  w.push(input.poolId);
  w.push(u64LE(input.deltaCbtcZk));
  w.push(u64LE(input.deltaTac));
  w.push(u64LE(input.shareAmount));
  w.push(input.cbtcZkInputOutpoint);
  w.push(input.cbtcZkInputCommit);
  w.push(input.tacInputOutpoint);
  w.push(input.tacInputCommit);
  w.push(input.lpShareCommit);
  w.push(input.depositorRecoveryCommit);
  w.push(u64LE(input.mintAmount));
  w.push(input.mintRecipientCommit);
  w.push(input.bindHash);
  w.u16(input.proof.length);
  w.push(input.proof);
  return w.out();
}

export function decodeCBtcTacDepositAtomic(payload: Uint8Array): CBtcTacDepositAtomicOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_DEPOSIT_ATOMIC) return null;
  const HEADER = 1 + 1 + 32 + 8 + 32 + 8 + 8 + 8 + 36 + 33 + 36 + 33 + 33 + 33 + 8 + 33 + 32 + 2;
  if (payload.length < HEADER) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const slotDenomSats = readU64LE(payload, p); p += 8;
  const poolId = payload.slice(p, p + 32); p += 32;
  const deltaCbtcZk = readU64LE(payload, p); p += 8;
  const deltaTac = readU64LE(payload, p); p += 8;
  const shareAmount = readU64LE(payload, p); p += 8;
  const cbtcZkInputOutpoint = payload.slice(p, p + 36); p += 36;
  const cbtcZkInputCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(cbtcZkInputCommit); } catch { return null; }
  const tacInputOutpoint = payload.slice(p, p + 36); p += 36;
  const tacInputCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(tacInputCommit); } catch { return null; }
  const lpShareCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(lpShareCommit); } catch { return null; }
  const depositorRecoveryCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(depositorRecoveryCommit); } catch { return null; }
  const mintAmount = readU64LE(payload, p); p += 8;
  if (mintAmount !== slotDenomSats) return null;
  const mintRecipientCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(mintRecipientCommit); } catch { return null; }
  const bindHash = payload.slice(p, p + 32); p += 32;
  const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (proofLen === 0 || p + proofLen !== payload.length) return null;
  const proof = payload.slice(p, p + proofLen);
  return { kind: 'cbtc-tac-deposit-atomic', networkTag, targetLeafHash, slotDenomSats, poolId, deltaCbtcZk, deltaTac, shareAmount, cbtcZkInputOutpoint, cbtcZkInputCommit, tacInputOutpoint, tacInputCommit, lpShareCommit, depositorRecoveryCommit, mintAmount, mintRecipientCommit, bindHash, proof };
}

// === T_CBTC_TAC_WITHDRAW_ATOMIC (0x58) — SPEC §5.49 ===
export interface CBtcTacWithdrawAtomicInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  slotDenomSats: bigint;
  burnNullifiers: Uint8Array[];
  burnCommits: Uint8Array[];
  burnAmount: bigint;
  lpShareAmount: bigint;
  recvCbtcZkCommit: Uint8Array;
  recvTacCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export interface CBtcTacWithdrawAtomicOutput {
  kind: 'cbtc-tac-withdraw-atomic';
  networkTag: number;
  targetLeafHash: Uint8Array;
  slotDenomSats: bigint;
  burnCount: number;
  burnNullifiers: Uint8Array[];
  burnCommits: Uint8Array[];
  burnAmount: bigint;
  lpShareAmount: bigint;
  recvCbtcZkCommit: Uint8Array;
  recvTacCommit: Uint8Array;
  bindHash: Uint8Array;
  proof: Uint8Array;
}

export function encodeCBtcTacWithdrawAtomic(input: CBtcTacWithdrawAtomicInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  const burnCount = input.burnNullifiers.length;
  if (burnCount < 1 || burnCount > 16) throw new Error('burn_count must be 1..16');
  if (input.burnCommits.length !== burnCount) throw new Error('burn_nullifiers and burn_commits length mismatch');
  for (const n of input.burnNullifiers) if (n.length !== 32) throw new Error('each burn_nullifier must be 32 bytes');
  for (const c of input.burnCommits) if (c.length !== 33) throw new Error('each burn_commit must be 33 bytes');
  if (input.recvCbtcZkCommit.length !== 33) throw new Error('recv_cbtc_zk_commit must be 33 bytes');
  if (input.recvTacCommit.length !== 33) throw new Error('recv_tac_commit must be 33 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (!input.proof || input.proof.length === 0 || input.proof.length > 0xffff) throw new Error('proof len 1..65535');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_WITHDRAW_ATOMIC).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.push(u64LE(input.slotDenomSats));
  w.u8(burnCount);
  for (const n of input.burnNullifiers) w.push(n);
  for (const c of input.burnCommits) w.push(c);
  w.push(u64LE(input.burnAmount));
  w.push(u64LE(input.lpShareAmount));
  w.push(input.recvCbtcZkCommit);
  w.push(input.recvTacCommit);
  w.push(input.bindHash);
  w.u16(input.proof.length);
  w.push(input.proof);
  return w.out();
}

export function decodeCBtcTacWithdrawAtomic(payload: Uint8Array): CBtcTacWithdrawAtomicOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_WITHDRAW_ATOMIC) return null;
  if (payload.length < 1 + 1 + 32 + 8 + 1 + 32 + 33 + 8 + 8 + 33 + 33 + 32 + 2) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const slotDenomSats = readU64LE(payload, p); p += 8;
  const burnCount = payload[p]; p += 1;
  if (burnCount < 1 || burnCount > 16) return null;
  if (payload.length < p + burnCount * 32 + burnCount * 33 + 8 + 8 + 33 + 33 + 32 + 2) return null;
  const burnNullifiers: Uint8Array[] = [];
  for (let i = 0; i < burnCount; i++) { burnNullifiers.push(payload.slice(p, p + 32)); p += 32; }
  const burnCommits: Uint8Array[] = [];
  for (let i = 0; i < burnCount; i++) {
    const c = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(c); } catch { return null; }
    burnCommits.push(c);
  }
  const burnAmount = readU64LE(payload, p); p += 8;
  if (burnAmount !== slotDenomSats) return null;
  const lpShareAmount = readU64LE(payload, p); p += 8;
  const recvCbtcZkCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(recvCbtcZkCommit); } catch { return null; }
  const recvTacCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(recvTacCommit); } catch { return null; }
  const bindHash = payload.slice(p, p + 32); p += 32;
  const proofLen = new DataView(payload.buffer, payload.byteOffset + p, 2).getUint16(0, true); p += 2;
  if (proofLen === 0 || p + proofLen !== payload.length) return null;
  const proof = payload.slice(p, p + proofLen);
  return { kind: 'cbtc-tac-withdraw-atomic', networkTag, targetLeafHash, slotDenomSats, burnCount, burnNullifiers, burnCommits, burnAmount, lpShareAmount, recvCbtcZkCommit, recvTacCommit, bindHash, proof };
}

// === T_CBTC_TAC_TOP_UP (0x59) — SPEC-CBTC-TAC-AMENDMENT §5.50 ===
export interface CBtcTacTopUpInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  oldBondOutpoint: Uint8Array;
  oldBondCommit: Uint8Array;
  oldBondAmount: bigint;
  addOutpoints: Uint8Array[];
  addCommits: Uint8Array[];
  addAmounts: bigint[];
  newBondCommit: Uint8Array;
  newBondAmount: bigint;
  newBondBlinding: Uint8Array;
  depositorSig: Uint8Array;
  bindHash: Uint8Array;
}

export interface CBtcTacTopUpOutput {
  kind: 'cbtc-tac-top-up';
  networkTag: number;
  targetLeafHash: Uint8Array;
  oldBondOutpoint: Uint8Array;
  oldBondCommit: Uint8Array;
  oldBondAmount: bigint;
  addCount: number;
  addOutpoints: Uint8Array[];
  addCommits: Uint8Array[];
  addAmounts: bigint[];
  newBondCommit: Uint8Array;
  newBondAmount: bigint;
  newBondBlinding: Uint8Array;
  depositorSig: Uint8Array;
  bindHash: Uint8Array;
}

export function encodeCBtcTacTopUp(input: CBtcTacTopUpInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  if (input.oldBondOutpoint.length !== 36) throw new Error('old_bond_outpoint must be 36 bytes');
  if (input.oldBondCommit.length !== 33) throw new Error('old_bond_commit must be 33 bytes');
  const addCount = input.addOutpoints.length;
  if (addCount < 1 || addCount > 15) throw new Error('add_count must be 1..15');
  if (input.addCommits.length !== addCount || input.addAmounts.length !== addCount) throw new Error('add_commits and add_amounts must match add_outpoints');
  if (input.newBondCommit.length !== 33) throw new Error('new_bond_commit must be 33 bytes');
  if (input.newBondBlinding.length !== 32) throw new Error('new_bond_blinding must be 32 bytes');
  if (input.depositorSig.length !== 64) throw new Error('depositor_sig must be 64 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (input.oldBondAmount <= 0n || input.oldBondAmount >= (1n << BigInt(N_BITS))) throw new Error('old_bond_amount out of range');
  if (input.newBondAmount <= 0n || input.newBondAmount >= (1n << BigInt(N_BITS))) throw new Error('new_bond_amount out of range');
  let sumAdd = 0n;
  for (let i = 0; i < addCount; i++) {
    if (input.addOutpoints[i]!.length !== 36) throw new Error(`add_outpoints[${i}] must be 36 bytes`);
    if (input.addCommits[i]!.length !== 33) throw new Error(`add_commits[${i}] must be 33 bytes`);
    const a = input.addAmounts[i]!;
    if (a <= 0n || a >= (1n << BigInt(N_BITS))) throw new Error(`add_amounts[${i}] out of range`);
    sumAdd += a;
  }
  if (input.newBondAmount !== input.oldBondAmount + sumAdd) throw new Error('new_bond_amount must equal old + sum(add_amounts)');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_TOP_UP).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.push(input.oldBondOutpoint);
  w.push(input.oldBondCommit);
  w.push(u64LE(input.oldBondAmount));
  w.u8(addCount);
  for (let i = 0; i < addCount; i++) {
    w.push(input.addOutpoints[i]!);
    w.push(input.addCommits[i]!);
    w.push(u64LE(input.addAmounts[i]!));
  }
  w.push(input.newBondCommit);
  w.push(u64LE(input.newBondAmount));
  w.push(input.newBondBlinding);
  w.push(input.depositorSig);
  w.push(input.bindHash);
  return w.out();
}

export function decodeCBtcTacTopUp(payload: Uint8Array): CBtcTacTopUpOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_TOP_UP) return null;
  if (payload.length < 1 + 1 + 32 + 36 + 33 + 8 + 1 + 77 + 33 + 8 + 32 + 64 + 32) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const oldBondOutpoint = payload.slice(p, p + 36); p += 36;
  const oldBondCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(oldBondCommit); } catch { return null; }
  const oldBondAmount = readU64LE(payload, p); p += 8;
  if (oldBondAmount === 0n || oldBondAmount >= (1n << BigInt(N_BITS))) return null;
  const addCount = payload[p]; p += 1;
  if (addCount < 1 || addCount > 15) return null;
  const expectedTail = addCount * (36 + 33 + 8) + 33 + 8 + 32 + 64 + 32;
  if (payload.length !== p + expectedTail) return null;
  const addOutpoints: Uint8Array[] = [];
  const addCommits: Uint8Array[] = [];
  const addAmounts: bigint[] = [];
  let sumAdd = 0n;
  for (let i = 0; i < addCount; i++) {
    addOutpoints.push(payload.slice(p, p + 36)); p += 36;
    const c = payload.slice(p, p + 33); p += 33;
    try { bytesToPoint(c); } catch { return null; }
    addCommits.push(c);
    const a = readU64LE(payload, p); p += 8;
    if (a === 0n || a >= (1n << BigInt(N_BITS))) return null;
    addAmounts.push(a);
    sumAdd += a;
  }
  const newBondCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(newBondCommit); } catch { return null; }
  const newBondAmount = readU64LE(payload, p); p += 8;
  if (newBondAmount === 0n || newBondAmount >= (1n << BigInt(N_BITS))) return null;
  if (newBondAmount !== oldBondAmount + sumAdd) return null;
  const newBondBlinding = payload.slice(p, p + 32); p += 32;
  const depositorSig = payload.slice(p, p + 64); p += 64;
  const bindHash = payload.slice(p, p + 32); p += 32;
  return { kind: 'cbtc-tac-top-up', networkTag, targetLeafHash, oldBondOutpoint, oldBondCommit, oldBondAmount, addCount, addOutpoints, addCommits, addAmounts, newBondCommit, newBondAmount, newBondBlinding, depositorSig, bindHash };
}

// === T_CBTC_TAC_BOND_RELEASE (0x5A) — SPEC-CBTC-TAC-AMENDMENT §5.51 ===
export interface CBtcTacBondReleaseInput {
  networkTag: number;
  targetLeafHash: Uint8Array;
  oldBondOutpoint: Uint8Array;
  oldBondCommit: Uint8Array;
  oldBondAmount: bigint;
  newBondCommit: Uint8Array;
  newBondAmount: bigint;
  newBondBlinding: Uint8Array;
  releaseCommit: Uint8Array;
  releaseAmount: bigint;
  releaseBlinding: Uint8Array;
  recipientPk: Uint8Array;
  depositorSig: Uint8Array;
  bindHash: Uint8Array;
}

export interface CBtcTacBondReleaseOutput {
  kind: 'cbtc-tac-bond-release';
  networkTag: number;
  targetLeafHash: Uint8Array;
  oldBondOutpoint: Uint8Array;
  oldBondCommit: Uint8Array;
  oldBondAmount: bigint;
  newBondCommit: Uint8Array;
  newBondAmount: bigint;
  newBondBlinding: Uint8Array;
  releaseCommit: Uint8Array;
  releaseAmount: bigint;
  releaseBlinding: Uint8Array;
  recipientPk: Uint8Array;
  depositorSig: Uint8Array;
  bindHash: Uint8Array;
}

export function encodeCBtcTacBondRelease(input: CBtcTacBondReleaseInput): Uint8Array {
  if ((input.networkTag & 0xff) > 2) throw new Error('network_tag must be 0|1|2');
  if (input.targetLeafHash.length !== 32) throw new Error('target_leaf_hash must be 32 bytes');
  if (input.oldBondOutpoint.length !== 36) throw new Error('old_bond_outpoint must be 36 bytes');
  if (input.oldBondCommit.length !== 33) throw new Error('old_bond_commit must be 33 bytes');
  if (input.newBondCommit.length !== 33) throw new Error('new_bond_commit must be 33 bytes');
  if (input.newBondBlinding.length !== 32) throw new Error('new_bond_blinding must be 32 bytes');
  if (input.releaseCommit.length !== 33) throw new Error('release_commit must be 33 bytes');
  if (input.releaseBlinding.length !== 32) throw new Error('release_blinding must be 32 bytes');
  if (input.recipientPk.length !== 33) throw new Error('recipient_pk must be 33 bytes');
  if (input.depositorSig.length !== 64) throw new Error('depositor_sig must be 64 bytes');
  if (input.bindHash.length !== 32) throw new Error('bind_hash must be 32 bytes');
  if (input.oldBondAmount <= 0n || input.oldBondAmount >= (1n << BigInt(N_BITS))) throw new Error('old_bond_amount out of range');
  if (input.newBondAmount <= 0n || input.newBondAmount >= (1n << BigInt(N_BITS))) throw new Error('new_bond_amount out of range');
  if (input.releaseAmount <= 0n || input.releaseAmount >= (1n << BigInt(N_BITS))) throw new Error('release_amount out of range');
  if (input.newBondAmount + input.releaseAmount !== input.oldBondAmount) throw new Error('new_bond + release must equal old_bond');
  const w = new ByteWriter();
  w.u8(Opcode.T_CBTC_TAC_BOND_RELEASE).u8(input.networkTag & 0xff);
  w.push(input.targetLeafHash);
  w.push(input.oldBondOutpoint);
  w.push(input.oldBondCommit);
  w.push(u64LE(input.oldBondAmount));
  w.push(input.newBondCommit);
  w.push(u64LE(input.newBondAmount));
  w.push(input.newBondBlinding);
  w.push(input.releaseCommit);
  w.push(u64LE(input.releaseAmount));
  w.push(input.releaseBlinding);
  w.push(input.recipientPk);
  w.push(input.depositorSig);
  w.push(input.bindHash);
  return w.out();
}

export function decodeCBtcTacBondRelease(payload: Uint8Array): CBtcTacBondReleaseOutput | null {
  if (!payload) return null;
  if (payload[0] !== Opcode.T_CBTC_TAC_BOND_RELEASE) return null;
  if (payload.length !== 1 + 1 + 32 + 36 + 33 + 8 + 33 + 8 + 32 + 33 + 8 + 32 + 33 + 64 + 32) return null;
  let p = 1;
  const networkTag = payload[p]; p += 1;
  if (networkTag > 2) return null;
  const targetLeafHash = payload.slice(p, p + 32); p += 32;
  const oldBondOutpoint = payload.slice(p, p + 36); p += 36;
  const oldBondCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(oldBondCommit); } catch { return null; }
  const oldBondAmount = readU64LE(payload, p); p += 8;
  if (oldBondAmount === 0n || oldBondAmount >= (1n << BigInt(N_BITS))) return null;
  const newBondCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(newBondCommit); } catch { return null; }
  const newBondAmount = readU64LE(payload, p); p += 8;
  if (newBondAmount === 0n || newBondAmount >= (1n << BigInt(N_BITS))) return null;
  const newBondBlinding = payload.slice(p, p + 32); p += 32;
  const releaseCommit = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(releaseCommit); } catch { return null; }
  const releaseAmount = readU64LE(payload, p); p += 8;
  if (releaseAmount === 0n || releaseAmount >= (1n << BigInt(N_BITS))) return null;
  if (newBondAmount + releaseAmount !== oldBondAmount) return null;
  const releaseBlinding = payload.slice(p, p + 32); p += 32;
  const recipientPk = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(recipientPk); } catch { return null; }
  const depositorSig = payload.slice(p, p + 64); p += 64;
  const bindHash = payload.slice(p, p + 32); p += 32;
  return { kind: 'cbtc-tac-bond-release', networkTag, targetLeafHash, oldBondOutpoint, oldBondCommit, oldBondAmount, newBondCommit, newBondAmount, newBondBlinding, releaseCommit, releaseAmount, releaseBlinding, recipientPk, depositorSig, bindHash };
}
