# T_SLOT_BURN (0x44) — Slot Burn

**Status:** ✅ Shipped (SPEC §5.22, SPEC-CBTC-ZK amendment)

Redeem a slot wrapper UTXO by presenting a Groth16/Bulletproof proof of membership in the slot Merkle tree. The burn consumes the slot and reveals the recipient via `recipient_commitment` and the associated `r_leaf` opening.

## Wire Format

```
T_SLOT_BURN(1) || network_tag(1) || asset_id(32) ||
denomination_LE(8) || merkle_root(32) || nullifier_hash(32) ||
recipient_commitment(33) || r_leaf(32) || bind_hash(32) ||
proof_len_LE(2) || proof(VAR)
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `denomination` ∈ [1, 2⁶⁴)
- `recipient_commitment` must be a valid secp256k1 compressed point
- `proof_len` ∈ [1, 65535]; payload must match declared proof length exactly

## Library Implementation

✅ `encodeSlotBurn`, `decodeSlotBurn` — exported from `lib-tacit`. `decodeSlotBurn` returns `SlotBurnOutput` (or `null` on malformed input).
