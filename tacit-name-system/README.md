# Tacit Name System (TNS)

> **Ref:** `proposals/40-name-system/`, `tacit-nostr/`, `tacit-specs/SPEC.md §5.x`
> **Design influences:** ENS (Ethereum), Proquint (namesys-eth), Namecoin, NIP-05 (Nostr), BIP-352, Handshake

A Bitcoin-native naming system where names resolve to **privacy primitives** (silent payment addresses, viewing keys) rather than static addresses. Built on tacit's existing opcode machinery + Nostr for off-chain resolution.

## Table of Contents

1. [TLDs & Name Formats](#tlds--name-formats)
2. [Two-Layer Architecture](#two-layer-architecture)
3. [On-Chain Registry (Tacit Opcodes)](#on-chain-registry-tacit-opcodes)
4. [Off-Chain Resolution (Nostr)](#off-chain-resolution-nostr)
5. [Name Format Translation](#name-format-translation)
6. [Anti-Sybil Pricing](#anti-sybil-pricing)
7. [Cross-Chain / Name System Bridging](#cross-chain--name-system-bridging)
8. [Integration with BIP-47 / BIP-352](#integration-with-bip-47--bip-352)
9. [R&D Roadmap](#rd-roadmap)

---

## TLDs & Name Formats

TNS supports **multiple name sources** with a unified resolution API. A name like `adam.tacit` or `adam.eth` or `adam@nostr` all resolve to the same _kind_ of data (viewing key + spend key + payment info).

### Supported Name Spaces

| TLD / Namespace | Source | Example | Resolution |
|-----------------|--------|---------|------------|
| `.tacit` | TNS native (tacit opcode registry) | `alice.tacit` | On-chain resolver record |
| `.tic` | TNS native (shorthand) | `alice.tic` | Same as `.tacit` |
| `.tac` | TNS native (minimal) | `alice.tac` | Same as `.tacit` |
| `.eth` | ENS (Ethereum) | `alice.eth` | ENS → L2 relay → Nostr bridge |
| `.limo` | ENS-compatible | `alice.limo` | Same as `.eth` |
| NIP-05 | Nostr | `alice@domain.com` | NIP-05 lookup → Nostr event |
| ICANN TLDs | DNS | `alice.com` | DNS + DNSSEC → oracle |
| `.wei` / `.is` | WNS | `alice.wei` | WNS resolver |
| ENS-compatible | Any ENS zone | `alice.arb` | ENS gateway |

### Name Normalization

```
alice.tacit  →  alice.tacit     (canonical, lowercase)
ALICE.TACIT  →  alice.tacit     (lowercased)
alice.tacit  →  tacit:alice     (internal format, TLD stripped)
alice        →  tacit:alice     (bare, defaults to .tacit)
```

### Proquint Names (Design Reference)

From [proquint.eth](https://github.com/namesys-eth/proquint.eth): pronounceable 4-byte identifiers like `babab-dabab` (CVCVC-CVCVC). Proquint names can be a sub-namespace of `.tacit` for short, human-memorable names:

```
babab-dabab.tacit  →  tacit:babab-dabab  →  resolves to viewing key
```

Using the same consonant-vowel encoding from proquint, 4 bytes become an 11-character pronounceable label. Anti-sybil pricing applies per-byte (see below).

---

## Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 2: Off-Chain (Nostr)                    │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ NIP-05     │  │ ENS Gateway │  │ WNS Bridge │  │ TNS Relay │ │
│  │ (Nostr id) │  │ (.eth/etc)  │  │ (.wei/etc) │  │ (nostr)   │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                  │
│  All resolve to a standardized JSON record:                      │
│  { tacit_view_pub, tacit_spend_pub, sp1_address,                │
│    nostr_pubkey, nip05, avatar_cid, ... }                       │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              Nostr kind 39020 (name resolution event)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Layer 1: On-Chain (Tacit)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  T_NAME_ETCH (0x6x) — first-broadcast-wins registration │    │
│  │  T_NAME_SET_RESOLVER (0x6y) — resolver record update    │    │
│  │  T_NAME_TRANSFER (0x6z) — ownership transfer (future)   │    │
│  └──────────────────────────────────────────────────────────┘    │
│          │              │               │                        │
│          ▼              ▼               ▼                        │
│     name.tacit    name.tic        name.tac (all aliases)        │
│                                                                  │
│  Canonical name → SHA256 → asset_id                              │
│  Owner = UTXO owner (CETCH-style)                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## On-Chain Registry (Tacit Opcodes)

### T_NAME_ETCH — Name Registration

```
Opcode:    0x6x (TBD, allocated from draft range)
Wire:      opcode(1) || name_label(VAR) || minter_pubkey(33) || owner_sig(64)

Constraints:
- name_label: 3-32 bytes (lowercased, NFC-normalized, stripped of TLD)
- minter_pubkey: 33-byte compressed secp256k1
- owner_sig: Schnorr sig over name_label under minter_pubkey
- Minimum registration fee: paid via Bitcoin miner fee (no protocol fee)
```

**asset_id derivation**: `SHA256("tacit-name-v1" || name_label)` — deterministic from the name.

**First-broadcast-wins**: Same as CETCH. The first confirmed `T_NAME_ETCH` for a given name_label creates the asset. Subsequent spends of that UTXO control name ownership.

### T_NAME_SET_RESOLVER — Resolver Update

```
Opcode:    0x6y (TBD)
Wire:      opcode(1) || name_asset_id(32) || resolver_kind(1) || resolver_bytes(VAR) || sig_by_owner(64)
```

**Resolver kinds:**

| Kind | Name | Bytes | Description |
|------|------|-------|-------------|
| `0x00` | `TACIT_STEALTH` | 66 | `spend_pub(33) || view_pub(33)` — per-name stealth keys |
| `0x01` | `BTC_SILENT_PAYMENT` | VAR | BIP-352 `sp1` address |
| `0x02` | `NOSTR_ID` | 32 | Nostr pubkey for this name |
| `0x03` | `ENS_NAME` | VAR | ENS `.eth` name (for bridging) |
| `0x04` | `IPFS_METADATA` | VAR | IPFS CID for profile/avatar |
| `0x05` | `NIP05` | VAR | Nostr NIP-05 identifier |
| `0x06` | `PAYMENT_CODE` | 79 | BIP-47 payment code |
| `0x07` | `TEXT_RECORD` | VAR | Key-value text record (like ENS texts) |

**Validation**: `verifySchnorr(sig_by_owner, name_asset_id || resolver_bytes, owner_pubkey)`. The owner pubkey is the xonly of the current `T_NAME_ETCH` UTXO owner.

### Name Transfer

Transfer is implicit — spending the `T_NAME_ETCH` UTXO to a new output transfers ownership. The new UTXO owner can update the resolver.

---

## Off-Chain Resolution (Nostr)

### Kind 39020 — Name Resolution Event

For names NOT registered on-chain (ENS, NIP-05, ICANN TLDs), a Nostr-based resolution provides the same resolver record format:

```jsonc
{
  "kind": 39020,
  "content": {
    "v": 1,
    "name": "alice.eth",
    "resolved_at": 1767225600,
    "resolver": {
      "tacit_view_pub": "33-byte-hex",
      "tacit_spend_pub": "33-byte-hex",
      "sp1_address": "sp1...",
      "payment_code": "pm8...",
      "nostr_pubkey": "32-byte-hex",
      "nip05": "alice@domain.com",
      "avatar_cid": "bafy...",
      "text_records": {
        "com.twitter": "@alice",
        "com.github": "alice"
      }
    },
    "proof": {
      "type": "ens-gateway" | "nip05" | "dnssec" | "signed",
      "data": "proof bytes or signature"
    }
  },
  "tags": [
    ["d", "<normalized_name>"],
    ["t", "name-resolution"],
    ["expiration", "1767225600"]
  ]
}
```

Key 39020 is an **addressable event** (`d` tag = normalized name). The latest event for a given name wins.

### Resolution Priority

When resolving a name, clients check in order:

1. **On-chain first**: If a `T_NAME_ETCH` exists for this name, use its resolver record directly
2. **Nostr fallback**: If no on-chain record, look for kind 39020 published by a trusted gateway
3. **Direct resolution**: For NIP-05 names, query the NIP-05 server directly (per NIP-05 spec)
4. **ENS gateway**: For `.eth`/`.limo` names, query an ENS → Nostr bridge

### Name Gateway Types

| Gateway | Input | Output | Trust Model |
|---------|-------|--------|-------------|
| ENS bridge | `.eth` name | Kind 39020 | Trusted gateway or on-chain proof |
| NIP-05 server | `user@domain` | Kind 39020 | NIP-05 HTTPS + Nostr sig |
| DNS oracle | ICANN domain | Kind 39020 | DNSSEC verification |
| WNS bridge | `.wei` name | Kind 39020 | L2 relay |
| TNS relay | `.tacit` name | On-chain tx | Trustless (on-chain) |

---

## Name Format Translation

A unified resolution API translates between name formats:

```
Input:    alice.tacit  →  tacit:alice              →  resolve()
Input:    alice.tic    →  tacit:alice              →  resolve()
Input:    alice.tac    →  tacit:alice              →  resolve()
Input:    alice.eth    →  ens:alice.eth             →  ens_gateway.resolve()
Input:    alice@nostr  →  nip05:alice@domain.com    →  nip05.resolve()
Input:    alice.com    →  dns:alice.com             →  dns_oracle.resolve()
Input:    alice.wei    →  wns:alice.wei             →  wns_bridge.resolve()
Input:    alice        →  tacit:alice (default .tacit)  →  resolve()
```

**Resolution output** is always the same normalized resolver record:

```typescript
interface TNSResolver {
  name: string;                        // canonical normalized name
  tld: string;                         // tacit | eth | nip05 | dns | wns
  tacit_view_pub?: Uint8Array;         // 33-byte compressed
  tacit_spend_pub?: Uint8Array;        // 33-byte compressed
  sp1_address?: string;                // BIP-352 silent payment address
  payment_code?: string;               // BIP-47 payment code
  nostr_pubkey?: Uint8Array;           // 32-byte xonly
  avatar_cid?: string;                 // IPFS CID
  text_records?: Record<string, string>;
  proof: ResolutionProof;              // how this was verified
}
```

---

## Anti-Sybil Pricing

### Pricing Model: Exponential Per-Byte

Inspired by Namecoin and proquint.eth's exponential pricing, but **Bitcoin-native** (denominated in sats, not ETH/gas):

| Name length | Registration fee multiplier | Example | Cost (at 1 sat/byte base) |
|-------------|---------------------------|---------|--------------------------|
| 3 chars | 1024× | `a.xy` | 3,072 sats |
| 4 chars | 256× | `abcd` | 1,024 sats |
| 5 chars | 64× | `alice` | 320 sats |
| 6 chars | 16× | `alice.tic` | 96 sats |
| 7+ chars | 1× (base) | `alice.tacit` | 7+ sats |

**Formula**:

```
base_price = len(name_label) satoshis
multiplier = max(1, 4^(7 - len(name_label)))
total_fee  = base_price × multiplier sats
```

The fee is **not a protocol fee** — it's the Bitcoin miner fee required to confirm the `T_NAME_ETCH` transaction. Short names require higher-value inputs (higher fee) to confirm quickly. The indexer checks that the miner fee paid ≥ the calculated minimum.

### Anti-Squat Mechanisms

| Mechanism | How it works | Severity |
|-----------|-------------|----------|
| **Length-gated pricing** | Short names cost exponentially more to register | Prevents mass squatting of 3-4 char names |
| **Height-gated registration** | Names shorter than 5 chars have a min confirm height delay | Prevents front-running at low fee rates |
| **Expiry** | Names expire after N blocks if not renewed | Frees squatted names |
| **Grace period** | N blocks after expiry, owner can renew at 2× cost | Owner protection |
| **Premium re-registration** | After expiry, anyone can re-register at decaying premium (100%→0% over 65 days) | From proquint.eth design |
| **Transfer penalty** | Each transfer subtracts 7 days from expiry | Discourages flippant transfers |

### Comparison with Other Systems

| System | Pricing | Anti-Sybil | Blockchain |
|--------|---------|------------|------------|
| ENS | Fixed ETH per year (+ gas) | None (anyone can register any name at same price) | Ethereum |
| Namecoin | Auction + yearly fee | Auction-based | Namecoin |
| TNS | Exponential per-byte + Bitcoin fee | Length pricing + height gate + expiry | Bitcoin (tacit) |
| Proquint.eth | Exponential ETH pricing | Commit-reveal + inbox + transfer penalty | Ethereum |

---

## Cross-Chain / Name System Bridging

### ENS Bridge

ENS names (`.eth`, `.limo`, etc.) are resolved via an ENS → Nostr bridge:

1. **Gateway** queries ENS on Ethereum (via L2 or light client)
2. Gateway publishes kind 39020 with the resolved record
3. Gateway signs the event with a known ENS bridging key
4. Client verifies the gateway sig, or if available, verifies the ENS proof directly

The ENS resolver record on Ethereum can point to a tacit resolver contract that stores the `(view_pub, spend_pub)` tuple. This allows ENS users to receive tacit payments without registering a `.tacit` name.

### NIP-05 Bridge

Nostr NIP-05 identifiers (`user@domain.com`) resolve via the standard NIP-05 HTTPS endpoint. The NIP-05 response includes a `tacit` field:

```json
{
  "names": {
    "alice": "npub1..."
  },
  "tacit": {
    "alice": {
      "view_pub": "02abc...",
      "spend_pub": "03def..."
    }
  }
}
```

This allows any NIP-05 user to receive tacit payments with zero additional registration.

### DNS Bridge

ICANN domains resolve via DNS TXT records:

```
_tacit.alice.com.  TXT  "tacit_view_pub=02abc... spend_pub=03def..."
```

A DNS oracle monitors DNSSEC chain and publishes kind 39020 when DNS records change.

---

## Integration with BIP-47 / BIP-352

The name system resolves to both BIP-352 and BIP-47 formats:

### BIP-352 Path

1. Resolve `alice.tacit` → get `sp1_address` (BIP-352 silent payment address)
2. Use `senderComputeSilentPaymentOutput()` to derive output key
3. Optionally publish kind 39015 (payment notification) to alice's Nostr key
4. alice scans via `receiverScanTxForSilentPayments()` or receives Nostr notification

### BIP-47 Path

1. Resolve `alice.tacit` → get `payment_code` (BIP-47 payment code)
2. Generate notification per BIP-47 §3.1
3. Publish kind 39016 instead of on-chain notification tx
4. alice receives via Nostr, derives shared secret, detects payments

### Wallet UX

```
User enters:  "send 1000 TAC to alice.tacit"

Client:
  1. Normalize: "alice.tacit" → tacit:alice
  2. Resolve on-chain: T_NAME_ETCH for asset_id=SHA256("tacit-name-v1" || "alice")
     → Found! Get resolver record: view_pub + spend_pub
  3. Pick payment method:
     a. BIP-352: derive output key, optionally send Nostr notify
     b. BIP-47: if recipient has payment_code, prefer BIP-47
     c. Default: BIP-352 (simpler, no per-sender state)
  4. Construct CXFER with derived recipient key
  5. Broadcast Bitcoin tx
```

---

## R&D Roadmap

### Phase 1: Core Naming (now)

- `T_NAME_ETCH` + `T_NAME_SET_RESOLVER` opcode wire format
- `TACIT_STEALTH` resolver kind (view_pub + spend_pub)
- Client: name resolution from on-chain registry
- Test: register `alice.tacit`, send payment, verify stealth derivation

### Phase 2: Nostr Bridge

- Kind 39020 name resolution events
- NIP-05 integration (tacit fields in NIP-05 response)
- ENS gateway (`.eth` → tacit resolver)
- Client: unified `resolve(name)` API across all name sources

### Phase 3: Anti-Sybil + Economics

- Length-gated pricing enforcement in indexer
- Height-based registration delay for short names
- Expiry + grace period + premium re-registration
- Transfer penalty

### Phase 4: Advanced

- BIP-47 payment code resolver kind
- DNS/DNSSEC oracle
- WNS bridge
- Proquint sub-namespace for pronounceable short names
- Name marketplace (transfer with price)
