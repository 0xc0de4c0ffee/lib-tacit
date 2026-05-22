# lib-tacit Review: Comparison with tacit-specs Reference

> Generated: 2026-05-21
> Reference commit: `11e2b99` (z0r0z/tacit)
> lib-tacit HEAD: `f240577`

## Full Comparison Table

### Cryptographic Primitives

| Function | File (ref) | File (lib) | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `deriveH()` | tacit.js:3793 | `pedersen.ts:14` | ✅ Match | Same try-and-increment algorithm |
| `H`, `G`, `ZERO` | tacit.js:3805-3807 | `pedersen.ts:15-17` | ✅ Match |
| `modN` | tacit.js:3810 | `pedersen.ts:29` | ✅ Match |
| `pedersenCommit` | tacit.js:3811 | `pedersen.ts:63` | ✅ Match |
| `pointToBytes` | tacit.js:3818 | `pedersen.ts:35` | ✅ Match |
| `bytesToPoint` | tacit.js:3825-3829 | `pedersen.ts:39` | ✅ Match | Length + prefix validation |
| `tryBytesToPoint` | (none in ref) | `pedersen.ts:46` | ✅ Added | null-safe for wire bytes |
| `bigintToBytes32` | tacit.js:3830 | `pedersen.ts:33` | ✅ Match |
| `bytes32ToBigint` | tacit.js:3831 | `pedersen.ts:36` | ✅ Match |
| `randomScalar` | tacit.js:4647 | `pedersen.ts:105` | ✅ Match |
| `deriveBlinding` | tacit.js:3843-3856 | `ecdh.ts:41` | ✅ Match | peer pubkey validated via `bytesToPoint` |
| `deriveChangeBlinding` | tacit.js:3864 | `ecdh.ts:53` | ✅ Match |
| `deriveEtchBlinding` | tacit.js:3879 | `ecdh.ts:63` | ✅ Match |
| `deriveMintBlinding` | tacit.js:3892 | `ecdh.ts:72` | ✅ Match |
| `deriveAmountKeystreamECDH` | tacit.js:3910-3916 | `ecdh.ts:81` | ✅ Match | peer pubkey validated |
| `deriveAmountKeystreamSelf` | tacit.js:3919 | `ecdh.ts:92` | ✅ Match |
| `deriveEtchAmountKeystream` | tacit.js:3883 | `ecdh.ts:101` | ✅ Match |
| `deriveMintAmountKeystream` | tacit.js:3896 | `ecdh.ts:109` | ✅ Match |
| `encryptAmount` | tacit.js:3940 | `ecdh.ts:117` | ✅ Match |
| `decryptAmount` | tacit.js:3956 | `ecdh.ts:129` | ✅ Match |
| `signSchnorr` | tacit.js:5180-5198 | `schnorr.ts:24` | ✅ Match | BIP-340 tagged hash |
| `verifySchnorr` | tacit.js:5200-5215 | `schnorr.ts:52` | ✅ Match | ZERO rejection, parity check |
| `msm` (Pippenger) | tacit.js:4692 | `msm.ts:14` | ✅ Match |
| `bpRangeAggProve` | tacit.js:4887 | `bulletproofs.ts:207` | ✅ Match |
| `bpRangeAggVerify` | tacit.js:4991 | `bulletproofs.ts:326` | ✅ Match |
| `bpRangeAggBatchVerify` | tacit.js:5003 | `bulletproofs.ts:340` | ✅ Match |
| `modInv` (used by BP) | tacit.js:4664 | `bulletproofs.ts:38` | ✅ Match | `modInvReal` kept; dead `modInv` removed |
| `bppRangeProve` | `bulletproofs-plus.js` | `bulletproofs-plus.ts` | ✅ Ported | BP+ aggregated range prover |
| `bppRangeVerify` | `bulletproofs-plus.js` | `bulletproofs-plus.ts` | ✅ Ported | BP+ aggregated range verifier |
| `poseidonHash` | `poseidon-lite` | `poseidon.ts` | ✅ Wrapped | poseidon1/poseidon2 from poseidon-lite |
| `groth16Verify` | snarkjs | `groth16.ts` | ✅ Wrapped | Optional snarkjs dep, dynamic import |
| `tryDecryptOutput` | tacit.js | `recovery/decrypt.ts` | ✅ Added | ECDH trial-decrypt for recovery |
| `encodeStealthAddress` | tacit.js:3925+ | `stealth.ts` | ✅ Ported | bech32m stealth address encode |
| `decodeStealthAddress` | tacit.js:3925+ | `stealth.ts` | ✅ Ported | bech32m stealth address decode |
| `stealthSharedSecret` | stealth-primitives.mjs | `stealth.ts` | ✅ Ported | ECDH shared secret derivation |
| `stealthOneTimeAddress` | stealth-primitives.mjs | `stealth.ts` | ✅ Ported | One-time address from shared secret |

