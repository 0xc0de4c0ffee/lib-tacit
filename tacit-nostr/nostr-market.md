# tacit-nostr-market — Decentralized Market for Tacit Assets over Nostr

> **Status:** R&D / Speculative Design
> **Reference:** [tacit-specs/SPEC.md](../../tacit-specs/SPEC.md), [lib-tacit/src/](../../src/)
> **Nostr NIPs:** [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) (Events), [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) (Encryption), [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) (Gift Wrap), [NIP-70](https://github.com/nostr-protocol/nips/blob/master/70.md) (Protected)

This document specifies a decentralized market protocol for tacit confidential assets on Bitcoin, using Nostr as the coordination and discovery layer. Tacit settlement remains on Bitcoin via the existing commit-reveal pattern; Nostr carries the **pre-trade coordination** (bids, asks, intents, drops) that the current centralized worker handles.

## Design Principles

1. **One keypair, two protocols.** The same secp256k1 key signs both Nostr events (NIP-01 `sig`) and Bitcoin transactions (kernel sigs, preauth-bid `SIGHASH_SINGLE|ACP`). No attestation needed — the embedded Bitcoin data proves itself. See `key-architecture/overview.md`.
2. **No trusted coordinator.** Relays are dumb storage; all validation is client-side. A `validating relay` (Tier 2) may reject structurally invalid events, but clients never depend on it.
3. **Settlement is Bitcoin.** Nostr coordination never settles anything. The commit-reveal tx pair, kernel sigs, and bulletproofs all live on Bitcoin. Nostr only carries the *advertisement* and *matching*.
4. **Privacy by default.** Counterparty identity is gift-wrapped (NIP-59) for take/fulfilment events. Only the intended recipient can unwrap. See `privacy/gift-wrapping.md`.
5. **Relay-agnostic.** Users publish to any set of relays. The market view is the union of all subscribed relays, deduplicated locally.

## Event Kinds

| Kind | Name | Replaceable | Wrapped | Description | Ref lib-tacit |
|------|------|-------------|---------|-------------|---------------|
| `39000` | `tacit-asset-listing` | Addressable (`d` = asset pair) | No | Advertise an asset for sale at a price | `src/opcodes/etch.ts` |
| `39001` | `tacit-atomic-intent` | Regular | No | Atomic buy intent with ECDH-encrypted blinding | `src/opcodes/axfer.ts`, `domains.ts:19-25` |
| `39002` | `tacit-preauth-bid` | Regular | No | Pre-signed BTC input + Pedersen commitment | `src/opcodes/preauth-bid.ts`, `domains.ts:32-36` |
| `39003` | `tacit-preauth-bid-take` | Regular | Yes | Seller fills a preauth-bid (gift-wrapped to buyer) | `src/opcodes/preauth-bid.ts` |
| `39004` | `tacit-preauth-bid-cancel` | Regular | No | Buyer cancels an unfilled preauth-bid | `domains.ts:33` |
| `39005` | `tacit-preauth-sale` | Regular | No | Pre-signed asset input (sell side) | `domains.ts:29-31` |
| `39006` | `tacit-preauth-sale-take` | Regular | Yes | Buyer fills a preauth-sale (gift-wrapped to seller) | `domains.ts:29-31` |
| `39007` | `tacit-drop-announce` | Addressable (`d` = drop ID) | No | DROP pool announcement + metadata | `src/opcodes/drop.ts`, `domains.ts:40-41` |
| `39008` | `tacit-dclaim-proof` | Regular | Yes | Claim proof + reveal tx for a DROP (gift-wrapped to issuer) | `src/opcodes/dclaim.ts` |
| `39009` | `tacit-wrapper-attest` | Regular | No | On-chain wrapper attestation binding | `src/opcodes/wrapper-attest.ts`, `domains.ts:42` |
| `39010` | `tacit-nostr-binding` | Regular | No | Optional: link Nostr key to a Bitcoin-only key (for key separation) | Not in lib (key separation mode) |

### Tags

All tacit market events MUST include:

| Tag | Value | Example | Purpose |
|-----|-------|---------|---------|
| `a` | `39000:<pubkey>:<asset_pair_d>` | `["a", "39000:abcd...1234:tacit-BTCSTABLE-USDC"]` | Reference to an asset listing |
| `p` | 32-byte hex pubkey | `["p", "abcd...1234"]` | Target participant (buyer/seller) |
| `e` | 32-byte hex event ID | `["e", "dead...beef"]` | Parent event reference (e.g., bid being taken) |
| `t` | lowercase tag | `["t", "tacit-preauth-bid"]` | Searchable category tag |
| `expiration` | Unix timestamp | `["expiration", "1767225600"]` | Event expiry — clients MUST ignore expired events |

### Domain tag mapping (lib-tacit → Nostr event)

The tacit protocol uses domain-separated hash tags for every signing context (`src/constants/domains.ts`). These map to Nostr event signing as follows:

| tacit domain tag | Signing context | Nostr equivalent |
|------------------|-----------------|-------------------|
| `tacit-preauth-bid-v1` | Bid message hash | Inner content of kind `39002` |
| `tacit-preauth-bid-cancel-v1` | Cancel message hash | `content` + `sig` of kind `39004` |
| `tacit-axintent-v1` | Intent message hash | Inner content of kind `39001` |
| `tacit-drop-v1` | DROP kernel message | Inner content of kind `39007` |
| `tacit-listing-v1` | OTC listing sign msg | Inner content of kind `39000` |

## Event Content Schemas

Every event's `content` field is a JSON object. Fields are regular JSON types; `Uint8Array` fields are hex-encoded.

### Kind 39000 — Asset Listing

```jsonc
{
  "asset_id": "32-byte-hex",
  "ticker": "BTCSTABLE",
  "decimals": 8,
  "price_sats": "100000000",       // bigint as string
  "min_fill": "1000000",           // bigint as string
  "max_fill": "10000000000",
  "listing_sig": "64-byte-hex",    // Schnorr sig per 'tacit-listing-v1'
  "anchor": "36-byte-hex"          // txid_BE(32) || vout_LE(4)
}
```

### Kind 39002 — Preauth Bid

```jsonc
{
  "asset_id": "32-byte-hex",
  "asset_input_count": 1,
  "bid_id": "16-byte-hex",
  "recipient_pubkey": "33-byte-hex",
  "amount": "1000000000",
  "blinding": "32-byte-hex",
  "price_sats": "50000000",
  "kernel_sig": "64-byte-hex",        // verifyKernel(sig, asset_id, inputOps, inputCs, [recipientC])
  "outputs": [
    { "commitment": "33-byte-hex" }   // recipient C, encryptedAmount optional for change output
  ],
  "rangeproof": "hex",                 // bppRangeVerify or bpRangeAggVerify
  "pre_signed_tx_hex": "hex-encoded Bitcoin tx (SIGHASH_SINGLE|ACP)"
}
```

Matches `PreauthBidInput` from `src/opcodes/preauth-bid.ts:13-23`. The `outputs` array mirrors the reference dapp wire format (recipient commitment + optional change).

### Kind 39003 — Preauth Bid Take (inner event, BEFORE gift wrap)

```jsonc
{
  "bid_id": "16-byte-hex",
  "settlement_tx_hex": "hex-encoded completed Bitcoin tx (buyer input + seller asset input)",
  "asset_input_outpoint": { "txid": "64-hex", "vout": 0 },
  "seller_change_output": { "commitment": "33-byte-hex", "encrypted_amount": "8-byte-hex" },
  "seller_kernel_sig": "64-byte-hex"
}
```

### Kind 39007 — DROP Announce

```jsonc
{
  "drop_id": "32-byte-hex",           // dropIdFromRevealTxid(revealTxidHex)
  "asset_id": "32-byte-hex",
  "cap_amount": "1000000000000",
  "per_claim": "100000000",
  "merkle_root": "32-byte-hex",
  "expiry_height": 850000,
  "ticker": "BTCSTABLE",
  "decimals": 8,
  "reveal_txid": "64-hex"
}
```

### Kind 39010 — Nostr-Bitcoin Binding (optional key separation mode)

```jsonc
{
  "bitcoin_pubkey": "33-byte-hex",
  "nostr_pubkey": "32-byte-hex",
  "binding_sig": "64-byte-hex"  // Bitcoin Schnorr sig over "tacit-nostr-bind-v1:<nostr_pubkey_hex>"
}
```

## Wire Protocol (Nostr → lib-tacit)

When a client receives an event, it maps the Nostr content fields to lib-tacit functions for validation:

| Event kind | Validate with | Ref |
|------------|---------------|-----|
| 39000 | `verifySchnorr(listing_sig, listingMsg(assetId, anchor, commitment, priceSats), xonly)` | `src/crypto/kernel.ts:listingMsg`, `src/crypto/schnorr.ts` |
| 39002 | `verifyKernel(kernel_sig, asset_id, inputOutpoints, inputCommitments, outputCommitments)` + `bppRangeVerify` or `bpRangeAggVerify` | `src/crypto/kernel.ts:verifyKernel`, `src/crypto/bulletproofs*.ts` |
| 39002 | Check pre-signed tx: `payload[0] === 0x5B`, SIGHASH=0x83 | `src/opcodes/preauth-bid.ts` |
| 39003 | Validate completed tx kernel sig matches buyer+seller commitments | `src/crypto/kernel.ts:verifyKernel` |
| 39007 | `dropIdFromRevealTxid(reveal_txid)` matches `drop_id` | `src/opcodes/drop.ts:dropIdFromRevealTxid` |
| 39008 | `decodeCDClaim(payload)` returns non-null | `src/opcodes/dclaim.ts:decodeCDClaim` |

## Coordination Flow: Preauth Bid → Take → Settle

1. **Buyer** generates a preauth-bid (kind 39002) using `src/opcodes/preauth-bid.ts` types and broadcasts it to relays.
2. **Seller** subscribes to kind 39002, finds matching bids. For each bid, the client validates:
   - Nostr event sig ✓ (NIP-01)
   - Kernel sig ✓ (`verifyKernel` from `src/crypto/kernel.ts`)
   - Bulletproof ✓ (`bppRangeVerify` from `src/crypto/bulletproofs-plus.ts`)
   - Chain state: buyer's input UTXO unspent ✓ (via `ChainClient.fetchOutspend`)
3. **Seller** constructs a take event (kind 39003), gift-wraps it (NIP-59) to the buyer's pubkey, publishes to relays.
4. **Buyer** receives the gift-wrapped take, unwraps, extracts the completed settlement tx, and broadcasts it to Bitcoin.
5. **Race**: if two sellers both took the same bid, both settlement txs reference the same buyer pre-signed input. Only one confirms per Bitcoin consensus.

## Validation Checklist (client-side)

Before accepting any event, the tacit-nostr client MUST check:

- [ ] NIP-01 event signature valid (BIP-340 Schnorr, `pubkey` == signer)
- [ ] `pubkey` matches the xonly pubkey in any embedded Bitcoin tx
- [ ] `expiration` tag not past (if present)
- [ ] For bid/take/sale events: kernel sig verifies
- [ ] For bid/take/sale events: bulletproof verifies
- [ ] For preauth events: referenced UTXO is unspent (chain query)
- [ ] For DROP events: `drop_id` derivation matches reveal txid
- [ ] For listing events: asset exists on chain (`assetIdFor` from `src/crypto/kernel.ts`)

## Difference from Current Worker

| Aspect | Worker (current) | Nostr (tacit-nostr) |
|--------|-----------------|---------------------|
| State storage | Centralized DB | Ephemeral — rebuilt from events |
| Bid matching | Server-side orderbook | Client-side subscription + local sort |
| Take coordination | CAS lock (atomic) | No lock — Bitcoin resolves double-spend |
| Validation | Worker validates before accepting | Client validates locally |
| Privacy | Worker knows counterparty | Gift wrap hides counterparty |
| Griefing protection | Rate-limit + CAS | Commit-fee cost + relay rate-limit |
| Expiry | Worker sweeps | Clients filter by `expiration` tag |
| Infrastructure | Server + DB cost | Relays + local client |
| Censorship resistance | Worker operator | Any relay, any time |

## Reference Files

| tacit-nostr concept | lib-tacit implementation | tacit-specs reference |
|---------------------|--------------------------|----------------------|
| Preauth bid wire format | `src/opcodes/preauth-bid.ts` | `SPEC.md §5.7.11` |
| Preauth bid var wire format | `src/opcodes/preauth-bid-var.ts` | `SPEC.md §5.7.12` |
| Atomic intent signing | `src/crypto/kernel.ts` `axintentMsg` | `SPEC.md §5.7.6` |
| DROP kernel msg | `src/crypto/kernel.ts` `dropKernelMsg` | `SPEC.md §5.12` |
| DROP ID derivation | `src/opcodes/drop.ts` `dropIdFromRevealTxid` | `SPEC.md §5.12` |
| DCLAIM | `src/opcodes/dclaim.ts` | `SPEC.md §5.13` |
| Listing signing | `src/crypto/kernel.ts` `listingMsg` | `SPEC.md §5.6` |
| ECDH blinding | `src/crypto/ecdh.ts` | `SPEC.md §3.3` |
| Kernel sig verification | `src/crypto/kernel.ts` | `SPEC.md §5.2` |
| Bulletproofs+ | `src/crypto/bulletproofs-plus.ts` | `SPEC-CXFER-BPP-AMENDMENT` |
| Chain client | `src/interfaces/chain-client.ts` | `worker/src/index.js` |
| Encryption (NIP-44) | `@noble/secp256k1` (ECDH) + `@noble/hashes` (HKDF+SHA256) | Not in tacit — Nostr-specific |
