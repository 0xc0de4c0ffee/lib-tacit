# BIP-352 Silent Payments

## Overview

BIP-352 silent payments allow sending plain Bitcoin sats to a static address (`sp1...` / `tsp1...`) that produces per-transaction-unique P2TR outputs. Only the recipient can detect incoming payments.

## Library Implementation

✅ `src/crypto/silent-payments.ts`:

| Function | Description |
|----------|-------------|
| `decodeSilentPaymentAddress` | Decode `sp1...`/`tsp1...` address → `{ scanPub, spendPub }` or null |
| `senderComputeSilentPaymentOutput` | Derive unique P2TR output key per BIP-352 §3.2 |
| `bip352OutpointBytes` | Canonical 36-byte outpoint (txid_LE + vout_LE) |
| `bip352SmallestOutpoint` | Lexicographic min over outpoints |
| `bip352TaggedHash` | BIP-340-style tagged SHA256 |

## Address Format

```
HRP: sp (mainnet) / tsp (signet)
Payload: version(0x00) || scanPub(33) || spendPub(33)
Encoding: bech32m
```

## Algorithm

1. Sum sender's input private keys → `a`
2. Find lexicographically smallest input outpoint → `op_L`
3. `input_hash = tagged_hash("BIP0352/Inputs", op_L || a·G)`
4. `ecdh = scanPub · (a · input_hash mod N)` → shared point
5. `t_k = tagged_hash("BIP0352/SharedSecret", ecdh || k)` → per-output tweak
6. `Q = spendPub + t_k·G` → P2TR output key

## Usage

Silent payments are used in the sats-send flow only. They do not interact with the tacit envelope or asset transfer protocol.
