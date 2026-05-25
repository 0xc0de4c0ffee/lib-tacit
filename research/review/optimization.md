# Optimization & Extension — v1 Design

## 1. BP+ as Default Range Proof

**Current:** Classic Bulletproofs (688 B for m=1) is the rangeproof used by CXFER (0x23), MINT (0x24), BURN (0x25), and AXFER (0x26). BP+ (~591 B for m=1) is only used by T_CXFER_BPP (0x22).

**Saving:** ~97 B per confidential output (14% witness reduction).

**Effort:** Moderate. Two approaches:
- **A:** Create new opcode variants (T_CXFER_ADV, T_MINT_ADV) that use BP+ exclusively. New opcode assignments needed.
- **B:** Soft-upgrade existing opcodes by adding a version flag byte to the wire format. The decoder dispatches to BP or BP+ verifier based on the flag. Backwards-compatible (old clients reject new version bytes).

**Priority: High** — witness size is the dominant cost center for confidential transfers. A 14% reduction at 97 B/tx compounds across all network activity. BP+ has been production-audited in the Monero ecosystem since 2020.

**Risk:** BP+ has no batch verifier yet in lib-tacit. `bpRangeAggBatchVerify` only wraps the single-proof verifier. A follow-up would implement the BP+ batch verifier (Bünz et al. 2020 §7.2) for indexer performance.

---

## 2. Cross-Input Rangeproof Aggregation

**Current:** One rangeproof per transaction, aggregating N output commitments into a single BP/BP+ proof. The aggregation is per-transaction only.

**Proposed:** Extend BP+ aggregation to cover outputs across multiple transactions in batch settlement protocols (e.g., exchange netting, AMM block settlement). A single BP+ m=8 proof can cover 8 commitments from different transactions.

**Saving:** ~6× for N=8 vs per-output proofs. A batch of 8 CXFERs currently costs 8 × 688 = 5,504 B in rangeproofs. A single BP+ m=8 is ~1,100 B. Saving: ~4,400 B (80%).

**Effort:** Research problem. Requires:
1. Batch coordinator that collects output commitments from multiple transactions
2. BP+ verifier API change: `bppRangeVerify(V_pts[], proof)` → `bppRangeVerify(commitments[][], proof)`
3. New opcode or protocol rule for batch proof submission

**Priority: Medium** — batch transfers are common in exchange/OTC settlement, but the protocol rule change needs community coordination.

---

## 3. Precomputed MSM Generator Table

**Current:** The Pippenger MSM (`src/crypto/msm.ts`) recomputes the signed-digit bucket table on every call. It does cache `lastGenLen` for same-length calls (`msm.ts:157-162`), so repeated calls with 64 generators reuse the table.

**Impact:** MSM is called ~20× per BP verification (one for each round of the inner-product argument). With 72 generators (G_vec 64 + H_vec 64 + Q 1, but only G_vec + H_vec = 64 at full rounds), each round's MSM computes a fresh bucket table.

**Proposed:**
- Precompute the full bucket table for G_vec (64 gen), H_vec (64 gen), and Q (1 gen) once at module load.
- Use a `PrecomputedMSM` class with lazy initialization:
  - First call triggers `buildTable(generators, c)`
  - Subsequent calls reuse the table
  - `c` (window size) is chosen adaptively: c=3 for ≤16 gen, c=4 for 17-64, c=5 for >64
- The BP verifier calls `precomputedMsm(scalars)` instead of `msm(generators, scalars)`.

**Saving:** ~50-100 ms per BP verification. For an indexer validating 1,000 transactions, this is 50-100 seconds saved.

**Effort:** Low. Add `PrecomputedMSM` class in `src/crypto/msm.ts`. The existing `lastGenLen` cache is a partial optimization; full precomputation extends it.

**Priority: Medium** — performance improvement for indexers, batch verification, and full-chain sync.

---

## 4. Compact Kernel Msg for 1:1 Transfers

**Current:** `computeKernelMsg` hashes the full serialization: domain tag + asset ID + input count + all input outpoints (36 B each) + output count + all output commitments (33 B each) + burned amount (8 B).

**For N=1 input, N=1 output** (the most common CXFER pattern: one asset input, one change output):
- Current: domain(14) + assetId(32) + count(1) + txid_BE(32) + vout_LE(4) + count(1) + commitment(33) + burn(8) = 125 B → SHA256
- Proposed: precompute a compact hash with fixed offsets, skipping the count bytes. Hash: domain + assetId + txid_BE + vout_LE + commitment. Saves 2 B.

**Saving:** ~2 B in hash preimage (32 fewer bytes of SHA256 compression function input). Marginal — the compression function processes 64-byte blocks, so the preimage goes from 2 blocks to 2 blocks (125 B and 123 B both round up to 128 B of SHA256 input). **No actual saving.**

**Effort:** Low, but also no benefit. Not worth a protocol change.

**Priority: Very Low.**

---

## 5. Envelope-Free Metadata (T_PETCH Optimization)

**Current:** T_PETCH payload is ~30 B (ticker, decimals, cap/minit, etc.) but the envelope wrapping adds 45 B of fixed overhead (pubkey push, OP_CHECKSIG, OP_FALSE OP_IF, magic, version, OP_ENDIF). Total on-chain: ~76 B.

**Proposed:** Move T_PETCH metadata to extra witness elements (per v2 rethink). Instead of embedding in a Taproot script-path spend envelope, encode metadata as `OP_RETURN` or annex fields. Drops the 45 B envelope overhead.

**Saving:** ~45 B (60% reduction for PETCH-type metadata transactions).

