# Skill: T_CTAC_LIEN_SPLIT — Split Liened LP-Share UTXO

## Domain Knowledge

T_CTAC_LIEN_SPLIT (0x4F) splits a liened LP-share UTXO into N outputs. One output retains the lien inheritance (`lien_inherit_index`), while the others become standard LP-share UTXOs. The depositor must sign the split authorization.

## Wire Format

```
opcode(1) || network_tag(1) || position_leaf_hash(32) ||
source_outpoint(36) || N(1) ||
(amount(8) || blinding(32) || commit(33)) × N ||
lien_inherit_index(1) || depositor_sig(64) || bind_hash(32)
```

## Key Constraints

- `N` ∈ {2..8}; `lien_inherit_index` < N
- Output amounts must sum correctly
- `depositor_sig` must be 64 bytes

## Implementation

```typescript
const payload = encodeCTacLienSplit({
  networkTag, positionLeafHash, sourceOutpoint,
  outputAmounts, outputBlindings, outputCommits,
  lienInheritIndex, depositorSig, bindHash,
});
const decoded = decodeCTacLienSplit(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.47.
