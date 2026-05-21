# lib-tacit Review: Comparison with tacit-specs Reference

> Generated: 2026-05-21
> Reference commit: `ce96228d7ca23305b470e144cdfe799201d57d90` (z0r0z/tacit)
> lib-tacit HEAD: `14dafa3`

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

### Indexer / Chain Client

| Component | Ref file | Lib file | Status | Notes |
|-----------|---------|---------|--------|-------|
| Esplora REST client | tacit.js:1792-2226 | `esplora-client.ts` | ✅ Ported |
| Ancestry walker | tacit.js:12000+ | `ancestry.ts` | ✅ Ported |
| Chain client interface | (abstract) | `chain-client.ts` | ✅ Match |

## Opcode Conflict: SPEC.md vs dapp/tacit.js

| Hex | SPEC.md says | dapp/tacit.js says | Notes |
|-----|-------------|-------------------|-------|
| `0x59` | `T_PREAUTH_BID` (📝 drafted) | `T_CBTC_TAC_TOP_UP` (✅ shipped) | Dapp is ground truth. SPEC hasn't updated. |
| `0x5A` | free | `T_CBTC_TAC_BOND_RELEASE` (✅ shipped) | Lib-tacit follows the dapp. |

See `src/constants/opcodes.ts:57-63` for the documenting comment.

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
| `decodeTWithdrawPayload` `bindHash` check | Computes expected `bindHash` via `computeWithdrawBindHash` during decode | Does NOT verify during decode | Per `AGENTS.md` + `docs/crypto/validation.md`, decoders are layer 1 (wire) only. Crypto verification is layer 3. |
| Proof-of-reserve helpers | Inline in dapp | Not ported | DApp-layer logic; library provides primitives |
| Stealth address codec | tacit.js:3925-4238 | Not ported | DApp-layer; bech32m addresses |
| BP+ prover/verifier | `bulletproofs-plus.js` | Not ported | Reference exists; wire codec in lib supports BP+ already |

## Remaining Gaps

| Gap | Location | Priority | Notes |
|-----|---------|----------|-------|
| `computeWithdrawBindHash` | tacit.js:4504 | Low | Crypto verify function; consumers can implement from primitives |
| BP+ prover/verifier | `bulletproofs-plus.js` | Medium | ~14% smaller proofs; reference available |
| Groth16 verifier (snarkjs) | tacit.js | Low | Mixer opcodes work without it |
| Stealth address codec | tacit.js:3925-4238 | Low | bech32m stealth addresses (dApp-layer) |
| `listingMsg` / `cancelMsg` / `claimMsg` / `axintentMsg`-family | tacit.js | Low | OTC listing & atomic intent signing messages |
| `AMM_SWAP_VAR_DOMAIN`-family helpers | tacit.js + AMM.md | Low | Drafted AMM opcodes; no consumers yet |

## Test Status

**117 tests passing**, 0 failing across 25 test files (submodule at `ce96228`).

| Test file | Count | Coverage |
|-----------|-------|----------|
| `tests/crypto/kernel.test.ts` | 8 | Kernel msg, dropKernelMsg, dropReclaimMsg, openingMsg, disclosureMsg, sign, verify, E'=0 rejection, BURN path, bad point handling |
| `tests/crypto/vectors.test.ts` | 30+ | Pinned hex vectors for H, BP gens, blindings, keystreams, asset IDs |
| `tests/crypto/schnorr.test.ts` | 4 | BIP-340 sign/verify, KAT vectors |
| `tests/crypto/bulletproofs.test.ts` | 10 | BP prove/verify/batch, edge cases |
| `tests/crypto/ecdh.test.ts` | 6 | ECDH blinding, keystream, encrypt/decrypt round-trips |
| `tests/opcodes/*.test.ts` | 8 files | All shipped opcode round-trips, edge cases |
| `tests/transaction/*.test.ts` | 2 files | Sighash, preauth, builder, asset ID |
| `tests/indexer/ancestry.test.ts` | 4 | Ancestry walk, kernel-sig validation |
| `tests/index.test.ts` | 1 | Barrel export completeness |
