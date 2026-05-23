# Stealth Addresses (Blinded-Pubkey Commits)

## Overview

Class-2 stealth recipient markers per SPEC-BLINDED-PUBKEY-AMENDMENT §A. Recipients publish a `tcs1...` bech32m handle. Senders derive per-transaction-unique commitments from the recipient's pubkey + the transaction's ECDH blinding. Only the recipient can detect incoming tacit transfers.

## Library Implementation

✅ `src/crypto/stealth.ts`:

| Function | Description |
|----------|-------------|
| `encodeStealthAddress` | Create `tcs1...` address (single-key or dual-key mode) |
| `decodeStealthAddress` | Decode `tcs1...` → `{ scanPub, spendPub }` |
| `deriveStealthEcdhSharedSecret` | ECDH shared secret (once per tx) |
| `deriveStealthBlindingFromShared` | Per-output blinding from shared secret |
| `senderComputeStealthCommit` | Sender derives blinded commitment |
| `recipientScanTxForStealth` | Recipient scans tx for matching commitments |

## Address Format

```
HRP: tcs (mainnet) / tcsts (signet)
Version: 0x00
Mode: 0x00 (single) || recipientPub(33)
      0x01 (dual)   || scanPub(33) + spendPub(33)
Encoding: bech32m
```

## Eligibility Rules (per §A.2.5)

Only `p2wpkh` and `p2tr-keypath` inputs contribute to ECDH aggregation. Tacit-envelope (P2TR script-path) and mixer-derived inputs are excluded. Mixer-derived check is evaluated first.

## Recovery

Recipient owns the wallet private key. On-chain recovery: compute ECDH shared secret from each tx's eligible aggregate pubkey, derive blinding per-output, compute candidate commitment, compare against output script.
