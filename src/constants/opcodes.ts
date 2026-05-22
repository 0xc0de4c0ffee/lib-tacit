// Canonical opcode table — single source of truth per SPEC §1.1.
// All byte assignments across shipped, drafted, reserved, and free slots.

export const Opcode = {
  // === Shipped (production) ===
  T_CETCH:              0x21,
  T_CXFER_BPP:          0x22,
  T_CXFER:              0x23,
  T_MINT:               0x24,
  T_BURN:               0x25,
  T_AXFER:              0x26,
  T_PETCH:              0x27,
  T_PMINT:              0x28,
  T_DEPOSIT:            0x29,
  T_WITHDRAW:           0x2A,
  T_DROP:               0x2B,
  T_DCLAIM:             0x2C,
  T_AXFER_VAR:          0x37,
  T_WRAPPER_ATTEST:     0x38,
  T_SLOT_MINT:          0x43,
  T_SLOT_BURN:          0x44,
  T_SLOT_ROTATE:        0x45,
  T_SLOT_SPLIT:         0x46,
  T_SLOT_MERGE:         0x47,
  T_CBTC_TAC_DEPOSIT:   0x49,
  T_CBTC_TAC_WITHDRAW:  0x4A,
  T_CBTC_TAC_FORCE_CLOSE: 0x4B,
  T_CTAC_LIEN_CLAIM:    0x4C,
  T_CTAC_LIEN_SPLIT:    0x4F,
  T_CBTC_TAC_DEPOSIT_ATOMIC:  0x57,
  T_CBTC_TAC_WITHDRAW_ATOMIC: 0x58,
  T_CBTC_TAC_TOP_UP:          0x59,
  T_CBTC_TAC_BOND_RELEASE:    0x5A,
  T_PREAUTH_BID:              0x5B,
  T_PREAUTH_BID_VAR:          0x5C,

  // === Drafted (spec written, implementation in progress) ===
  T_LP_ADD:             0x2D,
  T_LP_REMOVE:          0x2E,
  T_SWAP_BATCH:         0x2F,
  T_INTENT_ATTEST:      0x30,
  T_PROTOCOL_FEE_CLAIM: 0x31,
  T_SWAP_VAR:           0x32,
  T_SWAP_ROUTE:         0x33,
  T_FARM_INIT:          0x34,
  T_LP_BOND:            0x35,
  T_LP_UNBOND:          0x36,
  T_TRADE_BATCH:        0x39,
  T_RANGE_ATTEST:       0x3A,
  T_LP_HARVEST:         0x3B,
  T_AXFER_BPP:          0x3C,
  T_AXFER_VAR_BPP:      0x3D,
  T_FARM_REFUND:        0x3E,
  T_GOV_PROPOSAL:       0x50,
  T_GOV_VOTE:           0x51,
  T_GOV_VETO:           0x52,
  T_GOV_EXECUTE:        0x53,
  T_CUSD_TAC_DEPOSIT:   0x54,
  T_CUSD_TAC_WITHDRAW:  0x55,
  T_CUSD_TAC_FORCE_CLOSE: 0x56,

  // === Reserved ===
  T_LP_ADD_RANGE:       0x3F,
  T_LP_REMOVE_RANGE:    0x40,
  T_LP_REPOSITION:      0x41,
  T_LP_MIGRATE_V:       0x42,
  T_SLOT_NOTE:          0x48,
  T_SLOT_FRACTIONALIZE: 0x4D,
  T_SLOT_RECONSOLIDATE: 0x4E,
  T_PREAUTH_BID_BATCH:  0x5D,
  T_PREAUTH_MATCH:      0x5E,
} as const;

export type OpcodeValue = (typeof Opcode)[keyof typeof Opcode];

export const OpcodeNames: Record<number, string> = Object.fromEntries(
  Object.entries(Opcode).map(([k, v]) => [v, k]),
);

export const ShippedOpcodes: ReadonlySet<number> = new Set([
  Opcode.T_CETCH, Opcode.T_CXFER, Opcode.T_CXFER_BPP,
  Opcode.T_MINT, Opcode.T_BURN, Opcode.T_AXFER, Opcode.T_AXFER_VAR,
  Opcode.T_PETCH, Opcode.T_PMINT, Opcode.T_DEPOSIT, Opcode.T_WITHDRAW,
  Opcode.T_DROP, Opcode.T_DCLAIM, Opcode.T_WRAPPER_ATTEST,
  Opcode.T_SLOT_MINT, Opcode.T_SLOT_BURN, Opcode.T_SLOT_ROTATE,
  Opcode.T_SLOT_SPLIT, Opcode.T_SLOT_MERGE,
  Opcode.T_CBTC_TAC_DEPOSIT, Opcode.T_CBTC_TAC_WITHDRAW,
  Opcode.T_CBTC_TAC_FORCE_CLOSE, Opcode.T_CTAC_LIEN_CLAIM,
  Opcode.T_CTAC_LIEN_SPLIT,
  Opcode.T_CBTC_TAC_DEPOSIT_ATOMIC, Opcode.T_CBTC_TAC_WITHDRAW_ATOMIC,
  Opcode.T_CBTC_TAC_TOP_UP, Opcode.T_CBTC_TAC_BOND_RELEASE,
  Opcode.T_PREAUTH_BID, Opcode.T_PREAUTH_BID_VAR,
]);
