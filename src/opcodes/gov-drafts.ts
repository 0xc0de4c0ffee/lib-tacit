import { Opcode } from '../constants/opcodes.js';
// Drafted governance & cUSD.tac opcodes
// TODO: Implement per amendment specs.

export interface GovProposalInput { title: string; description: string; actions: Uint8Array[]; }
export interface GovVoteInput { proposalId: Uint8Array; vote: number; }
export interface GovVetoInput { proposalId: Uint8Array; }
export interface GovExecuteInput { proposalId: Uint8Array; }
export interface CusdTacDepositInput { collateral: bigint; mintAmount: bigint; }
export interface CusdTacWithdrawInput { positionId: Uint8Array; }
export interface CusdTacForceCloseInput { positionId: Uint8Array; }
