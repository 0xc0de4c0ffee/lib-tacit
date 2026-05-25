# AGENTS.md — AI Agent Instructions for lib-tacit

## Project Overview

This is a pure TypeScript library implementing the **tacit confidential token meta-protocol on Bitcoin**. It provides cryptographic primitives (Pedersen, classic Bulletproofs, Schnorr, ECDH, kernel signatures), opcode **wire** encode/decode for 34 shipped opcodes, and transaction utilities — all platform-agnostic with zero UI dependencies.

**Do not edit `tacit-specs/`** — read-only reference submodule. Port behavior into `src/` and `tests/` only.

The **reference implementation** lives at `tacit-specs/` (git submodule of [z0r0z/tacit](https://github.com/z0r0z/tacit)). The canonical spec is `tacit-specs/SPEC.md`. Ground truth for any behavioral question is the reference test suite in `tacit-specs/tests/` and the monolithic dapp at `tacit-specs/dapp/tacit.js`.

## Module Map

```
src/
├── index.ts              # Barrel re-export
├── constants/
│   ├── opcodes.ts         # Full opcode table (0x21–0xFF) per SPEC §1.1 — shipped, drafted, reserved, free
│   ├── domains.ts         # All v1 domain-separation tag strings (40+ tags)
│   ├── generators.ts      # Pinned hex vectors for H, G_vec, H_vec, Q
│   └── limits.ts          # Protocol constants (SECP_N, N_BITS, etc.)
├── crypto/
│   ├── pedersen.ts        # Pedersen commitments, NUMS H, point ops, modN, randomScalar
│   ├── schnorr.ts         # BIP-340 Schnorr sign/verify (in-house, independent of noble's schnorr)
│   ├── ecdh.ts            # ECDH-derived blindings + amount-encryption keystreams
│   ├── msm.ts             # Pippenger MSM (signed-digit windowed, c=3/4/5)
│   ├── kernel.ts          # Kernel sigs, Mint msg, Asset ID, excess, DROP/reclaim msgs,
│   │                      # listingMsg, axintentMsg, openingMsg, disclosureMsg
│   ├── bulletproofs.ts    # Classic BP range proofs (0x23)
│   ├── bulletproofs-plus.ts # BP+ aggregated range proofs (0x22, 14% smaller proofs)
│   ├── poseidon.ts         # Poseidon hash over BN254 (mixer Merkle trees)
│   ├── groth16.ts          # Groth16 verifier (optional snarkjs dep)
│   ├── stealth.ts          # Blinded-pubkey commits: tcs/tcsts addresses, ECDH blinding, scan/send helpers
│   ├── silent-payments.ts  # BIP-352 silent payments sender-side (sp1/tsp1 addresses)
│   └── primitives.ts       # xor32, taggedHash, tapLeafHash, controlBlock utilities
├── envelope/
│   ├── script.ts          # Taproot envelope script encode/decode (TACIT magic, pushdata chunking)
│   └── payload.ts         # ByteWriter utility, u64LE, readU64LE helpers
├── opcodes/
│   ├── etch.ts            # CETCH (0x21) — asset creation
│   ├── cxfer-bpp.ts       # T_CXFER_BPP (0x22) — CXFER with Bulletproofs+ (SPEC §5.21)
│   ├── transfer.ts        # CXFER (0x23) — confidential transfer
│   ├── mint.ts            # T_MINT (0x24) — mint additional supply
│   ├── burn.ts            # T_BURN (0x25) — destroy supply
│   ├── axfer.ts           # T_AXFER (0x26) — atomic OTC settlement
│   ├── petch.ts           # T_PETCH (0x27) — fair-launch deployment
│   ├── pmint.ts           # T_PMINT (0x28) — permissionless mint
│   ├── deposit.ts         # T_DEPOSIT (0x29) — shielded pool deposit + POOL_INIT
│   ├── withdraw.ts        # T_WITHDRAW (0x2A) — shielded pool withdrawal (Groth16)
│   ├── drop.ts            # T_DROP (0x2B) — public-claim pool (+ reclaim shape)
│   ├── dclaim.ts          # T_DCLAIM (0x2C) — permissionless claim
│   ├── axfer-var.ts       # T_AXFER_VAR (0x37) — variable-amount atomic settlement
│   ├── wrapper-attest.ts  # T_WRAPPER_ATTEST (0x38) — wrapper attestation
│   ├── axfer-bpp.ts        # T_AXFER_BPP (0x3C) — BP+ variant of atomic settlement
│   ├── axfer-var-bpp.ts    # T_AXFER_VAR_BPP (0x3D) — BP+ variant of variable-amount settlement
│   ├── preauth-bid.ts      # T_PREAUTH_BID (0x5B) encode/decode/context-hash
│   ├── preauth-bid-var.ts  # T_PREAUTH_BID_VAR (0x5C) encode/decode/context-hash
│   ├── slot.ts            # T_SLOT_* (0x43–0x47) — full encode/decode (SPEC-CBTC-ZK)
│   ├── cbtc-tac.ts        # T_CBTC_TAC_* (0x49–0x5A) — full encode/decode (SPEC-CBTC-TAC)
│   ├── amm-swap.ts        # T_SWAP_VAR (0x32) + T_SWAP_ROUTE (0x33) — full encode/decode + pool helpers
│   ├── amm-drafts.ts      # Drafted AMM opcodes (0x2D–0x31) — type definitions only
│   ├── farm-drafts.ts     # Drafted farm opcodes (0x34–0x3E) — type definitions
│   ├── gov-drafts.ts      # Drafted governance + cUSD.tac (0x50–0x56) — type definitions
│   └── index.ts           # Barrel export for all opcode modules
├── transaction/
│   ├── sighash.ts         # BIP-143 sighash, preauthSellerSpendSighash, tx serialization, txid
│   ├── address.ts         # P2WPKH script + bech32 address derivation
│   └── utils.ts           # hex, reverseBytes, reverseBytesHex, buildAnchor, voutLE
├── wallet/
│   ├── keypair.ts         # secp256k1 key generation, import, export, derivePubkey
│   ├── utxo-manager.ts    # UTXO fetch, cache, select, mark-spent
│   ├── prf.ts             # WebAuthn PRF passkey wallet (browser, optional)
│   └── encryption.ts      # AES-GCM + PBKDF2 encrypted-at-rest privkey
├── indexer/
│   ├── esplora-client.ts  # Esplora REST client (base rotation, concurrency cap, cooldown)
│   ├── ancestry.ts        # Memoized, depth-limited, kernel-sig validated ancestry walker
│   ├── ipfs.ts            # Verified IPFS fetch via helia + gateway failover
│   └── index.ts           # Barrel export
├── validation/
│   ├── validator.ts       # Recursive ancestry validation
│   ├── supply.ts          # Supply conservation checks
│   └── index.ts           # Barrel export
├── recovery/
│   ├── scanner.ts         # Chain scan for UTXO recovery
│   ├── decrypt.ts         # ECDH trial-decrypt for recovery
│   └── index.ts           # Barrel export
└── interfaces/
    └── chain-client.ts    # ChainClient, Broadcaster, ChainUTXO, ChainTx interfaces
```

## Conventions

- **TypeScript strict mode** — `tsconfig.json` enables strict, noUncheckedIndexedAccess, etc.
- **Pure functions** — no classes, no mutable module state (except lazy-generated BP generators)
- **Uint8Array** — all internal byte representations use `Uint8Array`, not hex strings or Buffer
- **ESM only** — `"type": "module"`, NodeNext module resolution
- **Build**: `bun run build` (runs `tsc`)
- **Typecheck**: `bun run typecheck` (runs `tsc --noEmit`)
- **Test isolation**: `bunfig.toml` sets `test.root = "./tests"` to avoid tacit-specs interference

## How to Add a New Opcode

1. Add the opcode constant to `src/constants/opcodes.ts` with its SPEC section number and status
2. Create `src/opcodes/<name>.ts` with typed `encode*` and `decode*` functions
3. Define input/output interfaces in the same file
4. Export from `src/opcodes/index.ts`
5. Create per-opcode doc file `docs/opcodes/0x##-name.md` with wire format and constraints
6. Add per-opcode test file `tests/opcodes/<name>.test.ts`
7. Add skill file `skills/opcodes/0x##-name.md`
8. Update `docs/opcodes/index.md` implementation status table
9. Update barrel test `tests/index.test.ts` to verify the new exports
10. Run `bun run typecheck && bun run build && bun test`

## Reference submodule

Update the read-only reference (do not edit files inside it, do not run `bun test` there):

```bash
bun run specs:pull
```

## How to Verify Correctness

1. Compare against the reference implementation at `tacit-specs/tests/composition.mjs` (Schnorr, ECDH, kernel, opcode wire formats)
2. Check pinned hex vectors in `tacit-specs/tests/vectors.test.mjs` for NUMS generators, asset IDs, blindings
3. Compare against `tacit-specs/tests/envelope.test.mjs` for envelope script round-trips
4. Compare against `tacit-specs/dapp/tacit.js` for wire format encode/decode functions
5. Compare against `tacit-specs/dapp/bulletproofs-plus.js` for BP+ crypto (src/crypto/bulletproofs-plus.ts)
6. Typecheck: `bun run typecheck`
7. Build: `bun run build`
8. Test: `bun test` (523+ tests; pinned vectors in `tests/crypto/vectors.test.ts`, no tacit-specs test root)
9. Read `docs/crypto/validation.md` before adding indexer-facing verify helpers

## Validation layers

1. **Wire** — `decodeEnvelopeScript`, `decodeCXfer`, … return `null` on malformed bytes (see `docs/crypto/validation.md`).
2. **Points** — `tryBytesToPoint` before curve ops on untrusted commitments.
3. **Crypto** — `verifyKernel`, `bpRangeAggVerify` (classic BP / opcode 0x23 only), Schnorr mint auth, Pedersen amount check.

Decoders never substitute for layer 3.

## Key Cryptographic Invariants

1. **Pedersen binding** — H is a NUMS generator with no known discrete log wrt G. If two implementations produce different H, they reject each other's proofs.
2. **Kernel sig soundness** — E' = ΣC_out - ΣC_in (+ burned·H on BURN). If E' = 0 (degenerate), reject. `verifyKernel` returns `false` (no throw) on bad points or length mismatch.
3. **Domain separation** — Every HMAC, BIP-340 message, and BP transcript uses a unique v1 domain tag. Cross-context replays are cryptographically impossible.
4. **Anchor uniqueness** — Each UTXO's anchor is `(txid_BE || vout_LE)`. Bitcoin consensus prevents double-spends, so no two outputs can share an anchor.
5. **Amount verification** — `amount_ct` is XOR with an HMAC-derived keystream. The Pedersen commitment provides the integrity check — tampering with ct yields a candidate amount that fails `pedersenCommit(candidate, r) == C`.

## Dependencies

- `@noble/secp256k1` ^2.1.0 — secp256k1 curve operations
- `@noble/hashes` ^1.4.0 — SHA256, HMAC, RIPEMD160, keccak
- `@scure/base` ^1.1.6 — bech32 (P2WPKH address encoding)
- `poseidon-lite` ^0.3.0 — Poseidon hash over BN254 (for future mixer module)
- `snarkjs` ^0.7.6 — Groth16 verifier (for shielded-pool withdrawals)
- `@helia/verified-fetch` ^7.2.10 — Trustless IPFS content retrieval

## Reference Submodule

The `tacit-specs/` directory is a git submodule at `c2ee202` pointing at `https://github.com/z0r0z/tacit`. Key reference files:

| File | Purpose |
|------|---------|
| `tacit-specs/SPEC.md` | Canonical protocol specification (opcode table §1.1, wire formats §§5.1–5.51) |
| `tacit-specs/tests/bulletproofs.mjs` | Reference BP implementation (Pedersen, MSM, IPA, prove/verify/batch) |
| `tacit-specs/tests/composition.mjs` | Reference composition (Schnorr, ECDH, opcode encode/decode, kernel, DROP/DCLAIM) |
| `tacit-specs/tests/vectors.test.mjs` | Pinned hex test vectors (generators, asset IDs, blindings, keystreams) |
| `tacit-specs/tests/envelope.test.mjs` | Envelope script round-trip + rejection tests |
| `tacit-specs/tests/composition.test.mjs` | End-to-end protocol tests (etch → mint → burn pipeline) |
| `tacit-specs/tests/stealth-primitives.mjs` | Stealth address EC math + DH shared-secret derivation |
| `tacit-specs/tests/cxfer-stealth.test.mjs` | CXFER-to-stealth-address integration tests |
| `tacit-specs/tests/swap-residual.test.mjs` | AMM swap residual (inventory-aware) verification |
| `tacit-specs/tests/swap-var.mjs` / `swap-var.test.mjs` | T_SWAP_VAR reference (44 tests) |
| `tacit-specs/tests/swap-route.mjs` / `swap-route.test.mjs` | T_SWAP_ROUTE reference (24 tests) |
| `tacit-specs/tests/cxfer-bpp-wire.test.mjs` | T_CXFER_BPP wire-format round-trip (136 tests) |
| `tacit-specs/tests/bulletproofs-plus-*.test.mjs` | BP+ prover/verifier cross-check (11 files) |
| `tacit-specs/tests/amm-validator.mjs` | Canonical AMM validator (all AMM opcodes) |
| `tacit-specs/tests/amm-spec-conformance.test.mjs` | Pinned opcode constants, domain tags, sizes |
| `tacit-specs/tests/bip352-sender-vectors.test.mjs` | BIP-352 sender-side silent payment test vectors (23/23 passing) |
| `tacit-specs/tests/bip352-receiver-vectors.test.mjs` | BIP-352 receiver-side silent payment test vectors (new in c2ee202) |
| `tacit-specs/tests/stealth-credit-persistence.test.mjs` | Stealth credit schema persistence + migration |
| `tacit-specs/tests/stealth-math.test.mjs` | Blinded-pubkey commit EC math (40 tests) |
| `tacit-specs/tests/cxfer-stealth.test.mjs` | CXFER-to-stealth-address integration tests (30 tests) |
| `tacit-specs/tests/preauth-bid-onchain-e2e-signet.mjs` | Preauth bid lifecycle on signet |
| `tacit-specs/tests/preauth-bid-var-onchain-e2e-signet.mjs` | Preauth bid var lifecycle on signet |
| `tacit-specs/tests/t-preauth-bid-bip143.test.mjs` | BIP-143 sighash preimage for preauth bid |
| `tacit-specs/dapp/tacit.js` | Monolithic dapp — source of truth for all shipped opcode encode/decode |
| `tacit-specs/dapp/bulletproofs-plus.js` | BP+ prover/verifier reference (T_CXFER_BPP, 907 LOC) |
| `tacit-specs/spec/CIRCUITS.md` | Circuit composition: mixer + AMM Groth16 families |
| `tacit-specs/spec/GLOSSARY.md` | Protocol glossary |
| `tacit-specs/spec/amm/wire-formats.md` | AMM opcode wire format reference (T_SWAP_VAR, T_SWAP_ROUTE, etc.) |
| `tacit-specs/spec/amendments/` | All amendment specs (stealth, preauth-bid, AMM, farm, etc.) |
