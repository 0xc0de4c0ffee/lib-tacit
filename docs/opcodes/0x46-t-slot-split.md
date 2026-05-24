# T_SLOT_SPLIT (0x46) — Slot Split

**Status:** ✅ Shipped (SPEC §5.24, SPEC-CBTC-ZK amendment)

Split a single slot wrapper into 2–16 new slot outputs. Σdenom_new ≤ denom_old. Each output carries its own `asset_id`, `denom`, `recipient_commit`, and `leaf_hash`. An optional bitmap-based note tail provides per-output encrypted notes.

## Wire Format

```
T_SLOT_SPLIT(1) || network_tag(1) || old_asset_id(32) ||
denom_old_LE(8) ||
old_merkle_root(32) || old_nullifier_hash(32) || old_recipient_commitment(33) ||
old_r_leaf(32) || old_bind_hash(32) || old_proof_len_LE(2) || old_proof(VAR) ||
N_outputs(1) ||
{ asset_id(32) || denom_LE(8) || recipient_commit(33) || leaf_hash(32) } × N ||
old_owner_pubkey(33) || old_owner_sig(64)
[optional: bitmap(⌈N/8⌉) || encrypted_notes(VAR)]
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `N_outputs` ∈ [2, 16]; Σdenom_new ≤ denom_old
- `denom_old`, each `denom` ∈ [1, 2⁶⁴)
- `old_recipient_commitment`, each `recipient_commit` must be valid secp256k1 compressed points
- Bitmap bits indicate which outputs carry a 122-byte encrypted note; unused bits must be 0

## Library Implementation

✅ `encodeSlotSplit`, `decodeSlotSplit` — exported from `lib-tacit`. `decodeSlotSplit` returns `SlotSplitOutput` (or `null` on malformed input).
