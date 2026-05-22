# References — tacit-specs v1

## SPEC.md Section Reference

| § | Title | Key Content |
|---|-------|-------------|
| §1.1 | Canonical opcode table | Full 0x21–0xFF assignment (shipped, drafted, reserved, free) |
| §3.1 | Curve and generators | secp256k1, NUMS H derivation |
| §3.2 | Pedersen commitment | `C = a·H + r·G`, computational binding |
| §3.3 | Bulletproofs aggregated rangeproof | BP construction, m∈{1,2,4,8}, IPA |
| §3.4 | BIP-340 Schnorr | Tagged hash, even-Y convention, kernel sig integration |
| §3.5 | Domain-separated HMAC-SHA256 derivations | ECDH blinding, keystream derivation, domain tags |
| §3.6 | Poseidon hash + per-pool Merkle tree | BN254 field, mixer tree structure |
| §3.7 | Groth16 zk-SNARK | Withdrawal circuit, BN254 pairing |
| §3.8 | Withdrawal circuit (canonical) | Nullifier, recipient commitment, Merkle root verification |
| §3.9 | BabyJubJub (embedded curve, AMM only) | Embedded curve for AMM cross-curve proofs |
| §3.10 | Sigma cross-curve binding (Camenisch-Stadler) | secp256k1 ↔ BabyJubJub binding |
| §4 | Asset identity | `asset_id = SHA256(txid_BE \|\| vout_LE)`, collision analysis |
| §4.1 | LP-share asset_id (AMM) | Third asset-id origin, `tacit-amm-lp-v1` domain |
| §5.1 | CETCH (0x21) — initial issuance | Encode/decode, decimals, ticker, supply commitment |
| §5.2 | CXFER (0x23) — confidential transfer | Kernel sig, rangeproof, amount encryption, blinding |
| §5.3 | T_MINT (0x24) — issue more supply | Mint authorization sig, mint limit, cap check |
| §5.4 | T_BURN (0x25) — destroy supply | Zero-output mode, burned amount in kernel msg |
| §5.5 | Validator algorithm | E'=0 check, purging, rangeproof verification |
| §5.6 | Range disclosure (balance ≥ K) | Selective disclosure protocol |
| §5.7 | T_AXFER (0x26) — atomic OTC settlement | Asset inputs, BTC fee handling, multi-asset kernel |
| §5.7.6 | Atomic intents | Double-spend race documentation, operational mitigation |
| §5.7.11 | Preauth bid (0x5B) | Buyer-offline pre-signed settlement, commit-reveal |
| §5.7.12 | Preauth bid var (0x5C) | Variable-amount preauth bid |
| §5.8 | T_PETCH (0x27) | Permissionless-mint deployment, cap/mint-limit |
| §5.9 | T_PMINT (0x28) | Permissionless mint event |
| §5.10 | T_DEPOSIT (0x29) | Shielded pool deposit, POOL_INIT, CID bytes |
| §5.11 | T_WITHDRAW (0x2A) | Groth16 withdrawal, nullifier, proof length guard |
| §5.12 | T_DROP (0x2B) | Public-claim pool, reclaim path, expiry |
| §5.13 | T_DCLAIM (0x2C) | Permissionless claim, Merkle proof verification |
| §5.14–5.20 | AMM opcodes (0x2D–0x33) | LP add/remove, SWAP batch/var, INTENT_ATTEST, PROTOCOL_FEE |
| §5.21 | T_CXFER_BPP (0x22) | CXFER with Bulletproofs+ rangeproof |
| §5.22 | T_SWAP_ROUTE (0x33) | Atomic multi-hop AMM swap |
| §5.19 | T_WRAPPER_ATTEST (0x38) | Optional on-chain wrapper attestation |
| §5.47–5.51 | cBTC.tac opcodes (0x49–0x5A) | Lien mint, cooperative unwind, force close, top-up, bond release |
| §6 | Recovery semantics | Key recovery, ECDH trial-decrypt, chain scan |
| §7 | Security properties | Privacy, soundness, issuer trust, mixer pool |

