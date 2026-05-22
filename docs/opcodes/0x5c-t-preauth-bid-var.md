# T_PREAUTH_BID_VAR (0x5C) — Variable-Amount Preauth Bid

**Status:** ✅ Shipped (SPEC-PREAUTH-BID-VAR-AMENDMENT §5.7.12)

Variable-amount (partial-fill) preauth bid. Extends the fixed-amount preauth-bid pattern (0x5B) with a price-per-unit model: buyer pre-signs K outputs at different fill amounts (covering `[min_fill, max_fill]` in `fill_increment` steps), seller picks one at broadcast time. The buyer's `refund_script_hash` binds where the unfilled sats return.

## Library Implementation

✅ Implemented — `src/opcodes/preauth-bid-var.ts`:
- `encodePreauthBidVar` — wire serialize
- `decodePreauthBidVar` — wire deserialize
- `computePreauthBidVarContextHash` — domain-tagged (`tacit-preauth-bid-var-context-v1`) hash binding the OP_RETURN

## Wire Format

```
op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
recipientPubkey(33) || pricePerUnit_LE(8) || maxFill_LE(8) ||
fillIncrement_LE(8) || fillAmount_LE(8) || recipientBlinding(32) ||
refundScriptHash(20) || decimalsScale(1) || kernelSig(64) ||
N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
rp_len(2) || rangeproof(rp_len)
```

## Constraints

- `asset_input_count`: integer in `[1, 255]`
- `bid_id`: exactly 16 bytes
- `recipient_pubkey`: 33 bytes compressed
- `recipient_blinding`: exactly 32 bytes
- `refund_script_hash`: exactly 20 bytes (hash160)
- `price_per_unit`, `max_fill`, `fill_increment`, `fill_amount`: must be positive; `fill_amount ≤ max_fill`
- `decimals_scale`: integer in `[0, 32]`
- `kernel_sig`: exactly 64 bytes BIP-340
- `N`: 1 (no seller change) or 2 (seller change)
- `ct_change`: 8 bytes, required when N=2
- `rangeproof`: ≤ 65535 bytes

## Context Hash

```
SHA256('tacit-preauth-bid-var-context-v1' || assetId || bidId ||
        recipientPubkey || pricePerUnit_LE || maxFill_LE ||
        fillIncrement_LE || fillAmount_LE || refundScriptHash ||
        decimalsScale)
```

Does NOT include `recipientBlinding` (bound via Pedersen consistency rule, not OP_RETURN). Each fill_amount in the K pre-signed set gets its own context hash — the seller picks which one to broadcast.
