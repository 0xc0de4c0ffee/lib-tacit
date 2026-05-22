# Skill: T_PREAUTH_BID (0x5B) — Preauth Bid

## Domain Knowledge

Buyer-offline preauth bid per SPEC-PREAUTH-BID-AMENDMENT §5.7.11. The buyer pre-signs a `SIGHASH_SINGLE_ACP` sats input + canonical bid-context OP_RETURN, any seller appends their asset UTXO + payout output and broadcasts. Reuses T_AXFER kernel-sig + Pedersen + bulletproof stack.

## Wire Format

```
op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
recipientPubkey(33) || amount_LE(8) || blinding(32) || priceSats_LE(8) ||
kernelSig(64) || N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
rp_len(2) || rangeproof(rp_len)
```

## Context Hash

Domain tag: `tacit-preauth-bid-context-v1`. SHA256 of:
```
domain_tag || assetId || bidId || recipientPubkey || amount_LE || blinding || priceSats_LE
```

## Implementation

✅ Implemented in `src/opcodes/preauth-bid.ts`:
- `encodePreauthBid(input)` → `Uint8Array`
- `decodePreauthBid(payload)` → `PreauthBidDecoded | null`
- `computePreauthBidContextHash(params)` → `Uint8Array`

## Key Functions

### `encodePreauthBid`
| Field | Type | Validation |
|-------|------|------------|
| assetId | 32 bytes | length check |
| assetInputCount | 1 byte | [1, 255] |
| bidId | 16 bytes | length check |
| recipientPubkey | 33 bytes | length check |
| amount | u64 LE | via w.u64 |
| blinding | 32 bytes | length check |
| priceSats | u64 LE | via w.u64 |
| kernelSig | 64 bytes | BIP-340 |
| outputs | [recipient, change?] | 1 or 2 |
| rangeproof | variable | ≤ 0xffff |

### `decodePreauthBid`
- Min payload: 231 bytes (N=1)
- Returns `null` on any malformed input
- Kind string: `'preauth-bid'`
