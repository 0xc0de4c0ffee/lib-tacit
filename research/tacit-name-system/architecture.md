# TNS Architecture: Components & Data Flow

## Component Map

```
                    ┌─────────────────────────────────────────┐
                    │              Wallet Client               │
                    │  resolve() → derive() → send()           │
                    └──────────┬──────────────┬───────────────┘
                               │              │
                    on-chain   │         off-chain (Nostr)
                    resolver   │         kind 39020
                               │              │
                    ┌──────────▼────┐  ┌──────▼───────────────┐
                    │ TNS On-Chain  │  │  TNS Off-Chain        │
                    │ Registry      │  │  (Bridges)            │
                    │               │  │                       │
                    │ T_NAME_ETCH   │  │  ┌─────────────────┐  │
                    │ T_NAME_SET_   │  │  │ NIP-05 Bridge   │  │
                    │   RESOLVER    │  │  │ (ICANN DNS)     │  │
                    │               │  │  └─────────────────┘  │
                    │ asset_id =    │  │  ┌─────────────────┐  │
                    │ namehash      │  │  │ ENS Bridge      │  │
                    │ (privacy-     │  │  │ (.eth + ICANN   │  │
                    │  preserving)  │  │  │  w/ DNSSEC)     │  │
                    └───────────────┘  │  └─────────────────┘  │
                                       │  ┌─────────────────┐  │
          ┌─────────────────────────┐  │  │ DNS Oracle      │  │
          │  namehash.md            │  │  │ (ICANN TLDs)    │  │
          │  SHA256 commitment      │  │  └─────────────────┘  │
          │  without revealing      │  │  ┌─────────────────┐  │
          │  name/TLD/years         │  │  │ WNS Bridge      │  │
          └─────────────────────────┘  │  │ (.wei/.is)      │  │
                                       │  └─────────────────┘  │
          ┌─────────────────────────┐  └───────────────────────┘
          │  pricing.md             │
          │  Exponential per-byte   │
          │  Years encoded in       │
          │  namehash commitment    │
          └─────────────────────────┘

  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │  resolver.md     │   │  bridge.md       │   │  wallet.md       │
  │  Per-name keys   │   │  ENS/DNS/NIP-05  │   │  Resolve → Derive│
  │  Multi-resolver  │   │  DNSSEC proofs   │   │  → Construct →   │
  │  Stealth derive  │   │  Proof chains    │   │  Broadcast       │
  └──────────────────┘   └──────────────────┘   └──────────────────┘
```

## Data Flow: Registration

```
1. User chooses name: "alice.tacit"
2. Client computes:
   name_hash = tns_namehash("alice", "tacit", years=2, payment_commitment)
3. Client constructs T_NAME_ETCH with name_hash (NOT the plaintext name)
4. Bitcoin: T_NAME_ETCH output with name_hash as asset_id
5. Client constructs T_NAME_SET_RESOLVER with resolver record
6. Bitcoin: resolver output spending the T_NAME_ETCH UTXO
7. Name is registered. On-chain only sees name_hash, not "alice" or "tacit".
```

## Data Flow: Resolution (Two Paths)

### On-Chain Path (Privacy Mode)

```
1. Sender knows recipient's name_hash (shared out of band, or from directory)
2. Sender looks up T_NAME_ETCH by name_hash on chain → gets resolver record
3. Sender derives payment output from resolver record (view_pub + spend_pub)
4. Sender constructs CXFER with derived recipient key
5. Recipient detects payment via scanning (or Nostr notify)
```

### Off-Chain Path (Discovery Mode)

```
1. Sender enters "alice" (no hash known)
2. Client queries Nostr kind 39020 with d="alice.tacit"
3. Gateway returns resolver record + proof chain
4. Sender verifies proof chain (ENS/DNSSEC/NIP-05)
5. Sender derives payment output
```

## Component Responsibilities

| Component | Responsibility | Key Files |
|-----------|---------------|-----------|
| `namehash.md` | SHA256 commitment scheme, registration without revealing name/TLD, proof-of-preimage | On-chain T_NAME_ETCH |
| `resolver.md` | Resolver kinds, key derivation (view_pub/spend_pub per name), multi-key support | On-chain T_NAME_SET_RESOLVER |
| `pricing.md` | Exponential per-byte, years+payment encoded in namehash, expiry/grace/renewal | Indexer validation |
| `bridge.md` | ENS, NIP-05, DNS/DNSSEC, WNS bridging, proof chains | Nostr kind 39020 |
| `wallet.md` | resolve() → derive() → send() pipeline, name entry UX | Client library |
