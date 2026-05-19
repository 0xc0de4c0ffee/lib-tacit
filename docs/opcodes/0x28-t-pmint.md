# T_PMINT (0x28) — Permissionless Mint

**Status:** ✅ Shipped (SPEC §5.9)

## Wire Format

```
T_PMINT(1) || asset_id(32) || etch_txid(32) ||
commitment(33) || amount_LE(8) || blinding(32)
```

## Key Properties

- No signature — anyone may broadcast
- `amount == T_PETCH.mint_limit` (validator enforces)
- `(amount, blinding)` are **public** — any chain reader audits cumulative supply
- Credited only at depth ≥ 3 (reorg safety)
- First CXFER from a PMINT UTXO re-blinds it back into confidential mode

## TypeScript Interface

```typescript
interface PMintInput {
  assetId: Uint8Array;
  etchTxid: Uint8Array;
  commitment: Uint8Array;
  amount: bigint;
  blinding: Uint8Array;
}

function encodePMint(input: PMintInput): Uint8Array;
function decodePMint(payload: Uint8Array): PMintOutput | null;
```
