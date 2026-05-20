# T_CXFER_BPP (0x22) — Confidential Transfer with Bulletproofs+

**Status:** ✅ Shipped (signet bake) — SPEC §5.21

Byte-identical to [CXFER (0x23)](./0x23-cxfer.md) except the rangeproof bytes use Bulletproofs+ instead of Bulletproofs. ~14% smaller witness across `m ∈ {1,2,4,8}`.

## Implementation Status (lib-tacit)

| Component | Status |
|-----------|--------|
| Wire `encodeCXferBpp` / `decodeCXferBpp` | ✅ |
| Classic Bulletproofs verify (`bpRangeAggVerify`) | ❌ Wrong proof type for 0x22 |
| Bulletproofs+ prove/verify | ❌ Port from `tacit-specs/dapp/bulletproofs-plus.js` |

Indexers must dispatch 0x22 witnesses to a BP+ verifier; using the 0x23 classic verifier will reject valid mainnet proofs.
