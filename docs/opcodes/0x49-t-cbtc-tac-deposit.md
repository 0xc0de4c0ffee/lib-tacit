# T_CBTC_TAC_DEPOSIT (0x49) — cBTC.tac Deposit

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.36)

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
slot_denom_sats(8) || bond_amount_TAC(8) || bond_source_outpoint(36) ||
bond_commit(33) || depositor_recovery_commit(33) ||
mint_amount(8) || mint_recipient_commit(33) || bind_hash(32) ||
proof_len(2) || proof
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `mint_amount` must equal `slot_denom_sats`
- All 33-byte commitment fields must encode valid secp256k1 points
- `proof` length 1..65535
- `bond_source_outpoint` is 36 bytes (txid_BE(32) || vout_LE(4))
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.36
