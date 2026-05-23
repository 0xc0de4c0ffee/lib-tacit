# Skill: BIP-352 Silent Payments

## Domain Knowledge

BIP-352 silent payments for sending plain Bitcoin sats to a static address that produces per-transaction-unique P2TR outputs. The sender derives a unique output key from the recipient's scan+spend pubkeys, the sender's input private keys, and the lexicographically-smallest input outpoint. Only the recipient can detect incoming payments by scanning all P2TR outputs against their scan private key.

## Reference Implementation

tacit-specs/dapp/tacit.js lines 4371-4484

## Wire Format (Address)

BIP-352 addresses use HRP `sp1...` (mainnet) / `tsp1...` (signet). Decoded payload:
```
version(5-bit, 0) || scanPub(33) || spendPub(33)
```
Total: 66 bytes decoded, bech32m-encoded.

## Functions

### decodeSilentPaymentAddress(addr)
- Returns `{ hrp, network, version, scanPub, spendPub }` or null
- Validates: length, HRP, checksum, version 0, 66-byte payload, valid pubkeys

### senderComputeSilentPaymentOutput({ inputPrivs, inputOutpoints, scanPub, spendPub, k })
- Sums all input private keys → `a`
- Finds lexicographically-smallest outpoint → `op_L`
- Computes `input_hash = SHA256(SHA256("BIP0352/Inputs") || SHA256("BIP0352/Inputs") || op_L || a*G)`
- ECDH: `ecdh = scanPub * (a * input_hash)`
- Per-output tweak: `t_k = SHA256(SHA256("BIP0352/SharedSecret") || ... || k)`
- Returns `{ xOnly }` — 32-byte P2TR output key

## Constraints

- At least one P2WPHK input required (enough to compute `a`)
- `k` parameter for multiple outputs to the same recipient
- Tweak must not be zero (BIP-352: skip this output)

## Use in tacit

- Sats-send flow: user pastes `sp1...` address → wallet derives unique P2TR output
- Does NOT interact with tacit envelope or asset transfers
