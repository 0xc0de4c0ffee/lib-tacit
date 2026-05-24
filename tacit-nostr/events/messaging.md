# Messaging Layer: Chat & Notifications over Nostr

> **Nostr NIPs:** [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) (DMs, deprecated), [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) (DMs, recommended), [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) (Gift Wrap)
> **Ref:** `tacit-nostr/privacy/gift-wrapping.md`

## Event Kind Range

Tacit-nostr uses the **39011–39020** range for messaging and notification primitives:

| Kind | Name | Wrapped? | Description |
|------|------|----------|-------------|
| `39011` | `tacit-dm` | Yes (NIP-59) | Direct message between two tacit users — trade negotiation, coordination |
| `39012` | `tacit-notification` | Yes (NIP-59) | Automated notification from one user/dapp to another |
| `39013` | `tacit-broadcast` | No | Dapp-to-many announcement (e.g., "new pool available") |
| `39014` | `tacit-group-msg` | Yes (NIP-59) | Multi-party coordination — batch-settlement, atomic swap negotiation |

## Kind 39011 — Direct Message

```jsonc
{
  "kind": 39011,
  "content": {
    "subject": "RE: bid ab12...cd34",    // optional: conversation thread
    "msg": "I can fill your bid at 95% of ask. Ready to sign?",
    "ref_event": "ab12...cd34"           // optional: referenced bid/listing event ID
  },
  "tags": [
    ["p", "<recipient_pubkey>"],
    ["e", "<parent_event_id>", "<relay_url>", "reply"]  // threaded reply
  ]
}
```

- MUST be gift-wrapped (NIP-59) to the recipient
- The `p` tag is visible to relays (enables routing)
- For sensitive negotiations (price discovery), consider using per-session keys

## Kind 39012 — Notifications

```jsonc
{
  "kind": 39012,
  "content": {
    "type": "settlement_confirmed",
    "txid": "ab12...cd34",
    "message": "Your bid ab12...cd34 was filled. Settlement tx confirmed at height 876543.",
    "ref_event": "ab12...cd34"
  }
}
```

Notification types:
| Type | Trigger | Sent by |
|------|---------|---------|
| `bid_filled` | Preauth bid taken | Filler (seller) |
| `settlement_confirmed` | Bitcoin tx confirms | Indexer / client |
| `drop_claimable` | DROP announced, claimant found | DROP issuer |
| `intent_matched` | Atomic intent matched | Counterparty |
| `position_liquidated` | cBTC.tac position force-closed | Keeper / chain monitor |

## Kind 39013 — Broadcast Announcements

```jsonc
{
  "kind": 39013,
  "content": {
    "topic": "new-pool",
    "pool_id": "32-byte-hex",
    "asset_a": "32-byte-hex",
    "asset_b": "32-byte-hex",
    "fee_bps": 30,
    "message": "New TAC/BTCSTABLE AMM pool now live. Starting liquidity: 10 TAC / 0.1 BTC."
  }
}
```

- NOT gift-wrapped (intended for public consumption)
- Clients filter by `t` tag for topics they subscribe to
- Dapps SHOULD sign with a well-known pubkey so clients can verify

## Integration with Market Events

The messaging layer integrates with the market coordination flow:

```
Kind 39002 (bid) published → Seller sees bid → 
  Kind 39011 (DM): "I can fill at 95% — let me adjust" →
  Kind 39011 (reply): "Accepted, proceed" →
  Kind 39003 (take, gift-wrapped) →
  Settlement confirms →
  Kind 39012 (notification): "Confirmed at block 876543"
```

## Privacy Considerations

1. **All DMs are gift-wrapped** — the relay sees the `p` tag but not the content
2. **`p` tag metadata leakage**: A relay sees "Alice sent a wrapped event to Bob at time T". If a settlement tx appears at T+1, the relay can infer Alice and Bob traded. Mitigation: use per-session keys for sensitive negotiations, or route through a Tier 2 relay that requires AUTH.
3. **Broadcasts are public**: Anyone can see kind 39013. Dapps should not include sensitive data in broadcast content.
4. **Threaded replies**: The `e` tag links DMs to parent events, which may leak conversation structure. Consider omitting `e` tag for high-privacy negotiations.

## Client Implementation Notes

1. Clients SHOULD subscribe to kinds 39011–39014 in addition to 39000–39010
2. Gift-wrapped notifications (39011, 39012, 39014) require the client to unwrap using their private key (same NIP-59 flow as market take events)
3. The unwrapping key is the same Nostr key that receives market events — no additional key management needed
4. Clients SHOULD persist unwrapped messages locally (IndexedDB / SQLite) for offline access and conversation history
