# T_DCLAIM (0x2C) — Permissionless Claim

**Status:** ✅ Shipped (SPEC §5.13)

## Wire Format

```
T_DCLAIM(1) || asset_id(32) || drop_reveal_txid(32) ||
commitment(33) || amount_LE(8) || blinding(32) ||
witness_len_LE(2) || witness(witness_len)
```

## Constraints

- No signature required — anyone may broadcast
- `amount == T_DROP.per_claim`
- If `merkle_root` non-zero, witness must prove merkle inclusion
- `(amount, blinding)` are public — recovery is trivial

## TypeScript Interface

```typescript
interface CDClaimInput {
  assetId: Uint8Array;
  dropRevealTxid: Uint8Array;
  commitment: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
  witness?: Uint8Array | null;
}

function encodeCDClaim(input: CDClaimInput): Uint8Array;
function decodeCDClaim(payload: Uint8Array): CDClaimOutput | null;
```
