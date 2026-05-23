# T_AXFER_BPP (0x3C) — Atomic Settlement with Bulletproofs+

**Status:** 📝 Drafted (SPEC-AXFER-BPP-AMENDMENT)

BP+ variant of T_AXFER (0x26). Same wire format except for the leading opcode byte (0x3C vs 0x26) and the rangeproof bytes (BP+ instead of classic BP).

## Wire Format

Same as T_AXFER (0x26): the encoder/decoder interfaces match byte-for-byte. The only difference is that the rangeproof field contains a Bulletproofs+ aggregated proof instead of a classic Bulletproof.

## Library Implementation

📝 Drafted — `src/opcodes/axfer-bpp.ts` has type definitions and stub wire codec.
