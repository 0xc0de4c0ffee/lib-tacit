# T_AXFER_VAR_BPP (0x3D) — Variable-Amount Atomic Settlement with BP+

**Status:** 📝 Drafted (SPEC-AXFER-BPP-AMENDMENT)

BP+ variant of T_AXFER_VAR (0x37). Same wire format except for the leading opcode byte (0x3D vs 0x37) and the rangeproof bytes.

## Library Implementation

📝 Drafted — `src/opcodes/axfer-var-bpp.ts` has type definitions and stub wire codec.
