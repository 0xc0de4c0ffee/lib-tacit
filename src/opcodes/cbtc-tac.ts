import { Opcode } from '../constants/opcodes.js';
// cBTC.tac lien model opcodes. SPEC-CBTC-TAC-AMENDMENT §5.47-5.49
// TODO: Implement full encode/decode per amendment spec.

export interface CBtcTacDepositInput { slotOutpoint: Uint8Array; lpShareAmount: bigint; lienAmount: bigint; }
export interface CBtcTacWithdrawInput { cbtcTacOutpoint: Uint8Array; slotPubkey: Uint8Array; }
export interface CBtcTacForceCloseInput { cbtcTacOutpoint: Uint8Array; }
export interface CTacLienClaimInput { cbtcTacOutpoint: Uint8Array; }
export interface CTacLienSplitInput { lienUtxo: Uint8Array; outputs: number; }

export function encodeCBtcTacDeposit(_input: CBtcTacDepositInput): Uint8Array { throw new Error('T_CBTC_TAC_DEPOSIT: not yet implemented'); }
export function encodeCBtcTacWithdraw(_input: CBtcTacWithdrawInput): Uint8Array { throw new Error('T_CBTC_TAC_WITHDRAW: not yet implemented'); }
export function encodeCBtcTacForceClose(_input: CBtcTacForceCloseInput): Uint8Array { throw new Error('T_CBTC_TAC_FORCE_CLOSE: not yet implemented'); }
export function encodeCTacLienClaim(_input: CTacLienClaimInput): Uint8Array { throw new Error('T_CTAC_LIEN_CLAIM: not yet implemented'); }
export function encodeCTacLienSplit(_input: CTacLienSplitInput): Uint8Array { throw new Error('T_CTAC_LIEN_SPLIT: not yet implemented'); }
