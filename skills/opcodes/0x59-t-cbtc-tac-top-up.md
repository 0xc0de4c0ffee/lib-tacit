# Skill: T_CBTC_TAC_TOP_UP — Top-Up cBTC.tac Position

## Domain Knowledge

T_CBTC_TAC_TOP_UP (0x59) allows a depositor to add additional LP shares to an existing cBTC.tac position. The old bond is replaced with a new bond covering the combined value. The depositor signs the authorization.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
old_bond_outpoint(36) || old_bond_commit(33) || old_bond_amount(8) ||
add_count(1) ||
(add_outpoint(36) || add_commit(33) || add_amount(8)) × add_count ||
new_bond_commit(33) || new_bond_amount(8) || new_bond_blinding(32) ||
depositor_sig(64) || bind_hash(32)
```

## Key Constraints

- `add_count` ∈ {1..15}
- `new_bond_amount` must equal `old_bond_amount + Σ(add_amounts)`
- All 33-byte commits must be valid secp256k1 points
- `depositor_sig` must be 64 bytes

## Implementation

```typescript
const payload = encodeCBtcTacTopUp({
  networkTag, targetLeafHash,
  oldBondOutpoint, oldBondCommit, oldBondAmount,
  addOutpoints, addCommits, addAmounts,
  newBondCommit, newBondAmount, newBondBlinding,
  depositorSig, bindHash,
});
const decoded = decodeCBtcTacTopUp(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.50.
