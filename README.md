# lib-tacit

Pure TypeScript library for the **tacit confidential token meta-protocol on Bitcoin**. Provides Pedersen commitments, Bulletproofs range proofs, Mimblewimble-style kernel signatures, ECDH blinding derivation, and full opcode encode/decode for 28 shipped opcodes — zero DOM, zero UI, reusable by any wallet, indexer, or dapp.

```bash
bun add lib-tacit @noble/secp256k1 @noble/hashes @scure/base poseidon-lite
```

## Features

- **Pedersen commitments** — amount-hiding commitments over secp256k1 with NUMS generator H
- **Bulletproofs (classic)** — aggregated range proofs (n=64 bits, m ∈ {1,2,4,8}) with Pippenger MSM; **Bulletproofs+ verify for 0x22 is not included yet** (wire codec only)
- **Kernel signatures** — Mimblewimble-style conservation-of-supply proofs
- **ECDH blinding** — deterministic amount encryption/decryption from privkey + chain data
- **BIP-340 Schnorr** — in-house sign/verify implementation (independent of noble's schnorr)
- **Opcode encode/decode** — 28 shipped opcodes:
  CETCH (0x21), T_CXFER_BPP (0x22), CXFER (0x23), T_MINT (0x24), T_BURN (0x25),
  T_AXFER (0x26), T_PETCH (0x27), T_PMINT (0x28), T_DEPOSIT (0x29),
  T_WITHDRAW (0x2A), T_DROP (0x2B), T_DCLAIM (0x2C), T_AXFER_VAR (0x37),
  T_WRAPPER_ATTEST (0x38), T_SLOT_* (0x43–0x47), T_CBTC_TAC_* (0x49–0x4F, 0x57–0x5A)
- **Taproot envelopes** — script-path envelope construction (TACIT magic, version, chunked pushdata)
- **Transaction tools** — BIP-143 sighash (ALL, SINGLE|ACP), tx serialization, P2WPKH address derivation
- **Wallet keypair** — secp256k1 key generation, import, export
- **PRF passkey wallet** — WebAuthn PRF extension for biometric key derivation (browser)
- **Key encryption** — AES-GCM + PBKDF2-SHA256 encrypted-at-rest private key storage
- **UTXO manager** — caching, selection, sort, and spend-marking for signing flows
- **Abstract interfaces** — `ChainClient` and `Broadcaster` for pluggable backends
- **Zero dependencies on browser APIs** — runs in Node.js, Bun, Deno, and browsers

## Quick Start

```typescript
import {
  // Key management
  generateKeypair, importPrivkey, derivePubkey, p2wpkhAddress,
  // Pedersen commitments
  pedersenCommit, pedersenVerify, G, H,
  // ECDH blinding & encryption
  deriveBlinding, deriveChangeBlinding, encryptAmount, decryptAmount,
  // Kernel signatures
  computeKernelMsg, signKernel, verifyKernel, assetIdFor,
  // Bulletproofs
  bpRangeAggProve, bpRangeAggVerify,
  // Opcode encode/decode
  encodeCEtch, decodeCEtch, encodeCXfer, decodeCXfer,
  // Schnorr
  signSchnorr, verifySchnorr,
  // Constants
  Opcode, SECP_N, N_BITS,
  // Transaction
  p2wpkhScript, buildAnchor,
} from 'lib-tacit';

// Generate a wallet
const wallet = generateKeypair();
const address = p2wpkhAddress(wallet.pub, 'bc'); // mainnet

// Etch a new asset
const anchor = buildAnchor(commitTxid, 0);
const supply = 1_000_000n;
const rBlind = deriveEtchBlinding(wallet.priv, anchor);
const C = pedersenCommit(supply, rBlind);
const { proof } = bpRangeAggProve([supply], [rBlind]);

const payload = encodeCEtch({
  ticker: 'MYTOKEN',
  decimals: 2,
  commitment: pointToBytes(C),
  encryptedAmount: encryptAmount(supply, deriveEtchAmountKeystream(wallet.priv, anchor)),
  rangeproof: proof,
});
```

## Module Map

```
lib-tacit
├── constants/     — Opcodes, domain tags, generator vectors, protocol limits
├── crypto/        — Pedersen, Schnorr, ECDH, Bulletproofs, MSM, Kernel
├── envelope/      — Taproot script-path encode/decode, ByteWriter
├── opcodes/       — 28 shipped + 5 stub/draft modules (see AGENTS.md for full list)
├── transaction/   — BIP-143 sighash, TX serialization, P2WPKH address
├── wallet/        — Keypair, UTXO manager, PRF passkey, key encryption
├── indexer/       — Esplora client, ancestry walker
└── interfaces/    — ChainClient, Broadcaster (abstract)
```

## Test

```bash
bun test      # 100+ tests, isolated from tacit-specs/ (pinned vectors in tests/crypto/vectors.test.ts)
bun run typecheck
bun run build
```

## Validation model

Opcode `decode*` functions parse **wire format only**. A parsed envelope is not valid tacit state until you also run kernel verification, range proofs, and amount–commitment checks. See [docs/crypto/validation.md](docs/crypto/validation.md).

`verifyKernel` returns `false` on malformed commitments (never throws). Use `tryBytesToPoint` when parsing individual points from untrusted payloads.

## Trust Model

This library implements the cryptographic primitives from [SPEC.md](tacit-specs/SPEC.md). It contains **no network I/O and no DOM access**. Consumers (wallets, indexers, dapps) are responsible for:

- Chain data fetching (`ChainClient` interface)
- Transaction broadcasting (`Broadcaster` interface)
- Key storage (encrypted localStorage, hardware wallet, etc.)
- UI rendering

## License

MIT — same as the [reference implementation](https://github.com/z0r0z/tacit).
