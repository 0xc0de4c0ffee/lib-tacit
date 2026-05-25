# T_AXFER_VAR_BPP (0x3D) — Variable-Amount Atomic Settlement with BP+

**Status:** ✅ Shipped (SPEC-AXFER-BPP-AMENDMENT)

BP+ variant of T_AXFER_VAR (0x37). Same wire format except for the leading opcode byte (0x3D vs 0x37) and the rangeproof bytes.

## Library Implementation

✅ Shipped — full wire encode/decode in `src/opcodes/axfer-var-bpp.ts`. Exports `encodeAXferVarBpp`, `decodeAXferVarBpp`, `AXFERVarBPPInput`, `AXFERVarBPPOutput`.
