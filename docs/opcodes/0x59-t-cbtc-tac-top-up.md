# T_CBTC_TAC_TOP_UP (0x59) — cBTC.tac Top-Up

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.50)

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
old_bond_outpoint(36) || old_bond_commit(33) || old_bond_amount(8) ||
add_count(1) ||
(add_outpoint(36) || add_commit(33) || add_amount(8)) × add_count ||
new_bond_commit(33) || new_bond_amount(8) || new_bond_blinding(32) ||
depositor_sig(64) || bind_hash(32)
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `add_count` ∈ {1..15}
- `new_bond_amount` must equal `old_bond_amount` + Σ(`add_amounts`)
- All 33-byte commitment fields must encode valid secp256k1 points
- Outpoints are 36 bytes (txid_BE(32) || vout_LE(4))
- `depositor_sig` is 64 bytes
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.50
