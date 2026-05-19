import { Opcode } from '../constants/opcodes.js';
// Drafted AMM opcodes: T_LP_ADD, T_LP_REMOVE, T_SWAP_BATCH, T_INTENT_ATTEST,
// T_PROTOCOL_FEE_CLAIM, T_SWAP_VAR, T_SWAP_ROUTE
// TODO: Implement per AMM.md and respective amendment specs.

export type AmmDraftOpcode = 0x2D | 0x2E | 0x2F | 0x30 | 0x31 | 0x32 | 0x33;
export const AMM_DRAFT_OPCODES: AmmDraftOpcode[] = [0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33];
