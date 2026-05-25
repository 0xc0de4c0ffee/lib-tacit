# Bitcoin Descriptor Wallets

> How BIP 380–388 redefine wallet architecture around deterministic descriptors.
> Reference: BIP 380, BIP 381–386, BIP 387, BIP 389, BIP 388.

## Why Descriptors

Before descriptors, wallets relied on ad-hoc address derivation logic scattered across import/export formats (BIP 32 xpubs, BIP 44/49/84/86 path templates, raw scripts). This made:

- **Wallet recovery** fragile — a backup of xpubs was useless without knowing which script type and derivation path the original wallet used.
- **Hardware wallet integration** painful — each vendor invented its own way to communicate "this is a 2-of-3 Taproot multisig at m/86'/0'/0'".
- **Multisig coordination** error-prone — cosigners had to manually align script structure, key ordering, and derivation paths.

Descriptors solve this with a **single self-contained string** that describes everything needed to derive addresses and sign for a wallet:

```
wsh(sortedmulti(2,[abcd1234/48h/0h/0h/2h]xpub6.../0/*,[ef567890/48h/0h/0h/2h]xpub6.../0/*))
```

One string → all UTXOs, all signing keys, all addresses.

## BIP 380 — General Descriptor Structure

A descriptor is a recursive expression tree:

```
wsh(and_v(v:pk(key_expr),or_d(pk(recovery_expr),older(52560))))
```

### Key Expressions

Keys in descriptors come in two forms:

**HD key (xpub route):**
```
xpub6CpWk9wAe9X4p5b9KpPq7NRpPdg3jHqYn8qPZPpPq7NRpPdg3jHqYn8qPZP/0/*
```
- Derives a key chain at `m/0/i` for `i = 0, 1, 2, ...`
- The `*` is a placeholder resolved to actual index values at address-derivation time

**Origin-prefixed HD key:**
```
[abcd1234/48h/0h/0h/2h]xpub6.../0/*
```
- `abcd1234` = 4-byte master key fingerprint (BIP 32)
- `/48h/0h/0h/2h` = full derivation path from master to xpub
- Everything after `]` is the xpub + relative derivation

Origin-prefixed keys let hardware wallets identify *which* master seed controls the key, enabling multi-seed coordination (e.g., multisig with keys from different hardware wallets).

## BIP 381–386 — Script Type Descriptors

| Descriptor | Script | Address Type | Use Case |
|---|---|---|---|
| `pk(key)` | `<pubkey> OP_CHECKSIG` | — (raw) | Pay-to-pubkey (rare) |
| `pkh(key)` | `OP_DUP OP_HASH160 <hash160> OP_EQUALVERIFY OP_CHECKSIG` | P2PKH legacy | Legacy addresses (1...) |
| `wpkh(key)` | `OP_0 <hash160>` | P2WPKH native segwit | Bech32 addresses (bc1q...) |
| `sh(wpkh(key))` | `OP_HASH160 <hash160> OP_EQUAL` nested | P2SH-P2WPKH | Segwit-in-legacy (3...) |
| `wsh(script)` | `OP_0 <sha256(script)>` | P2WSH | Native segwit multisig / miniscript |
| `sh(wsh(script))` | `OP_HASH160 <hash160> OP_EQUAL` nested | P2SH-P2WSH | Multisig bridge |
| `tr(key)` | BIP 341 Taproot | P2TR | Bech32m addresses (bc1p...) |
| `tr(key,{leaf1,leaf2,...})` | BIP 341 with script tree | P2TR | Taproot with script paths |

### Key Detail: `tr()` with Script Tree

`tr(key)` alone produces a key-path-only taproot output (spendable by key alone). `tr(key,{leaf1,leaf2,...})` embeds a Merkle tree of script leaves under the taproot output. Each leaf is itself a descriptor expression:

```
tr(xpub6.../0/*,{and_v(v:pk(xpub6.../1/*),older(52560))})
```

This is the **critical entry point for Miniscript** — scripts inside `tr()`'s second argument are Miniscript expressions.

