# lib-tacit

Pure TypeScript library for the **tacit confidential token meta-protocol on Bitcoin**. Provides Pedersen commitments, Bulletproofs range proofs, Mimblewimble-style kernel signatures, ECDH blinding, stealth addresses, BIP-352 silent payments, and full opcode encode/decode for 32 shipped opcodes — zero DOM, zero UI, reusable by any wallet, indexer, or dapp.

```bash
bun add lib-tacit @noble/secp256k1 @noble/hashes @scure/base poseidon-lite @helia/verified-fetch
```

---

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
| | Stealth addresses | Blinded-pubkey commits (`tcs`/`tcsts`), ECDH blinding, scan/send |
| | Silent payments | BIP-352 sender-side silent payment output derivation (`sp1` addresses) |
| | xor32 | XOR two 32-byte arrays for encryption/commitment helpers |
| **Opcodes** | 32 shipped encode/decode | CETCH · T_CXFER_BPP · CXFER · T_MINT · T_BURN · T_AXFER · T_PETCH · T_PMINT · T_DEPOSIT · T_WITHDRAW · T_DROP · T_DCLAIM · T_AXFER_VAR · T_WRAPPER_ATTEST · T_AXFER_BPP · T_AXFER_VAR_BPP · T_SLOT_* · T_CBTC_TAC_* · T_PREAUTH_BID · T_PREAUTH_BID_VAR |
| **Envelope** | Taproot script-path | TACIT magic, version, chunked pushdata encode/decode |
| **Transaction** | Tools | BIP-143 sighash (ALL, SINGLE\|ACP), tx serialization, P2WPKH address, preauth, builder, taproot primitives |
| **Wallet** | Keypair | secp256k1 generation, import, export |
| | PRF passkey | WebAuthn PRF extension for biometric key derivation (browser) |
| | Key encryption | AES-GCM + PBKDF2-SHA256 encrypted-at-rest storage |
| | UTXO manager | Caching, selection, sort, spend-marking |
| **Indexer** | Esplora client | REST client with base rotation, concurrency cap, cooldown |
| | Ancestry walker | Memoized, depth-limited, kernel-sig validated |
| | IPFS | Trustless content retrieval via helia + gateway (`cidToV1`, `ipfsFetchVerified`) |
| **Validation** | Ancestry | Recursive ancestry validation |
| | Supply | Pedersen + public supply conservation checks |
| **Recovery** | Scanner | Chain scan for UTXO recovery |
| | Decrypt | ECDH trial-decrypt of encrypted amounts |
| **Interfaces** | ChainClient | Abstract chain data access (fetchTx, fetchUTXOs, etc.) |
| | Broadcaster | Abstract transaction submission |
| **Runtime** | Cross-platform | Zero DOM, zero window, runs in Node.js, Bun, Deno, and browsers |

---

## Quick Start