---

## tacit.js Function Reference

### Cryptographic Primitives

| Function | Lines | Description |
|----------|-------|-------------|
| `deriveH()` | 3803-3814 | NUMS generator H via try-and-increment SHA256 |
| `pedersenCommit(amount, blinding)` | 3821-3827 | Pedersen commitment `a·H + r·G` |
| `bytesToPoint(b)` | 3835-3839 | Compressed 33 B point deserialization (throws on invalid) |
| `pointToBytes(P)` | 3832 | Compressed 33 B point serialization |
| `bigintToBytes32(n)` | 3830 | 32 BE bytes from bigint |
| `bytes32ToBigint(b)` | 3831 | Bigint from 32 BE bytes |
| `randomScalar()` | 4647-4650 | Random `[1, SECP_N)` via crypto.getRandomValues |

### ECDH Blinding

| Function | Lines | Description |
|----------|-------|-------------|
| `deriveBlinding(myPriv, theirPub, anchor, voutIdx)` | 3853-3867 | Recipient blinding from ECDH shared secret |
| `deriveChangeBlinding(myPriv, anchor, voutIdx)` | 3864 | Change blinding (self-derived, no ECDH) |
| `deriveEtchBlinding(myPriv, anchor)` | 3879 | Etch supply blinding (no voutIdx) |
| `deriveAmountKeystreamECDH(myPriv, theirPub, anchor, voutIdx)` | 3910-3916 | Amount encryption keystream (ECDH) |
| `deriveAmountKeystreamSelf(myPriv, anchor, voutIdx)` | 3919 | Amount encryption keystream (self/change) |
| `encryptAmount(amount, keystream)` | 3940 | XOR amount with 8 B keystream |
| `decryptAmount(ct, keystream)` | 3956 | XOR ciphertext with 8 B keystream |

### Schnorr Signatures (BIP-340)

| Function | Lines | Description |
|----------|-------|-------------|
| `signSchnorr(msgHash, priv32)` | 5190-5198 | BIP-340 tagged hash signing, even-Y negation |
| `verifySchnorr(sig64, msgHash, pubXonly32)` | 5210-5226 | BIP-340 verification, ZERO rejection, parity check |

### Bulletproofs (Classic BP)

| Function | Lines | Description |
|----------|-------|-------------|
| `bpRangeAggProve(values, blindings, n_bits)` | 4887-4990 | Classic BP aggregated prover |
| `bpRangeAggVerify(V_pts, proofBytes, n_bits)` | 5001-5002 | Single-proof verifier |
| `bpRangeAggBatchVerify(items, n_bits)` | 5003-5030 | Batch verifier (multiple proofs, multiple commitments) |

### MSM (Pippenger)

| Function | Lines | Description |
|----------|-------|-------------|
| `msm(points, scalars)` | 4692 | Signed-digit windowed Pippenger, c=3/4/5 |

### Kernel Signatures

| Function | Lines | Description |
|----------|-------|-------------|
| `computeKernelMsg(assetId, inputOutpoints, outputCommitments, burnedAmount)` | 6393-6421 | SHA256 kernel msg, domain `tacit-kernel-v1` |
| `verifyKernel(...)` | 6067-6095 (inline) | Kernel sig verification under E'.xonly() |
| `signKernel(msg, excess)` | 5200 (wraps signSchnorr) | Kernel sig signing |

### Envelope

| Function | Lines | Description |
|----------|-------|-------------|
| `encodeEnvelopeScript(signingPubXonly, payload)` | 5645 | Envelope encoding with TACIT magic + version |
| `decodeEnvelopeScript(script)` | 5660-5670 | Envelope decoding, returns `{opcode, payload, signingPubXonly}` or null |

### Opcode Encode/Decode