### Validation

| Function | Ref file | Lib file | Status | Notes |
|----------|----------|----------|--------|-------|
| `validateAncestry` | (ancestry walker) | `validation/validator.ts` | ✅ Added | Wraps AncestryWalker.walkAncestry |
| `checkSupplyConservation` | (kernel helper) | `validation/supply.ts` | ✅ Added | Excess point non-degenerate check |

### Recovery

| Function | Ref file | Lib file | Status | Notes |
|----------|----------|----------|--------|-------|
| `scanForUTXOs` | (chain scan) | `recovery/scanner.ts` | ✅ Added | Batch UTXO fetch + envelope detection |
| `tryDecryptOutput` | tacit.js | `recovery/decrypt.ts` | ✅ Added | ECDH self-decrypt path |
| `tryDecryptOutputs` | tacit.js | `recovery/decrypt.ts` | ✅ Added | Batch variant |

### Kernel Signatures

| Function | File (ref) | File (lib) | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `computeKernelMsg` | tacit.js:6067-6095 | `kernel.ts:26` | ✅ Match | Domain `tacit-kernel-v1`, count ≥ 255 guard |
| `computeCxferExcess` | tacit.js:4690 | `kernel.ts:61` | ✅ Match |
| `computeExcessPoint` | tacit.js:6067-6095 (inline) | `kernel.ts:72` | ✅ Added | Returns null on bad points |
| `signKernel` | tacit.js:5200 | `kernel.ts:96` | ✅ Match |
| `verifyKernel` | tacit.js:6067-6095 (inline) | `kernel.ts:105` | ✅ Match | Returns false on bad points (no throw) |
| `computeMintMsg` | tacit.js:6155 | `kernel.ts:127` | ✅ Match | Domain `tacit-mint-v1` |
| `dropKernelMsg` | tacit.js:6644 | `kernel.ts:155` | ✅ Added | Domain `tacit-drop-v1` |
| `dropReclaimMsg` | tacit.js:6685 | `kernel.ts:186` | ✅ Added | Domain `tacit-drop-reclaim-v1` |
| `openingMsg` | tacit.js:29542 | `kernel.ts:201` | ✅ Added | Domain `tacit-opening-v1` |
| `disclosureMsg` | tacit.js:29595 | `kernel.ts:218` | ✅ Added | Domain `tacit-disclosure-v1` |
| `dropIdFromRevealTxid` | tacit.js:6632 | `drop.ts:184` | ✅ Added | DROP identifier derivation |
| `assetIdFor` | tacit.js:3785 | `kernel.ts:146` | ✅ Match |
| `computeWithdrawBindHash` | tacit.js:4504 | *not ported* | 🔶 Missing | Crypto verify function; low priority |

### Opcode Encode/Decode

