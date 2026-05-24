# T_CBTC_TAC_WITHDRAW (0x4A) — cBTC.tac Withdraw

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.37)

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
burn_count(1) || burn_nullifiers(burn_count × 32) ||
burn_commits(burn_count × 33) ||
burn_amount(8) || burn_balance_proof_len(2) || burn_balance_proof ||
insurance_claim_TAC(8) || bond_return_commit(33) ||
bind_hash(32) || proof_len(2) || proof
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `burn_count` ∈ {1..16}
- `burn_amount` > 0; `insurance_claim_TAC` ≥ 0
- All 33-byte commitment fields must encode valid secp256k1 points
- `burn_balance_proof` and `proof` lengths 1..65535
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.37