| Function | Lines | Opcode |
|----------|-------|--------|
| `encodeCEtchPayload` / `decodeCEtch` | 5688 | 0x21 CETCH |
| `encodeCXferBppPayload` / `decodeCXferBpp` | 5789 | 0x22 T_CXFER_BPP |
| `encodeCXferPayload` / `decodeCXfer` | 5744 | 0x23 CXFER |
| `encodeCMintPayload` / `decodeCMint` | 6114 | 0x24 T_MINT |
| `encodeCBurnPayload` / `decodeCBurn` | 6172 | 0x25 T_BURN |
| `encodeAXferPayload` / `decodeAXfer` | 5832 | 0x26 T_AXFER |
| `encodePEtchPayload` / `decodePEtch` | 6248 | 0x27 T_PETCH |
| `encodePMintPayload` / `decodePMint` | 6324 | 0x28 T_PMINT |
| `encodeDepositPayload` / `decodeDeposit` | 6723/6738 | 0x29 T_DEPOSIT |
| `encodeWithdrawPayload` / `decodeWithdraw` | 6819 | 0x2A T_WITHDRAW |
| `encodeDropPayload` / `decodeDrop` | 6399/6436 | 0x2B T_DROP (standard + reclaim) |
| `encodeDClaimPayload` / `decodeDClaim` | 6533 | 0x2C T_DCLAIM |
| `encodeAXferVarPayload` / `decodeAXferVar` | 5859 | 0x37 T_AXFER_VAR |
| `encodeWrapperAttestPayload` / `decodeWrapperAttest` | 5498 | 0x38 T_WRAPPER_ATTEST |

### Validation (tacit.js)

| Function | Lines | Description |
|----------|-------|-------------|
| `async validateOutpoint(rootTxid, rootVout, ...)` | 13169-13180+ | Recursive outpoint validation (ancestry walk) |
| E'=0 check (CXFER, burned=0) | 13510 | `markAll(N, false)` on ZERO excess |
| E'=0 check (CXFER, partial burn) | 13590 | Same guard, different code path |
| E'=0 check (AXFER, cross-asset) | 13663 | `markAll(N, false)` on ZERO EPrimeV2 |
| E'=0 check (T_AXFER + CXFER combined) | 13753 | `markBothTacitVouts(false)` |

---

## Key Test Files (tacit-specs/tests/)

| File | Language | Tests | Lines | Purpose |
|------|----------|-------|-------|---------|
| `bulletproofs.mjs` | ESM | BP IPA, MSM, prove/verify/batch | 509 | Reference BP implementation (Pedersen, MSM, IPA, prove/verify/batch) |
| `composition.mjs` | ESM | Schnorr, ECDH, opcode encode/decode | 1381 | Reference composition: kernel sigs, blinindgs, keystreams, all opcode encode/decode helpers |
| `composition.test.mjs` | ESM | End-to-end protocol tests | 1247 | Full pipeline: etch→mint→burn, CXFER, AXFER, stealth, preauth-bid |
| `vectors.test.mjs` | ESM | Pinned hex vectors | 177 | Pinned vectors for H, BP gens, blindings, keystreams, asset IDs, kernel msg |
| `envelope.test.mjs` | ESM | Envelope round-trip + fuzz | 281 | Encode/decode round-trip, 200 random buffer fuzz, rejection tests |
| `stealth-primitives.mjs` | ESM | Stealth address EC math + DH | — | Shared secret derivation, one-time address, bech32m encode/decode |
| `cxfer-stealth.test.mjs` | ESM | CXFER-to-stealth integration | — | Full CXFER with stealth recipient, kernel sig validation |
| `swap-residual.mjs` | ESM | AMM swap residual verification | — | Inventory-aware residual proof for AMM swaps |

---

## Key Test Files (lib-tacit tests/)

