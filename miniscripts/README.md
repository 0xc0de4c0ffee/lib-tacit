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
│   └── taproot-miniscript.md          ← Taproot + Miniscript interplay (key path, script path, multi_a, MuSig2)
├── tacit-integration/                 ← integration sketches (empty in this branch)
├── examples/                          ← worked examples (empty in this branch)
└── analysis/                          ← analysis notes (empty in this branch)
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
