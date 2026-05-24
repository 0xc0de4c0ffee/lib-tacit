# NIP-46 Bunker: Multi-Key Signer

> **Nostr NIP:** [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) (Nostr Connect)
> **Ref:** `src/crypto/silent-payments.ts`, `src/crypto/schnorr.ts`, `src/crypto/kernel.ts`, `src/crypto/ecdh.ts`

## Problem

Browser-based tacit clients cannot safely hold private keys. NIP-46 delegates signing to a **bunker** (remote signer — mobile app, extension, HWW). With separate keys per domain, the bunker manages **multiple keypairs** from the same seed.

## Bunker Architecture

```
Client (browser dapp)              Bunker (mobile/extension/HWW)
         │                              │
         │  connect("bunker://...")     │
         │─────────────────────────────>│
         │  session token               │
         │<─────────────────────────────│
         │                              │
         │  sign_event(kind, content)   │  ← uses Nostr key
         │─────────────────────────────>│
         │  sig                         │
         │<─────────────────────────────│
         │                              │
         │  tacit_sign_kernel(msg)      │  ← uses tacit key
         │─────────────────────────────>│
         │  kernel_sig                  │
         │<─────────────────────────────│
         │                              │
         │  tacit_ecdh_blinding(pub)    │  ← uses tacit scan key
         │─────────────────────────────>│
         │  blinding scalar             │
         │<─────────────────────────────│
         │                              │
         │  bitcoin_sign_tx(tx, input)  │  ← uses Bitcoin key
         │─────────────────────────────>│
         │  tx_sig                      │
         │<─────────────────────────────│
```

## Domain-Specific Methods

| Method | Domain Key | Params | Returns | Description |
|--------|-----------|--------|---------|-------------|
| `sign_event` | Nostr | `kind`, `content`, `tags` | `sig` | Standard NIP-46 |
| `get_public_key` | Nostr | — | `pubkey` | Standard NIP-46 |
| `tacit_get_sp_address` | Tacit | — | `sp1...` | Returns BIP-352 silent payment address |
| `tacit_sign_kernel` | Tacit | `msg_hex` (32-byte) | `sig_hex` | Signs kernel message per `computeKernelMsg` |
| `tacit_ecdh_blinding` | Tacit | `their_pub_hex` (33/32-byte) | `blinding_hex` | Returns `deriveBlinding(myPriv, theirPub)` |
| `tacit_schnorr_sign` | Tacit | `msg_hex` (32-byte) | `sig_hex` | Generic BIP-340 for listing/binding sigs |
| `tacit_bind_keys` | All | `nostr_pubkey_hex` | `{ tacit_sig, bitcoin_sig }` | Signs kind 39010 binding for all keys |
| `bitcoin_sign_tx` | Bitcoin | `psbt_hex` | `sig_hex` | Signs a Bitcoin tx input |
| `bitcoin_get_pubkey` | Bitcoin | — | `33-byte-hex` | Returns BIP-84 public key |

## Key Isolation

The bunker exposes **different keys for different methods**:

- `sign_event` → Nostr key (`m/44'/1237'/0'/0/0`)
- `tacit_*` methods → Tacit key (`m/138'/0'/0'/0/0` + BIP-352 scan key)
- `bitcoin_*` methods → Bitcoin key (`m/84'/0'/0'/0/0`)

This means a compromised bunker session for `sign_event` does **not** leak the tacit or Bitcoin keys. Conversely, a dapp that only requests Nostr signing cannot move funds.

## Method Request Format

```jsonc
{
  "method": "tacit_sign_kernel",
  "params": ["ab12...cd34"],
  "id": "request-uuid"
}
```

## Implementation Priority

1. Direct seed access (R&D, simplest — derive all keys at startup)
2. NIP-46 bunker connect + `sign_event` + `tacit_schnorr_sign`
3. Full method table (all tacit + bitcoin methods)
4. HWW bridge (hardware wallet per domain)