| File | Tests | Lines | Coverage |
|------|-------|-------|----------|
| `tests/crypto/kernel.test.ts` | 18 | — | Kernel msg, DROP msgs, sign/verify, E'=0 rejection, BURN, domain separation |
| `tests/crypto/vectors.test.ts` | 11 | 98 | Pinned hex vectors for H, BP gens, blindings, keystreams, asset IDs |
| `tests/crypto/schnorr.test.ts` | 8 | — | BIP-340 sign/verify, KAT vectors, R_x tamper, all-zero sig |
| `tests/crypto/pedersen.test.ts` | 8 | — | Pedersen commit/verify, H invariant, pinned vectors, C(0,1)=G, C(1,0)=H |
| `tests/crypto/bulletproofs.test.ts` | 9 | — | BP prove/verify/batch, edge values |
| `tests/crypto/bulletproofs-plus.test.ts` | 21 | — | BP+ KAT, m=1/2/4/8, tampered rejection, RNG determinism |
| `tests/crypto/ecdh.test.ts` | 11 | — | ECDH blinding, keystream, encrypt/decrypt round-trips, edge cases |
| `tests/crypto/stealth.test.ts` | 16 | — | Encode/decode round-trip, DH symmetry, one-time address |
| `tests/crypto/poseidon.test.ts` | 9 | — | poseidonHash consistency, edge values |
| `tests/crypto/groth16.test.ts` | 6 | — | Error class, verify rejection (snarkjs-optional) |
| `tests/crypto/msm.test.ts` | — | — | Pippenger MSM correctness |
| `tests/integration/etch-mint-burn.test.ts` | 6 | — | Full pipeline: etch→mint→burn, CXFER, BP+, envelope chunking |
| `tests/transaction/sighash.test.ts` | — | — | BIP-143 sighash, preauthSellerSpendSighash, pinned vectors |
| `tests/validation/supply.test.ts` | — | — | checkSupplyConservation, checkPublicSupply |
| `tests/validation/validator.test.ts` | — | — | validateAncestry edge cases |
| `tests/indexer/ancestry.test.ts` | 4 | — | Ancestry walk, kernel-sig validation |
| `tests/recovery/decrypt.test.ts` | 6 | — | tryDecryptOutput correct/wrong/bad, batch |
| `tests/envelope.test.ts` | — | — | Envelope round-trip, fuzz, rejection |

---

## Constants and Domain Tags

| File | Key Contents |
|------|--------------|
| `src/constants/opcodes.ts` | Full opcode table (0x21–0xFF), ShippedOpcodes Set, Opcode enum |
| `src/constants/domains.ts` | 67+ domain tags: `tacit-kernel-v1`, `tacit-blind-v1`, `tacit-bp-v1`, `tacit-bpp-v1`, etc. |
| `src/constants/generators.ts` | Pinned hex vectors for H, G_vec, H_vec, Q |
| `src/constants/limits.ts` | `SECP_N` (secp256k1 order), `N_BITS` (64), `BP_AGG_CAPS` ([1,2,4,8]), `MAX_SCRIPT_PUSH` (520) |

---

## Amendment Specs (tacit-specs/spec/amendments/)

| File | Content |
|------|---------|
| `SPEC-STEALTH-ADDRESS-AMENDMENT.md` | Stealth addresses, DH shared secret, bech32m encoding |
| `SPEC-PREAUTH-BID-AMENDMENT.md` | Preauth bid (0x5B, 0x5C), commit-reveal protocol, SIGHASH_SINGLE\|ANYONECANPAY |
| `SPEC-AMM-AMENDMENT.md` | AMM opcodes (0x2D–0x33), cross-curve proofs, BabyJubJub |
| `SPEC-FARM-AMENDMENT.md` | Farm opcodes (0x34–0x3E), staking, rewards |
| `SPEC-CBTC-TAC-AMENDMENT.md` | cBTC.tac opcodes (0x49–0x5A), lien protocol, wrapper attestation |
| `SPEC-GOV-AMENDMENT.md` | Governance opcodes (0x50–0x56), cUSD.tac |
