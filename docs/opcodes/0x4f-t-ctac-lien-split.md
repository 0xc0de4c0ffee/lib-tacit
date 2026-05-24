# T_CTAC_LIEN_SPLIT (0x4F) — cTAC Lien Split

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.47)

## Wire Format

```
opcode(1) || network_tag(1) || position_leaf_hash(32) ||
source_outpoint(36) || N(1) ||
(amount(8) || blinding(32) || commit(33)) × N ||
lien_inherit_index(1) || depositor_sig(64) || bind_hash(32)
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `N` ∈ {2..8}
- `lien_inherit_index` < N
- Each output amount > 0
- All 33-byte commitment fields must encode valid secp256k1 points
- `source_outpoint` is 36 bytes (txid_BE(32) || vout_LE(4))
- `depositor_sig` is 64 bytes
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.47
