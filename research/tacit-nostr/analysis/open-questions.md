# Open Questions & Edge Cases

## Protocol Design

### Q1: Event size limits for BP+ proofs

Bulletproofs+ proofs for m=8 can be ~1500 bytes. With the Bitcoin transaction hex (preauth-bid takes ~1KB), kernel sigs (64 bytes), and envelope metadata, a preauth-bid take event can be 3–5 KB. With gift wrap (additional encrypted layers), 5–8 KB. Most Nostr relays accept up to 64 KB, so this is fine. But some mobile-friendly relays cap at 8 KB. Should tacit-nostr mandate a minimum relay event size? Or compress proofs?

**Proposal:** Tacit-nostr clients SHOULD prefer relays advertising at least 64 KB max event size (NIP-11). For BP+ proofs, always use the smaller BP+ format (not classic BP) to minimize payload.

### Q2: Relay discovery bootstrapping

Without a hardcoded relay list, new users don't know where to find tacit events. Options:
- Hardcode 3–5 known-good tacit relays in the client (similar to how current dapp hardcodes the worker URL)
- Use DNS-based discovery: `_nostr-tacit._tcp.example.com` SRV records
- Use NIP-66 relay directories with `supported_kinds` containing 39000-39010

**Proposal:** Ship the client with a default relay list (configurable). Use NIP-66 for dynamic discovery.

### Q3: Event deduplication across relays

The same event published to 10 relays creates 10 copies. Clients deduplicate by event `id`. But two different events that semantically represent the same preauth-bid (same pre-signed tx, different Nostr `sig`) would appear as two bids. Is this a problem?

**Analysis:** The Nostr `sig` is computed over the event `id`. Two events with the same content but different timestamps or different relay-specific tags would produce different `id`s. Clients would see two identical-seeming bids. Resolution: the embedded Bitcoin tx's `vin[0]` (the buyer's input) is the canonical identifier. If two events contain the same `vin[0]`, they represent the same bid — the client deduplicates by comparing the embedded tx input, not the Nostr event ID.

### Q4: Concurrent takes on the same bid

Two sellers both take the same bid. Both publish take events (kind 39003) at similar timestamps. Both settlement txs reference the same buyer pre-signed input. Only one can confirm. How should the client handle the second take?

**Resolution:** Bitcoin consensus handles this. The client sees both take events (after unwrapping). For each, it broadcasts the settlement tx. Whichever confirms first wins. The other tx becomes invalid. The losing seller's commit fee is lost. Clients SHOULD warn sellers: "This bid has N pending takes — your commit fee is at risk if another tx confirms first."

### Q5: Orderbook consistency across relay sets

Alice subscribes to 3 relays, Bob subscribes to 5 different relays. They see different subsets of events. Is this a problem?

**Analysis:** In a decentralized market, this is expected. Alice may see a bid that Bob doesn't. If both see the same bid, the race is resolved by Bitcoin consensus. If Alice sees a better price that Bob doesn't, that's a relay subscription quality issue, not a protocol flaw.

## Key Management

### Q6: Key separation vs single key

The recommended approach (single keypair) links Nostr identity to Bitcoin identity. Users who want separation must generate a separate Nostr key and publish kind 39010. Should the client proactively generate a separate key by default?

**Proposal:** Default to the same keypair (simpler). Offer "generate separate market identity" as an advanced option. If the user chooses separate keys, the client automatically creates and publishes the kind 39010 binding event.

### Q7: Hardware wallet support

Most Nostr clients don't support HWW signing. tacit-nostr needs Schnorr signing for both Nostr events and Bitcoin transactions. If the key is in a Ledger/Trezor, the client needs to:
- Get the xonly pubkey from the device
- Get Schnorr signatures from the device (Ledger supports it via Bitcoin app)
- Sign Nostr events the same way

**Analysis:** This works today with Ledger (Bitcoin app supports BIP-340 Schnorr). Trezor supports it via the Bitcoin-only firmware. The UX is slightly worse — user must confirm every Nostr event on the device. For bots, a hot key is needed anyway.

## Privacy

### Q8: Relay correlation of wrapped events

A relay sees a gift-wrapped event (kind 1059) with a `p` tag matching Bob's pubkey. The relay knows Bob is receiving *something*. Even though the relay can't decrypt it (ephemeral key), it can correlate: Bob received a wrapped event at time T, then a Bitcoin settlement tx appeared on chain at time T+1.

**Analysis:** This correlation exists in the current worker too (the worker knows a take happened before settlement). Gift wrap prevents *third-party relays* from knowing, but the recipient's relay sees the `p` tag. Mitigation: use different relays for receiving wrapped events than for general Nostr activity. The `protected events` tag (NIP-70 `["-"]`) can signal that the event should not be relayed further.

### Q9: What if the buyer is offline?

The buyer publishes a preauth-bid and goes offline. A seller takes the bid and wraps a take event to the buyer's relay. The buyer's client receives the wrapped event but can't process it until the user comes online and the client decrypts it.

**Analysis:** This is identical to the current preauth-bid flow. The buyer is expected to be online within the bid's `expiration` window. If not, the seller's take goes unwatched — the seller loses their commit fee. This is the same risk as the current worker-based preauth-bid.

## Relays

### Q10: Tier 2 relay byzantine behavior

A Tier 2 relay (tacit-validating) could:
- Accept an invalid event (rejecting it would be correct, but not required)
- Reject a valid event (censorship — but user can publish to another relay)
- Leak wrapped events to non-recipients (violation of NIP-59 expectations)

**Mitigation:** None — relays are untrusted by design. Clients validate everything. A Tier 2 relay that accepts invalid events just wastes its own storage. A Tier 2 relay that leaks wrapped events faces reputational damage (users stop using it).

### Q11: Relay monetization for Tier 2

Validating every preauth-bid requires chain queries (fetchOutspend, asset lookups). This costs the relay operator. Possible monetization:
- Pay-per-event micro-fee (lightning zaps)
- Subscription model (NIP-11 `payments_url`)
- Ad-supported (not ideal)
- Run as a public good (operator absorbs cost like block explorers)

**Analysis:** Chain queries are the expensive part. A Tier 2 relay could batch queries and cache results. The cost per event is fractions of a cent (one HTTP request per UTXO check). Subscription models are reasonable.

## Nostr NIP Gap Analysis

| Needed feature | NIP coverage | Gap |
|---------------|-------------|-----|
| Event signing | NIP-01 (BIP-340 Schnorr) ✅ | None |
| Encryption | NIP-44 (ChaCha20 + HKDF) ✅ | Uses different KDF than tacit (intentional) |
| Private messaging | NIP-59 (Gift Wrap) ✅ | Take events fit perfectly |
| Protected events | NIP-70 (Protected Events) ✅ | Useful for limiting re-publishing |
| AUTH | NIP-42 (AUTH) ✅ | Needed for serving wrapped events |
| Relay discovery | NIP-66 (Relay Discovery) ⚠️ | Not widely implemented; fallback to hardcoded list |
| Paid relays | NIP-11 (Relay Info) ❌ | No standard paid relay protocol. Implement custom. |
| Large events | NIP-11 (limitation field) ✅ | Relays advertise max event size |
