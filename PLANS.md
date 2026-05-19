# PLANS.md — Architecture & Implementation Roadmap

## Architecture

`@tacit/lib` is a pure TypeScript library that implements the cryptographic and protocol layers of the [tacit confidential token meta-protocol on Bitcoin](https://github.com/z0r0z/tacit). It is designed to be platform-agnostic — zero DOM, zero `window`, zero `localStorage` — so any wallet, indexer, or dapp can reuse the same auditable logic regardless of runtime.

### Design Principles

1. **Pure functions only** — No side effects. All I/O through injected interfaces.
2. **Uint8Array throughout** — No `Buffer` (Node-specific), no hex strings internally.
3. **No classes** — Plain functions and simple data objects match the reference implementation.
4. **TypeScript strict** — Every opcode payload, crypto output, and interface is typed.
5. **Single source of truth** — The canonical [SPEC.md](tacit-specs/SPEC.md) and [tests/](tacit-specs/tests/) in the reference submodule define correctness.

### Dependency Graph

```
opcodes/ ──┐
crypto/ ───┼──> constants/
envelope/ ──┘

wallet/ ──> crypto/ ──> constants/
transaction/ ──> envelope/ ──> constants/
```

### What's In Scope

| Layer | Modules |
|-------|---------|
| **Crypto** | Pedersen commitments, Bulletproofs (BP), BIP-340 Schnorr, ECDH blinding, Kernel signatures, Pippenger MSM |
| **Envelope** | Taproot script-path encode/decode, ByteWriter |
| **Opcodes** | CETCH, CXFER, T_MINT, T_BURN, T_AXFER, T_AXFER_VAR, T_PETCH, T_PMINT, T_DROP, T_DCLAIM, T_DEPOSIT, T_WITHDRAW |
| **Transaction** | BIP-143 sighash, TX serialization, P2WPKH address, anchor construction |
| **Wallet** | Key generation, import, export (secp256k1) |
| **Interfaces** | `ChainClient`, `Broadcaster` (abstract) |

### What's Out of Scope

- DOM rendering, HTML templates, CSS
- External wallet connection (Xverse, UniSat, Leather)
- In-browser key encryption (AES-GCM localStorage)
- Passphrase modals, toast notifications
- Network selector, Discover/Market/Holdings/Drops UI
- Faucet, IPFS pin UX, marketplace listing creation
- Chain-data fetching from specific APIs
- Tx broadcasting to specific endpoints

## Implementation Phases

### Phase 1: Foundation ✅
- git init, bun init, submodule clone
- `constants/` — opcodes, domains, generators, limits
- `crypto/` — pedersen, schnorr, ecdh, msm
- `envelope/` — script, payload (ByteWriter)
- `transaction/` — sighash, serialize, address
- `wallet/` — keypair
- `interfaces/` — ChainClient, Broadcaster

### Phase 2: Core Crypto + Opcodes ✅
- `crypto/bulletproofs.ts` — BP range proofs (prove, verify, batch verify)
- `crypto/kernel.ts` — kernel signatures, asset ID, mint msg
- `opcodes/etch.ts` — CETCH encode/decode
- `opcodes/transfer.ts` — CXFER encode/decode
- `opcodes/mint.ts` — T_MINT encode/decode
- `opcodes/burn.ts` — T_BURN encode/decode

### Phase 3: Extended Opcodes ✅
- `opcodes/axfer.ts` — T_AXFER encode/decode
- `opcodes/petch.ts` — T_PETCH encode/decode
- `opcodes/pmint.ts` — T_PMINT encode/decode
- `opcodes/drop.ts` — T_DROP encode/decode
- `opcodes/dclaim.ts` — T_DCLAIM encode/decode

### Phase 4: Remaining Opcodes (TODO)
- `opcodes/axfer-var.ts` — T_AXFER_VAR (0x37)
- `opcodes/transfer-bpp.ts` — CXFER_BPP (0x22)
- `opcodes/deposit.ts` — T_DEPOSIT (0x29)
- `opcodes/withdraw.ts` — T_WITHDRAW (0x2A)
- `crypto/bulletproofs-plus.ts` — BP+ variant
- `crypto/poseidon.ts` — Poseidon hash
- `crypto/groth16.ts` — Groth16 verifier (optional snarkjs)

### Phase 5: Validation & Recovery (TODO)
- `validation/validator.ts` — recursive ancestry validation
- `validation/supply.ts` — supply conservation checks
- `recovery/scanner.ts` — chain scan for UTXO recovery
- `recovery/decrypt.ts` — ECDH trial-decrypt

### Phase 6: Tests & Docs (TODO)
- Port reference tests to TypeScript
- Write per-opcode documentation
- Write crypto documentation
- Write architecture documentation
- Write skills files for AI agents

## Known Gaps vs Reference

1. **BP+ proofs (T_CXFER_BPP)** — 0x22 opcode not yet implemented; ~14% smaller witnesses
2. **Mixer (T_DEPOSIT / T_WITHDRAW)** — Poseidon + Groth16 circuit not yet ported
3. **AMM opcodes** — T_LP_ADD, T_LP_REMOVE, T_SWAP_BATCH, T_SWAP_VAR etc. (ceremony-gated, drafted status)
4. **Self-custody slot** — T_SLOT_MINT/BURN/ROTATE/SPLIT/MERGE
5. **cBTC.tac lien** — T_CBTC_TAC_DEPOSIT/WITHDRAW/FORCE_CLOSE
6. **Validator** — recursive ancestry walk is currently in the dapp-only reference
7. **Recovery scanner** — privkey-only chain scan + ECDH trial-decrypt
8. **On-chain protocol tests** — ported offline tests exist but not yet in this repo