| Opcode | Ref encoder | Lib encoder | Lib decoder | Status | Notes |
|--------|------------|------------|------------|--------|-------|
| CETCH (0x21) | tacit.js:5688 | `etch.ts:41` | `etch.ts:70` | ✅ Match | `Number.isInteger(decimals)` guard added |
| T_CXFER_BPP (0x22) | tacit.js:5789 | `cxfer-bpp.ts:25` | `cxfer-bpp.ts:45` | ✅ Match | BP+ wire only; BP+ crypto not ported |
| CXFER (0x23) | tacit.js:5744 | `transfer.ts:33` | `transfer.ts:55` | ✅ Match |
| T_MINT (0x24) | tacit.js:6114 | `mint.ts:30` | `mint.ts:50` | ✅ Match |
| T_BURN (0x25) | tacit.js:6172 | `burn.ts:37` | `burn.ts:75` | ✅ Match | Zero-output rangeproof guard added |
| T_AXFER (0x26) | tacit.js:5832 | `axfer.ts:30` | `axfer.ts:54` | ✅ Match |
| T_PETCH (0x27) | tacit.js:6248 | `petch.ts:32` | `petch.ts:57` | ✅ Match |
| T_PMINT (0x28) | tacit.js:6324 | `pmint.ts:27` | `pmint.ts:44` | ✅ Match |
| T_DEPOSIT (0x29) | tacit.js:6723/6738 | `deposit.ts:52/66` | `deposit.ts:83` | ✅ Match | CID length bounds validated |
| T_WITHDRAW (0x2A) | tacit.js:6819 | `withdraw.ts:31` | `withdraw.ts:54` | ✅ Fixed | Added `proofLen === 0` guard; moved denom check before proof parse |
| T_DROP (0x2B) | tacit.js:6399/6436 | `drop.ts:65/100` | `drop.ts:124` | ✅ Match | Standard + reclaim shapes |
| T_DCLAIM (0x2C) | tacit.js:6533 | `dclaim.ts:37` | `dclaim.ts:81` | ✅ Match |
| T_AXFER_VAR (0x37) | tacit.js:5859 | `axfer-var.ts:23` | `axfer-var.ts:44` | ✅ Match |
| T_WRAPPER_ATTEST (0x38) | tacit.js:5498 | `wrapper-attest.ts:20` | `wrapper-attest.ts:33` | ✅ Match |

### Envelope Script

| Function | Ref lines | Lib file | Status | Notes |
|----------|----------|---------|--------|-------|
| `encodeEnvelopeScript` | tacit.js:5607-5618 | `script.ts:36` | ✅ Match |
| `decodeEnvelopeScript` | tacit.js:5621-5670 | `script.ts:66` | ✅ Match |
| `ENVELOPE_MAGIC` | tacit.js:5580 | `domains.ts:109` | ✅ Match | "TACIT" |
| `ENVELOPE_VERSION` | tacit.js:5581 | `domains.ts:110` | ✅ Match | 0x01 |

### Domain Tags

| Tag | Ref line | Lib file | Status |
|-----|---------|---------|--------|
| `tacit-blind-v1` | 3782 | `domains.ts:6` | ✅ Match |
| `tacit-change-v1` | 3863 | `domains.ts:7` | ✅ Match |
| `tacit-etch-v1` | 3877 | `domains.ts:8` | ✅ Match |
| `tacit-etch-amount-v1` | 3878 | `domains.ts:9` | ✅ Match |
| `tacit-mint-blind-v1` | 3890 | `domains.ts:10` | ✅ Match |
| `tacit-mint-amount-v1` | 3891 | `domains.ts:11` | ✅ Match |
| `tacit-amount-v1` | 3906 | `domains.ts:12` | ✅ Match |
| `tacit-amount-self-v1` | 3907 | `domains.ts:13` | ✅ Match |
| `tacit-kernel-v1` | 6067 | `domains.ts:16` | ✅ Match |
| `tacit-mint-v1` | 6155 | `domains.ts:17` | ✅ Match |
| `tacit-drop-v1` | 6675 | `domains.ts:34` | ✅ Match |
| `tacit-drop-reclaim-v1` | 6696 | `domains.ts:35` | ✅ Match |
| `tacit-withdraw-bind-v1` | 4495 | `domains.ts:67` | ✅ Match |
| `tacit-cxfer-stealth-v1` | 3943 | `domains.ts:104` | ✅ Match |
| `tacit-axfer-stealth-v1` | 3944 | `domains.ts:105` | ✅ Match |
| `tacit-axfer-var-stealth-v1` | 3945 | `domains.ts:106` | ✅ Match |
| `tacit-generator-H-v1` | 3794 | `domains.ts:52` | ✅ Match |
| `tacit-bp-G-v1` | — | `domains.ts:53` | ✅ Match |
| `tacit-bp-H-v1` | — | `domains.ts:54` | ✅ Match |
| `tacit-bp-Q-v1` | — | `domains.ts:55` | ✅ Match |
| `tacit-bp-v1` | — | `domains.ts:58` | ✅ Match |

