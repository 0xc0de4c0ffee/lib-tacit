# miniscripts — Tacit × Bitcoin Miniscript R&D

**Status:** Research-only. Speculative design exploration. **Never intended for merge into `main`.**

This branch is an R&D spike investigating how [Bitcoin Miniscript](https://bitcoin.sipa.be/miniscript/) (BIP 379) could be layered into Tacit's existing Taproot script-path envelope architecture to unlock richer spending conditions — timelocked recovery, multisig governance, escrow, atomic swaps, and beyond.

## What This Branch Contains

```
miniscripts/
├── README.md                          ← this file
├── overview.md                        ← why Miniscript matters for Tacit
├── concepts/
│   ├── miniscript-basics.md           ← Miniscript primer (policy language, fragments, types, compilation)
│   ├── taproot-miniscript.md          ← Taproot + Miniscript interplay (key path, script path, multi_a, MuSig2)
│   ├── bip-388-policies.md            ← BIP 388 wallet policy descriptors
│   └── descriptor-wallets.md          ← Descriptor wallet support and integration
├── tacit-integration/
│   ├── current-model.md               ← current tacit taproot envelope architecture
│   ├── byte-comparison.md             ← wire format vs miniscript byte sizing
│   ├── proposed-architecture.md       ← proposed hybrid taproot + miniscript architecture
│   ├── vault-patterns.md              ← vault patterns for high-value assets
│   ├── timelocked-recovery.md         ← timelocked recovery leaf design
│   ├── anchor-outputs.md              ← P2A anchor outputs for CPFP fee bumping
│   ├── dao-gov-miniscript.md          ← DAO governance via miniscript thresh() leaves
│   ├── preauth-bid-htlc.md            ← hashlock-based preauth bid settlement (HTLC)
│   └── escrow-dispute.md              ← escrow / dispute resolution with thresh()
├── examples/
│   ├── fee-estimation-example.md      ← fee estimation from miniscript descriptors
│   ├── psbt-flow.md                   ← PSBT coordination flow for multi-sig
│   ├── timelock-recovery-wsh.md       ← P2WSH descriptor with timelocked recovery
│   ├── taproot-tacit-envelope.md      ← taproot envelope integration example
│   └── policy-to-script.md            ← policy-to-script compilation walkthrough
└── analysis/
    ├── fees.md                        ← fee quantification envelope vs miniscript
    ├── security.md                    ← security analysis and attack surface
    ├── privacy.md                     ← privacy analysis script-path vs key-path
    ├── tradeoffs-p2wsh-vs-taproot-vs-envelope.md  ← tradeoff comparison
    └── adoption-roadmap.md            ← phased adoption roadmap
```

## Relationship to `tacit-specs/`

The canonical spec lives at `tacit-specs/SPEC.md` (`refs/tacit-specs` submodule). This branch does **not** modify any specification file. All research here is exploratory — if any pattern proves viable it would be proposed as an amendment to the tacit spec and implemented in `src/` on a separate feature branch.

## Guiding Questions

1. Can a Miniscript leaf replace the existing `OP_CHECKSIG OP_FALSE OP_IF … OP_ENDIF` envelope structure for specific opcodes?
2. Can we embed a Miniscript-based recovery path alongside the canonical envelope without breaking any existing validator?
3. Can Miniscript `multi_a` (BIP 386) express Tacit multisig governance with fewer bytes than the existing approach?
4. What does the satisfaction algorithm look like when a subset of the witness must also supply kernel-sig data, Pedersen openings, and range proofs?

## Out of Scope

- Anything requiring a Bitcoin consensus change
- Modifications to the existing shipped-opcode wire formats
- Production readiness, test vectors, or integration with the indexer
