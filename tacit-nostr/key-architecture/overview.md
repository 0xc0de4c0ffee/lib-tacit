# Key Architecture: Separate Keys per Domain

> **Ref:** `src/crypto/silent-payments.ts`, `src/crypto/schnorr.ts`, `src/crypto/kernel.ts`, `src/constants/domains.ts`
> **Nostr NIP:** [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [NIP-06](https://github.com/nostr-protocol/nips/blob/master/06.md) (key derivation)
> **BIP:** [BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) (silent payments), [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) (SegWit v1)

## Design Decision: One Seed, Many Keys

A **single BIP-39 seed** derives separate keypairs for each domain. The Nostr key does **not** reuse the Bitcoin or tacit key. Each domain has its own spec-compliant derivation:

| Domain | Purpose | Derivation | Key Type | Receiving Format |
|--------|---------|------------|----------|------------------|
| **Nostr** | Event identity, DM, relay auth | `m/44'/1237'/0'/0/*` (NIP-06) | 32-byte xonly (BIP-340) | npub / nsec |
| **Bitcoin** | On-chain BTC spending, fee inputs | `m/84'/0'/0'/0/*` (BIP-84) | 33-byte compressed | bc1q... (P2WPKH) |
| **Tacit assets** | Pedersen commitments, kernel sigs | `m/138'/0'/0'/0/*` (custom) | 32-byte xonly (BIP-340) | sp1... / tsp1... (BIP-352) |
| **Lightning** | Lightning node operations | `m/84'/0'/0'/0/*` (same as BTC) or custom | Per-LN-implementation | Node pubkey |

> **R&D simplicity**: For the initial research phase, a single seed phrase is the minimum. All four keys can be derived at startup from one BIP-39 mnemonic. Future iterations can support hardware wallets per domain.

## BIP-352 Silent Payments for Tacit Receiving

[BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) defines a dual-key (scan + spend) model for static payment addresses. The tacit protocol's existing ECDH blinding (`src/crypto/ecdh.ts`) and amount encryption (`src/crypto/silent-payments.ts`) are already BIP-352 compatible.

### Key Derivation (BIP-352)

The reference implementation in `src/crypto/silent-payments.ts` provides:

```
deriveSilentPaymentKeys(spendPriv) → { scanPriv, scanPub, spendPub }
deriveSilentPaymentScanPriv(spendPriv) → scanPriv (SHA256 tag mod N)
```

Where `spendPriv` is derived from the seed at `m/138'/0'/0'/0/0`:

```
scanPriv  = SHA256("BIP0352/ScanKey" || SHA256("BIP0352/ScanKey") || spendPriv) mod N
scanPub   = scanPriv · G
spendPub  = spendPriv · G
```

### Receiving Address Format

```
sp1<bech32m(version=0 || scanPub(33) || spendPub(33))>  // mainnet
tsp1<bech32m(...)>                                        // signet
```

Encoded via `encodeSilentPaymentAddress()` from `src/crypto/silent-payments.ts`. The `sp1` address is published in Nostr listing events (kind 39000) so potential buyers can compute shared outputs.

### Sending to a Silent Payment Address

```
senderComputeSilentPaymentOutput({ inputPrivs, inputOutpoints, scanPub, spendPub })
```

Returns the xonly output key. The sender does **not** need the recipient's Nostr key — only their `sp1` silent payment address. This breaks the link between Nostr identity and on-chain receiving.

## How It Works in tacit-nostr

### Nostr Key (Event Signing)

- Signs all Nostr events (kinds 39000–39020)
- Standard NIP-01 event signing (SHA256(event) → Schnorr sig)
- Derived per NIP-06: `m/44'/1237'/0'/0/*`
- The Nostr pubkey is the user's **identity** on the market — reputation, ratings, trade history

### Bitcoin Key (On-Chain Fee Inputs)

- Signs Bitcoin transaction inputs (SIGHASH_ALL, SIGHASH_SINGLE|ACP)
- Used for commit-fee inputs, preauth-bid inputs, and any on-chain BTC spending
- Derived per BIP-84: `m/84'/0'/0'/0/*`
- Never used for Nostr event signing — prevents cross-protocol key leakage

### Tacit Key (Asset Operations)

- Signs kernel messages (computeKernelMsg), listing messages, opening messages
- Used for ECDH blinding derivation (deriveBlinding)
- The corresponding silent payment address (`sp1...`) is published in listing events
- Derived from seed (BIP-352 scan+spend keypair)
- All tacit-specific operations use this key exclusively

### Key Binding: Kind 39010

Since the Nostr key is different from the tacit/Bitcoin keys, a **binding event** proves the Nostr identity controls the other keys:

```
kind: 39010
pubkey: <Nostr pubkey>
content: {
  "tacit_sp_address": "sp1...",
  "bitcoin_pubkey": "33-byte-hex",
  "nostr_pubkey": "32-byte-hex"
}
tags: [
  ["tacit-sig",  <64-byte Schnorr sig over "tacit-nostr-bind-v1:<tacit_sp_address>" under tacit key>],
  ["bitcoin-sig", <64-byte Schnorr sig over "tacit-nostr-bind-v1:<nostr_pubkey_hex>" under bitcoin key>]
]
```

**Validation**: The client verifies both signatures independently. If either fails, the binding is rejected. The `tacit-sig` proves the Nostr key's operator controls the tacit key that receives payments.

> **R&D simplicity**: For the initial phase, binding events are optional. A minimal client can derive all keys from the same seed and skip the binding check. Binding becomes important when users import an existing Nostr key (e.g., from a different wallet) and need to prove they control the corresponding tacit/Bitcoin keys.

## ECDH with X-Only Pubkeys

Nostr event `pubkey` is always 32-byte xonly (BIP-340). Tacit's ECDH functions (`src/crypto/ecdh.ts`) expect a 33-byte compressed key. Parity recovery:

1. For ECDH with a Nostr `pubkey`, try both even (`0x02`) and odd (`0x03`) prefix bytes
2. Events SHOULD include `pubkey_parity` tag: `["pubkey_parity", "0"]` or `["pubkey_parity", "1"]`
3. The `recipient_pubkey` in kind 39002 content is 33-byte (prefix included) — no recovery needed

This applies to NIP-44 gift-wrap and tacit ECDH blinding derivation.

## Privacy Considerations

1. **No on-chain ↔ Nostr link**: The Nostr pubkey cannot be derived from the silent payment address (`sp1...`). Event metadata does not directly reveal on-chain activity.
2. **Binding event is opt-in**: Users who don't need reputation can skip kind 39010 entirely — their Nostr and tacit keys remain unlinked.
3. **Per-session keys**: For privacy-sensitive trading, generate fresh tacit keys and publish a temporary binding. See `nostr-market.md`.
4. **Gift wrapping**: Take events are gift-wrapped (NIP-59). The relay sees the recipient's Nostr `p` tag but not the payment details.
