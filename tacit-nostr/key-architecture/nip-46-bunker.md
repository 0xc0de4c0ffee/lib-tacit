# NIP-46 Bunker Integration: Unified Key Management

> **Nostr NIP:** [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) (Nostr Connect)
> **Ref:** `src/crypto/schnorr.ts`, `src/crypto/kernel.ts`, `src/crypto/ecdh.ts`, `src/crypto/pedersen.ts`

## Problem

Browser-based tacit clients cannot safely hold a private key. NIP-46 solves this by delegating signing to a **bunker** (remote signer — mobile app, desktop extension, hardware wallet) while the client only gets a session token.

## Bunker Architecture

```
Client (browser dapp)        Bunker (mobile/extension/HWW)
         │                            │
         │  connect("bunker://...")   │
         │───────────────────────────>│
         │     session token          │
         │<───────────────────────────│
         │                            │
         │  sign_event(kind, content) │
         │───────────────────────────>│
         │     sig                    │
         │<───────────────────────────│
         │                            │
         │  tacit_sign_kernel(msg)    │
         │───────────────────────────>│
         │     kernel_sig             │
         │<───────────────────────────│
         │                            │
         │  tacit_ecdh_blinding(pub)  │
         │───────────────────────────>│
         │     blinding scalar        │
         │<───────────────────────────│
```

## Custom NIP-46 Methods for Tacit

The NIP-46 spec defines `sign_event` and `get_public_key`. Tacit needs additional methods:

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `tacit_sign_kernel` | `msg_hex` (32-byte msg hash), `asset_id_hex` | `sig_hex` (64-byte Schnorr) | Signs a kernel message per `computeKernelMsg` |
| `tacit_ecdh_blinding` | `their_pub_hex` (33/32-byte) | `blinding_hex` (32-byte scalar) | Returns `deriveBlinding(myPriv, theirPub)` |
| `tacit_schnorr_sign` | `msg_hex` (32-byte) | `sig_hex` (64-byte) | Generic BIP-340 schnorr sign (for listing_sig, binding_sig, etc.) |
| `tacit_derive_keystream` | `their_pub_hex`, `amount_hex` (string LE) | `encrypted_amount_hex` | Returns XOR keystream for amount encryption |

### Method Request Format

```jsonc
{
  "method": "tacit_sign_kernel",
  "params": [
    "ab12...cd34",     // msg_hex — 32-byte SHA256 kernel message
    "ef56...7890"      // asset_id_hex — 32-byte asset id
  ],
  "id": "request-uuid"
}
```

### Security Considerations

1. **Session isolation**: Each bunker session SHOULD use a distinct derived key (per NIP-46 spec). The client never sees the master private key.
2. **Method allowlist**: The bunker SHOULD let the user approve or deny each method type — signing a kernel message is a different trust level than deriving an ECDH blinding.
3. **ECDH derivation reveals counterparty**: `tacit_ecdh_blinding` reveals the counterparty's pubkey to the bunker. Users SHOULD use a per-session keypair (key separation mode) to avoid linking their master key.
4. **Hardware wallet support**: For HWWs that only support Bitcoin signing (e.g., `sign_schnorr`), the Nostr event signing can also be routed through the same HWW via the bunker bridge.

## Key Derivation for Bunker Mode

When using a bunker, the effective signing key is the bunker's key. The client never holds the private key:

| Operation | Who Signs | Bunker Method |
|-----------|-----------|---------------|
| Nostr event (39000-39010) | Bunker | `sign_event` (NIP-46 standard) |
| Kernel message | Bunker | `tacit_sign_kernel` |
| Listing signature | Bunker | `tacit_schnorr_sign` |
| ECDH blinding for amount encryption | Bunker | `tacit_ecdh_blinding` |
| ECDH for NIP-44 gift wrap | Bunker | `tacit_ecdh_blinding` (same method) |
| Bitcoin tx signing (preauth bid input) | Bunker | `sign_event` with custom payload |

## Relation to Key Separation

When using a bunker in key separation mode (kind 39010):
- The Nostr key pair lives in the bunker (signs events)
- The Bitcoin key pair also lives in the bunker (signs kernel msgs and txs)
- The binding sig (kind 39010) proves the Nostr key is authorized to act for the Bitcoin key
- The bunker can enforce that binding: refuse `tacit_sign_kernel` if the caller can't prove authorization

## Implementation Priority

1. Direct key access (current design — simplest, desktop-only)
2. Bunker connect + `sign_event` + `tacit_schnorr_sign` (mobile/extension support)
3. `tacit_ecdh_blinding` + `tacit_derive_keystream` (full privacy in browser)
4. HWW bridge via bunker (hardware security for BTC settlement)
