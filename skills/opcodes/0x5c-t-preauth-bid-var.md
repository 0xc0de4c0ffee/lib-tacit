# Skill: T_PREAUTH_BID_VAR (0x5C) — Variable-Amount Preauth Bid

## Domain Knowledge

Variable-amount (partial-fill) preauth bid per SPEC-PREAUTH-BID-VAR-AMENDMENT §5.7.12. Extends the fixed-amount preauth-bid (0x5B) with a price-per-unit model: buyer pre-signs K outputs at different fill amounts (covering `[min_fill, max_fill]` in `fill_increment` steps), seller picks one at broadcast time. The buyer's `refund_script_hash` binds where the unfilled sats return.

## Wire Format

```
op(1) || assetId(32) || assetInputCount(1) || bidId(16) ||
recipientPubkey(33) || pricePerUnit_LE(8) || maxFill_LE(8) ||
fillIncrement_LE(8) || fillAmount_LE(8) || recipientBlinding(32) ||
refundScriptHash(20) || decimalsScale(1) || kernelSig(64) ||
N(1) || C_recipient(33) || [C_change(33) || ct_change(8)]? ||
rp_len(2) || rangeproof(rp_len)
```

## Context Hash

Domain tag: `tacit-preauth-bid-var-context-v1`. SHA256 of:
```
domain_tag || assetId || bidId || recipientPubkey ||
pricePerUnit_LE || maxFill_LE || fillIncrement_LE || fillAmount_LE ||
refundScriptHash || decimalsScale
```

Does NOT include recipientBlinding (bound via Pedersen consistency rule, not OP_RETURN).

## Implementation

✅ Implemented in `src/opcodes/preauth-bid-var.ts`:
- `encodePreauthBidVar(input)` → `Uint8Array`
- `decodePreauthBidVar(payload)` → `PreauthBidVarDecoded | null`
- `computePreauthBidVarContextHash(params)` → `Uint8Array`

## Key Functions

### `encodePreauthBidVar`
| Field | Type | Validation |
|-------|------|------------|
| assetId | 32 bytes | length check |
| assetInputCount | 1 byte | [1, 255] |
| bidId | 16 bytes | length check |
| recipientPubkey | 33 bytes | length check |
| pricePerUnit | u64 LE | > 0 |
| maxFill | u64 LE | > 0 |
| fillIncrement | u64 LE | > 0 |
| fillAmount | u64 LE | > 0, ≤ maxFill |
| recipientBlinding | 32 bytes | length check |
| refundScriptHash | 20 bytes | length check |
| decimalsScale | 1 byte | [0, 32] |
| kernelSig | 64 bytes | BIP-340 |
| outputs | [recipient, change?] | 1 or 2 |
| rangeproof | variable | ≤ 0xffff |

### `decodePreauthBidVar`
- Min payload: 268 bytes (N=1)
- Returns `null` on any malformed input
- Additional validation: `fillAmount !== 0n && fillAmount ≤ maxFill`
- Kind string: `'preauth-bid-var'`
