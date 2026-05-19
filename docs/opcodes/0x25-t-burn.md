# T_BURN (0x25) — Destroy Supply

**Status:** ✅ Shipped (SPEC §5.4)

## Wire Format

```
T_BURN(1) || asset_id(32) || burned_amount_LE(8) ||
kernel_sig(64) || N(1) ||
(C_i(33) || amount_ct_i(8))*N ||
[rp_len(2) || rangeproof]  (omitted if N=0)
```

N ∈ {0, 1, 2, 4, 8} where 0 = full burn.

## Key Difference from CXFER

- `burned_amount` is **public** (LE u64)
- Kernel message includes non-zero burned_LE: `computeKernelMsg(asset_id, inputs, outputs, burned_amount)`
- `E' = ΣC_out + burned·H − ΣC_in`

## TypeScript Interface

```typescript
interface CBurnInput {
  assetId: Uint8Array;
  burnedAmount: bigint;       // u64, public
  kernelSig: Uint8Array;
  outputs: Output[];          // change outputs (empty = full burn)
  rangeproof: Uint8Array;     // omitted if N=0
}

function encodeCBurn(input: CBurnInput): Uint8Array;
function decodeCBurn(payload: Uint8Array): CBurnOutput | null;
```
