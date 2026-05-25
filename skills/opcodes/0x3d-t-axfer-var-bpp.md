# Skill: T_AXFER_VAR_BPP (0x3D) — Variable-Amount Atomic Settlement with BP+

## Domain Knowledge

Bulletproofs+ variant of T_AXFER_VAR (0x37). ~14% smaller rangeproof at the same security level. Same wire format as T_AXFER_VAR except opcode byte and rangeproof field.

## Implementation Status

✅ Shipped — full wire encode/decode in `src/opcodes/axfer-var-bpp.ts`. Exports `encodeAXferVarBpp`, `decodeAXferVarBpp`, `AXFERVarBPPInput`, `AXFERVarBPPOutput`.

## Wire Format

Same as T_AXFER_VAR (0x37).
