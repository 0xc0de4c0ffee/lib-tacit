# TNS Resolver: Per-Name Key Derivation & Multi-Resolver Support

## Resolver Record (On-Chain)

A resolver record is stored on chain via `T_NAME_SET_RESOLVER`. It maps a `name_asset_id` (the namehash) to one or more resolver entries.

```
T_NAME_SET_RESOLVER wire:
  opcode(1) || name_asset_id(32) || n_entries(1) || entries(VAR) || sig_by_owner(64)

Each entry:
  resolver_kind(1) || resolver_bytes(VAR)
```

### Resolver Kinds (Full Table)

| Kind | Name | Bytes | Description | Derivation |
|------|------|-------|-------------|------------|
| `0x00` | `TACIT_STEALTH_V1` | 66 | `(spend_pub(33) \|\| view_pub(33))` | HKDF from wallet key + name_hash |
| `0x01` | `TACIT_STEALTH_V2` | 98 | `(spend_pub(33) \|\| view_pub(33) \|\| spend_priv_commit(32))` | Same + spend key commitment |
| `0x02` | `BTC_SILENT_PAYMENT` | VAR | BIP-352 `sp1` address string | `encodeSilentPaymentAddress()` |
| `0x03` | `PAYMENT_CODE` | 79 | BIP-47 payment code | `pm8...` format |
| `0x04` | `NOSTR_ID` | 32 | Nostr pubkey (32-byte xonly) | Direct |
| `0x05` | `NIP05` | VAR | `user@domain.com` | NIP-05 identifier |
| `0x06` | `ENS_NAME` | VAR | ENS name (e.g., `alice.eth`) | ENS bridge |
| `0x07` | `IPFS_METADATA` | VAR | IPFS CIDv1 (e.g., `bafy...`) | `ipfsFetchVerified()` |
| `0x08` | `TEXT_RECORD` | VAR | Key-value text record | `key=value\|key2=value2` |
| `0x09` | `BTC_ADDRESS` | VAR | Static Bitcoin address | P2WPKH / P2TR |
| `0xFF` | `END` | 0 | Terminator | No more entries |

## Stealth Key Derivation (TACIT_STEALTH_V1)

For each registered name, two deterministic secp256k1 keys are derived:

```
namespace = SHA256("tacit-name-key-v1" || name_asset_id)

view_priv = HKDF-SHA256(ikm=master_wallet_privkey, salt="tacit-name-view-v1", info=namespace)[:32]
view_pub  = view_priv · G

spend_priv = HKDF-SHA256(ikm=master_wallet_privkey, salt="tacit-name-spend-v1", info=namespace)[:32]
spend_pub  = spend_priv · G
```

This ensures:
- **Each name has unique keys** — different names cannot be linked by key reuse
- **Deterministic from seed** — recovery from seed phrase only, no localStorage needed
- **Computationally independent** — knowing `view_priv` does not reveal `spend_priv` (different HKDF salt)

## Payment Derivation (Sender Side)

When resolving `alice.tacit` to send a payment:

```
resolver = resolve("alice.tacit")  // returns resolver record

if resolver has TACIT_STEALTH_V1:
    // Derive one-time recipient key per tacit's existing ECDH
    ephemeral_key = generate_keypair()
    shared_secret = ECDH(ephemeral_key.priv, resolver.view_pub)
    one_time_spend_key = HMAC(shared_secret, "tacit-name-payment-v1") · G + resolver.spend_pub
    output_key = pedersen_commit(amount, blinding) with one_time_spend_key as recipient

if resolver has BTC_SILENT_PAYMENT:
    // BIP-352 silent payment (reuses silent-payments.ts)
    output_xonly = senderComputeSilentPaymentOutput({
        inputPrivs, inputOutpoints,
        scanPub: resolver.sp1_address.scanPub,
        spendPub: resolver.sp1_address.spendPub
    })

if resolver has PAYMENT_CODE:
    // BIP-47 payment code (via Nostr notification kind 39016)
    shared_secret = ECDH(sender_priv, resolver.payment_code.notification_key)
    // ... per BIP-47 §3.3
```

## Recipient Detection

### Via On-Chain Scan

```
For each CXFER output:
    one_time_candidate = output.commitment - ephemeral_key · view_priv
    if one_time_candidate == spend_pub:  // this is my payment
        decrypt_amount(output.encryptedAmount, shared_secret)
```

### Via Nostr Notification

```
Receive kind 39015 (BIP-352 notify):
    verify expected_output_key == compute_output_key(scan_priv, input_outpoints)
    // direct — no scanning needed

Receive kind 39016 (BIP-47 notify):
    derive shared_secret from notification_pubkey
    // all future payments from this sender use the derived chain
```

## Resolver Update Rules

1. **Latest confirmed wins**: The most recent `T_NAME_SET_RESOLVER` spending the name UTXO is the current resolver
2. **Append-only entries**: A resolver update can add, remove, or replace individual resolver kinds. Missing kinds are preserved from the previous resolver
3. **Signature required**: `verifySchnorr(sig, name_asset_id || new_entries, owner_pubkey)` must pass
4. **Bounded size**: Total resolver entries ≤ 1024 bytes (enforced by Bitcoin tx standardness)
