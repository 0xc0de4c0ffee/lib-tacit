# Skill: T_SWAP_ROUTE (0x33) — Multi-Hop Route Swap

## Domain Knowledge

Atomic multi-hop AMM routing via constant-product curve (same as T_SWAP_VAR). Supports 2–8 hops in a single Bitcoin tx. Each hop is a variable-amount swap through a distinct pool. The trader signs once; the settler (e.g. a solver or MEV searcher) fills all hops atomically.

## Implementation Status

✅ Shipped — wire encode/decode in `src/opcodes/amm-swap.ts`. Exports `encodeSwapRoute`, `decodeSwapRoute`, `SwapRouteInput`, `SwapRouteDecoded`, `SwapRouteHop`.

## Wire Format

```
T_SWAP_ROUTE(1)   — 0x33
n_hops(1)         — 2..8
trader_input_asset_id(32)
trader_output_asset_id(32)
min_out(8)        — u64 LE, overall minimum output across route
expiry_height(4)  — u32 LE
trader_pubkey(33) — compressed secp256k1
hops[n_hops]      — each 67 bytes:
  pool_id(32)
  direction(1)    — 0=A→B, 1=B→A
  fee_bps(2)      — u16 LE, 0..1000
  R_A_pre(8)      — u64 LE
  R_B_pre(8)      — u64 LE
  delta_A_net_mag(8) — u64 LE
  delta_B_net_mag(8) — u64 LE
trader_input_txidBE(32)
trader_input_vout(4)  — u32 LE
C_in_secp(33)
C_receipt_secp(33)
r_receipt(32)
range_proof_len(2) — u16 LE
range_proof(N)
kernel_sig(64)     — BIP-340 over kernel_msg
intent_sig(64)     — BIP-340 over intent_msg
```

## Constraints

- `n_hops ∈ [2, 8]`
- `trader_input_asset_id ≠ trader_output_asset_id`
- `range_proof_len > 0`
- Each hop: `direction ∈ {0,1}`, `fee_bps ∈ [0, 1000]`
- All secp pubkeys must be valid compressed curve points
