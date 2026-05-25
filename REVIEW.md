# lib-tacit Review: Comparison with tacit-specs Reference

> Updated: 2026-05-25
> Reference commit: `c2ee202` (z0r0z/tacit) — refresh with `bun run specs:pull`
> **523 tests passing**, 2840 expect calls, 42 test files

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
| `encodeStealthAddress` | tacit.js:4074+ | `stealth.ts` | ✅ Match | `tcs`/`tcsts`/`tcsrt` §D.1 codec |
| `decodeStealthAddress` | tacit.js:4095+ | `stealth.ts` | ✅ Match | throws on malformed (no silent null) |
| `deriveStealthEcdhSharedSecret` | tacit.js:4121 | `stealth.ts` | ✅ Match | x-only SHA256 ECDH |
| `deriveStealthBlindingFromShared` | tacit.js:4133 | `stealth.ts` | ✅ Match | per-vout HMAC stage |
| `deriveStealthEcdhBlinding` | tacit.js:4144 | `stealth.ts` | ✅ Match | convenience wrapper |
| `computeStealthCommit` | tacit.js:4151 | `stealth.ts` | ✅ Match | P + b·G |
| `computeStealthTweakedSk` | tacit.js:4160 | `stealth.ts` | ✅ Match | (sk + b) mod n |
| `classifyStealthInput` | tacit.js:4176 | `stealth.ts` | ✅ Match | §A.2.5 + mixer precedence |
| `senderComputeStealthCommit` | tacit.js:4281 | `stealth.ts` | ✅ Match | sender-side commit |
| `recipientScanTxForStealth` | tacit.js:4305 | `stealth.ts` | ✅ Match | §H.1 one ECDH per tx |
| `stealthTxAnchorHead` | tacit.js:4267 | `stealth.ts` | ✅ Match | alias of `buildAnchor` |
| `senderComputeSilentPaymentOutput` | tacit.js:4371+ | `silent-payments.ts` | ✅ Ported | BIP-352 native sats send |
| `senderScanTxForSilentPayments` | tacit.js | `silent-payments.ts` | ✅ Ported | BIP-352 receiver scan |
| `decodeSilentPaymentAddress` | tacit.js:4382 | `silent-payments.ts` | ✅ Ported | BIP-352 sp1… addresses |
| `receiverScanTxForSilentPayments` | tacit.js | `silent-payments.ts` | ✅ Ported | BIP-352 receiver scanning |
| `xor32` | (new) | `primitives.ts` | ✅ Added | XOR two 32-byte arrays for encryption/commitment |
| `ipfsFetchVerified` | (new) | `ipfs.ts` | ✅ Added | Trustless IPFS via helia + gateway fallback |
| `cidToV1` | (new) | `ipfs.ts` | ✅ Added | CIDv0 → CIDv1 conversion for consistency |
| `taggedHash` | BIP-340 | `sighash.ts` | ✅ Added | BIP-340 tagged hash SHA256(tag ‖ tag ‖ m) |
| `tapLeafHash` | BIP-342 | `sighash.ts` | ✅ Added | Tapleaf hash for script-path inclusion proof |
| `tweakedOutputKey` | BIP-342 | `sighash.ts` | ✅ Added | P2TR output key = internal + t·G |
| `controlBlock` | BIP-342 | `sighash.ts` | ✅ Added | Control block encoding for tapscript |

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
| `listingMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Off-chain OTC listing (SPEC §5.6) |
| `listingMsgBytes` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Low-level serialized listing bytes |
| `listingCancelMsgBytes` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Cancel message bytes for OTC listing |
| `listingClaimMsgBytes` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Claim message bytes for OTC listing |
| `axintentMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Atomic intent message (SPEC §5.7.6) |
| `axintentClaimMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Match | AXINTENT claim variant |
| `axintentClaimMsgVar` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Variable-amount AXINTENT claim variant |
| `axintentFulfilMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Match | AXINTENT fulfil variant |
| `axintentCancelMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Added | AXINTENT cancel variant |
| `bidIntentMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Bid intent message (SPEC §5.7.6.1) |
| `bidClaimMsg` | tacit.js (dapp) | `kernel.ts` | ✅ Match | Bid claim message |
| `assetIdFor` | tacit.js:3785 | `kernel.ts:146` | ✅ Match |
| `computeWithdrawBindHash` | tacit.js:4504 | *not ported* | 🔶 Missing | Crypto verify function; low priority |

