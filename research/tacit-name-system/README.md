# Tacit Name System (TNS)

> **Ref:** `proposals/40-name-system/`, `tacit-nostr/`, `tacit-specs/SPEC.md §5.x`
> **Design influences:** ENS (Ethereum), Proquint (namesys-eth), Namecoin, NIP-05 (Nostr), BIP-352, BIP-47, Handshake

A Bitcoin-native naming system where names resolve to **privacy primitives** (silent payment addresses, viewing keys) rather than static addresses. Built on tacit's existing opcode machinery + Nostr for off-chain resolution.

## Directory

| Document | Description |
|----------|-------------|
| [`architecture.md`](./architecture.md) | Component map, data flow, two-layer on-chain/off-chain model |
| [`namehash.md`](./namehash.md) | SHA256-based privacy-preserving namehash — register without revealing name, TLD, years, or payment |
| [`resolver.md`](./resolver.md) | Resolver kinds (stealth, BIP-352, BIP-47, Nostr, DNS), per-name key derivation, multi-resolver format |
| [`pricing.md`](./pricing.md) | Exponential per-byte anti-sybil pricing, duration multiplier, height-gated registration, expiry/renewal |
| [`bridge.md`](./bridge.md) | ENS bridge (Solidity ref), NIP-05 bridge (extended JSON), DNS/DNSSEC oracle, WNS bridge |
| [`wallet.md`](./wallet.md) | Client API, resolve → derive → send pipeline, name entry UX, notification integration |
| [`README.md`](./README.md) | This file |

## Quick Overview

### Name Support

TLNS supports **any name source** through a unified resolution API:

```
alice.tacit  →  on-chain resolver (privacy: namehash hides the name)
alice.tic    →  alias for .tacit
alice.tac    →  alias for .tacit
alice.eth    →  ENS gateway → Nostr kind 39020
alice@nostr  →  NIP-05: ICANN HTTPS → Nostr kind 39020
alice.com    →  DNS/DNSSEC oracle → Nostr kind 39020
alice.wei    →  WNS bridge → Nostr kind 39020
babab-dabab  →  Proquint: pronounceable 4-byte name → .tacit sub-namespace
```

All resolve to the same output format: `(view_pub, spend_pub, sp1_address, payment_code, ...)`.

### Key Innovation: Namehash Privacy

Traditional name systems store the name in plaintext on chain. TNS stores only:

```
namehash = SHA256("tacit-namehash-v1" || SHA256(label) || SHA256(tld) || u8(years) || payment_salt || owner_pubkey)
```

The name, TLD, registration duration, and payment are **hidden**. Ownership is proven by revealing the preimage (kind 39021). This means:
- A `.tacit` user and an ENS user are indistinguishable on chain
- Registration duration is committed (anti-front-running)
- Payment is committed (anti-sybil enforcement)

### Three Payment Paths

| Path | Mechanism | When to Use |
|------|-----------|-------------|
| **BIP-352** | `senderComputeSilentPaymentOutput()` | One-time payments, no per-sender state |
| **BIP-47** | Payment code + Nostr notify (kind 39016) | Recurring payments, proof of payment |
| **Tacit stealth** | ECDH(view_pub) → derived one-time key | Default — lowest overhead |
