# T_SLOT_MINT (0x43) — Slot Mint

**Status:** ✅ Shipped (SPEC §5.21, SPEC-CBTC-ZK amendment)

Atomic mint of a self-custody-slot wrapper: a fixed-denomination UTXO bound to a recipient via `recipient_commit` with an optional encrypted note. Includes payment fields for the BTC cost and a Bitcoin-address x-only pubkey `k_btc_xonly` for cooperative-dispute key access.

## Wire Format

```
T_SLOT_MINT(1) || network_tag(1) || asset_id(32) ||
denomination_LE(8) || recipient_commit(33) || leaf_hash(32) ||
payment_asset_id(32) || payment_amount_LE(8) ||
minter_pubkey(33) || minter_sig(64) || k_btc_xonly(32)
[optional: 0x01 || encrypted_note(122)]
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `denomination` ∈ [1, 2⁶⁴)
- `payment_amount` ∈ [0, 2⁶⁴)
- `recipient_commit` must be a valid secp256k1 compressed point
- Encrypted note (if present) must be exactly 122 bytes

## Library Implementation

✅ `encodeSlotMint`, `decodeSlotMint` — exported from `lib-tacit`. `decodeSlotMint` returns `SlotMintOutput` (or `null` on malformed input).