### Opcode Encode/Decode

| Opcode | Ref encoder | Lib encoder | Lib decoder | Status | Notes |
|--------|------------|------------|------------|--------|-------|
| CETCH (0x21) | tacit.js:5688 | `etch.ts:41` | `etch.ts:70` | ✅ Match | `Number.isInteger(decimals)` guard added |
| T_CXFER_BPP (0x22) | tacit.js:5789 | `cxfer-bpp.ts:25` | `cxfer-bpp.ts:45` | ✅ Match | BP+ wire only; BP+ crypto ported |
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
| T_SWAP_VAR (0x32) | tacit.js:10589 | `amm-swap.ts` | `amm-swap.ts` | ✅ Match | Full encode/decode + pool helpers |
| T_SWAP_ROUTE (0x33) | tacit.js:10656 | `amm-swap.ts` | `amm-swap.ts` | ✅ Match | Full encode/decode, N_HOPS_MAX=4 |
| T_AXFER_VAR (0x37) | tacit.js:5859 | `axfer-var.ts:23` | `axfer-var.ts:44` | ✅ Match |
| T_WRAPPER_ATTEST (0x38) | tacit.js:5498 | `wrapper-attest.ts:20` | `wrapper-attest.ts:33` | ✅ Match |
| T_AXFER_BPP (0x3C) | tacit.js (dapp) | `axfer-bpp.ts` | `axfer-bpp.ts` | ✅ Match | BP+ variant of atomic settlement |
| T_AXFER_VAR_BPP (0x3D) | tacit.js (dapp) | `axfer-var-bpp.ts` | `axfer-var-bpp.ts` | ✅ Match | BP+ variant of variable-amount settlement |
| T_SLOT_MINT (0x43) | tacit.js | `slot.ts` | `slot.ts` | ✅ Match | Full encode/decode |
| T_SLOT_BURN (0x44) | tacit.js | `slot.ts` | `slot.ts` | ✅ Match | Full encode/decode |
| T_SLOT_ROTATE (0x45) | tacit.js | `slot.ts` | `slot.ts` | ✅ Match | Full encode/decode |
| T_SLOT_SPLIT (0x46) | tacit.js | `slot.ts` | `slot.ts` | ✅ Match | Full encode/decode |
| T_SLOT_MERGE (0x47) | tacit.js | `slot.ts` | `slot.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_DEPOSIT (0x49) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_WITHDRAW (0x4A) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_FORCE_CLOSE (0x4B) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CTAC_LIEN_CLAIM (0x4C) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CTAC_LIEN_SPLIT (0x4F) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_DEPOSIT_ATOMIC (0x57) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_WITHDRAW_ATOMIC (0x58) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_TOP_UP (0x59) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_CBTC_TAC_BOND_RELEASE (0x5A) | tacit.js | `cbtc-tac.ts` | `cbtc-tac.ts` | ✅ Match | Full encode/decode |
| T_PREAUTH_BID (0x5B) | tacit.js | `preauth-bid.ts` | `preauth-bid.ts` | ✅ Match | Full encode/decode/context-hash |
| T_PREAUTH_BID_VAR (0x5C) | tacit.js | `preauth-bid-var.ts` | `preauth-bid-var.ts` | ✅ Match | Full encode/decode/context-hash |

### Envelope Script

| Function | Ref lines | Lib file | Status | Notes |
|----------|----------|---------|--------|-------|
| `encodeEnvelopeScript` | tacit.js:5607-5618 | `script.ts:36` | ✅ Match |
| `decodeEnvelopeScript` | tacit.js:5621-5670 | `script.ts:66` | ✅ Match |
| `ENVELOPE_MAGIC` | tacit.js:5580 | `domains.ts` | ✅ Match | "TACIT" |
| `ENVELOPE_VERSION` | tacit.js:5581 | `domains.ts` | ✅ Match | 0x01 |

### Domain Tags

Full domain tag table in `src/constants/domains.ts` (previously missing tags now added):

| Tag | Ref | Lib | Status |
|-----|-----|-----|--------|
| `tacit-bid-intent-v1` | tacit.js | domains.ts:26 | ✅ Fixed (was missing -v1 suffix) |
| `tacit-bid-claim-v1` | tacit.js | domains.ts:27 | ✅ Fixed (was missing -v1 suffix) |
| `tacit-swap-route-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-amm-receipt-secp-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-amm-receipt-bjj-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-amm-xcurve-seed-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-claim-pool-lp-asset-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-mint-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-rotate-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-split-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-merge-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-btc-key-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-secret-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-slot-nullifier-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-cbtc-tac-variant-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-cbtc-tac-deposit-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-cbtc-tac-withdraw-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-cbtc-tac-force-close-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-cbtc-tac-recovery-blinding-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-ctac-lien-split-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-ctac-deposit-atomic-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-ctac-withdraw-atomic-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-ctac-topup-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-ctac-release-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-cbtc-tac-atomic-mint-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-share-slash-claim-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-share-slash-claim-blind-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-bridge-deposit-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-bridge-burn-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-mixer-deposit-secret-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-mixer-deposit-nullifier-v1` | tacit.js | domains.ts | ✅ Added |
| `tacit-pool-empty-v1` | tacit.js | domains.ts | ✅ Added |

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
| `signP2wpkhInput` | tacit.js:18011 | `sighash.ts` | ✅ Fixed | Was using Schnorr — now ECDSA DER per BIP-143 |
| `derSignEcdsa` | tacit.js:623-642 | `sighash.ts` | ✅ Added | DER encoder from compact (r,s) per X.690 |
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

## Notable Bugs Found and Fixed

### 1. `signP2wpkhInput` used Schnorr instead of ECDSA
**File:** `src/transaction/sighash.ts` (fixed 2026-05-25)
**Impact:** P2WPKH spends require DER-encoded ECDSA signatures per BIP-143. The previous implementation used `signSchnorr`, which produces BIP-340 Schnorr signatures incompatible with legacy segwit. Any wallet or broadcaster consuming this function would produce witnesses rejected by Bitcoin nodes.
**Fix:** Replaced with `secp.sign()` (ECDSA DER) + custom `derSignEcdsa()` helper appending the sighash byte. Mirrors the dapp's `derEncodeFromCompact()` approach at `tacit.js:623-642`.

### 2. `decodeWithdraw` — Missing zero-length proof guard
**File:** `src/opcodes/withdraw.ts:72` (fixed)
**Impact:** A zero-length `proof` field would be accepted by the decoder. The reference rejects `proofLen === 0` (tacit.js:6862). A zero-length Groth16 proof is invalid per SPEC §5.11.
**Fix:** Added `if (proofLen === 0) return null;` before the length-exactness check. Also relocated the `denomination` range check before proof parse for early rejection.

### 3. `encodePoolInit` — Missing CID length validation
**File:** `src/opcodes/deposit.ts:69` (fixed)
**Impact:** `vkCid` and `ceremonyCid` were accepted at any length, including zero. The reference requires 1–64 bytes (tacit.js:6749-6750). Empty CIDs would produce malformed pool-init envelopes.
**Fix:** Added `vkCid.length` and `ceremonyCid.length` range checks (1–64).

### 4. `decodeDeposit` — Missing CID length bounds
**File:** `src/opcodes/deposit.ts:96-99` (fixed)
**Impact:** The decoder accepted zero-length or >64-byte CIDs. The reference rejects these (tacit.js:6788, 6793).
**Fix:** Added `vkCidLen < 1 || vkCidLen > 64` and `ceremonyCidLen < 1 || ceremonyCidLen > 64` guards.

### 5. Missing `-v1` suffix on BID_INTENT_DOMAIN and BID_CLAIM_DOMAIN
**File:** `src/constants/domains.ts:26-27` (fixed 2026-05-25)
**Impact:** Domain tags `tacit-bid-intent` and `tacit-bid-claim` were missing the `-v1` suffix mandated by SPEC §3.5. This would produce different HMAC keys between implementations, causing cross-implementation verification failures for preauth-bid signatures.
**Fix:** Changed to `tacit-bid-intent-v1` and `tacit-bid-claim-v1`.

### 6. `SWAP_ROUTE_N_HOPS_MAX` was 8, should be 4
**File:** `src/constants/limits.ts` (fixed 2026-05-25)
**Impact:** Encode/decode functions accepted 2–8 hops per route, but the reference rejects >4 hops (tacit.js:6152, SPEC §5.22). An indexer using our library could accept invalid envelopes.
**Fix:** Changed constant to `4`.

## Design Divergences (Intentional)

| Area | Reference | Lib-tacit | Rationale |
|------|-----------|-----------|-----------|
| `decodeTWithdrawPayload` `bindHash` check | Computes expected `bindHash` via `computeWithdrawBindHash` during decode | Does NOT verify during decode | Per `docs/crypto/validation.md`, decoders are layer 1 (wire) only. Crypto verification is layer 3. |
| Proof-of-reserve helpers | Inline in dapp | Not ported | DApp-layer logic; library provides primitives |
| Encode/decode naming | `encodeCXferPayload` / `decodeCXferPayload` | `encodeCXfer` / `decodeCXfer` | Shorter names, same signatures |
| Naming convention | Destructured object params | Typed interfaces | TypeScript-idiomatic; same wire output |
| Bridge opcodes (0x60-0x63) | In dapp (POC) | Not ported | Upstream ETH bridge POC, not shipped. Add when protocol-activation ceremony published. |

## Open Gaps (vs reference @ `c2ee202`)

| Area | Reference | lib-tacit | Priority |
|------|-----------|-----------|----------|
| `computeWithdrawBindHash` | tacit.js:4504 | not ported | low — crypto verify function |
| Bind-hash compute functions (cbtc-tac, slot) | tacit.js (dapp) | not ported | low — crypto verify functions |
| Bridge opcode encode/decode (0x60-0x63) | tacit.js (dapp POC) | not ported | low — upstream POC, not shipped |
| Drafted AMM/farm/gov `0x2D`–`0x56` | amendments + partial dapp | type stubs only (amm-drafts, farm-drafts, gov-drafts) | low |
| T_TRADE_BATCH (0x39), T_RANGE_ATTEST (0x3A) | amendments | no file exists | low |
| On-chain OP_RETURN helpers | tacit.js (dapp) | not ported | low — auxiliary recovery helpers |

## Closed Gaps

| Gap | Status |
|-----|--------|
| BP+ prover/verifier | ✅ `bulletproofs-plus.ts` |
| Poseidon / Groth16 | ✅ wrapped |
| Class-2 blinded-pubkey stealth | ✅ `stealth.ts` (ported from stealth-primitives/dapp) |
| BIP-352 silent payments (sender + receiver) | ✅ `silent-payments.ts` |
| AXINTENT message variants | ✅ `kernel.ts` (`axintentClaimMsg`, `axintentFulfilMsg`, `axintentCancelMsg`, `bidIntentMsg`) |
| T_AXFER_BPP / T_AXFER_VAR_BPP (0x3C/0x3D) | ✅ `axfer-bpp.ts`, `axfer-var-bpp.ts` (full encode/decode) |
| Slot opcodes 0x43–0x47 | ✅ `slot.ts` (full encode/decode) |
| cBTC.tac opcodes 0x49–0x4F, 0x57–0x5A | ✅ `cbtc-tac.ts` (full encode/decode) |
| T_SWAP_VAR / T_SWAP_ROUTE (0x32/0x33) | ✅ `amm-swap.ts` (full encode/decode + pool helpers) |
| Shipped transfer-family wire `0x21`–`0x2C`, `0x37`–`0x38`, `0x5B`–`0x5C` | ✅ encoders/decoders + tests |
| Validation + recovery | ✅ `validation/`, `recovery/` |
| XOR32 primitive | ✅ `primitives.ts` |
| IPFS verified fetch + CID conversion | ✅ `ipfs.ts` (`ipfsFetchVerified`, `cidToV1`) |
| Taproot sighash primitives | ✅ `sighash.ts` (`taggedHash`, `tapLeafHash`, `tweakedOutputKey`, `controlBlock`) |
| P2WPKH ECDSA signing | ✅ `sighash.ts:derSignEcdsa` — fixed 2026-05-25 |
| Domain tag `-v1` suffix correctness | ✅ `domains.ts:26-27` — fixed 2026-05-25 |
| SWAP_ROUTE_N_HOPS_MAX = 4 | ✅ `limits.ts:27` — fixed 2026-05-25 |

## Test Status

**523 tests passing**, 2840 expect calls across 42 test files.

| Test file | Count | Coverage |
|-----------|-------|----------|
| `tests/crypto/kernel.test.ts` | 34 | Kernel msg, sign/verify, E'=0, domain tags, axintent/bid msg variants |
| `tests/crypto/silent-payments.test.ts` | 15 | BIP-352 decode, sender compute, receiver scan, outpoint bytes, tagged hash |
| `tests/crypto/stealth.test.ts` | 15 | Codec, ECDH, commit, classifier, scan |
| `tests/crypto/msm.test.ts` | 15 | Pippenger MSM, signed-digit windowed |
| `tests/crypto/ecdh.test.ts` | 11 | Blinding, keystream, encrypt/decrypt |
| `tests/crypto/vectors.test.ts` | 11 | Pinned hex vectors |
| `tests/crypto/bulletproofs.test.ts` | 9 | BP prove/verify/batch |
| `tests/crypto/poseidon.test.ts` | 9 | poseidonHash consistency |
| `tests/crypto/schnorr.test.ts` | 8 | BIP-340 sign/verify, KAT |
| `tests/crypto/pedersen.test.ts` | 8 | Commit/verify, H invariant |
| `tests/crypto/bulletproofs-plus.test.ts` | 21 | BP+ KAT, round-trip m=1/2/4/8 |
| `tests/crypto/groth16.test.ts` | 6 | snarkjs verify (optional) |
| `tests/crypto/fixture-signing.test.ts` | 5 | Deterministic 0xaa..aa key |
| `tests/crypto/primitives.test.ts` | 8 | xor32 identity, symmetry, length |
| `tests/opcodes/slot.test.ts` | 33 | Slot (0x43-0x47) encode/decode round-trips, decode rejection, boundary |
| `tests/opcodes/cbtc-tac.test.ts` | 36 | cBTC.tac (0x49-0x5A) encode/decode round-trips, decode rejection |
| `tests/opcodes/amm-swap.test.ts` | 30 | T_SWAP_VAR (0x32) + T_SWAP_ROUTE (0x33) encode/decode + pool helpers |
| `tests/opcodes/ (remaining 18 files)` | ~130 | All shipped opcode encode/decode: round-trips, truncated, boundary, rejected |
| `tests/envelope.test.ts` | 22 | Encode/decode round-trip, 200 random buffer fuzz, chunking |
| `tests/indexer/ipfs.test.ts` | 12 | CIDv0/v1 match, cidToV1, corrupt rejection |
| `tests/transaction/sighash.test.ts` | 25 | ALL/SINGLE/NONE/ACP, taproot primitives, ECDSA DER |
| `tests/validation/2 files` | 17 | Supply conservation, E'=0 degenerate, ancestry |
| `tests/recovery/decrypt.test.ts` | 6 | ECDH trial-decrypt, batch |
| `tests/integration/etch-mint-burn.test.ts` | 6 | Full pipeline, BP+, stealth |
| `tests/indexer/ancestry.test.ts` | 6 | Memoized walks, kernel-sig |
| `tests/index.test.ts` | 1 | Barrel export completeness |

## Opcode Constants

Full opcode table in `src/constants/opcodes.ts`. All 56 entries from SPEC §1.1 covered (shipped, drafted, reserved).

| Hex | Name | Section | Our Status | Notes |
|-----|------|---------|-----------|-------|
| `0x3C` | T_AXFER_BPP | — | ✅ Shipped (promoted 2026-05-25) | BP+ variant of T_AXFER. Was drafted, now shipped with full encode/decode. |
| `0x3D` | T_AXFER_VAR_BPP | — | ✅ Shipped (promoted 2026-05-25) | BP+ variant of T_AXFER_VAR. Was drafted, now shipped with full encode/decode. |
| `0x60–0x63` | Bridge opcodes (T_BRIDGE_DEPOSIT/BURN/ROTATE/NOTE) | — | ⬜ Not in constants | Upstream ETH bridge POC, not shipped. Add when protocol-activation ceremony published. |
