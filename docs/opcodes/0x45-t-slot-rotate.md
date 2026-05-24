# T_SLOT_ROTATE (0x45) — Slot Rotate

**Status:** ✅ Shipped (SPEC §5.23, SPEC-CBTC-ZK amendment)

Transfer a slot wrapper to a new recipient by burning the old slot and immediately minting a new slot in one atomic opcode. The old owner authorises via `old_owner_sig`. Includes payment fields for BTC cost and a new `k_btc_xonly`.

## Wire Format

```
T_SLOT_ROTATE(1) || network_tag(1) || asset_id(32) ||
denomination_LE(8) ||
old_merkle_root(32) || old_nullifier_hash(32) || old_recipient_commitment(33) ||
old_r_leaf(32) || old_bind_hash(32) || old_proof_len_LE(2) || old_proof(VAR) ||
new_recipient_commit(33) || new_leaf_hash(32) || new_k_btc_xonly(32) ||
payment_asset_id(32) || payment_amount_LE(8) ||
old_owner_pubkey(33) || old_owner_sig(64)
[optional: 0x01 || encrypted_note(122)]
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `denomination` ∈ [1, 2⁶⁴); `payment_amount` ∈ [0, 2⁶⁴)
- `old_recipient_commitment`, `new_recipient_commit` must be valid secp256k1 compressed points
- `old_proof_len` ∈ [1, 65535]
- Encrypted note (if present) must be exactly 122 bytes

## Library Implementation

✅ `encodeSlotRotate`, `decodeSlotRotate` — exported from `lib-tacit`. `decodeSlotRotate` returns `SlotRotateOutput` (or `null` on malformed input).
