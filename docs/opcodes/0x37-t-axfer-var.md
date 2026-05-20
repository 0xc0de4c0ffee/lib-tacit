# T_AXFER_VAR (0x37) — Variable-Amount Atomic Settlement

**Status:** ✅ Shipped (SPEC §5.7)

T_AXFER_VAR extends T_AXFER with continuous-amount partial-fill semantics. The taker can fill any amount in `[min_fill, max_amount]` instead of a fixed amount. N=2 outputs exactly (recipient + change). Mandatory OP_RETURN(80) for dual-party recovery.

## Library Implementation

✅ `encodeAXferVar`, `decodeAXferVar` — exported from `lib-tacit`.
