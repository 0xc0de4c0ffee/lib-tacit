# T_CBTC_TAC_FORCE_CLOSE (0x4B) — cBTC.tac Force Close

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.38)

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
liquidator_payout_pk(33) || amm_swap_min_BTC_out(8) || bind_hash(32)
```

Total fixed size: 107 bytes.

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `liquidator_payout_pk` must encode a valid secp256k1 point
- `amm_swap_min_BTC_out` ≥ 0
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.38
