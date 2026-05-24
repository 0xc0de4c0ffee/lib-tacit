# Skill: T_CBTC_TAC_BOND_RELEASE — Release Bond from cBTC.tac Position

## Domain Knowledge

T_CBTC_TAC_BOND_RELEASE (0x5A) allows a depositor to release part of the bond from a cBTC.tac position without fully unwinding. The bond is split into a new (smaller) bond and a release output sent to a recipient public key.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
old_bond_outpoint(36) || old_bond_commit(33) || old_bond_amount(8) ||
new_bond_commit(33) || new_bond_amount(8) || new_bond_blinding(32) ||
release_commit(33) || release_amount(8) || release_blinding(32) ||
recipient_pk(33) || depositor_sig(64) || bind_hash(32)
```

Fixed total: 388 bytes.

## Key Constraints

- `new_bond_amount + release_amount` must equal `old_bond_amount`
- All 33-byte fields must be valid secp256k1 points
- `recipient_pk` is the recipient's compressed public key

## Implementation

```typescript
const payload = encodeCBtcTacBondRelease({
  networkTag, targetLeafHash,
  oldBondOutpoint, oldBondCommit, oldBondAmount,
  newBondCommit, newBondAmount, newBondBlinding,
  releaseCommit, releaseAmount, releaseBlinding,
  recipientPk, depositorSig, bindHash,
});
const decoded = decodeCBtcTacBondRelease(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.51.
