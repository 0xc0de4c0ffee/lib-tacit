# Skill: T_SWAP_VAR (0x32) — Variable-Amount Swap

## Domain Knowledge

Per-trade variable-amount AMM swap. Uses a sigma cross-curve proof. Shipped per §5.20.

## Implementation Status

✅ Shipped — full wire encode/decode + pool helpers in `src/opcodes/amm-swap.ts`. Exports `encodeSwapVar`, `decodeSwapVar`, `swapVarCurveDeltaOut`, `SwapVarInput`, `SwapVarDecoded`.
