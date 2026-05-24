# T_CBTC_TAC_BOND_RELEASE (0x5A) — cBTC.tac Bond Release

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.51)

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
old_bond_outpoint(36) || old_bond_commit(33) || old_bond_amount(8) ||
new_bond_commit(33) || new_bond_amount(8) || new_bond_blinding(32) ||
release_commit(33) || release_amount(8) || release_blinding(32) ||
recipient_pk(33) || depositor_sig(64) || bind_hash(32)
```

Fixed total size: 388 bytes.

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `new_bond_amount` + `release_amount` must equal `old_bond_amount`
- All 33-byte commitment and key fields must encode valid secp256k1 points
- `depositor_sig` is 64 bytes
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.51
