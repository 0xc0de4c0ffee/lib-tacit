# Skill: T_PMINT (0x28) — Permissionless Mint

## Domain Knowledge

T_PMINT mints exactly `mint_limit` tokens against a [T_PETCH](./0x27-t-petch.md) fair-launch asset. Anyone may broadcast. The (amount, blinding) are **public** so cumulative supply is auditable.

## Wire Format

```
T_PMINT(1) || asset_id(32) || etch_txid(32) ||
commitment(33) || amount_LE(8) || blinding(32)
```

## Key Properties

- No signature required
- `amount == T_PETCH.mint_limit` (validator enforces)
- Confirmed height must be within PETCH's `[start, end]` window
- Credited at depth >= 3 (reorg safety)
- `(amount, blinding)` are public — any chain reader can `pedersenCommit(amount, blinding) == commitment`

## Implementation

```typescript
const payload = encodePMint({ assetId, etchTxid, commitment: pointToBytes(C), amount: mintLimit, blinding });
```

## Recovery

Trivial: `amount` and `blinding` are in the envelope clear-text. Match `P2WPKH(hash160(my_pub))` to vout[0].
