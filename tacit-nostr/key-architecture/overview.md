# Key Architecture: Same secp256k1 Keypair for Nostr + Bitcoin

> **Ref:** `src/constants/domains.ts`, `src/crypto/schnorr.ts`, `src/crypto/kernel.ts`
> **Nostr NIP:** [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) (events use secp256k1/BIP-340)

## Design Decision: One Keypair

Tacit and Nostr both use **secp256k1** with **BIP-340 Schnorr signatures**. This means the same keypair can:

- Sign Nostr events (NIP-01 `sig` field) — 64-byte Schnorr sig over SHA256(event)
- Sign tacit kernel messages — 64-byte Schnorr sig over `tacit-kernel-v1 || ...`
- Sign preauth-bid inputs — `SIGHASH_SINGLE|ACP` over the Bitcoin tx
- Sign attestations — `tacit-listing-v1`, `tacit-opening-v1`, etc.

**No attestation event is needed.** When a preauth-bid event (kind 39002) is published, the event's `pubkey` field is the 32-byte xonly public key. The embedded pre-signed Bitcoin tx's xonly pubkey must match the event `pubkey`. Clients verify this at validation time — the Bitcoin tx `proves itself` as belonging to the Nostr event author. See `validation/client-side.md` for the exact check.

## Key Generation

Standard BIP-39 mnemonic → BIP-32 seed → derivation:

| Purpose | Derivation path | Notes |
|---------|----------------|-------|
| Bitcoin spending | `m/84'/0'/0'/0/*` | Standard BIP-84 (SegWit v1) |
| Nostr market identity | **Same as above** or `m/138'/0'/0'` | Reuses the same key for simplicity. Users may derive a separate Nostr key and publish kind 39010 to attest. |
| Ephemeral gift-wrap keys | Random per-wrap | Generated at wrap time, discarded after use (per NIP-59 spec) |

## Privacy Implication

Using the same key means your Nostr pubkey IS your Bitcoin xonly pubkey. Any event you publish reveals your on-chain identity. Mitigations:

1. **Per-session keypairs** — Generate a fresh keypair for each trading session. Transfer tacit UTXOs to it via a CXFER. Cheap and effective.
2. **Gift wrapping** — Take events (kind 39003, 39006, 39008) are wrapped; the relay never sees the taker's pubkey. Only the settlement tx later reveals it.
3. **No requirement to link** — If you never publish a listing, no one knows your key has tacit assets. Only on-chain activity reveals ownership.
4. **Hardware wallet** — Sign Nostr events with the same HWW that signs Bitcoin txs. Most HWWs support BIP-340 Schnorr (via Bitcoin signing).

## Key Separation Mode (Optional)

For users who want unlinkability, a separate Nostr key can be generated and bound via kind 39010:

```
kind: 39010
pubkey: <Nostr pubkey>
content: <Bitcoin xonly pubkey hex>
tags: [["bitcoin-sig", <64-byte Schnorr sig over "tacit-nostr-bind-v1:<nostr_pubkey_hex>"]]]
```

The binding sig is validated by the client: `verifySchnorr(binding_sig, SHA256("tacit-nostr-bind-v1:<nostr_pubkey_hex>"), bitcoin_xonly)`. If it passes, the Nostr pubkey is authorized to act for the Bitcoin key. This is only needed for off-chain reputation or dispute resolution.
