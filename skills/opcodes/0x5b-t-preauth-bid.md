# Skill: T_PREAUTH_BID (0x5B) — Preauth Bid

## Domain Knowledge

Buyer-offline preauth bid per SPEC-PREAUTH-BID-AMENDMENT §5.7.11. The buyer pre-signs a `SIGHASH_SINGLE_ACP` sats input + canonical bid-context OP_RETURN, any seller appends their asset UTXO + payout output and broadcasts. Reuses T_AXFER kernel-sig + Pedersen + bulletproof stack.

## Wire Format

```
T_PREAUTH_BID(1) || asset_id(32) || asset_input_count(1) || bid_id(16) ||
recipient_pubkey(33) || amount_LE(8) || blinding(32) || price_sats_LE(8) ||
kernel_sig(64) || N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
rp_len(2) || rangeproof(rp_len)
```

## Implementation Status

📝 Drafted — type definitions exist in `src/opcodes/preauth-bid.ts`. Encode/decode not yet implemented.
