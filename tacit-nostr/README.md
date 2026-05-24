# tacit-nostr — Decentralized Tacit Market over Nostr

> **Status:** R&D / Speculative Design
> **Branch:** `tacit-nostr`
> **Depends on:** [lib-tacit](..) (pure TS library for tacit protocol primitives)
> **Ref submodule:** [z0r0z/tacit](https://github.com/z0r0z/tacit) at `tacit-specs/`

## Objective

Replace the centralized worker (`tacit-specs/worker/src/index.js`) with a **decentralized coordination layer over Nostr** for trading tacit confidential assets. All settlement remains on Bitcoin via the existing commit-reveal pattern. Nostr carries the pre-trade coordination (bids, asks, intents, DROP announcements) that the current worker handles.

## How It Works

1. **One seed, many keys** — A single BIP-39 seed derives separate keypairs for Nostr (identity), Bitcoin (on-chain), and tacit assets (BIP-352 silent payments). See `key-architecture/overview.md`.
2. **Public events** — Bids, asks, and DROP announcements as standard Nostr events. Clients subscribe to kinds 39000–39012. See `events/kinds.md`.
3. **Private takes** — Take events gift-wrapped (NIP-59) so only the recipient can decrypt. See `privacy/gift-wrapping.md`.
4. **Client validates everything** — Kernel sigs, bulletproofs, chain state, Nostr sigs, and key bindings. No trust in relays. See `validation/client-side.md`.
5. **No CAS lock** — Bitcoin consensus resolves double-spends. Losing seller loses commit fee.

## Directory Structure

```
tacit-nostr/
├── README.md                          # This file
├── nostr-market.md                    # Master protocol spec
├── key-architecture/
│   ├── overview.md                    # Key management: separate keys per domain, BIP-352 silent payments
│   └── nip-46-bunker.md               # NIP-46 multi-key signer for browser clients
├── events/
│   ├── kinds.md                       # Event kind table (39000-39020), tags, content schemas
│   └── messaging.md                   # DM and notification layer (kinds 39011-39014)
├── privacy/
│   └── gift-wrapping.md               # NIP-59 gift wrap for take/fulfilment events
├── validation/
│   └── client-side.md                 # Client-side validation pipeline, event cache
├── relays/
│   └── tier-model.md                  # Tier 1/2/3 relay model, validation at relay level
└── analysis/
    ├── vs-worker.md                   # Full comparison with current worker-based market
    └── open-questions.md              # Open design questions + edge cases
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Key model | Separate keys per domain (Nostr / Bitcoin / tacit) | BIP-352 silent payments for tacit, BIP-84 for BTC, NIP-06 for Nostr. No key reuse. Binding event (kind 39010) attests control. |
| Receiving format | BIP-352 silent payment addresses (`sp1...`) | Compatible with tacit ECDH blinding. Breaks on-chain ↔ Nostr link. No address reuse. |
| Orderbook | Reconstructed locally from Nostr events | No central state. Deduplicate by event ID. Sort by price client-side. |
| Take coordination | No CAS — Bitcoin resolves double-spends | Decentralization requires sacrificing atomic CAS. Race cost = commit fee (~few thousand sats). |
| Take privacy | Gift wrap (NIP-59) for take/fulfilment events | Hides counterparty identity from relay until settlement confirms. |
| Relay model | Any Nostr relay (Tier 1). Validating relay optional (Tier 2). | Clients always validate. Tier 2 relay is a convenience, not a trust requirement. |
| Protection | NIP-70 protected events for limiting re-publishing | Optional. Reduces spread of stale/expired events. |
| Encryption | NIP-44 v2 (ChaCha20 + HKDF) | Compatible with standard Nostr tooling. Different from tacit's HMAC keystream (intentional — different purpose). |

## Related Work

- [NIP-15](https://github.com/nostr-protocol/nips/blob/master/15.md) — Nostr Marketplace (physical/digital goods). tacit-nostr is NOT NIP-15 compatible — tacit deals with confidential assets, not physical products. But the event kind conventions (addressable events, `d` tags, `p` tags) are shared.
- [Diagon-Alley](https://github.com/lnbits/Diagon-Alley) — The reference implementation for NIP-15. Different domain (physical e-commerce vs confidential tokens).
- [NostrMarket](https://github.com/lnbits/nostrmarket) — NIP-15 marketplace client. Architectural reference for nostr-native market clients.

## NIP & BIP Coverage

| Standard | Status | Use in tacit-nostr |
|----------|--------|-------------------|
| [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | ✅ Required | Event format, signing, relay protocol |
| [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md) | ⚠️ Required for Tier 2+ | AUTH for serving wrapped events |
| [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) | ✅ Required | Encrypted payloads (gift wrap) |
| [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) | ✅ Required | Gift wrap for take events |
| [NIP-70](https://github.com/nostr-protocol/nips/blob/master/70.md) | ⚠️ Optional | Protected events |
| [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) | ⚠️ Recommended | Relay list metadata |
| [NIP-66](https://github.com/nostr-protocol/nips/blob/master/66.md) | ❌ Future | Relay discovery by kind |
| [BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) | ✅ Required | Silent payment addresses (`sp1...`) |
| [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) | ✅ Required | Bitcoin key derivation |
| [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) | ⚠️ Future | Multi-key bunker for browser clients |
