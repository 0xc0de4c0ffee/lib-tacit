# T_CBTC_TAC_WITHDRAW_ATOMIC (0x58) — cBTC.tac Withdraw Atomic

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.49)

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
slot_denom_sats(8) || burn_count(1) ||
burn_nullifiers(burn_count × 32) || burn_commits(burn_count × 33) ||
burn_amount(8) || lp_share_amount(8) ||
recv_cbtc_zk_commit(33) || recv_tac_commit(33) ||
bind_hash(32) || proof_len(2) || proof
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `burn_count` ∈ {1..16}
- `burn_amount` must equal `slot_denom_sats`
- All 33-byte commitment fields must encode valid secp256k1 points
- `proof` length 1..65535
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.49
