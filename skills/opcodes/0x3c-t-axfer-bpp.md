# Skill: T_AXFER_BPP (0x3C) — Atomic Settlement with Bulletproofs+

## Domain Knowledge

Bulletproofs+ variant of T_AXFER (0x26). ~14% smaller rangeproof at the same security level. Same wire format as T_AXFER except opcode byte and rangeproof field uses BP+ instead of classic BP.

## Implementation Status

📝 Drafted — `src/opcodes/axfer-bpp.ts` has type definitions and stub wire codec.

## Wire Format

Same as T_AXFER (0x26): op(1) || asset_id(32) || asset_input_count(1) || kernel_sig(64) || N(1) || N×(commitment(33) || ct(8)) || rp_len(2) || rangeproof(BP+, N-dependent size)