**Effort:** Moderate. Requires a new "metadata witness" protocol rule. Could be done as a soft upgrade — existing indexers that look for the `"TACIT"` magic would need to also check for the new format.

**Priority: Medium** — small ops benefit most from envelope removal. For a single-UTXO asset creation, 45 B overhead is a large fraction of the total.

---

## 6. Sparse Commitment Format

**Current:** All commitments use full 33 B compressed points (0x02/03 || x-coordinate).

**Proposed:** For outputs known to be within a low range (e.g., DROP per-claim amounts ≤ 2^32), use a compact format: 32 B x-only coordinate + 1 B flag indicating expected Y parity. The verifier tries both parities on mismatch.

**Saving:** ~1 B per commitment. Marginal.

**Effort:** Low for the format change. The verifier complexity increases slightly (must handle both 32 B and 33 B commitment formats). Not backwards-compatible without a flag byte.

**Priority: Very Low** — 1 B per commitment is not worth the engineering complexity or compatibility break.

---

## 7. Hardware Wallet Integration (BIP 388)

**Current:** tacit uses custom PSBT fields and custom signing logic. No hardware wallet support — all signing occurs in JavaScript via `@noble/secp256k1`.

**Proposed:** Register tacit policies via BIP 388 wallet policies. Use standard BIP 371 Taproot PSBT fields. This unlocks:
- Ledger/Trezor/Coldcard support for tacit transactions
- Air-gapped signing workflows
- Multi-signer coordination (PSBT round-trips)

**Effort:** High. Requires:
- Mapping tacit opcode envelopes to BIP 388 descriptors
- Modifying the signing flow (`signKernel`, `signSchnorr`) to accept partially-signed PSBTs
- Wallet UI changes for PSBT display and approval
- Registering tacit-specific PSBT fields with BIP repository

**Priority: High** — hardware wallet support is the most requested feature for production deployments. Without it, tacit requires hot-wallet signing, which limits custodial and high-value use cases.

---

## 8. Migration Path Summary

| # | Optimization | Saving | Effort | Priority |
|---|-------------|--------|--------|----------|
| 1 | BP+ as default rangeproof | 97 B/tx (14%) | Moderate | High |
| 2 | Cross-input BP+ aggregation | ~6× for N=8 | Research | Medium |
| 3 | Precomputed MSM table | 50-100 ms/verify | Low | Medium |
| 4 | Compact kernel msg (1:1) | ~0 B (no block saving) | Low | Very Low |
| 5 | Envelope-free metadata | 45 B (60%) | Moderate | Medium |
| 6 | Sparse commitment format | 1 B/commit | Low | Very Low |
| 7 | BIP 388 hardware wallet | N/A (new capability) | High | High |

---

## Post-Quantum Migration (Long-term)

### Primitive Replacement Table

| Primitive | PQ Replacement | Maturity | Impact |
|-----------|---------------|----------|--------|
| BIP-340 Schnorr (kernel sigs) | FALCON-1024 or SPHINCS+ | NIST-standardized (2024) | 1-8 KB sigs, new curve or hash |
| ECDH blinding | ML-KEM (Kyber) | NIST-standardized (2024) | New key exchange, no additive homomorphism |
| Pedersen commitments | Hash-based commitments (Merkle) | Well-studied | NOT homomorphic — breaks kernel equation |
| Bulletproofs (classic) | STARKs (FRI-based) | Production in StarkWare, RiscZero | Larger proofs (tens of KB), hash-only assumptions |
| Bulletproofs+ | STARKs (FRI-based) | Production | Same as classic BP |
| Groth16/BN254 | Plonk w/ PQ-friendly arithmetization | Active research | Larger proofs, no trusted setup |

### The Kernel Sig Problem

The additive homomorphism `E' = ΣC_out - ΣC_in` is essential to the kernel sig equation. No practical PQ commitment scheme is additively homomorphic at comparable efficiency.

Three viable paths:

**Path A: UTXO-level accounting (hard fork).** Remove kernel sigs entirely. Each UTXO proves its own validity with a range proof. Supply conservation is an indexer-level aggregation over all UTXOs. Requires hard fork of the meta-protocol, invalidates all existing kernel-sig validation. Prohibitively expensive for on-chain verification at scale.

**Path B: Lattice-based additive commitments.** Replace Pedersen with Ring-LWE commitments. Additive homomorphism exists over `R_q = Z_q[X]/(X^n + 1)`. Kernel sig becomes a Ring-LWE proof. Witness sizes grow from 33 B (compressed point) to ~1 KB per commitment. Theoretical constructions exist (Fujisaki-Okamoto over lattices) but no practical implementation matches secp256k1 scale.

**Path C: Hybrid migration (pragmatic).** Keep EC-based Pedersen commitments for on-chain efficiency. Add PQ fallback signatures via FALCON/Sphincs. This is the most practical near-term approach — used by Apple iMessage PQ3 (2024), Signal PQXDH (2023), and Google Chrome. The kernel sig equation remains on secp256k1; the PQ signature is an additional layer for metadata integrity.

### Timeline

| Year | Milestone | Impact on secp256k1 |
|------|-----------|---------------------|
| 2026 | IBM 1k logical qubits | No impact |
| 2028 | IBM 10k logical qubits | Research attacks on small curves |
| 2033 | 200k logical qubits | ~1/37 of qubits needed for secp256k1 |
| 2040 | 1M logical qubits | ~1/7 of qubits needed |
| 2045+ | 7.4M logical qubits | secp256k1 DLP broken in hours |

**Recommendation:** Begin PQ migration documentation by 2028. Concrete migration proposal by 2033. Path C (hybrid) is the recommended first step — low protocol impact, high security gain.
