# Proposal: Private Names for Tacit

> **Upstream:** [z0r0z/tacit#40](https://github.com/z0r0z/tacit/issues/40) — Private names for tacit (adam.tacit with unlinkable payments)
> **Status:** Design response / R&D
> **Author:** @ChinmayGopal931

## Summary

This proposal extends tacit with a **naming layer** — human-readable names (`adam.tacit`) that resolve to a **privacy primitive** (viewing pubkey + name-specific spend pubkey) instead of a static Bitcoin address. Senders derive a one-time recipient pubkey via the same ECDH machinery `T_CXFER` already uses for amount encryption.

No new cryptographic primitives. Same Sapling-style ECDH that `T_SLOT_NOTE` (§5.26) uses for recipient detection, applied one layer up.

## Opcodes

### `T_NAME_ETCH` (name registration)

First-broadcast-wins name registration.

```
Wire: opcode(1) || name_label(VAR) || minter_pubkey(33) || owner_sig(64)
```

- `asset_id` derived from canonical name encoding (hash of normalized name)
- Height-based minimum name length as anti-squat lever
- CETCH-style ownership: owner = whoever owns the carrying UTXO
- Name normalization: lowercase, NFC, strip `.tacit` suffix

### `T_NAME_SET_RESOLVER` (resolver update)

```
Wire: opcode(1) || name_asset_id(32) || resolver_kind(1) || resolver_bytes(VAR) || sig_by_current_owner(64)
```

**Resolver kinds (v1):**

| Kind byte | Name | Resolver bytes | Description |
|-----------|------|---------------|-------------|
| `0x00` | `TACIT_STEALTH` | `spend_pub(33) || view_pub(33)` = 66 bytes | Per-name stealth keys |
| `0x01` | `BTC_SILENT_PAYMENT` | `sp1_address(VAR)` | BIP-352 address (reserved for v2) |
| `0x02` | `NOSTR_ID` | `nostr_pubkey(32)` | Link to Nostr identity |
| `0x03` | `ENS_NAME` | `ens_name(VAR)` | ENS `.eth` / `.limo` resolution |
| `0x04` | `IPFS_CID` | `cid(VAR)` | IPFS-hosted profile metadata |
| `0x05` | `NIP05` | `nip05_string(VAR)` | Nostr NIP-05 identifier |

Latest confirmed resolver update wins on chain. Signature must verify against the current name-owner UTXO.

## Stealth Derivation

The `TACIT_STEALTH` resolver carries `(spend_pub || view_pub)` — two 33-byte compressed secp256k1 points (66 bytes).

```
spend_pub = spend_priv · G        // name-specific, HKDF-derived from wallet privkey
view_pub  = view_priv · G         // HKDF-derived, same pattern as §5.26.1 sk_view
```

When sender wants to pay `adam.tacit`:
1. Look up the on-chain resolver record for name `adam` → get `(spend_pub, view_pub)`
2. Generate ephemeral keypair `(e, e·G)` per-payment
3. Shared secret = ECDH(e, view_pub) → HMAC → recipient one-time spend key
4. Recipient detects payment via ECDH(e·G, view_priv) — same scan pattern as BIP-352

## Opcode Allocation

Requesting allocation from the **draft/reserved range** in the canonical opcode table (§1.1). Suggested positions (contiguous, in the 0x6x or 0x7x range depending on maintainer preference):

| Opcode | Name | Section |
|--------|------|---------|
| `T_NAME_ETCH` | Name registration | New |
| `T_NAME_SET_RESOLVER` | Resolver record update | New |
| `T_NAME_TRANSFER` | Name ownership transfer | Future |

## Rationale

- **Same ECDH machinery** tacit already uses — no new crypto audit surface
- **Per-name spend keys** prevent linkage between different name payments (unlike ENS where all payments go to the same address)
- **On-chain resolver** means resolution has no off-chain dependency (no DNS, no IPFS in the critical path)
- **Reserved `BTC_SILENT_PAYMENT` kind** allows future BIP-352 integration without breaking the v1 wire format
- **Height-gated anti-squat** prevents mass squatting without preventing legitimate registration

## Reference

See `tacit-specs/spec/amendments/` for the full amendment draft structure. See `tacit-name-system/` for the extended name system design including multi-TLD support, Nostr integration, and anti-sybil pricing.