```typescript
import {
  generateKeypair, importPrivkey, derivePubkey, p2wpkhAddress,
  pedersenCommit, pedersenVerify, G, H,
  deriveBlinding, deriveChangeBlinding, encryptAmount, decryptAmount,
  computeKernelMsg, signKernel, verifyKernel, assetIdFor,
  bpRangeAggProve, bpRangeAggVerify,
  encodeCEtch, decodeCEtch, encodeCXfer, decodeCXfer,
  signSchnorr, verifySchnorr,
  Opcode, SECP_N, N_BITS,
  p2wpkhScript, buildAnchor, pointToBytes,
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

---

## Module Map

```
lib-tacit
├── constants/     — Opcodes, domain tags, generator vectors, protocol limits
├── crypto/        — Pedersen, Schnorr, ECDH, Bulletproofs, MSM, Kernel,
│                    stealth, silent-payments, primitives
├── envelope/      — Taproot script-path encode/decode, ByteWriter
├── opcodes/       — 32 shipped modules (0x21–0x5C)
├── transaction/   — BIP-143 sighash, TX serialization, P2WPKH address,
│                    taproot primitives (taggedHash, controlBlock, etc.)
├── wallet/        — Keypair, UTXO manager, PRF passkey, key encryption
├── indexer/       — Esplora client, ancestry walker, IPFS verified fetch
├── validation/    — Ancestry validation, supply conservation
├── recovery/      — Chain scan, ECDH trial-decrypt
└── interfaces/    — ChainClient, Broadcaster (abstract)
```

---

## Cryptographic Invariants

These guarantees are enforced at the protocol level and hold regardless of wallet implementation:

1. **Pedersen binding** — H is a NUMS generator with no known discrete log wrt G. Two implementations producing different H would reject each other's proofs. This is the foundation of the confidential amount system.

2. **Kernel sig soundness** — Every confidential transaction proves supply conservation via `E' = ΣC_out - ΣC_in`. If `E' = 0` (degenerate, all commitments cancel out), the kernel is rejected. `verifyKernel` returns `false` (never throws) on bad points or length mismatch.

3. **Domain separation** — Every HMAC, BIP-340 message, and Bulletproofs transcript uses a unique v1 domain tag (e.g. `tacit-kernel-v1`, `tacit-blind-v1`, `tacit-drop-v1`). Cross-context replay is cryptographically impossible — no signature from one opcode can substitute for another.

4. **Anchor uniqueness** — Each UTXO's anchor is `(txid_BE || vout_LE)`. Bitcoin consensus prevents double-spends, so no two outputs across all valid envelopes can share an anchor. This guarantees blinding uniqueness.

5. **Amount verification** — `amount_ct` is XOR with an HMAC-derived keystream. The Pedersen commitment provides the integrity check: tampering with the ciphertext yields a candidate amount that fails `pedersenCommit(candidate, r) == C`.

---

## Validation Model

Decode functions (`decodeCXfer`, `decodeCEtch`, etc.) parse **wire format only**. A parsed envelope is not valid tacit state until you also run:

1. **Kernel verification** — `verifyKernel` checks supply conservation
2. **Range proofs** — `bpRangeAggVerify` / `bppRangeVerify` check amounts are in range [0, 2^64)
3. **Amount–commitment consistency** — `pedersenVerify` checks encrypted amount matches commitment

This is the three-layer model:
- **Layer 1 (Wire)**: `decode*` returns `null` on malformed bytes
- **Layer 2 (Points)**: `tryBytesToPoint` before curve ops on untrusted commitments
- **Layer 3 (Crypto)**: `verifyKernel`, range proofs, amount checks

Decoders never substitute for layer 3.

---

## How to Verify Correctness

1. Compare against `tacit-specs/tests/composition.mjs` for Schnorr, ECDH, kernel, and opcode wire formats
2. Check pinned hex vectors in `tests/crypto/vectors.test.ts` for NUMS generators, asset IDs, blindings
3. Compare against `tacit-specs/dapp/tacit.js` for wire format encode/decode functions
4. Compare against `tacit-specs/dapp/bulletproofs-plus.js` for BP+ crypto
5. Run `bun run typecheck && bun run build && bun test` (421+ tests)

---

## Test

```bash
bun run specs:pull   # fetch latest tacit-specs submodule
bun test             # 421+ tests, isolated from tacit-specs/
bun run typecheck
bun run build
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@noble/hashes` | 1.4.0 | SHA256, HMAC, RIPEMD160, keccak |
| `@noble/secp256k1` | 2.1.0 | secp256k1 curve operations |
| `@scure/base` | 1.1.6 | bech32, base58 encoding |
| `poseidon-lite` | 0.3.0 | Poseidon hash over BN254 |
| `@helia/verified-fetch` | 7.2.10 | Trustless IPFS content retrieval |
| `snarkjs` | 0.7.6 | Groth16 zk-proof verification (optional) |

---

## Trust Model

This library implements the cryptographic primitives from [SPEC.md](tacit-specs/SPEC.md). It contains **no network I/O and no DOM access**. Consumers are responsible for:

- Chain data fetching (`ChainClient` interface)
- Transaction broadcasting (`Broadcaster` interface)
- Key storage (encrypted localStorage, hardware wallet, etc.)
- UI rendering

---

## License

MIT — same as the [reference implementation](https://github.com/z0r0z/tacit).
