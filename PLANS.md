# PLANS.md — Architecture & Implementation

## Architecture

`lib-tacit` is a pure TypeScript library that implements the cryptographic and protocol layers of the [tacit confidential token meta-protocol on Bitcoin](https://github.com/z0r0z/tacit). It is designed to be platform-agnostic — zero DOM, zero `window`, zero `localStorage` — so any wallet, indexer, or dapp can reuse the same auditable logic regardless of runtime.

### Design Principles

1. **Pure functions only** — No side effects. All I/O through injected interfaces.
2. **Uint8Array throughout** — No `Buffer` (Node-specific), no hex strings internally.
3. **No classes** — Plain functions and simple data objects match the reference implementation.
4. **TypeScript strict** — Every opcode payload, crypto output, and interface is typed.
5. **Single source of truth** — The canonical [SPEC.md](tacit-specs/SPEC.md) and [tests/](tacit-specs/tests/) in the reference submodule define correctness.

### Dependency Graph

```
opcodes/ ───┐
crypto/ ────┼──> constants/
envelope/ ──┘

wallet/ ──> crypto/ ──> constants/
transaction/ ──> envelope/ ──> constants/
validation/ ──> indexer/ ──> crypto/
recovery/ ──> crypto/ ──> wallet/
```

### Module Map

```
src/
├── constants/     — Opcodes, domain tags, generator vectors, protocol limits
├── crypto/        — Pedersen, Schnorr, ECDH, Bulletproofs, BP+, MSM, Kernel,
│                    Poseidon, Groth16 verifier, stealth address
├── envelope/      — Taproot script-path encode/decode, ByteWriter
├── opcodes/       — 28 shipped + 5 stub/draft modules
├── transaction/   — BIP-143 sighash, TX serialization, P2WPKH address, builder
├── wallet/        — Keypair, UTXO manager, PRF passkey, key encryption
├── indexer/       — Esplora client, ancestry walker
├── validation/    — Ancestry validation, supply conservation checks
├── recovery/      — Chain scan, ECDH trial-decrypt
└── interfaces/    — ChainClient, Broadcaster (abstract)
```

### What's In Scope

| Layer | Modules |
|-------|---------|
| **Crypto** | Pedersen commitments, Bulletproofs (BP + BP+), BIP-340 Schnorr, ECDH blinding, Kernel signatures, Pippenger MSM, Poseidon hash, Groth16 verifier, stealth addresses |
| **Envelope** | Taproot script-path encode/decode, ByteWriter |
| **Opcodes** | CETCH, T_CXFER_BPP, CXFER, T_MINT, T_BURN, T_AXFER, T_AXFER_VAR, T_PETCH, T_PMINT, T_DROP, T_DCLAIM, T_DEPOSIT, T_WITHDRAW, T_WRAPPER_ATTEST, T_SLOT_*, T_CBTC_TAC_* |
| **Transaction** | BIP-143 sighash, TX serialization, P2WPKH address, anchor construction, builder |
| **Wallet** | Key generation, import, export, UTXO manager, PRF passkey, key encryption |
| **Indexer** | Esplora REST client, ancestry walker |
| **Validation** | Ancestry validation, supply conservation |
| **Recovery** | Chain scan, ECDH trial-decrypt of recovery UTXOs |
| **Interfaces** | `ChainClient`, `Broadcaster` (abstract) |

### What's Out of Scope

- DOM rendering, HTML templates, CSS
- External wallet connection (Xverse, UniSat, Leather)
- Passphrase modals, toast notifications
- Network selector, Discover/Market/Holdings/Drops UI
- Faucet, IPFS pin UX, marketplace listing creation
- Chain-data fetching from specific endpoints
- Tx broadcasting to specific endpoints
- DApp-specific signing messages (listingMsg, cancelMsg, claimMsg, axintentMsg-family)

## Implementation Status

All phases complete. See [REVIEW.md](./REVIEW.md) for full comparison vs reference.

- **Phase 1** Foundation ✅
- **Phase 2** Core Crypto + Opcodes ✅
- **Phase 3** Extended Opcodes ✅
- **Phase 4** Remaining Opcodes ✅
- **Phase 5** Crypto Gaps (BP+, Poseidon, Groth16) ✅
- **Phase 6** Validation & Recovery ✅
- **Phase 7** Stealth Addresses ✅
- **Phase 8** Test Coverage (280+ tests across 34 files) ✅
