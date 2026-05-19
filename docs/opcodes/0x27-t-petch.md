# T_PETCH (0x27) — Fair-Launch Deployment

**Status:** ✅ Shipped (SPEC §5.8)

## Wire Format

```
T_PETCH(1) || ticker_len(1) || ticker(tlen) || decimals(1) ||
cap_amount_LE(8) || mint_limit_LE(8) ||
mint_start_height_LE(4) || mint_end_height_LE(4) ||
image_len(2) || image_uri(image_len)
```

## Constraints

- `cap_amount % mint_limit == 0` (cap must be reachable)
- `mint_start_height ≥ deployment_height + 1`
- Produces **zero tokens** at deploy time — no supply UTXO
- `asset_id = SHA256(reveal_txid_BE || 0_LE)` — same as CETCH

## TypeScript Interface

```typescript
interface PETCHInput {
  ticker: string;
  decimals: number;
  capAmount: bigint;
  mintLimit: bigint;
  mintStartHeight: number;
  mintEndHeight: number;
  imageUri?: string | null;
}

function encodePEtch(input: PETCHInput): Uint8Array;
function decodePEtch(payload: Uint8Array): PETCHOutput | null;
```
