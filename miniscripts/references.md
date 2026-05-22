# References: Miniscript for Tacit

## BIPs (Bitcoin Improvement Proposals)

| BIP | Title | Relevance |
|-----|-------|-----------|
| [BIP 340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) | Schnorr Signatures | Core signing primitive for key-path spends and MuSig2 aggregation |
| [BIP 341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki) | Taproot | Enables key-path vs script-path spends; the foundation of the proposed architecture |
| [BIP 342](https://github.com/bitcoin/bips/blob/master/bip-0342.mediawiki) | Tapscript | Extended opcodes for taproot script-path spends (64 B signatures, OP_CHECKSIGADD, etc.) |
| [BIP 370](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki) | PSBTv2 | Partially Signed Bitcoin Transaction format v2 — needed for hardware wallet coordination |
| [BIP 371](https://github.com/bitcoin/bips/blob/master/bip-0371.mediawiki) | Taproot PSBT Fields | PSBT fields for taproot inputs/outputs (control blocks, leaf scripts, tap tree) |
| [BIP 379](https://github.com/bitcoin/bips/blob/master/bip-0379.mediawiki) | Miniscript | Formal miniscript type system and non-malleable satisfaction algorithm |
| [BIP 380–389](https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki) | Output Script Descriptors | Standardized format for describing output scripts (BIP 380: general, 381: raw, 382: pkh, 383: sh, 384: wsh, 385: tr, 386: rawtr, 387: combo, 388: wallet policies, 389: multisig) |
| [BIP 388](https://github.com/bitcoin/bips/blob/master/bip-0388.mediawiki) | Wallet Policies | Defines how wallets exchange miniscript policy descriptors (used by Liana, Sparrow, etc.) |
| [BIP 431](https://github.com/bitcoin/bips/blob/master/bip-0431.mediawiki) | TRUC (v3 Transactions) | Topologically Restricted Until Confirmation — enables 1-parent-1-child CPFP with predictable topology |

---

## Bitcoin Core Pull Requests

| PR | Title | Version | Relevance |
|----|-------|---------|-----------|
| [#24147](https://github.com/bitcoin/bitcoin/pull/24147) | Miniscript backend | v25.0 | Core miniscript parsing, analysis, and satisfaction |
| [#24148](https://github.com/bitcoin/bitcoin/pull/24148) | Miniscript in watchonly wallets | v25.0 | Descriptor wallets can watch miniscript outputs |
| [#24149](https://github.com/bitcoin/bitcoin/pull/24149) | Miniscript signing | v25.0 | `signrawtransactionwithwallet` for miniscript |
| [#27255](https://github.com/bitcoin/bitcoin/pull/27255) | Tapscript miniscript | v26.0 | Miniscript support for taproot script-path spends |
| [#26567](https://github.com/bitcoin/bitcoin/pull/26567) | Descriptor fee estimation | v26.0 | Accurate fee estimation for miniscript-based spends |
| [#30352](https://github.com/bitcoin/bitcoin/pull/30352) | Pay-to-Anchor | v28.0 | P2A output type for CPFP fee bumping |
| [#21283](https://github.com/bitcoin/bitcoin/pull/21283) | PSBTv2 | (2026) | Full PSBTv2 support for multi-party miniscript coordination |
| [#29675](https://github.com/bitcoin/bitcoin/pull/29675) | MuSig2 wallet support | v31.0 | Key aggregation for taproot internal keys |

---

## Production Wallets (Miniscript Support)

| Wallet | Miniscript Type | Notes |
|--------|-----------------|-------|
| [Liana](https://wizardsardine.com/liana/) | P2WSH miniscript | Flagship miniscript wallet; timelocked recovery; BIP 388 wallet policies |
| [Sparrow](https://sparrowwallet.com/) | P2WSH + Taproot | Descriptor-based; supports miniscript via BIP 388; hardware wallet integration |
| [Specter DIY](https://specter.solutions/) | P2WSH miniscript | Miniscript support since v1.5.0; multisig via descriptors |
| [MyCitadel](https://mycitadel.io/) | P2WSH miniscript | Miniscript since v1.3.0; focus on multisig and timelocks |
| [Nunchuk](https://nunchuk.io/) | Multisig descriptors | Multisig via descriptors; miniscript in development |

---

## Libraries

| Library | Language | Relevance |
|---------|----------|-----------|
| [rust-miniscript](https://github.com/rust-bitcoin/rust-miniscript) | Rust | Reference miniscript implementation; policy-to-miniscript compiler; type-checking; satisfaction |
| [Bitcoin Core miniscript](https://github.com/bitcoin/bitcoin/tree/master/src/miniscript) | C++ | Production miniscript in Bitcoin Core v25+; used by all Core-derived wallets |
| [bdk (Bitcoin Dev Kit)](https://github.com/bitcoindevkit/bdk) | Rust | Wallet library using rust-miniscript; descriptor-based; supports P2WSH and taproot |
| [libwally-core](https://github.com/ElementsProject/libwally-core) | C | C library with miniscript support; used by Jade and other hardware wallets |
| [bip340](https://github.com/bitcoin/bips/blob/master/bip-0340/reference.py) | Python | Reference BIP 340 implementation (useful for testing) |
| [miniscript.fee](https://miniscript.fee/) | — | Official miniscript website with playground, docs, and examples |

---

## Reference Documentation

| Document | Source | Relevance |
|----------|--------|-----------|
| [Miniscript specification](https://bitcoin.sipa.be/miniscript/) | Pieter Wuille | Original miniscript writeup (pre-BIP) |
| [BIP 379 spec text](https://github.com/bitcoin/bips/blob/master/bip-0379.mediawiki) | BIP | Formal miniscript type system and satisfaction algorithm |
| [Bitcoin Core descriptors.md](https://github.com/bitcoin/bitcoin/blob/master/doc/descriptors.md) | Bitcoin Core | Descriptor language reference |
| [Output Script Descriptors](https://bitcoindevkit.org/descriptors/) | BDK docs | Practical guide to descriptors |
| [Wizardsardine Miniscript Field Report](https://wizardsardine.com/blog/) | Wizardsardine | Production learnings from Liana (miniscript wallet) |
| [Bitcoin Optech Newsletter](https://bitcoinops.org/en/newsletters/) | Optech | Weekly coverage of miniscript, taproot, and related developments |
| [Miniscript Policy Language](https://miniscript.fee/playground) | miniscript.fee | Interactive policy → miniscript compiler |
| [Miniscript.fee Analysis](https://miniscript.fee/analysis) | miniscript.fee | Analyze miniscript properties (malleability, satisfaction cost, etc.) |

---

## Related Reading

| Topic | Reference |
|-------|-----------|
| Taproot background | [Taproot Overview](https://bitcoinops.org/en/topics/taproot/) (Bitcoin Optech) |
| Covenants | CheckTemplateVerify, CheckOutputDataVerify (BIP 119), TXHASH/CSFS |
| MuSig2 | [MuSig2 BIP draft](https://github.com/bitcoin/bips/pull/1492) |
| Cross-input aggregation | [BIP draft: cross-input signature aggregation](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) |
| Silent Payments | [BIP 352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) — static address without on-chain linkability |
| Atomic swaps | [Scriptless threshold adaptor signatures](https://github.com/BlockchainCommons/SmartCustody/blob/master/Docs/Scriptless.md) |
| OP_VAULT | [BIP 345](https://github.com/bitcoin/bips/blob/master/bip-0345.mediawiki) — vault-optimized opcode proposal |

---

## Tacit-Specific References

| File | Location | Relevance |
|------|----------|-----------|
| SPEC.md | `tacit-specs/SPEC.md` | Canonical protocol spec (opcode table, wire formats) |
| tacit.js | `tacit-specs/dapp/tacit.js` | Source of truth for shipped opcode encode/decode |
| GLOSSARY.md | `tacit-specs/spec/GLOSSARY.md` | Protocol glossary |
| envelopes | `spec/AMENDMENTS.md` | stealth, preauth-bid, AMM, farm amendment specs |
| src/envelope/script.ts | `src/envelope/script.ts` | Current taproot envelope implementation |
| src/crypto/kernel.ts | `src/crypto/kernel.ts` | Kernel signature logic (would become key-path signing) |
| src/crypto/schnorr.ts | `src/crypto/schnorr.ts` | In-house BIP 340 implementation |
| src/transaction/sighash.ts | `src/transaction/sighash.ts` | Sighash computation (needs tapscript leaf updates) |
| docs/crypto/validation.md | `docs/crypto/validation.md` | Validation layers reference |

---

## Glossary

| Term | Definition |
|------|------------|
| **Internal key** | The key used for taproot key-path spends |
| **Leaf script** | A script in the taproot merkle tree |
| **Control block** | Merkle proof connecting a script to the taproot output, included in witness |
| **Miniscript** | A structured language for representing Bitcoin scripts with type-checking and non-malleability guarantees |
| **Descriptor** | A string representation of an output script template with key placeholders |
| **BIP 388** | Wallet policy descriptor standard — enables exchange of miniscript policies between wallets |
| **MuSig2** | Multi-signature scheme for aggregating multiple keys into a single taproot internal key |
| **TRUC/v3** | Topologically Restricted Until Confirmation — v3 transactions with 1-child-1-parent CPFP |
| **P2A** | Pay-to-Anchor — output type for dedicated fee bumping |
| **HASSIG** | Miniscript property: every satisfaction must include at least one signature |
| **`or_d`** | Miniscript fragment: "or with delay" — left branch preferred, right branch has timelock |
| **`thresh`** | Miniscript fragment: k-of-n threshold |
