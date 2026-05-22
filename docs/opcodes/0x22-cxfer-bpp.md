# T_CXFER_BPP (0x22) — Confidential Transfer with Bulletproofs+

**Status:** ✅ Shipped — SPEC §5.21

Byte-identical to [CXFER (0x23)](./0x23-cxfer.md) except the rangeproof bytes use Bulletproofs+ instead of Bulletproofs. ~14% smaller witness across `m ∈ {1,2,4,8}`.

## Implementation Status (lib-tacit)

| Component | Status |
|-----------|--------|
| Wire `encodeCXferBpp` / `decodeCXferBpp` | ✅ |
| Classic Bulletproofs verify (`bpRangeAggVerify`) | ❌ Wrong proof type for 0x22 |
| Bulletproofs+ prove/verify (`bppRangeProve` / `bppRangeVerify`) | ✅ `src/crypto/bulletproofs-plus.ts` |

Indexers must dispatch 0x22 witnesses to `bppRangeVerify` (BP+); using the 0x23 classic `bpRangeAggVerify` will reject valid mainnet proofs.
