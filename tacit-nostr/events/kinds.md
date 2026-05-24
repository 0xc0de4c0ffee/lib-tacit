# Event Kinds — Full Reference

> **Ref:** `src/constants/domains.ts`, `src/opcodes/*.ts`
> **Nostr NIP:** [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)

## Registered Kind Range

Tacit-nostr uses the **39xxx** range (application-specific, unregistered in NIPs):

| Kind | Name | NIP-01 type | Wrapped? | Notes |
|------|------|-------------|----------|-------|
| 39000 | asset-listing | Addressable (`d` = asset pair ID) | No | Updated when price/quantity changes |
| 39001 | atomic-intent | Regular | No | Expires after 5 min (client-filtered) |
| 39002 | preauth-bid | Regular | No | Expires at `expiration` tag |
| 39003 | preauth-bid-take | Regular | Yes (NIP-59) | Inner content before wrap |
| 39004 | preauth-bid-cancel | Regular | No | References bid via `e` tag |
| 39005 | preauth-sale | Regular | No | |
| 39006 | preauth-sale-take | Regular | Yes (NIP-59) | |
| 39007 | drop-announce | Addressable (`d` = drop ID) | No | |
| 39008 | dclaim-proof | Regular | Yes (NIP-59) | |
| 39009 | wrapper-attest | Regular | No | |
| 39010 | nostr-binding | Regular | No | Optional key separation |

## Tag Conventions

### Required tags per kind

| Kind | Required tags | Optional tags |
|------|---------------|---------------|
| 39000 | `d` (asset pair ID) | `t` (category), `expiration` |
| 39001 | `a` (ref listing), `p` (taker), `expiration` | |
| 39002 | `a` (ref listing), `expiration` | `p` (target seller, if any) |
| 39003 | `e` (ref bid), `p` (buyer pubkey) | `a` (ref listing) |
| 39004 | `e` (ref bid) | `expiration` (recommended: short TTL) | |
| 39005 | `a` (ref listing), `expiration` | |
| 39006 | `e` (ref sale), `p` (seller pubkey) | |
| 39007 | `d` (drop ID), `a` (asset) | `expiration` |
| 39008 | `e` (ref drop announce), `p` (DROP issuer) | |
| 39009 | `a` (ref asset) | |
| 39010 | `p` (Nostr pubkey) | `bitcoin-sig` |

### Tag value formats

- `d` tag: `"<asset_id_hex>"` for single-asset listings, `"<asset_a_id>~<asset_b_id>"` for trading pair listings, `"<drop_id_hex>"` for drops
- `a` tag: `"39000:<pubkey_hex>:<asset_pair_id>"` — standard NIP-01 addressable event reference
- `e` tag: `"<event_id_hex>"` — standard NIP-01 event reference
- `p` tag: `"<32-byte hex pubkey>"` — standard NIP-01 pubkey reference
- `expiration`: Unix timestamp as string — non-standard but widely supported

## Event Deduplication

Since tacit-nostr operates across multiple relays, clients MUST deduplicate by event `id` (which includes the signature):

- Same `id` → same event, deduplicate
- Different event IDs with same semantic content → both accepted (race is resolved by Bitcoin consensus)
- Replaceable events (39000, 39007): for same `kind` + `pubkey` + `d` tag, keep the newest `created_at`

## Expiry Semantics

- Events with an `expiration` tag MUST be ignored by clients if `now > expiration`
- Relays MAY serve expired events; clients MUST filter them
- Preauth bids (39002) and intents (39001) SHOULD always include `expiration`
- DROP announcements (39007) MAY omit `expiration` (they're valid until chain expiry)
