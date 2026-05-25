# Validation Review — Ancestry, Supply Conservation, Edge Cases, Test Gaps

## Validator Edge Cases

### E' = 0 Check — 🔴 Critical (Defended)

The degenerate kernel excess `E' = ΣC_out - ΣC_in = ZERO` allows forging a kernel signature under the identity point. Rejected in ALL 4 validator paths in the reference `tacit.js`:

| Path | Line | Context |
|------|------|---------|
| CXFER (Σout = Σin, burned=0) | tacit.js:13510 | `markAll(N, false)` on E'=ZERO |
| CXFER w/ partial burn | tacit.js:13590 | Same guard, different code path |
| AXFER (cross-asset) | tacit.js:13663 | `EPrimeV2` check, same guard |
| T_AXFER + CXFER combined | tacit.js:13753 | `markBothTacitVouts(false)` |

Additionally, `src/crypto/kernel.ts:117` checks `if (!EPrime \|\| EPrime.equals(ZERO)) return false` in `verifyKernel`. The `computeExcessPoint` helper (`kernel.ts:72-92`) returns `null` if any commitment fails `tryBytesToPoint` — ZERO fails because its `0x00` prefix is not `0x02/0x03`. Four-layer defense. ✅

### Point Validation

`tryBytesToPoint` (`src/crypto/pedersen.ts:46-50`) validates:
- Length exactly 33 bytes (compressed form) — returns `null` otherwise
- Prefix byte is `0x02` or `0x03` (even/odd Y) — returns `null` for `0x00` (ZERO), `0x04` (uncompressed), or any other prefix
- Curve equation via `secp.ProjectivePoint.fromHex` — throws caught and returns `null`

This is consistently applied before any curve operation: `computeExcessPoint`, `bpRangeAggVerify`, `bpRangeAggBatchVerify`. ✅

### Kernel Msg Count Validation

`computeKernelMsg` (`src/crypto/kernel.ts:32-34`) throws if `inputOutpoints.length > 0xff` or `outputCommitments.length > 0xff`. The count is serialized as a single `u8` byte — values > 255 would silently truncate without this guard. ✅ Guard present.

**Missing: lower bound for 0 inputs.** `verifyKernel` (`kernel.ts:105-122`) checks `sig64.length !== 64` and `inputOutpoints.length !== inputCommitments.length`, but does NOT check `inputOutpoints.length > 0`. Structurally prevented by opcode decoders (every CXFER/BURN/MINT requires at least one asset input), but defense-in-depth would add `if (inputOutpoints.length === 0) return false` to `verifyKernel`. 🟡 Minor.

### T_AXFER Input Count Validation

`decodeAXfer` (`src/opcodes/axfer.ts:62`) checks `assetInputCount < 1 -> return null`. The kernel sig verification in the ancestry walker (`src/indexer/ancestry.ts:271-283`) slices `tx.vin` to the first `assetInputCount` entries. Two-layer defense. ✅

---

## Supply Conservation

### `checkSupplyConservation` (`src/validation/supply.ts:8-19`)

Calls `computeExcessPoint(outputCommitments, inputCommitments, burnedAmount)`. Returns `EPrime !== null` — i.e., true if the excess point is non-degenerate and all commitments parse. No additional supply math at this layer — the point equality `E' = ΣC_out - ΣC_in` IS the conservation proof.

### `checkPublicSupply` (`src/validation/supply.ts:21-28`)

For public amounts (BURN burned amount, PETCH cap, MINT limit): checks `sum(outputValues) <= sum(inputValues)`. Simple integer comparison, no Pedersen involved.

### Fee Output Handling

Bitcoin miners add fee outputs that are NOT tacit outputs. The supply conservation check MUST exclude fee outputs from `ΣC_out`. This is correctly handled by construction:
- The kernel msg (`computeKernelMsg`) only hashes commitment bytes for tacit outputs with Pedersen commitments — NOT BTC fee vouts.
- `computeExcessPoint` only sums the commitment array passed by the caller — fee outputs are simply not included.
- In the ancestry walker (`src/indexer/ancestry.ts`), `vin[0]` is always skipped as the anchor/BTC fee input.

