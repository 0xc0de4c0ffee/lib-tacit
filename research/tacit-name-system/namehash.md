# TNS Namehash: Privacy-Preserving Name Commitment

> **Design goal:** Register a name without revealing the name, TLD, registration years, or payment on chain. The on-chain record is a SHA256 hash. Ownership is proven by revealing the preimage at disclosure time.

## The Privacy Problem

Traditional name systems (ENS, DNS) store the name in plaintext on chain or in a public registry. This means:

- Anyone can scan the registry for valuable names (front-running)
- Your name is publicly linked to your address forever
- The TLD reveals which namespace you're in (`.tacit` vs `.eth` vs ICANN)
- Registration duration and payment are public

**TNS namehash solves this**: the on-chain `T_NAME_ETCH` stores only `SHA256(name || TLD || years || payment_salt || owner_pubkey)`. The name, TLD, years, and payment are hidden until the owner chooses to reveal them.

## Namehash Algorithm

```
tns_namehash(label, tld, years, payment_salt, owner_pubkey) =
    SHA256(
        "tacit-namehash-v1"  ||    // domain separator
        SHA256(label)         ||    // hidden label
        SHA256(tld)           ||    // hidden TLD
        u8(years)             ||    // registration duration (hidden)
        payment_salt          ||    // 32-byte random salt for payment hiding
        owner_pubkey               // 33-byte compressed (NOT hidden — proves ownership)
    )
```

Where:
- `label`: normalized lowercase label (e.g., `alice`)
- `tld`: TLD identifier (e.g., `tacit`, `eth`, `icann:example.com`)
- `years`: registration duration in years (u8, 1-255)
- `payment_salt`: 32-byte random value used to hide the miner fee
- `owner_pubkey`: 33-byte compressed public key (visible — ties name to owner)

## On-Chain Registration

### T_NAME_ETCH with Namehash

```
Old (plaintext):  opcode || name_label(VAR) || minter_pubkey || owner_sig
New (privacy):    opcode || name_hash(32) || minter_pubkey(33) || owner_sig(64) || years(1)
```

The on-chain payload reveals:
- `name_hash`: 32-byte SHA256 (hides label, TLD, payment)
- `minter_pubkey`: who registered it
- `years`: registration duration (visible — indexer needs this for expiry calculation)
- `owner_sig`: Schnorr proof of ownership

It does **NOT** reveal:
- The human-readable name (alice)
- The TLD (.tacit, .eth, icann:...)
- The payment amount or salt

### Proof of Ownership (Reveal)

To prove "I own `alice.tacit`", the owner publishes the preimage:

```jsonc
{
  "kind": 39021,               // TNS name reveal event
  "content": {
    "v": 1,
    "name_hash": "abc...",     // matches on-chain T_NAME_ETCH
    "label": "alice",
    "tld": "tacit",
    "years": 2,
    "payment_salt": "32-byte-hex",
    "owner_pubkey": "33-byte-hex"
  },
  "tags": [
    ["d", "<name_hash_hex>"],
    ["t", "tns-reveal"],
    ["p", "<owner_nostr_pubkey>"]
  ]
}
```

**Verification**: `SHA256("tacit-namehash-v1" || SHA256(label) || SHA256(tld) || u8(years) || payment_salt || owner_pubkey) === name_hash`. If it matches, the revealer is the owner.

## How This Handles Multiple TLD/Name Systems

### ICANN Domains (via NIP-05 or ENS)

For ICANN TLDs like `alice@example.com` (NIP-05) or `alice.com` (DNS/ENS):

```
TLD format: "icann:example.com"
Label:      "alice"
name_hash = SHA256("tacit-namehash-v1" || SHA256("alice") || SHA256("icann:example.com") || ...)
```

The `icann:` prefix distinguishes ICANN domains from native `.tacit` names. The bridge gateway proves ownership via NIP-05 HTTPS response or DNSSEC chain.

### ENS Names

```
TLD format: "ens:alice.eth"
Label:      "" (empty — the ENS namehash is used directly)
name_hash = SHA256("tacit-namehash-v1" || SHA256("") || SHA256("ens:alice.eth") || ...)
```

For ENS, the bridge verifies the ENS namehash resolves to a tacit-compatible resolver. The ENS namehash is used directly as the label SHA256 (empty label + ENS-specific TLD).

## Payment Commitment

The `payment_salt` hides the registration fee from the public. The fee is committed as:

```
payment_commitment = SHA256("tacit-name-payment-v1" || fee_sats || payment_salt)
```

The miner fee in the Bitcoin transaction must be ≥ the committed fee. The indexer verifies:
1. `payment_commitment` matches the fee paid
2. The fee meets the minimum for the name's length (when revealed)
3. If the name is never revealed, the fee is still valid (just unverifiable for anti-squat)

This means:
- **Without revealing**: anyone can register a namehash without revealing the name
- **Without anti-squat**: short names can't be enforced until reveal (acceptable for R&D)
- **After reveal**: anti-squat pricing is verifiable and enforceable

## Registration Flow (Privacy Mode)

```
1. User picks "alice.tacit" for 2 years
2. Client generates random payment_salt
3. Client computes name_hash
4. Client broadcasts T_NAME_ETCH with name_hash, years=2
   → On-chain: only 32 bytes of hash + minter_pubkey + years + sig
5. Name is registered. No one knows it's "alice.tacit".
6. Later, user reveals name via kind 39021 (optional — only when they want to be found)
```

## Design Rationale

### Why Hide the TLD?

If the TLD is visible on chain, an observer can distinguish:
- Native `.tacit` registrations (high privacy, tacit-native keys)
- ENS bridged names (Ethereum user)
- NIP-05 names (Nostr user)
- DNS names (traditional web2 user)

This metadata leaks the user's primary identity domain. Hiding the TLD means all registrations look identical on chain — a `.tacit` user and an ENS user are indistinguishable.

### Why Encode Years in the Hash?

Registration duration affects pricing (longer = more sats). Committing to years in the hash prevents:
- Registering with "1 year" pricing but claiming "10 years" later
- Post-dating a registration after the fact
- Front-running by extending duration

### Why Not Use ZK-SNARKs?

ZK-SNARKs (Groth16) are already available in tacit (`src/crypto/groth16.ts`) for the mixer pool. A zk-proof could prove "I know a preimage of name_hash where label length ≥ 5" without revealing the label. This is a future optimization — for R&D, simple SHA256 commitment + reveal is sufficient. The reveal is optional (only needed for discoverability).

## Namehash vs ENS Namehash

| Aspect | ENS namehash | TNS namehash |
|--------|-------------|--------------|
| Algorithm | Recursive SHA3 (label by label) | Single SHA256 over all fields |
| Privacy | Reveals all labels | Hides label, TLD, years, payment |
| Verification | Anyone can resolve from chain | Requires reveal event |
| Duration encoding | Not included (renewal is separate) | Committed in hash (anti-front-running) |
| Payment commitment | Not included | Included (anti-sybil enforcement) |

## v1 Simplifications

For the initial R&D phase, the namehash can include the **label in plaintext** (no privacy) while keeping the hash structure for future privacy upgrades:

```
v1: name_hash = SHA256("tacit-namehash-v1" || label || tld || u8(years) || owner_pubkey)
v2: name_hash = SHA256("tacit-namehash-v1" || SHA256(label) || SHA256(tld) || ...)
```

v1 is fully public (same as ENS). v2 adds privacy. The wire format is identical — only the hash computation changes. v2 registrations are forward-compatible with v1 indexers (they see a 32-byte hash either way).
