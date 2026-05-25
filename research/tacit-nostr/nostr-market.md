# tacit-nostr — Decentralized Market for Tacit Assets over Nostr

> **Status:** R&D / Speculative Design
> **Ref:** [tacit-specs/SPEC.md](../../tacit-specs/SPEC.md), [lib-tacit/src/](../../src/)
> **Nostr NIPs:** [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md), [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md), [NIP-70](https://github.com/nostr-protocol/nips/blob/master/70.md)
> **BIP:** [BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) (silent payments)

Decentralized market protocol for tacit confidential assets on Bitcoin, using Nostr as coordination and discovery. Settlement remains on Bitcoin via commit-reveal; Nostr carries **pre-trade coordination** (bids, asks, intents, drops).

## Design Principles

1. **Separate keys per domain** — Nostr identity key, Bitcoin key, tacit key (BIP-352). No key reuse. Nostr events attest which Bitcoin/tacit keys the user controls via kind 39010 binding. See `key-architecture/overview.md`.
2. **No trusted coordinator** — Relays are dumb storage; all validation is client-side.
3. **Settlement is Bitcoin** — Nostr never settles. Commit-reveal, kernel sigs, bulletproofs all on chain.
4. **Privacy by default** — Take/fulfilment events gift-wrapped (NIP-59). Recipient's `sp1` address from listing event, not Nostr pubkey.
5. **BIP-352 receiving** — All tacit assets use silent payment addresses (`sp1...`/`tsp1...`). Sender computes shared output key from scan+spend pubkeys. No on-chain address reuse.

## Event Kinds

| Kind | Name | Replaceable | Wrapped | Description | Ref lib-tacit |
|------|------|-------------|---------|-------------|---------------|
| `39000` | `tacit-asset-listing` | Addressable (`d` = asset pair ID) | No | Advertise a trading pair (e.g., TAC/BTCSTABLE) with price. Includes `sp1` address. | `src/crypto/silent-payments.ts` |
| `39001` | `tacit-atomic-intent` | Regular | No | Atomic buy intent with ECDH-encrypted blinding | `src/opcodes/axfer.ts` |
| `39002` | `tacit-preauth-bid` | Regular | No | Pre-signed BTC input + Pedersen commitment | `src/opcodes/preauth-bid.ts` |
| `39003` | `tacit-preauth-bid-take` | Regular | Yes | Seller fills a preauth-bid (gift-wrapped to buyer) | `src/opcodes/preauth-bid.ts` |
| `39004` | `tacit-preauth-bid-cancel` | Regular | No | Buyer cancels an unfilled preauth-bid | `src/constants/domains.ts` |
| `39005` | `tacit-preauth-sale` | Regular | No | Pre-signed asset input (sell side) | `domains.ts:29-31` |
| `39006` | `tacit-preauth-sale-take` | Regular | Yes | Buyer fills a preauth-sale (gift-wrapped to seller) | `domains.ts:29-31` |
| `39007` | `tacit-drop-announce` | Addressable (`d` = drop ID) | No | DROP pool announcement + metadata | `src/opcodes/drop.ts` |
| `39008` | `tacit-dclaim-proof` | Regular | Yes | Claim proof + reveal tx (gift-wrapped to issuer) | `src/opcodes/dclaim.ts` |
| `39009` | `tacit-wrapper-attest` | Regular | No | On-chain wrapper attestation binding | `src/opcodes/wrapper-attest.ts` |
| `39010` | `tacit-key-binding` | Regular | No | Nostr key attests it controls tacit/Bitcoin keys | See key-architecture |
| `39011` | `tacit-dm` | Regular | Yes | Direct message between tacit users | See `events/messaging.md` |
| `39012` | `tacit-notification` | Regular | Yes | Automated notification from dapp/user | See `events/messaging.md` |

### Tags

| Tag | Value | Purpose |
|-----|-------|---------|
| `a` | `39000:<pubkey>:<asset_pair_id>` | Reference to an asset listing |
| `p` | 32-byte hex pubkey | Target participant |
| `e` | 32-byte hex event ID | Parent event reference |
| `t` | lowercase tag | Searchable category |
| `expiration` | Unix timestamp | Event expiry |
| `sp` | silent payment address (`sp1...`) | BIP-352 receiving address (kind 39000) |

### Domain tag mapping

| tacit domain tag | Signing context | Nostr equivalent |
|------------------|-----------------|-------------------|
| `tacit-preauth-bid-v1` | Bid message hash | Inner content of kind `39002` |
| `tacit-preauth-bid-cancel-v1` | Cancel message hash | `content` + `sig` of kind `39004` |
| `tacit-axintent-v1` | Intent message hash | Inner content of kind `39001` |
| `tacit-drop-v1` | DROP kernel message | Inner content of kind `39007` |
| `tacit-listing-v1` | OTC listing sign msg | Inner content of kind `39000` |

## Event Content Schemas

Every event's `content` field is a JSON object.

### Kind 39000 — Asset Listing

```jsonc
{
  "asset_id": "32-byte-hex",
  "ticker": "BTCSTABLE",
  "decimals": 8,
  "price_sats": "100000000",
  "min_fill": "1000000",
  "max_fill": "10000000000",
  "sp_address": "sp1...",              // BIP-352 silent payment address for receiving
  "listing_sig": "64-byte-hex",         // Schnorr sig under tacit key per 'tacit-listing-v1'
  "anchor": "36-byte-hex"
}
tags: [
  ["d", "<asset_pair_id>"],
  ["sp", "sp1..."]
]
```

### Kind 39002 — Preauth Bid

```jsonc
{
  "asset_id": "32-byte-hex",
  "asset_input_count": 1,
  "bid_id": "16-byte-hex",
  "recipient_pubkey": "33-byte-hex",   // tacit public key (NOT Nostr pubkey)
  "amount": "1000000000",
  "blinding": "32-byte-hex",
  "price_sats": "50000000",
  "kernel_sig": "64-byte-hex",
  "outputs": [
    { "commitment": "33-byte-hex" }
  ],
  "rangeproof": "hex",
  "pre_signed_tx_hex": "hex-encoded Bitcoin tx (SIGHASH_SINGLE|ACP)"
}
tags: [
  ["a", "39000:<listing_pubkey>:<asset_pair>"],
  ["expiration", "1767225600"]
]
```

Matches `PreauthBidInput` from `src/opcodes/preauth-bid.ts:13-23`. The `recipient_pubkey` is the buyer's **tacit key** (NOT the Nostr event pubkey). Sellers validate the kernel sig against this key.

### Kind 39010 — Key Binding

```jsonc
{
  "tacit_sp_address": "sp1...",
  "bitcoin_pubkey": "33-byte-hex",
  "nostr_pubkey": "32-byte-hex"
}
tags: [
  ["tacit-sig", <64-byte sig under tacit key>],
  ["bitcoin-sig", <64-byte sig under bitcoin key>]
]
```

## Wire Protocol (Nostr → lib-tacit)

| Event kind | Validate with | Ref |
|------------|---------------|-----|
| 39000 | `verifySchnorr(listing_sig, listingMsg(...), tacit_xonly)` | `src/crypto/kernel.ts`, `src/crypto/schnorr.ts` |
| 39002 | `verifyKernel(kernel_sig, asset_id, ..., outputCommitments)` + `bppRangeVerify` | `src/crypto/kernel.ts`, `src/crypto/bulletproofs*.ts` |
| 39003 | Validate completed tx kernel sig matches buyer+seller commitments | `src/crypto/kernel.ts` |
| 39010 | Verify both `tacit-sig` and `bitcoin-sig` independently | `src/crypto/schnorr.ts` |

## Coordination Flow: Preauth Bid → Take → Settle

1. **Buyer** derives tacit keypair from seed, publishes sp1 address in kind 39000 listing.
2. **Buyer** generates preauth-bid (kind 39002) signed under their **tacit key**, broadcasts to relays.
3. **Seller** subscribes to kind 39002. Validates per `validation/client-side.md`:
   - Nostr event sig ✓ (NIP-01, under Nostr key)
   - Binding (kind 39010): tacit key belongs to Nostr identity ✓
   - Kernel sig ✓ (`verifyKernel`, under tacit key)
   - Bulletproof ✓
   - Chain state: buyer's input UTXO unspent ✓
4. **Seller** constructs take (kind 39003), gift-wraps to buyer's Nostr pubkey, publishes.
5. **Buyer** unwraps, extracts settlement tx, broadcasts to Bitcoin.
6. **Race**: two sellers both took the same bid → Bitcoin consensus picks one.

## Key Differences from One-Key Design

| Aspect | One-key (old) | Multi-key (new) |
|--------|--------------|-----------------|
| Nostr key = Bitcoin key | Yes — reuse | No — separate derivations |
| Binding event | Optional (kind 39010) | Required for reputation (kind 39010) |
| Receiving address | Bitcoin xonly pubkey | BIP-352 silent payment (`sp1...`) |
| On-chain ↔ Nostr link | Direct (same pubkey) | None (binding is opt-in) |
| Key leakage risk | High (one compromise = all) | Low (per-domain isolation) |
| BIP-352 compatibility | No | Yes — native |