🔵 Info — correctly handled by construction.

---

## Ancestry Validation

### `validateAncestry` (`src/validation/validator.ts:7-24`)

Wraps `AncestryWalker.walkAncestry` (`src/indexer/ancestry.ts:318-336`). Walks each UTXO backward through CXFER/MINT/BURN ancestors to the original CETCH/T_PETCH root. At each hop:
1. Fetches the transaction via `ChainClient.fetchTx`
2. Extracts the envelope witness (`vin[0].witness[1]`)
3. Parses and dispatches by envelope kind
4. For CXFER/AXFER/BURN: calls `verifyKernel` with parent input outpoints and output commitments
5. Recursively validates each parent input UTXO

### Depth Limit

Configurable (default 100, `src/indexer/ancestry.ts:158`). Prevents deep-chain DoS. Each recursive hop fetches one transaction and validates one kernel sig. ✅

### Memoization

Results cached by `txid:vout` key in `memo` Map (`src/indexer/ancestry.ts:154`). Transaction cache in `txMemo` (`src/indexer/ancestry.ts:155`). Asset info in `assetMemo` (`src/indexer/ancestry.ts:156`). `invalidate()` method clears per-key or full cache. 🟡 Not reorg-aware — caller must call `invalidate()` after chain reorg detection.

### Non-Tacit UTXO Handling

`parseEnvelope` (`src/indexer/ancestry.ts:66-128`) checks for `ShippedOpcodes.has(decoded.opcode)` — returns `kind: 'unknown'` for unmatched opcodes. The `walkAncestry` loop breaks on non-tacit parents (can't recursively validate). 🔵 Info.

---

## Test Coverage Gaps

### Current Status

**317 tests, 2433 expect() calls, 36 files** — all passing.

| Category | Files | Notes |
|----------|-------|-------|
| Crypto | 13 | pedersen, schnorr, ecdh, kernel, msm, bp, bpp, poseidon, groth16, stealth, vectors, fixture-signing |
| Opcodes | 15 (14 shipped + preauth-bid) | All round-trip, field bounds, truncated, wrong opcode |
| Integration | 1 | Full etch→mint→burn pipeline |
| Transaction | 2 | Sighash, builder |
| Validation | 2 | Supply conservation, ancestry |
| Recovery | 1 | ECDH trial-decrypt |
| Indexer | 1 | Ancestry walk |
| Envelope | 1 | Round-trip + fuzz |
| Index | 1 | Barrel export |

### Identified Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Extreme amounts (2^64 - 1) not in pinned vectors | 🟡 Minor | Edge of u64 range; BP rejects values ≥ 2^64 |
| Extreme blindings (SECP_N - 1) not tested | 🟡 Minor | modN reduction handles this, but not pinned |
| BP proof bytes NOT pinned | 🔵 Info | Non-deterministic by design (random nonces) |
| Cross-opcode edge cases: CXFER msg ≠ BURN msg same params | ✅ Tested | `tests/crypto/kernel.test.ts` covers this |
| MSM with all-zero scalars | 🟡 Minor | Theoretical issue; MSM returns ZERO for all-zero inputs |
| BP+ m=8 aggregation with 8 zero-value outputs | 🟡 Minor | Zero-value outputs are valid (e.g., DROP per_claim=0 edge) |
| Envelope fuzzing: 200 random buffers | ✅ Tested | `envelope.test.ts` |
| `verifyKernel` with 0 inputs | 🟡 Minor | Structurally prevented by decoders, but no explicit test |
| BURN with 0 outputs | ✅ Tested | Zero-output rangeproof guard tested |
| `computeKernelMsg` with 0 outputs | 🟡 Minor | Allowed by msg structure (BURN can have 0 outputs) |
| `tryBytesToPoint` with point at infinity compressed | 🟡 Minor | 0x00 prefix rejected, but no explicit test |
| Preauth bid decode with truncated fields | ✅ Tested | Boundary tests in `preauth-bid.test.ts` |
