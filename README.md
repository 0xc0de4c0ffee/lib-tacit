# lib-tacit

Pure TypeScript library for the **tacit confidential token meta-protocol on Bitcoin**. Provides Pedersen commitments, Bulletproofs range proofs, Mimblewimble-style kernel signatures, ECDH blinding derivation, and full opcode encode/decode for 32 shipped opcodes — zero DOM, zero UI, reusable by any wallet, indexer, or dapp.

```bash
bun add lib-tacit @noble/secp256k1 @noble/hashes @scure/base poseidon-lite
```

## Features

| Category | Feature | Description |
|----------|---------|-------------|
| **Crypto** | Pedersen commitments | Amount-hiding `C = a·H + r·G` over secp256k1 with NUMS generator H |
| | Bulletproofs (classic) | Aggregated range proofs (n=64 bits, m∈{1,2,4,8}) with Pippenger MSM |
| | Bulletproofs+ (0x22) | ~14% smaller aggregated range proofs (m∈{1,2,4,8}) |
| | BIP-340 Schnorr | In-house sign/verify, independent of noble's schnorr |
| | ECDH blinding | Deterministic amount encryption/decryption from privkey + chain data |
| | Kernel signatures | Mimblewimble-style conservation-of-supply proofs |
| | Poseidon hash | BN254 hash for mixer Merkle trees (via poseidon-lite) |
| | Groth16 verifier | Optional snarkjs integration for zk-proof verification |
| | Stealth addresses | Blinded-pubkey commits (tcs/tcsts), ECDH blinding, scan/send |
| | Silent payments | BIP-352 sender-side silent payment output derivation (sp1... addresses) |
| | xor32 | XOR two 32-byte arrays for encryption/commitment helpers |
| **Opcodes** | 32 shipped encode/decode | CETCH (0x21) · T_CXFER_BPP (0x22) · CXFER (0x23) · T_MINT (0x24) · T_BURN (0x25) · T_AXFER (0x26) · T_PETCH (0x27) · T_PMINT (0x28) · T_DEPOSIT (0x29) · T_WITHDRAW (0x2A) · T_DROP (0x2B) · T_DCLAIM (0x2C) · T_AXFER_VAR (0x37) · T_WRAPPER_ATTEST (0x38) · T_AXFER_BPP (0x3C) · T_AXFER_VAR_BPP (0x3D) · T_SLOT_* (0x43–0x47) · T_CBTC_TAC_* (0x49–0x4F, 0x57–0x5A) · T_PREAUTH_BID (0x5B) · T_PREAUTH_BID_VAR (0x5C) |
| **Envelope** | Taproot script-path | TACIT magic, version, chunked pushdata encode/decode |
| **Transaction** | Tools | BIP-143 sighash (ALL, SINGLE\|ACP), tx serialization, P2WPKH address, preauth, builder, taproot primitives |
| **Wallet** | Keypair | secp256k1 generation, import, export |
| | PRF passkey | WebAuthn PRF extension for biometric key derivation (browser) |
| | Key encryption | AES-GCM + PBKDF2-SHA256 encrypted-at-rest storage |
| | UTXO manager | Caching, selection, sort, spend-marking |
| **Indexer** | Esplora client | REST client with base rotation, concurrency cap, cooldown |
| | Ancestry walker | Memoized, depth-limited, kernel-sig validated |
| | IPFS | Trustless content retrieval via helia + gateway (cidToV1, ipfsFetchVerified) |
| **Validation** | Ancestry | Recursive ancestry validation |
| | Supply | Pedersen + public supply conservation checks |
| **Recovery** | Scanner | Chain scan for UTXO recovery |
| | Decrypt | ECDH trial-decrypt of encrypted amounts |
| **Interfaces** | ChainClient | Abstract chain data access (fetchTx, fetchUTXOs, etc.) |
| | Broadcaster | Abstract transaction submission |
| **Runtime** | Cross-platform | Zero DOM, zero window, runs in Node.js, Bun, Deno, and browsers |

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
├── crypto/        — Pedersen, Schnorr, ECDH, Bulletproofs, MSM, Kernel, stealth, silent-payments, primitives
├── envelope/      — Taproot script-path encode/decode, ByteWriter
├── opcodes/       — 32 shipped modules (see AGENTS.md for full list)
├── transaction/   — BIP-143 sighash, TX serialization, P2WPKH address, taproot primitives
├── wallet/        — Keypair, UTXO manager, PRF passkey, key encryption
├── indexer/       — Esplora client, ancestry walker, IPFS verified fetch
├── validation/    — Ancestry validation, supply conservation
├── recovery/      — Chain scan, ECDH trial-decrypt
└── interfaces/    — ChainClient, Broadcaster (abstract)
```

## Test

```bash
bun run specs:pull   # fetch latest tacit-specs submodule (read-only reference)
bun test             # 419+ tests, isolated from tacit-specs/ (pinned vectors in tests/crypto/vectors.test.ts)
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

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@noble/hashes` | 1.4.0 | SHA256, HMAC, RIPEMD160, keccak |
| `@noble/secp256k1` | 2.1.0 | secp256k1 curve operations |
| `@scure/base` | 1.1.6 | bech32, base58 encoding |
| `poseidon-lite` | 0.3.0 | Poseidon hash over BN254 |
| `@helia/verified-fetch` | 7.2.10 | Trustless IPFS content retrieval |
| `snarkjs` | 0.7.6 | Groth16 zk-proof verification (optional) |

## License

MIT — same as the [reference implementation](https://github.com/z0r0z/tacit).