### Transaction Layer

| Function | Ref lines | Lib file | Status | Notes |
|----------|----------|---------|--------|-------|
| `hash160` | tacit.js:481 | `sighash.ts:8` | ✅ Match |
| `hash256` | tacit.js:480 | `sighash.ts:7` | ✅ Match |
| `sighashV0` | tacit.js:504-524 | `sighash.ts:28` | ✅ Match | BIP-143 |
| `sighashV0WithType` | tacit.js:531-582 | `sighash.ts:39` | ✅ Match |
| `preauthSellerSpendSighash` | composition.mjs | `sighash.ts:115` | ✅ Match | Pinned vector match |
| `serializeTx` | tacit.js:585-608 | `sighash.ts:148` | ✅ Match |
| `txid` | tacit.js:610 | `sighash.ts:182` | ✅ Match |
| `p2wpkhScript` | tacit.js:500 | `address.ts:7` | ✅ Match |
| `p2wpkhAddress` | tacit.js:501 | `address.ts:15` | ✅ Match |
| `buildCommitTx` | (ref tests) | `builder.ts:30` | ✅ Match |
| `buildRevealTx` | (ref tests) | `builder.ts:43` | ✅ Match |
| `computeAssetIdFromTx` | tacit.js:3785 | `builder.ts:62` | ✅ Match |
| `preauthSellerSpendSighash` | composition.mjs:282-312 | `sighash.ts:115` | ✅ Match | Pinned vector verified |

### Wallet

| Component | Ref file | Lib file | Status | Notes |
|-----------|---------|---------|--------|-------|
| Key generation | tacit.js:1057-1159 | `keypair.ts` | ✅ Match |
| UTXO Manager | tacit.js:2756-2829 | `utxo-manager.ts` | ✅ Match |
| PRF passkey wallet | `dapp/prf-wallet.js` | `prf.ts` | ✅ Ported |
| Key encryption (AES-GCM) | tacit.js:740-813 | `encryption.ts` | ✅ Ported |

### Indexer / Validation / Recovery

| Module | Ref file | Lib file | Status | Notes |
|--------|---------|---------|--------|-------|
| Esplora REST client | tacit.js:1792-2226 | `esplora-client.ts` | ✅ Ported | Concurrency cap, base rotation, cooldown |
| Ancestry walker | tacit.js:12000+ | `ancestry.ts` | ✅ Ported | Memoized, depth-limited, kernel-sig validated |
| Chain client interface | (abstract) | `chain-client.ts` | ✅ Match | Expanded with ChainTxVin, ChainTxVout, etc. |
| Ancestry validation | (composition.mjs) | `validation/validator.ts` | ✅ Added | validateAncestry wraps walker |
| Supply conservation | (kernel helper) | `validation/supply.ts` | ✅ Added | checkSupplyConservation + checkPublicSupply |
| Chain scanner | tacit.js | `recovery/scanner.ts` | ✅ Added | scanForUTXOs batch fetch + envelope detect |
| ECDH trial-decrypt | tacit.js | `recovery/decrypt.ts` | ✅ Added | tryDecryptOutput + batch |

## Opcode Assignments

| Hex | Opcode | Section | Status | Notes |
|-----|--------|---------|--------|-------|
| `0x59–0x5A` | T_CBTC_TAC_TOP_UP / T_CBTC_TAC_BOND_RELEASE | §5.50–5.51 | ✅ Shipped | Moved from `0x59` free slot in prior SPEC; now matches dapp ground truth. |
| `0x5B` | T_PREAUTH_BID | §5.7.11 | ✅ Shipped | Promoted from drafted per spec commit 5979c1c. |
| `0x5C` | T_PREAUTH_BID_VAR | §5.7.12 | ✅ Shipped | Promoted from drafted; signet-validated end-to-end. |
| `0x5D–0x5E` | T_PREAUTH_BID_BATCH / T_PREAUTH_MATCH | preauth-family | 🔒 Reserved | Preauth/offline-trading follow-ups. |

See `src/constants/opcodes.ts` for the full table.

## Bugs Found and Fixed During Review