## BIP 387 — Multisig Descriptors

`multi(k,key1,key2,...,keyN)` and `sortedmulti(k,key1,...,keyN)`:

- `multi(2,xpubA,xpubB,xpubC)` = bare multisig (M-of-N, keys in given order)
- `sortedmulti(2,xpubA,xpubB,xpubC)` = keys sorted lexicographically before hashing

`sortedmulti` is the standard for coordinated multisig wallets because cosigners independently derive the same script regardless of the order they specify their keys.

Example: a 2-of-3 Taproot multisig:

```
tr(multi(2,xpubA/0/*,xpubB/0/*,xpubC/0/*))
```

## BIP 389 — Multi-Path Descriptors

Before BIP 389, wallets needed two separate descriptors: one for receive addresses (`/0/*`) and one for change (`/1/*`). BIP 389 introduces the `<0;1>` syntax:

```
wpkh(xpub6.../<0;1>/*)
```

This single descriptor generates:
- Receive addresses: `m/0/i` (`i = 0, 1, 2, ...`)
- Change addresses: `m/1/i` (`i = 0, 1, 2, ...`)

Multi-path combines with any descriptor type:

```
tr(xpub6.../<0;1>/*,{and_v(v:pk(xpub6.../2/*),older(52560))})
```

## Miniscript Descriptor Examples

Taproot miniscript with a 1-year timelocked recovery:

```
tr(xpub6User/0/*,{and_v(v:pk(xpub6Recovery/0/*),older(52560))})
```

- **Key path**: User signs with `xpub6User` → instant spend
- **Script path (leaf)**: Recovery key + 52560 blocks (~1 year) → delayed recovery if user loses access

Taproot with two miniscript leaves (recovery + dispute escrow):

```
tr(xpub6Internal/0/*,{
  and_v(v:pk(xpub6Recovery/0/*),older(52560)),
  thresh(2,pk(xpub6Alice/0/*),pk(xpub6Bob/0/*),pk(xpub6Arbiter/0/*))
})
```

- Leaf 0: recovery after 1 year
- Leaf 1: 2-of-3 arbitration (Alice, Bob, arbiter)

Non-taproot miniscript (legacy P2WSH):

```
wsh(and_v(v:pk(key_user),or_d(pk(key_recovery),older(52560))))
```

- User key with recovery fallback, in P2WSH (older, larger script than taproot).

## PSBT Role in Descriptor Wallets

PSBT (BIP 174) is the bridge between descriptor wallets and signing devices. Key interactions:

1. **Wallet creates PSBT** with inputs, outputs, and the descriptor(s) attached as metadata in the `PSBT_GLOBAL_XPUB` and per-input `PSBT_IN_TAP_BIP32_PATH` fields.
2. **PSBT carries the descriptor** implicitly — the xpubs and paths tell the signer which keys are involved.
3. **Signer identifies what to sign** — it checks each input's BIP 32 derivation against its registered descriptors. If the input belongs to the signer's wallet, it produces a signature.
4. **Wallet finalizes** — combines partial signatures, verifies, broadcasts.

## Hardware Wallet Flow

BIP 388 (see [wallet policies](bip-388-policies.md)) splits descriptor registration from signing:

**Registration (one-time):**
1. Wallet application constructs a `policy map` (BIP 388 template)
2. Wallet sends the policy map to the hardware device
3. Device displays a human-readable summary (e.g., "2-of-3 multisig, account 1")
4. User confirms on-device
5. Device stores an HMAC of the policy for later verification

**Signing (repeated):**
1. Wallet constructs a PSBT referencing known outputs
2. Wallet sends PSBT + policy HMAC to hardware device
3. Device verifies HMAC matches stored policy
4. Device identifies which inputs belong to this wallet and prompts user
5. Device produces partial signatures
6. Wallet combines, finalizes, broadcasts

This split means the user only approves the policy once, and every subsequent signing session is cryptographically bound to that one-time approval.
