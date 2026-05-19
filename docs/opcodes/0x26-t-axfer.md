# T_AXFER (0x26) — Atomic OTC Settlement

**Status:** ✅ Shipped (SPEC §5.7)

## Wire Format

```
T_AXFER(1) || asset_id(32) || asset_input_count(1) ||
kernel_sig(64) || N(1) ||
(C_i(33) || amount_ct_i(8))*N ||
rp_len(2) || rangeproof
```

## Key Difference from CXFER

- `asset_input_count` distinguishes tacit asset inputs from auxiliary BTC inputs
- Maker signs with `SIGHASH_SINGLE | ANYONECANPAY` (0x83)
- Taker appends BTC funding inputs/outputs with `SIGHASH_ALL`
- Both sides settle in one Bitcoin tx

## TypeScript Interface

```typescript
interface AXFERInput {
  assetId: Uint8Array;
  assetInputCount: number;
  kernelSig: Uint8Array;
  outputs: Output[];
  rangeproof: Uint8Array;
}

function encodeAXfer(input: AXFERInput): Uint8Array;
function decodeAXfer(payload: Uint8Array): AXFEROutput | null;
```
