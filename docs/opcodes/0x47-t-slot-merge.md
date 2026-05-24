# T_SLOT_MERGE (0x47) — Slot Merge

**Status:** ✅ Shipped (SPEC §5.25, SPEC-CBTC-ZK amendment)

Atomically merge 2–16 slot wrapper inputs into a single new slot output. Σdenom_old ≥ denom_new — surplus is implicitly burned. The new slot can carry an optional encrypted note.

## Wire Format

```
T_SLOT_MERGE(1) || network_tag(1) || N_inputs(1) ||
{ asset_id(32) || denom_old_LE(8) ||
  old_merkle_root(32) || old_nullifier_hash(32) || old_recipient_commitment(33) ||
  old_r_leaf(32) || old_bind_hash(32) || proof_len_LE(2) || proof(VAR) } × N ||
new_asset_id(32) || denom_new_LE(8) ||
new_recipient_commit(33) || new_leaf_hash(32) ||
new_owner_pubkey(33) || new_owner_sig(64)
[optional: 0x01 || encrypted_note(122)]
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `N_inputs` ∈ [2, 16]; Σdenom_old ≥ denom_new
- `denom_old` (each), `denom_new` ∈ [1, 2⁶⁴)
- `old_recipient_commitment` (each), `new_recipient_commit` must be valid secp256k1 compressed points
- Encrypted note (if present) must be exactly 122 bytes

## Library Implementation

✅ `encodeSlotMerge`, `decodeSlotMerge` — exported from `lib-tacit`. `decodeSlotMerge` returns `SlotMergeOutput` (or `null` on malformed input).
