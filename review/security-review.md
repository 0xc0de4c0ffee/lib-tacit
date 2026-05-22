# Security Review — MEV, Race Conditions, Griefing, Replay, Trust Model

## MEV Analysis

### Commit-reveal frontrunning

**Impossible.** The kernel signature (`src/crypto/kernel.ts:96-101`) binds the excess `E' = ΣC_out - ΣC_in` to specific input outpoints and output commitments via `computeKernelMsg` (`kernel.ts:26-58`). An attacker who observes the committal cannot forge a reveal with different outputs because:
1. The kernel sig verification (`kernel.ts:105-122`) recovers `E'` from the on-chain commitments.
2. Forging a valid kernel sig requires the discrete log of `E'` — i.e., ECDLP.

✅ No commit-reveal MEV.

### Preauth-bid two-completors

**Race, one winner.** Two sellers who observe the same preauth-bid commitment both construct valid reveals. Bitcoin consensus settles exactly one; the other's tx is rejected by mempool (double-spend). Loser loses commit-tx fee. Identical to Lightning HTLC race resolution. ✅

### Preauth-bid seller griefing

`tacit-specs/spec/amendments/SPEC-PREAUTH-BID-AMENDMENT.md:564-580` — after the seller broadcasts the commit tx but before the reveal confirms, the buyer can double-spend the funding outpoint in a `SIGHASH_ALL` self-spend. The seller loses their commit-tx fee (~$1-3 mainnet). Acknowledged in SPEC §5.7.11 as a known limitation. **Not value-extractive griefing** (buyer recovers their full pre-funded amount minus the seller's commit fee — the buyer gains nothing economically). 🔵 Info.

### Dust pinning

SPEC §5.7.11 — attacker broadcasts a low-fee transaction occupying the buyer's input UTXO. Honest buyer must RBF or wait for mempool eviction. The attacker's cost is the dust tx fee. This is a known limitation of Bitcoin's mempool policy, not specific to tacit. 🔵 Info.

### DROP claim race

`src/opcodes/drop.ts:127-184` decodes the drop. `tacit-specs/SPEC.md:2653-2654` — first valid `T_DCLAIM` reveal wins. Loser forfeits commit-tx fee. Claim output is pubkey-bound (recipient is the claimant's P2WPKH) — a frontrunner cannot redirect the output. ✅

### Shielded withdrawal

`T_WITHDRAW` (`0x2A`) uses a Groth16 proof binding `(nullifier, recipient, Merkle root, denomination)`. `tacit-specs/SPEC.md:2421` — indexers atomically check + insert the nullifier. A frontrunner cannot forge a withdrawal proof. ✅

### AMM uniform clearing price

`tacit-specs/SPEC.md:3180` — `T_SWAP_BATCH` enforces uniform clearing price within a batch. Cross-batch curation MEV is a known tradeoff (see AMM.md §"Curation-MEV mitigation"). The V1 arbiter block at wire slot is reserved (`SPEC.md:2884`) for a follow-up amendment.

---

## Atomic Intent Double-Spend Race

**🟠 Major — Not cryptographically prevented.**

`tacit-specs/SPEC.md:1401-1402`:

> **Maker double-spend race.** Between fulfilment-posting and taker-broadcast, the maker could in principle race-spend the asset UTXO in another tx.

The flow:
1. Maker posts intent listing (off-chain, via worker).
2. Taker requests fulfilment.
3. Maker broadcasts commit tx, then reveals the `(amount, blinding)` opening to the taker.
4. **Between step 3 and the taker's broadcast of the reveal tx, the maker can spend the asset UTXO in a different transaction.**
5. If the maker's race-spend confirms first, the taker's reveal is invalid (stale input).

**Mitigation (operational only):**
- Taker broadcasts immediately on receiving fulfilment (dApp's "Take" button).
- CPFP (child-pays-for-parent) if needed.
- Same race as ordinals atomic listings, Magic Eden marketplace, and every off-chain Bitcoin exchange protocol.

**Long-term fix:** Requires OP_CTV (BIP-119) or OP_VAULT (BIP-345) for covenant-level enforcement. SPEC §5.7.7 (`tacit-specs/SPEC.md:1720`) acknowledges this:

> A future protocol revision with on-chain escrow (true buyer-funded atomic settlement) is feasible via either (a) BIP-119 OP_CTV / BIP-345 OP_VAULT once one ships at consensus, or (b) a two-commit architecture.

Same race exists for preauth-sale (`SPEC.md:1950`):

> **Seller double-spend race.** Between publish and settlement broadcast, the seller can spend the asset UTXO in a different tx.

---

## Cross-Opcode Replay

### Kernel sig domain shared between CXFER and T_AXFER

`src/crypto/kernel.ts:37` uses `te.encode(KERNEL_MSG_DOMAIN)` (= `tacit-kernel-v1`). Both `computeKernelMsg` (used by CXFER) and `computeExcessPoint` + `verifyKernel` (used by both CXFER and T_AXFER) share this domain tag.

**Why this is safe:** The kernel msg structure includes `(assetId, inputOutpoints, outputCommitments, burnedAmount)`. The outpoints and commitments are transaction-specific. A kernel sig valid for a CXFER cannot be replayed as a T_AXFER kernel because:
- CXFER expects `ΣC_out = ΣC_in` (burnedAmount = 0).
- T_AXFER expects the same equation but with different outpoints and potentially different asset inputs.
- The `verifyKernel` function (`kernel.ts:105-122`) enforces `inputOutpoints.length === inputCommitments.length` and `E' ≠ ZERO`.

An attacker who rewraps a CXFER's kernel sig into a T_AXFER envelope must also supply the exact same input outpoints and output commitments — but those outpoints are already spent by the original CXFER. Bitcoin consensus prevents double-spending them.

**🔵 Info — Not exploitable.** Domain tag reuse is a cosmetic concern, not a security bug. A follow-up could add separate `tacit-axfer-kernel-v1` for defense-in-depth, but there is no concrete replay path.

### All other signing domains

Every other BIP-340 message domain, HMAC keystream domain, and SHA256 domain is unique per context (`src/constants/domains.ts`). Cross-context replay is impossible. ✅

---

## Trust Model

### Single-key kernel

If the kernel private key (the blinding excess `Σr_out - Σr_in`) is compromised, the attacker can:
1. Spend any tacit UTXO controlled by that key.
2. Forge kernel signatures for arbitrary transfers.

**Impact scope:** All UTXOs derived from the same key. Same trust model as any Bitcoin wallet (single key → single point of failure).

**Mitigation:** Standard key management — hardware wallets, multi-sig (future — not yet implemented), passkey-based wallets (`src/wallet/prf.ts`).

### NUMS generators (H, G_vec, H_vec, Q)

`src/crypto/pedersen.ts:62-78` derives H via `SHA256("tacit-generator-H-v1")` + counter → tryPoint. `src/crypto/bulletproofs.ts:88-100` derives G_vec/H_vec/Q via the same pattern with different domain strings.

**If the discrete log of H wrt G is discovered:** The entire protocol's binding is broken — any Pedersen commitment can be opened to any amount under any blinding. Pedersen `C = a·H + r·G` becomes malleable.

**If the discrete log of BP generators is discovered:** BP soundness collapses — a prover could forge range proofs.

**Prevention:** NUMS (Nothing-Up-My-Sleeve) construction. The discrete log would require solving ECDLP for a point derived from a public SHA256 hash. Equivalent to breaking secp256k1.

**Pinned vectors:** `src/constants/generators.ts` — cross-implementations must produce the exact same hex points or all proofs fail. This is already caught by `tests/crypto/vectors.test.ts`.

### BP generators

Same NUMS derivation as H (`src/crypto/bulletproofs.ts:106-114`). Pinned vectors in `src/constants/generators.ts:9-17`. If an implementation uses a typo'd domain string, it silently produces different generators and rejects every proof from canonical implementations. ✅ (The pinned vectors catch this, which is the point.)

### Miner trust

Miners see all tacit protocol data:
- Envelope payload is in the witness stack (visible on chain).
- Commitments, encrypted amounts, rangeproofs, kernel sigs — all visible.

**Miner capabilities:**
- Cannot forge proofs (cryptographic binding).
- Can censor transactions (standard mempool policy).
- Can reorder transaction within a block (standard MEV).
- Can delay confirmation (fee-based prioritization).

**Bottom line:** Same as any Bitcoin protocol — miners are untrusted but constrained by consensus.

### Indexer trust

Indexers validate kernel sigs, rangeproofs, and supply conservation.

**Malicious indexer capabilities:**
- Falsely report supply (show more or less than actual).
- Serve stale or fabricated UTXO data.
- Censor specific transactions from their API.

**User mitigations:**
- Trust-but-verify: validate kernel sigs locally (`verifyKernel` at `src/crypto/kernel.ts:105-122`).
- Supply audit: re-derive `E'` from chain data (`src/validation/supply.ts`).
- Run own indexer (Esplora client + ancestry walker at `src/indexer/`).
- Check rangeproof validity (`bpRangeAggBatchVerify` at `src/crypto/bulletproofs.ts:340-498`).

---

## Post-Quantum Threat Model

### ECDLP-based primitives — broken by Shor's algorithm

Everything that depends on the hardness of the discrete log on secp256k1:

| Primitive | File | Broken? |
|-----------|------|---------|
| Kernel signatures (`Schnorr`) | `src/crypto/schnorr.ts` | ✅ Broken |
| ECDH key exchange | `src/crypto/ecdh.ts` | ✅ Broken |
| Pedersen commitments | `src/crypto/pedersen.ts` | ✅ Broken |
| Bulletproofs range proofs | `src/crypto/bulletproofs.ts` | ✅ Broken |
| BP+ range proofs | `src/crypto/bulletproofs-plus.ts` | ✅ Broken |
| Groth16 (KZG-based) | `src/crypto/groth16.ts` | ✅ Broken |
| Stealth address DH | `src/crypto/stealth.ts` | ✅ Broken |

**What survives a quantum adversary:**

| Component | File | Survives? | Why |
|-----------|------|-----------|-----|
| Asset ID derivation (SHA256) | `src/crypto/kernel.ts:263-268` | ✅ Survives | Hash-based; Grover's gives ~2^128 security |
| Domain tags | `src/constants/domains.ts` | ✅ Survives | Static strings; no crypto dependency |
| Nullifier privacy (SHA256 of secret) | `src/opcodes/withdraw.ts` | ✅ Survives | Hash collision resistance |
| Envelope structure | `src/envelope/script.ts` | ✅ Survives | Script bytes, no crypto |
| Bitcoin tx structure | `src/transaction/sighash.ts` | ✅ Survives | Hash-based (BIP-143) |
| UTXO set management | `src/wallet/utxo-manager.ts` | ✅ Survives | Offline storage |
| Ticker/decimals metadata | `src/opcodes/etch.ts` | ✅ Survives | Plaintext metadata |

### Hardest property to replace post-quantum

The **additive homomorphism of Pedersen commitments** — `C(a₁) + C(a₂) = C(a₁ + a₂)` — enables the kernel excess `E' = ΣC_out - ΣC_in` to prove supply conservation without revealing individual amounts.

Post-quantum homomorphic commitments exist (e.g., lattice-based), but:
1. They are **much larger** (kilobytes vs 33 bytes per Pedersen point).
2. The BP/BP+ rangeproofs that prove amounts are in-range also rely on Pedersen homomorphism + ECDLP.
3. No post-quantum rangeproof scheme with comparable efficiency to Bulletproofs exists at this protocol's security level (128-bit PQ).

**A port to PQ-crypto would require replacing the entire cryptographic stack**, including kernel sigs, rangeproofs, and commitments, while maintaining the wire format sizes. This is a protocol-level redesign, not a module swap.

### Timeline

- Current security level: ≈ 128-bit classical (secp256k1).
- Shor's algorithm requires ≈ 4096 logical qubits for secp256k1 — not feasible today but projected within 10-15 years (assuming fault-tolerant quantum computing advances).
- `lib-tacit`'s defense: the domain-tagged hash structure means a PQ-migration can reuse the same wire format structure with new crypto primitives. The envelope, opcode dispatch, and validation layers are crypto-agnostic.

---

## Summary of Severity Findings

| Severity | Finding | Status |
|----------|---------|--------|
| ✅ Safe | Commit-reveal frontrunning | Cryptographically prevented (kernel sig) |
| 🟠 Major | Atomic intent double-spend race | Operational mitigation only; covenant-level fix deferred |
| 🔵 Info | Kernel sig domain shared CXFER/T_AXFER | Not exploitable; cosmetic concern |
| ✅ Safe | Cross-opcode replay (all other domains) | Different domain tags per context |
| ✅ Safe | Asset ID collision | Disjoint preimage sizes + SHA256 |
| 🔵 Info | PUSHDATA4 not handled | Safe rejection (null) |
| ✅ Safe | Decoders never throw | Consistent null-return pattern |
| 🔵 Info | DROP/DCLAIM claim race | Bitcoin consensus settles winner |
| 🔵 Info | Preauth-bid seller griefing | Acknowledged in SPEC; buyer gains nothing |
| ✅ Safe | NUMS generator soundness | Pinned vectors cross-check derivation |
| 🟢 Future | Post-quantum migration | All ECDLP primitives broken by Shor's; hash-based components survive |
