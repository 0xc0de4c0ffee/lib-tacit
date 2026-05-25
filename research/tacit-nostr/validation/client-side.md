# Client-Side Validation

> **Ref:** `src/crypto/schnorr.ts`, `src/crypto/kernel.ts`, `src/crypto/bulletproofs-plus.ts`, `src/interfaces/chain-client.ts`, `src/opcodes/*.ts`

The tacit-nostr client validates every event before accepting it into the local orderbook. This validation is the core of trustlessness — the client never trusts a relay or another participant.

## Validation Pipeline

```
Event received → Layer 1: Nostr sig → Layer 2: Structure → Layer 3: Crypto → Layer 4: Chain
```

### Layer 1: Nostr Signature

- [ ] Event `id` = SHA256(serialized `[0, pubkey, created_at, kind, tags, content]`) ✓
- [ ] `sig` is a valid BIP-340 Schnorr signature over `id` under `pubkey` ✓
- [ ] `created_at` is not in the future (> 5 min ahead) ✓
- [ ] `expiration` tag (if present): `now < expiration` ✓
- [ ] `kind` is in the recognized range (39000–39010) ✓

Implementation: `verifySchnorr(sig, id, pubkey)` from `src/crypto/schnorr.ts`.

### Layer 2: Structure

- [ ] `content` is valid JSON ✓
- [ ] Required fields exist per kind (see `events/kinds.md`) ✓
- [ ] Required tags exist per kind ✓
- [ ] Hex fields decode to correct byte lengths (32, 33, 64, etc.) ✓
- [ ] BigInt fields are valid numeric strings ✓

### Layer 3: Cryptography

**For preauth bid (39002) / preauth sale (39005):**

- [ ] Embedded Bitcoin tx: `payload[0]` matches expected opcode (0x5B for bid, 0x26 for sale) ✓
- [ ] Embedded tx: SIGHASH flag on pre-signed input is `0x83` (SINGLE|ACP) ✓
- [ ] **Key binding**: If kind 39010 exists for the event author, verify both `tacit-sig` and `bitcoin-sig`. The kernel sig and bulletproof MUST be verified against the **tacit key** from the binding, NOT the event `pubkey` ✓
- [ ] Kernel sig verifies: `verifyKernel(kernel_sig, asset_id, inputs, output_commitments, burned?)` against the **tacit key** ✓
- [ ] Bulletproof verifies: `bppRangeVerify(output_commitments, rangeproof)` or `bpRangeAggVerify(commitments, proof)` ✓
- [ ] Event `pubkey` (Nostr identity) matches the binding's `nostr_pubkey` (if binding present) ✓

Implementation: `src/crypto/kernel.ts`, `src/crypto/bulletproofs-plus.ts`, `src/crypto/pedersen.ts`.

**For preauth bid take (39003) / preauth sale take (39006):**

- [ ] After unwrapping (NIP-59): inner event is a valid take ✓
- [ ] The completed settlement tx: `verifyKernel` with combined buyer+seller commitments ✓
- [ ] The referenced bid (via `e` tag) exists and is not expired ✓
- [ ] The buyer's pre-signed input is still used (not replaced) ✓

**For DROP announce (39007):**

- [ ] `drop_id` matches `dropIdFromRevealTxid(reveal_txid)` ✓
- [ ] `per_claim` divides `cap_amount` evenly ✓
- [ ] `expiry_height` (if present) > current chain height ✓

Implementation: `src/opcodes/drop.ts`.

**For DCLAIM proof (39008) (after unwrap):**

- [ ] `decodeCDClaim(payload)` returns non-null ✓
- [ ] Merkle proof verifies against the DROP's `merkle_root` ✓
- [ ] The revealed settlement tx confirms the claim output ✓

Implementation: `src/opcodes/dclaim.ts`.

**For asset listing (39000):**

- [ ] `listing_sig` verifies: `verifySchnorr(listing_sig, SHA256("tacit-listing-v1" || ...), xonly)` ✓
- [ ] The asset exists on chain: `assetIdFor(txid, vout)` matches a confirmed CETCH/PETCH ✓

Implementation: `src/crypto/kernel.ts` (assetIdFor), `src/crypto/schnorr.ts`.

### Layer 4: Chain State

- [ ] The referenced UTXO (from pre-signed tx) is unspent ✓
  - Query: `ChainClient.fetchOutspend(txid, vout)` returns `{ spent: false }`
- [ ] The asset ID matches a confirmed CETCH/PETCH on chain ✓
  - Query: `ChainClient.fetchTx(etchTxid)` → decode envelope → confirm opcode 0x21/0x27
- [ ] For DROP: `confirmed_height <= expiry_height` (if expiry is set) ✓

Implementation: `src/interfaces/chain-client.ts` (interface), any concrete client.

## Rejection Handling

| Failed check | Client action |
|-------------|---------------|
| NIP-01 sig | Drop event, log warning |
| Structure | Drop event, log error |
| Kernel sig | Drop event (invalid commitment), log for analysis |
| Bulletproof | Drop event (corrupted proof) |
| Chain UTXO spent | Accept event but mark as `unfillable` — buyer already spent the input |
| Expired | Drop event silently |

## Local Orderbook State

After validation, the client maintains an in-memory orderbook:

```
type OrderbookEntry = {
  event: SignedEvent        // the full Nostr event
  validated: boolean        // passed all checks
  unfillable: boolean       // chain state: UTXO already spent
  assetId: Uint8Array
  priceSats: bigint
  amount: bigint
  timestamp: number         // event.created_at
  relay: string             // which relay served this
}
```

Entries are sorted by `priceSats` ascending (for asks) or descending (for bids). Unfillable entries are hidden but not deleted — they may become fillable again (e.g., if the spend tx is replaced).

## Client-Side Event Cache

A client restart after a week of market activity means re-downloading and re-validating potentially thousands of events across N relays. To avoid this:

1. **Local cache**: Clients SHOULD persist validated events in IndexedDB (browser) or SQLite (desktop/mobile), indexed by event ID.
2. **Cache freshness**: On restart, the client loads cached events, then subscribes to new events since the last `created_at` watermark.
3. **Staleness check**: Cached events with an `expiration` tag in the past are dropped on load. Events referencing UTXOs that may have been spent require a chain re-check (Layer 4 re-validation).
4. **Cache invalidation**: If a cached event's referenced UTXO is confirmed spent, the event is marked `unfillable` (not deleted — the bid may have been replaced, not filled).
5. **Storage limit**: Clients SHOULD cap the cache at a configurable limit (default: 10,000 events) and evict the oldest by `created_at`.
