# T_CXFER_BPP (0x22) — Confidential Transfer with Bulletproofs+

**Status:** ✅ Shipped (signet bake) — SPEC §5.21

Byte-identical to [CXFER (0x23)](./0x23-cxfer.md) except the rangeproof bytes use Bulletproofs+ instead of Bulletproofs. ~14% smaller witness across `m ∈ {1,2,4,8}`.

## Implementation Status

Not yet implemented in `@tacit/lib`. See `tacit-specs/dapp/bulletproofs-plus.js` for the reference BP+ prover/verifier.
