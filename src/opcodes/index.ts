// Opcode index — barrel export for all opcode encode/decode modules.
// Shipped opcodes: full encode/decode (some with stub status noted)
// Drafted opcodes: type-only exports

export { encodeCEtch, decodeCEtch } from './etch.js';
export type { CEtchInput, CEtchOutput } from './etch.js';

export { encodeCXfer, decodeCXfer } from './transfer.js';
export type { CXFERInput, CXFEROutput, Output } from './transfer.js';

export { encodeCMint, decodeCMint } from './mint.js';
export type { CMintInput, CMintOutput } from './mint.js';

export { encodeCBurn, decodeCBurn } from './burn.js';
export type { CBurnInput, CBurnOutput } from './burn.js';

export { encodeAXfer, decodeAXfer } from './axfer.js';
export type { AXFERInput, AXFEROutput } from './axfer.js';

export { encodePEtch, decodePEtch } from './petch.js';
export type { PETCHInput, PETCHOutput } from './petch.js';

export { encodePMint, decodePMint } from './pmint.js';
export type { PMintInput, PMintOutput } from './pmint.js';

export { encodeCDrop, decodeCDrop, encodeCDropReclaim, dropIdFromRevealTxid } from './drop.js';
export type { CDropInput, CDropOutput, CDropReclaimInput, CDropReclaimOutput, DecodedDrop } from './drop.js';

export { encodeCDClaim, decodeCDClaim, encodeCDClaimWitness } from './dclaim.js';
export type { CDClaimInput, CDClaimOutput, CDClaimWitness } from './dclaim.js';

// Shipped — CXFER with Bulletproofs+ (SPEC §5.21)
export { encodeCXferBpp, decodeCXferBpp } from './cxfer-bpp.js';
export type { CXFERBPPInput, CXFERBPPOutput } from './cxfer-bpp.js';

// Shipped — Shielded pool deposit (SPEC §5.10)
export { encodeDeposit, decodeDeposit, encodePoolInit, isPoolInit } from './deposit.js';
export type { DepositInput, DepositOutput, PoolInitInput, PoolInitOutput } from './deposit.js';

// Shipped — Shielded pool withdrawal (SPEC §5.11)
export { encodeWithdraw, decodeWithdraw } from './withdraw.js';
export type { WithdrawInput, WithdrawOutput } from './withdraw.js';

// Shipped — Variable-amount atomic settlement (SPEC §5.7.9)
export { encodeAXferVar, decodeAXferVar } from './axfer-var.js';
export type { AXFERVarInput, AXFERVarOutput } from './axfer-var.js';

// Shipped — Wrapper attestation (SPEC §5.19)
export { encodeWrapperAttest, decodeWrapperAttest } from './wrapper-attest.js';
export type { WrapperAttestInput, WrapperAttestOutput } from './wrapper-attest.js';

// Shipped — Self-custody slot family (SPEC-CBTC-ZK)
export {
  encodeSlotMint, encodeSlotBurn, encodeSlotRotate,
  encodeSlotSplit, encodeSlotMerge,
} from './slot.js';
export type {
  SlotMintInput, SlotBurnInput, SlotRotateInput,
  SlotSplitInput, SlotMergeInput,
} from './slot.js';

// Shipped — cBTC.tac lien family (SPEC-CBTC-TAC)
export {
  encodeCBtcTacDeposit, encodeCBtcTacWithdraw,
  encodeCBtcTacForceClose, encodeCTacLienClaim, encodeCTacLienSplit,
} from './cbtc-tac.js';
export type {
  CBtcTacDepositInput, CBtcTacWithdrawInput,
  CBtcTacForceCloseInput, CTacLienClaimInput, CTacLienSplitInput,
} from './cbtc-tac.js';

// Drafted AMM opcodes (0x2D-0x33)
export { AMM_DRAFT_OPCODES } from './amm-drafts.js';
export type { AmmDraftOpcode } from './amm-drafts.js';

// Drafted farm opcodes (0x34-0x3E)
export type {
  FarmInitInput, LpBondInput, LpUnbondInput,
  LpHarvestInput, FarmRefundInput,
} from './farm-drafts.js';

// Drafted governance + cUSD.tac opcodes (0x50-0x56)
export type {
  GovProposalInput, GovVoteInput, GovVetoInput, GovExecuteInput,
  CusdTacDepositInput, CusdTacWithdrawInput, CusdTacForceCloseInput,
} from './gov-drafts.js';

// Drafted — Preauth-bid family (0x5B-0x5E)
export { encodePreauthBid, decodePreauthBid } from './preauth-bid.js';
export type { PreauthBidInput, PreauthBidDecoded, PreauthBidOutput } from './preauth-bid.js';
export { encodePreauthBidVar, decodePreauthBidVar } from './preauth-bid-var.js';
export type { PreauthBidVarInput, PreauthBidVarDecoded } from './preauth-bid-var.js';
