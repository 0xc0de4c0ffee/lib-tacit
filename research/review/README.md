# tacit-specs v1 — Research Review

## Purpose

This directory contains a comprehensive security, cryptography, and design
review of the **tacit confidential token meta-protocol on Bitcoin**. The
reference being audited is `tacit-specs/` — the git submodule pinned at
[z0r0z/tacit](https://github.com/z0r0z/tacit).

## Scope

| Artifact | Role |
|----------|------|
| `tacit-specs/SPEC.md` (3748 lines) | Canonical protocol specification |
| `tacit-specs/dapp/tacit.js` | Monolithic reference dapp — source of truth for shipped opcode encode/decode |
| `tacit-specs/dapp/bulletproofs-plus.js` | BP+ reference (907 LOC, cofactor-8 port to secp256k1) |
| `tacit-specs/tests/composition.mjs` | Reference composition (Schnorr, ECDH, kernel, opcode wire) |
| `tacit-specs/tests/bulletproofs.mjs` | Reference BP implementation (Pedersen, MSM, IPA) |
| `tacit-specs/tests/vectors.test.mjs` | Pinned hex test vectors |
| `tacit-specs/tests/envelope.test.mjs` | Envelope script round-trip + rejection |
| `tacit-specs/spec/` | Circuits, glossary, AMM wire formats, amendments |

## Methodology

1. **Code audit** — TypeScript implementation in `src/` cross-referenced against
   the reference `tacit-specs/dapp/tacit.js` for behavioral equivalence
2. **Design analysis** — Cryptographic invariants documented in SPEC.md and
   `docs/` compared against implementation
3. **Edge-case enumeration** — Zero scalars, identity points, empty arrays,
   degenerate commitments, boundary values for every primitive
4. **Post-quantum threat model** — Shor-vulnerable primitives identified,
   migration horizon estimated, hash-based survivors catalogued

## Severity Rubric

| Icon | Level | Meaning |
|------|-------|---------|
| 🔴 | **Critical** | Breaks protocol security (inflation, double-spend, supply bypass) if exploitable |
| 🟠 | **Major** | Significant design concern, implementation risk, or subtle correctness issue |
| 🟡 | **Minor** | Edge case, missing defense-in-depth, documentation gap |
| 🔵 | **Info** | Documented, accepted, or purely theoretical — no action required |

## Finding Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | 🔴 | E' = 0 degenerate kernel sig — rejected in 4 separate validator paths | Defended |
| 2 | 🟠 | BP+ cofactor-8 port (all `INV_EIGHT`/`scalarmult8` removed) — most dangerous porting trap | Mitigated by KAT |
| 3 | 🟠 | BP transcript challenge=0 with complex retry handling — re-implementations may diverge | Mitigated by spec |
| 4 | 🟡 | Even-Y convention for kernel scalar negation NOT documented in SPEC.md | Cross-impl risk |
| 5 | 🟡 | `computeKernelMsg` allows 0 inputs (structurally prevented by decoder) | Defense-in-depth |
| 6 | 🟡 | BP transcript challenge=0 re-hash uses unlabeled `0x01` suffix | Non-standard |
| 7 | 🟡 | `deriveBlinding` output bias < 2^(-128) from `% SECP_N` | Accepted |
| 8 | 🟡 | `deriveBlinding` does not guard against r=0 output (~2^-256) | Negligible |
| 9 | 🟡 | No cross-opcode `bytesToPoint` try/catch in MINT DROP verify | Missing validation |
| 10 | 🔵 | NUMS H counter not revealed in spec | Documented design |
| 11 | 🔵 | `bpRangeAggBatchVerify` returns true for 0 items | Accepted |
| 12 | 🔵 | `safeMult(..., 0n)` returns ZERO — consumed downstream | Documented |
| 13 | 🔵 | Blinding reuse prevented by Bitcoin consensus, not crypto | Accepted |
| 14 | 🔵 | secp256k1 cofactor=1 eliminates small-subgroup attacks | Benefit |
| 15 | 🔵 | `pedersenCommit` silently reduces amount and blinding mod N | BP layer defends |
| 16 | 🔵 | Schnorr `signSchnorr` throws on zero seckey; not guarded at call site | Spec requirement |
| 17 | 🔵 | `verifySchnorr` returns `false` (no throw) on bad inputs | Correct |
| 18 | 🔵 | `verifyKernel` returns `false` (no throw) on bad points | Correct |

## Post-Quantum Threat Model

| Primitive | Broken by | Survives? | Notes |
|-----------|-----------|-----------|-------|
| Schnorr (BIP-340) | Shor (ECDLP) | ❌ | Core signing primitive |
| ECDH | Shor (ECDLP) | ❌ | Blinding derivation, stealth addresses |
| Pedersen commitment binding | Shor (ECDLP) | ❌ | `C = a·H + r·G` — H's dlog w.r.t G is everything |
| Bulletproofs (classic & BP+) | Shor (ECDLP) | ❌ | IPA rounds, polynomial commitments |
| Groth16 / BN254 | Shor (BN254 DLP) | ❌ | Mixer withdraw circuit |
| SHA256 / HMAC | Grover (quadratic) | ✅ | ~2^128 preimage resistance |
| Poseidon | Grover (quadratic) | ✅ | ~2^128 preimage resistance |
| Nullifiers / Merkle roots | Grover (quadratic) | ✅ | Hard to invert |

### Qubit Estimates

- **secp256k1**: ~2337 logical / ~7.4M physical qubits (Roetteler et al. 2017)
- **IBM roadmap**: 200K qubits by 2033, 1M+ by 2035+
- **Likely threat horizon**: 15–25 years before EC-DLP is practically breakable

## The Hard Problem: Kernel Sig Homomorphism

The protocol's additive homomorphism — `E' = ΣC_out - ΣC_in` — is its
greatest strength (compact supply verification) **and** its greatest PQ
migration challenge. Hash-based commitments are not additively homomorphic.

Three migration paths exist, none trivial:

1. **STARKs over a PQ-safe field** (FRI-based). No elliptic curves needed.
   Proofs are large (~100 KB+) but the homomorphism is expressed as a circuit
   constraint rather than a group equation.
2. **Lattice-based commitments** (ML-KEM/Kyber-style). Additive
   homomorphism exists over structured lattices (Ring-LWE). The kernel sig
   becomes an ML-DSA-style proof. Witness sizes balloon.
3. **UTXO-level accounting** — Abandon tx-level kernel sigs entirely.
   Each UTXO carries its own range proof; supply conservation becomes an
   indexer-level aggregate computation rather than a cryptographic proof.
   Requires protocol fork.

## Files

| File | Contents |
|------|----------|
| `crypto-review.md` | Full cryptography primitive-by-primitive analysis |
| `README.md` | This file — overview, methodology, findings, PQ model |

All code references point to `src/` paths (TypeScript implementation) unless
noted as `tacit-specs/` (reference JavaScript).
