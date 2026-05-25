# Gift Wrapping for Tacit Market Events

> **Nostr NIP:** [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) (Gift Wrap), [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) (Encryption)
> **Ref:** `src/crypto/ecdh.ts` (ECDH derivation), `src/constants/domains.ts`

## Why Gift Wrap?

In the current worker-based market, the worker knows which seller took which buyer's bid. This info is not broadcast — the worker keeps it private until settlement confirms. On Nostr, without wrapping, everyone would see the `p` tag of the taker. Gift wrap prevents this.

### ⚠️ CRITICAL: Do NOT reuse tacit's ECDH for NIP-44

NIP-44's ECDH step uses **unhashed** ECDH output (raw x coordinate of shared point). Tacit's `deriveBlinding` and `ecdhSeed` in `src/crypto/ecdh.ts` use `SHA256(shared_point)`. Using the wrong one produces a different conversation key — gift-wrap encryption or decryption will silently produce garbage.

- **Tacit's ECDH**: `sha256(shared_point_bytes)` — used in `src/crypto/ecdh.ts:deriveBlinding`
- **NIP-44 ECDH**: `raw_x_coordinate` — used in NIP-44 HKDF step

The tacit-nostr client MUST implement NIP-44's vanilla ECDH (unhashed) for the gift-wrap layer. The tacit domain-tagged HMAC is ONLY for the inner content (kernel sigs, blinding derivation, amount encryption).

## Events That MUST Be Wrapped

| Event | Wrapped to | Why |
|-------|-----------|-----|
| Preauth-bid take (39003) | Buyer's pubkey | Only the buyer needs to see the completed tx |
| Preauth-sale take (39006) | Seller's pubkey | Only the seller needs to see the buyer's BTC input |
| DCLAIM proof (39008) | DROP issuer pubkey | Hides who is claiming until on-chain confirmation |
| Atomic intent fulfilment (part of 39001 flow) | Intent creator's pubkey | Hides filler identity |

## Events That Are Public

| Event | Why |
|-------|-----|
| Asset listing (39000) | Needs maximum discoverability |
| Preauth bid (39002) | Needs all potential sellers to find it |
| Preauth sale (39005) | Needs all potential buyers to find it |
| DROP announce (39007) | Needs all potential claimants to find it |
| Preauth bid cancel (39004) | One-to-many notification |

## Gift Wrap Flow (NIP-59)

```
Layer 3: Gift Wrap (kind 1059)
├─ signed by: ephemeral random key
├─ p tag: recipient pubkey
├─ content: NIP-44 encrypted Seal
│
└─── Layer 2: Seal (kind 13)
    ├─ signed by: real author
    ├─ tags: [] (MUST be empty per NIP-59)
    ├─ content: NIP-44 encrypted Rumor
    │
    └─── Layer 1: Rumor (unsigned event)
        ├─ kind: 39003 (or 39006, 39008)
        ├─ content: { settlement_tx_hex, ... }
        ├─ tags: [["e", "<parent_event_id>"], ...]
        └─ id: SHA256(event)   // unsigned! determines identity
```

### Encryption details (NIP-44 v2)

1. **Conversation key**: ECDH between `author_privkey` and `recipient_pubkey` → HKDF-extract with salt `"nip44-v2"`. This matches our existing `deriveBlinding` pattern in `src/crypto/ecdh.ts` but uses the Nostr-specified HKDF instead of tacit's HMAC.
2. **Message key**: HKDF-expand(conversation_key, nonce, 76 bytes) → `chacha_key(32)` + `chacha_nonce(12)` + `hmac_key(32)`
3. **Encrypt**: ChaCha20-poly (with padding per NIP-44 spec)
4. **MAC**: HMAC-SHA256 over `nonce || ciphertext`

### Implementation note

NIP-44's ECDH step uses **unhashed** ECDH output (raw x coordinate of shared point). Tacit's `deriveBlinding` in `src/crypto/ecdh.ts` uses HMAC-SHA256 over the shared point. The Nostr wrapping layer should use the standard NIP-44 conversation key derivation (HKDF over unhashed ECDH), NOT tacit's domain-tagged HMAC, to remain compatible with standard Nostr tooling. The tacit-specific signing is inside the inner rumor content.

## Relay Storage of Wrapped Events

- Wrapped events (kind 1059) MAY be deleted by relays after a configurable TTL
- The ephemeral signing key is one-time-use and cannot be linked to the real author
- Relays SHOULD require AUTH (NIP-42) to serve kind 1059 events, and only serve them to the `p` tag recipient
- Clients SHOULD publish wrapped events only to the recipient's read relays

## Gift Wrap vs tacit's existing ECDH

| Aspect | tacit ECDH (src/crypto/ecdh.ts) | Nostr NIP-44 |
|--------|----------------------------------|--------------|
| Curve | secp256k1 | secp256k1 |
| ECDH output | Hashed (SHA256) | Unhashed (raw x) |
| KDF | HMAC(key, "tacit-*-v1" \|\| anchor) | HKDF-extract(salt="nip44-v2") |
| Encryption | XOR with keystream | ChaCha20 + HMAC-SHA256 |
| Used for | Amount encryption, blinding derivation | Event content encryption |

Both use the same curve. The Nostr wrapping layer must use NIP-44's KDF to remain compatible.
