# T_DEPOSIT (0x29) — Shielded Pool Deposit

**Status:** ✅ Shipped (SPEC §5.10)

## Wire Format

```
T_DEPOSIT(1) || asset_id(32) || denomination(8) ||
[pool_denom(8) || vk_cid_len(1) || vk_cid || ceremony_cid_len(1) || ceremony_cid || init_sig(64)]
  — only if denom=0 (POOL_INIT)
[leaf_commitment(32) || kernel_sig(64)]
  — only if denom>0 (DEPOSIT)
```

## Implementation Status

Not yet implemented in `@tacit/lib`.