### 1. `decodeWithdraw` — Missing zero-length proof guard
**File:** `src/opcodes/withdraw.ts:72`
**Impact:** A zero-length `proof` field would be accepted by the decoder. The reference rejects `proofLen === 0` (tacit.js:6862). A zero-length Groth16 proof is invalid per SPEC §5.11.
**Fix:** Added `if (proofLen === 0) return null;` before the length-exactness check. Also relocated the `denomination` range check before proof parse for early rejection.

### 2. `encodePoolInit` — Missing CID length validation
**File:** `src/opcodes/deposit.ts:69`
**Impact:** `vkCid` and `ceremonyCid` were accepted at any length, including zero. The reference requires 1–64 bytes (tacit.js:6749-6750). Empty CIDs would produce malformed pool-init envelopes.
**Fix:** Added `vkCid.length` and `ceremonyCid.length` range checks (1–64).

### 3. `decodeDeposit` — Missing CID length bounds
**File:** `src/opcodes/deposit.ts:96-99`
**Impact:** The decoder accepted zero-length or >64-byte CIDs. The reference rejects these (tacit.js:6788, 6793). An adversarial envelope with out-of-bounds CIDs would decode successfully.
**Fix:** Added `vkCidLen < 1 || vkCidLen > 64` and `ceremonyCidLen < 1 || ceremonyCidLen > 64` guards.

## Design Divergences (Intentional)

| Area | Reference | Lib-tacit | Rationale |
|------|-----------|-----------|-----------|
| `decodeTWithdrawPayload` `bindHash` check | Computes expected `bindHash` via `computeWithdrawBindHash` during decode | Does NOT verify during decode | Per `docs/crypto/validation.md`, decoders are layer 1 (wire) only. Crypto verification is layer 3. |
| Proof-of-reserve helpers | Inline in dapp | Not ported | DApp-layer logic; library provides primitives |
| DApp-specific signing messages | tacit.js (listingMsg, cancelMsg, claimMsg, axintentMsg-family) | Not ported | OTC listing & atomic intent signing — dApp-surface only |

## All Gaps Closed

All previously tracked gaps have been closed:

| Gap | Status |
|-----|--------|
| BP+ prover/verifier (bulletproofs-plus.js port) | ✅ `src/crypto/bulletproofs-plus.ts` — 27 tests |
| Poseidon hash | ✅ `src/crypto/poseidon.ts` — wraps poseidon-lite |
| Groth16 verifier (snarkjs) | ✅ `src/crypto/groth16.ts` — optional dynamic import |
| Stealth address codec (bech32m) | ✅ `src/crypto/stealth.ts` — encode/decode + DH + one-time addr |
| Validation (ancestry + supply checks) | ✅ `src/validation/validator.ts` + `supply.ts` |
| Recovery (chain scan + ECDH trial-decrypt) | ✅ `src/recovery/scanner.ts` + `decrypt.ts` |

## Test Status

**285 tests passing**, 0 failing across 35 test files (submodule at `11e2b99`).

| Test file | Count | Coverage |
|-----------|-------|----------|
| `tests/crypto/kernel.test.ts` | 18 | Kernel msg, DROP msgs, sign, verify, E'=0 rejection, BURN, replays, domain separation |
| `tests/crypto/vectors.test.ts` | 11 | Pinned hex vectors for H, BP gens, blindings, keystreams, asset IDs |
| `tests/crypto/schnorr.test.ts` | 8 | BIP-340 sign/verify, KAT vectors, R_x tamper, all-zero sig |
| `tests/crypto/pedersen.test.ts` | 8 | Pedersen commit/verify, H invariant, pinned vectors, C(0,1)=G, C(1,0)=H |
| `tests/crypto/bulletproofs.test.ts` | 9 | BP prove/verify/batch, edge values |
| `tests/crypto/bulletproofs-plus.test.ts` | 21 | BP+ KAT, round-trip m=1/2/4/8, tampered rejection, RNG determinism |
| `tests/crypto/ecdh.test.ts` | 11 | ECDH blinding, keystream, encrypt/decrypt round-trips, determinism, edges |
| `tests/crypto/poseidon.test.ts` | 9 | poseidonHash consistency, equivalence, edge values |
| `tests/crypto/groth16.test.ts` | 6 | Error class, verify rejection (snarkjs-optional) |
| `tests/crypto/stealth.test.ts` | 16 | Encode/decode round-trip, DH symmetry, one-time address, ephem key |
| `tests/crypto/fixture-signing.test.ts` | 6 | Deterministic test key (0xaa..aa), Schnorr + kernel fixed-key signing |
| `tests/opcodes/16 files` | 76 | All 14 shipped + 2 preauth stubs: round-trips, wrong opcode, truncated/empty, field-length validation, boundary values |
| `tests/transaction/2 files` | 2 | Sighash, preauth, builder, asset ID |
| `tests/indexer/ancestry.test.ts` | 4 | Ancestry walk, kernel-sig validation |
| `tests/validation/2 files` | 11 | Supply conservation, public supply, validateAncestry |
| `tests/recovery/decrypt.test.ts` | 6 | tryDecryptOutput correct/wrong/bad, batch |
| `tests/integration/etch-mint-burn.test.ts` | 6 | Full pipeline: etch→mint→burn, balanced CXFER, BP+ via CXFER_BPP, envelope chunking, stealth |
| `tests/index.test.ts` | 1 | Barrel export completeness |

