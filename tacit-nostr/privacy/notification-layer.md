# Nostr-Initiated Silent Payments: BIP-352 + Off-Chain Notification

> **Ref:** `src/crypto/silent-payments.ts`, `src/crypto/ecdh.ts`
> **Nostr NIP:** [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) (Gift Wrap), [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md)
> **BIP:** [BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) (silent payments), [BIP-47](https://github.com/bitcoin/bips/blob/master/bip-0047.mediawiki) (payment codes)

## The Notification Problem

Both BIP-47 and BIP-352 solve receiver privacy, but each has a notification cost:

| Approach | Notification Mechanism | Cost | Recipient Scanning |
|----------|----------------------|------|-------------------|
| **BIP-47** | On-chain OP_RETURN tx (notification tx) | ~10k sats + 1 block confirm | Watch for notification txs only |
| **BIP-352** | None (sender derives from own inputs) | 0 on-chain bytes | Scan ALL transactions |
| **Nostr hybrid** | Off-chain Nostr gift-wrapped event | 0 on-chain cost | Subscribe to Nostr kind 39015 |

The Nostr hybrid keeps BIP-352's cryptographic derivation (already in `src/crypto/silent-payments.ts`) but replaces chain scanning with an off-chain notification sent over Nostr.

## Protocol: Kind 39015 — Payment Notification

```jsonc
{
  "kind": 39015,
  "content": {
    "v": 1,                                   // version
    "type": "silent-payment-notify",           // or "bip47-notify"
    "sender_sp": "sp1...",                     // sender's silent payment address (if public)
    "sender_pubkey": "33-byte-hex",            // sender's tacit public key
    "input_outpoints": [                       // inputs that fund the payment
      {"txid": "64-hex", "vout": 0}
    ],
    "expected_output_key": "32-byte-hex",      // xonly: computed by sender per BIP-352
    "amount_sats": "100000",                   // for non-confidential payments
    "memo": "thanks for the trade",            // optional human-readable note
    "commitment": "33-byte-hex"                // optional: Pedersen commitment for tacit assets
  },
  "tags": [
    ["p", "<recipient_nostr_pubkey>"],          // visible to relay (routing)
    ["expiration", "1767225600"],               // notification expires
    ["t", "silent-payment"]
  ]
}
```

**Wrapping**: Kind 39015 MUST be gift-wrapped (NIP-59) to the recipient's Nostr pubkey. The relay sees only the `p` tag (routing) and a kind 1059 wrapper.

### Derivation (BIP-352, no change)

The sender uses the existing `senderComputeSilentPaymentOutput()` from `src/crypto/silent-payments.ts`:

```
outputKey = senderComputeSilentPaymentOutput({
  inputPrivs,           // sender's input private keys
  inputOutpoints,        // sender's input outpoints (match content.input_outpoints)
  scanPub,               // from recipient's sp1 address
  spendPub               // from recipient's sp1 address
}).xOnly
```

The recipient verifies: `receiverScanTxForSilentPayments({ classifiedInputs, allInputOutpoints, outputs, scanPriv, spendPub })` returns a result with matching `voutIndex`. If the notification is honest, this succeeds trivially — the recipient already knows which tx to look at.

### Flow

```
Sender                                   Recipient
  │                                          │
  │  1. Derive output key per BIP-352         │
  │     using recipient's sp1 address         │
  │                                          │
  │  2. Create kind 39015 notification        │
  │     (expected_output_key, input_outpoints)│
  │                                          │
  │  3. Gift-wrap to recipient's Nostr key    │
  │     Publish to recipient's read relays    │
  │─────────────────────────────────────────>│
  │                                          │  4. Unwrap, verify expected_output_key
  │                                          │     Store: "expecting tx with this output"
  │                                          │
  │  5. Broadcast Bitcoin tx with             │
  │     the computed silent payment output    │
  │     ⋮                                     │
  │  ┌─ Bitcoin block ──────────────────┐     │
  │  │ tx: ... output: expected_key...  │     │
  │  └──────────────────────────────────┘     │
  │                                          │  6. Scan for confirmed tx matching
  │                                          │     expected_output_key
  │                                          │     (narrow scan: by output key, not
  │                                          │      scanning all blocks)
```

## Why This Beats Both BIP-47 and Pure BIP-352

### vs BIP-47

| Aspect | BIP-47 | Nostr hybrid |
|--------|--------|-------------|
| Notification cost | ~10k sats on-chain | 0 sats (Nostr event) |
| Notification privacy | Public OP_RETURN (anyone sees sender→recipient link) | Gift-wrapped (relay sees `p` tag only) |
| Sender identity | Permanent (notification tx links sender pubkey to recipient forever) | Ephemeral (one-time gift-wrap key) |
| Key rotation | Per-sender chain code | Fresh per-payment (BIP-352) |
| Recipient setup | Must publish payment code | Must publish `sp1` address (done) |

### vs Pure BIP-352

| Aspect | BIP-352 | Nostr hybrid |
|--------|---------|-------------|
| Scanning | Full chain or trusted 3rd party | Subscribe to Nostr kind 39015 |
| Missed payments | Undetectable without scan | Missed if offline during notification |
| Backfill | Must re-scan from wallet birthday | Sender can re-send notification |
| Privacy | Everyone who knows your `sp1` can detect your payments | Only notified recipients know |

### Missed Notification Recovery

If the recipient was offline and missed the Nostr notification, they fall back to BIP-352's standard `receiverScanTxForSilentPayments()`:

1. On reconnect, subscribe to kind 39015 with `since=<last_connected_at>`
2. If any notifications were missed, process them
3. As a last resort, run the chain scan (same as pure BIP-352) checking for unclaimed outputs

This gives **graceful degradation**: best case = off-chain notification (0 cost), worst case = chain scan (same as BIP-352).

## Integration with tacit-nostr Market

In the market flow (see `nostr-market.md`), the payment notification replaces the current "wait for settlement confirmation" polling:

```
1. Buyer publishes kind 39002 (preauth bid) → includes their tacitness
2. Seller takes the bid → publishes kind 39003 (gift-wrapped)
3. Buyer broadcasts settlement tx
4. Buyer publishes kind 39015 (payment notification) gift-wrapped to seller
5. Seller sees notification → knows exactly which tx to check
   → verifies output key against `receiverScanTxForSilentPayments`
   → confirms on chain
```

No polling, no chain scanning, no notification tx on Bitcoin. The seller knows within seconds of the settlement tx hitting the mempool.

## Implementation Surface

Already implemented in `src/crypto/silent-payments.ts`:
- `encodeSilentPaymentAddress()` / `decodeSilentPaymentAddress()` — address format
- `senderComputeSilentPaymentOutput()` — sender-side output derivation
- `receiverScanTxForSilentPayments()` — receiver-side verification
- `deriveSilentPaymentKeys()` / `deriveSilentPaymentScanPriv()` — key derivation

New surface (pure Nostr):
- Kind 39015 event schema (this document)
- Client: unwrap kind 1059 → extract kind 39015 → verify expected_output_key
- Client: on reconnect, kind 39015 backfill with `since` filter

## Key Difference from BIP-47 Payment Codes

BIP-47 uses a reusable **payment code** (pubkey + chain code) and per-sender notification transactions. The notification establishes a shared secret that derives all future payments between that sender-recipient pair.

This hybrid does NOT use BIP-47 payment codes. It uses BIP-352's per-payment derivation (each payment uses different input UTXOs → different output key). The Nostr notification is a courtesy — it tells the recipient "look at this txid," not "here's our shared secret."

The benefit of avoiding BIP-47 payment codes:
- No per-sender state to maintain (just one `sp1` address)
- No notification tx on chain → cheaper and more private
- Payments are not linkable to a sender-recipient pair (BIP-47's notification tx links them permanently)

## R&D Phase: Minimum Viable

For the initial research phase, the notification is **optional**. A minimal client can:
1. Publish `sp1` address in kind 39000 (listing)
2. Use `senderComputeSilentPaymentOutput()` to send
3. Use `receiverScanTxForSilentPayments()` to detect (chain scan, no Nostr notification)

The notification layer (kind 39015) is added when the chain scan becomes a bottleneck.
