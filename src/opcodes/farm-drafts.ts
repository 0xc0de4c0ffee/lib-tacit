import { Opcode } from '../constants/opcodes.js';
// Drafted farm opcodes: T_FARM_INIT, T_LP_BOND, T_LP_UNBOND, T_LP_HARVEST,
// T_FARM_REFUND, T_AXFER_BPP, T_AXFER_VAR_BPP, T_TRADE_BATCH, T_RANGE_ATTEST
// TODO: Implement per SPEC-AMM-FARM-AMENDMENT.md and related specs.

export interface FarmInitInput { rewardAssetId: Uint8Array; rewardTotal: bigint; startHeight: number; endHeight: number; }
export interface LpBondInput { farmId: Uint8Array; lpAssetId: Uint8Array; amount: bigint; }
export interface LpUnbondInput { bondId: Uint8Array; bonderSig: Uint8Array; }
export interface LpHarvestInput { bondId: Uint8Array; }
export interface FarmRefundInput { farmId: Uint8Array; }