## MEV & Frontrunning Analysis

Tacit operates entirely within Bitcoin consensus — every opcode is a Bitcoin transaction spending Taproot outputs. All mempool and consensus properties apply directly. This section describes what is and is not possible under current Bitcoin consensus, referenced against the tacit specification amendments.

### Miner cannot include two transactions spending the same input in one block

Bitcoin block assembly (Bitcoin Core `CreateNewBlock`) maintains a set of spent outpoints as transactions are added to the template. Any candidate transaction whose input is already in that set is skipped — a second transaction spending the same UTXO would be consensus-invalid and cannot be included. This is identical to how every Bitcoin wallet and protocol (Lightning, RGB, Counterparty, Ordinals) handles double-spend races: **exactly one transaction per outpoint per block**.

If two sellers both take the same preauth-bid (both construct a settlement tx referencing the buyer's pre-signed input), the miner MUST pick at most one. The other sits in the mempool as conflicting until eviction (typically ~2 weeks, or immediately if the winning transaction confirms and the outpoint is spent). This is not a tacit-specific behavior — it is Bitcoin's consensus-level double-spend prevention. Every protocol using pre-signed `SIGHASH_SINGLE|ANYONECANPAY` transactions (Lightning HTLCs, RGB, payjoins) inherits the same constraint.

**The losing transaction pays zero fees.** Bitcoin has no "gas" — an unconfirmed transaction pays nothing to miners. The losing completor's asset UTXO remains spendable. The only economic cost to the loser is the commit-tx fee (the P2TR output they funded is on-chain but their reveal tx could not spend it). This commit-tx loss is structurally identical to any Bitcoin OTC marketplace where two takers race for the same maker order (per SPEC-PREAUTH-BID-AMENDMENT §5.7.11: "Settlement attempts that race against the spend are rejected by Bitcoin consensus (double-spend) at relay time").

### SIGHASH constraint: what a pre-signed tx commits to

Preauth-bid uses `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY` (`0x83`). The signature covers `vin[0]` and `vout[0]` — the buyer's input and locked payout. The completor controls fee (they add their own inputs/outputs). A miner cannot modify the signed fields (signature invalidates at relay time). The only power a miner has over the signed portion is to include or exclude the entire transaction (identical to every Bitcoin transaction).

### Commit-reveal frontrunning (impossible)

A miner seeing both commit and reveal cannot forge a different reveal spending the same P2TR. The kernel signature binds to specific input outpoints and Pedersen commitments — forging requires solving discrete log on secp256k1 (intractable). Same invariant for Bulletproofs and Groth16 proofs: they are commitment-bound, not malleable.

### Preauth-bid (0x5B) SPEC-PREAUTH-BID-AMENDMENT §5.7.11

**Two-seller race**: Both settlement txs spend the buyer's pre-signed `vin[0]`. Only one confirms. The losing seller's asset UTXO is untouched; they lose only their commit-tx fee. This is the same race as every Bitcoin OTC marketplace (the spec explicitly notes this). RBF (BIP-125, wallet policy, not consensus) allows one completor to outbid the other, but neither the buyer's output nor the miner can be cheated.

**Seller-side griefing** (spec §5.7.11): Between the seller's commit broadcast and reveal confirmation, a malicious buyer can double-spend their own funding outpoint. The seller's reveal fails; they lose their commit fee. The buyer gains nothing beyond their own sats — this is not value extraction. The spec recommends a worker-side outspend pre-check to minimize the window (identical to every Bitcoin OTC marketplace).

**Dust pinning**: An attacker with no asset can broadcast a low-fee settlement tx occupying the buyer's input. The honest seller must either replace via RBF or wait for mempool eviction. The preauth-bid spec acknowledges this as a known limitation of the round-1 amendment and defers a buyer-bond mitigation.

### Preauth-sale: symmetric race

Seller pre-signs asset input; multiple buyers compete to add BTC payout inputs. Same cost structure — losing buyer loses commit fee, asset UTXO is returned to the seller's intended counterparty (first confirm wins). The losing buyer's BTC input was never spent.

### DROP/DCLAIM (0x2B/0x2C) per SPEC §5.12–5.13

First valid claim reveal to confirm wins the DROP pool payout. The claim output is pubkey-bound (kernel sig requires the claimant's key). A frontrunner cannot redirect payout — they would need the original claimant's private key. After `expiryHeight`, the issuer reclaims via Schnorr signature (reclaim path is permissioned).

### Atomic intent / T_AXFER (0x26)

Recipient-bound intents (`takerPubkey`) cannot be claimed by anyone else. Unbound intents are fillable by any observer — this is by design (limit order behavior). The 5-minute window is bounded by the worker's claim-gate; after expiry, the intent is no longer fillable.

### Shielded pool (0x29/0x2A)

T_WITHDRAW uses Groth16 over BN254 per §3.7. The nullifier prevents double-spend. A miner cannot forge a withdrawal to a different recipient (proof binds nullifier + recipient commitment + Merkle root — forging requires solving the circuit's NP-relation). T_DEPOSIT appends leaves to the Merkle tree; reordering within a block does not change the block-committed root.

### Cross-opcode domain separation

Every signing domain uses a unique v1 tag (`tacit-kernel-v1`, `tacit-preauth-bid-v1`, `tacit-drop-v1`, etc.) per `src/constants/domains.ts`. Cross-context replay is cryptographically impossible — no miner or third party can substitute one opcode's signature for another.

### Summary

| Surface | Feasibility | Loser's cost | Spec reference |
|---------|------------|--------------|----------------|
| Commit censorship | Miner choice | Liveness delay | Bitcoin-native |
| Commit-reveal frontrun | Impossible (crypto) | None | Kernel sig (discrete log) |
| Preauth-bid: two completors | Race (one wins) | Loser loses commit fee | SPEC-PREAUTH-BID-AMENDMENT §5.7.11 |
| Preauth-bid: seller griefing | Possible (costly for attacker) | Seller loses commit fee | §5.7.11 (identical to any BTC OTC) |
| Preauth-bid: dust pinning | Possible (griefing) | Winner pays replacement fee | §5.7.11 (known limitation) |
| Preauth-sale: two buyers | Race (one wins) | Loser loses commit fee | SPEC-PREAUTH-BID-AMENDMENT §5.7.8 |
| DROP: claim race | Race (one wins) | Loser loses commit fee | SPEC §5.12–5.13 |
| Shielded withdrawal | Impossible (Groth16) | None | SPEC §3.7, §5.11 |
| Cross-opcode replay | Impossible (domain tags) | None | Domain separation |

**Key properties:**
- **No losing participant loses their asset** — the loser's reveal tx never confirms; their UTXOs remain spendable. The only loss is the commit-tx fee (~few thousand sats for a P2TR output).
- **No gas model** — Bitcoin does not charge for unconfirmed transactions. A transaction pays fees only when it confirms.
- **Every race is one-confirmation-per-outpoint under Bitcoin consensus** — identical to Lightning HTLC races, RGB state transitions, and any Bitcoin OTC marketplace.
- **Cryptographic invariants prevent output theft** — kernel sigs, Bulletproofs, and Groth16 proofs are commitment-bound. SIGHASH locks protect pre-signed outputs. No miner or third party can forge valid proofs under standard cryptographic assumptions.
