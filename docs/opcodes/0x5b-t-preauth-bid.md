# T_PREAUTH_BID (0x5B) — Buyer-Offline Preauth Bid

**Status:** ✅ Shipped (SPEC-PREAUTH-BID-AMENDMENT §5.7.11)

Buyer-offline preauth bid. Symmetric counterpart to preauth-sale: buyer pre-signs sats input + canonical bid-context OP_RETURN under `SIGHASH_SINGLE_ACP` (`0x83`), any seller appends asset UTXO + payout output and broadcasts. Reuses `T_AXFER` kernel-sig + Pedersen + bulletproof stack.

## Library Implementation

✅ Implemented — `src/opcodes/preauth-bid.ts`:
- `encodePreauthBid` — wire serialize
- `decodePreauthBid` — wire deserialize  
- `computePreauthBidContextHash` — domain-tagged (`tacit-preauth-bid-context-v1`) hash binding the OP_RETURN

## Wire Format

```
op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
recipientPubkey(33) || amount_LE(8) || blinding(32) || priceSats_LE(8) ||
kernelSig(64) || N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
rp_len(2) || rangeproof(rp_len)
```

## Constraints

- `asset_input_count`: integer in `[1, 255]`
- `bid_id`: exactly 16 bytes
- `recipient_pubkey`: 33 bytes compressed
- `blinding`: exactly 32 bytes
- `kernel_sig`: exactly 64 bytes BIP-340
- `N`: 1 (exact-fill) or 2 (seller change)
- `ct_change`: 8 bytes, required when N=2
- `rangeproof`: ≤ 65535 bytes
