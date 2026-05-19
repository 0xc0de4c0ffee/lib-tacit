# T_DROP (0x2B) — Public-Claim Pool

**Status:** ✅ Shipped (SPEC §5.12)

## Wire Format

```
T_DROP(1) || asset_id(32) || cap_amount_LE(8) || per_claim_LE(8) ||
merkle_root(32) || expiry_height_LE(4) || ticker_len(1) || ticker(tlen) ||
decimals(1) || asset_input_count(1) || kernel_sig(64)
```

## Constraints

- `cap_amount % per_claim == 0`
- `merkle_root` all-zero = open (no eligibility gate)
- Supply-preserving: tokens shift from depositor to pool to claimant

## TypeScript Interface

```typescript
interface CDropInput {
  assetId: Uint8Array;
  capAmount: bigint;
  perClaim: bigint;
  merkleRoot: Uint8Array;
  expiryHeight: number;
  ticker?: string | null;
  decimals?: number;
  assetInputCount: number;
  kernelSig: Uint8Array;
}

function encodeCDrop(input: CDropInput): Uint8Array;
function decodeCDrop(payload: Uint8Array): CDropOutput | null;
```
