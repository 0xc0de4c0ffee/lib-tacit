# Comparison: Nostr Market vs Worker-Based Market

> **Ref:** `tacit-specs/worker/src/index.js`, `tacit-specs/dapp/tacit.js`

## Overview

The current tacit market uses a **centralized worker** (`tacit-specs/worker/src/index.js`) that maintains an orderbook, manages preauth-bids, and provides a CAS lock for take coordination. tacit-nostr replaces the worker with **Nostr relays + client-side validation**.

## Aspect-by-Aspect Comparison

| Aspect | Worker (current) | Nostr (tacit-nostr) | Trade-off |
|--------|-----------------|---------------------|-----------|
| **Orderbook state** | Centralized in worker DB (sorted, paginated) | Reconstructed locally from relay subscription | Nostr: no single source of truth, client does more work |
| **Bid discovery** | `GET /preauth-bids` — single endpoint | Subscribe to kind 39002 on N relays | Nostr: more resilient, higher latency |
| **Take coordination** | Worker CAS lock — first take wins atomically | Bitcoin consensus — winner confirmed by block inclusion | Nostr: losing takes cost commit fees; Worker: single point of failure |
| **Validation** | Worker validates before accepting | Client validates locally (Tier 2 relay may also validate) | Nostr: client has full validation code; Worker: server hides complexity |
| **Counterparty privacy** | Worker knows who took what; does not broadcast | Gift wrap hides taker identity from relay | Nostr: better privacy against third parties; same vs worker |
| **Griefing protection** | Worker rate-limits by IP/pubkey, CAS lock prevents double-takes | No built-in protection. Races cost commit fees. Tier 2 relay can rate-limit. | Worker: stronger against griefing. Nostr: relies on Bitcoin economics. |
| **Expiry** | Worker sweeps expired bids automatically | Clients filter by `expiration` tag. Stale events remain on relays. | Nostr: clients must implement filtering; Worker: automatic cleanup |
| **Infrastructure cost** | Server(s) + DB + monitoring | Relays (shared cost) + client-side validation (user's CPU) | Nostr: no server cost for market operator |
| **Censorship resistance** | Worker operator can censor specific pubkeys, assets, or regions | Anyone can publish to any relay. No single operator controls access. | Nostr: strictly better for censorship resistance |
| **Client complexity** | Thin client (calls worker API, validates nothing) | Thick client (validates everything, manages relay subscriptions) | Nostr: client is more complex. Worker: client can be simpler. |
| **Discovery** | Single worker URL | Multiple relay URLs (NIP-65, NIP-66) | Nostr: bootstrapping requires relay discovery |
| **Update latency** | Milliseconds (WebSocket to worker) | Seconds to minutes (Nostr relay propagation) | Worker: faster. Nostr: relay-dependent. |
| **Event ordering** | Server-side sequence | No guaranteed order (relays may deliver events in different order) | Nostr: clients must handle out-of-order events |

## When to Use Each

| Scenario | Better fit | Why |
|----------|-----------|-----|
| High-frequency trading | Worker | Lower latency, CAS lock prevents race losses |
| Large trades (>$10K) | Nostr | Censorship resistance outweighs race risk |
| Privacy-sensitive | Nostr | Gift wrap hides counterparty |
| Regulatory risk | Nostr | No central operator to target |
| Mobile/low-power client | Worker | Thin client, server does the work |
| Bot/automated trading | Both | Bots can run both in parallel |

## Coexistence

Nothing prevents running both in parallel. A tacit-nostr client can:
1. Publish bids to both Nostr relays AND the worker
2. Subscribe to worker API for fast matching
3. Subscribe to Nostr relays for censorship-resistant backup

The settlement tx is the same Bitcoin transaction either way. The coordination layer is orthogonal to settlement.
