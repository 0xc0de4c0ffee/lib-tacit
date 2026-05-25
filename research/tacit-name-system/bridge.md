# TNS Bridges: ENS, NIP-05, DNS/DNSSEC, WNS

## Unified Name Space

All name systems converge to the same resolution output. The bridge layer translates between name formats.

### Name Space Hierarchy

```
                    ┌─────────────────────────────┐
                    │        TNS Resolver          │
                    │  (unified output format)      │
                    └──────────┬──────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐           ┌────▼────┐
    │ On-Chain│          │ Nostr   │           │ Bridges │
    │ Tacit   │          │ Direct  │           │         │
    │ Names   │          │ 39020   │           │         │
    └─────────┘          └─────────┘           │         │
                                               │         │
                                    ┌──────────▼──┐  ┌──▼──────────┐
                                    │ ENS Bridge   │  │ WNS Bridge  │
                                    │ .eth .limo   │  │ .wei .is    │
                                    │ .arb + ICANN │  │             │
                                    │ w/ DNSSEC    │  │             │
                                    └──────┬───────┘  └──────┬──────┘
                                           │                  │
                                    ┌──────▼───────┐   ┌─────▼──────┐
                                    │ NIP-05       │   │ DNS Oracle │
                                    │ user@domain  │   │ ICANN TLDs │
                                    │ (ICANN DNS)  │   │ via DNSSEC │
                                    └──────────────┘   └────────────┘
```

## ICANN Convergence

NIP-05, ENS, DNS, and ICANN TLDs all converge on the **ICANN domain namespace**:

| System | Name Format | ICANN Integration | Proof Mechanism |
|--------|------------|------------------|-----------------|
| NIP-05 | `user@domain.com` | Domain is ICANN | HTTPS + Nostr sig (NIP-05 spec) |
| ENS w/ DNSSEC | `user.com` | ICANN TLD via DNSSEC | DNSSEC proof on Ethereum |
| DNS Oracle | `user.com` | Native DNS | DNSSEC chain verification |
| ENS w/ .eth | `user.eth` | ENS-specific TLD (not ICANN) | ENS proof (ETH RPC) |

### Canonical ICANN Identifier

The canonical internal format for ICANN-based names:

```
icann:{domain}:{user}

icann:example.com:alice     // NIP-05: alice@example.com
icann:example.com:www       // DNS: www.example.com
icann:ethereum.eth:alice    // ENS: alice.eth (ethereum.eth is the ENS registrar)
```

## ENS Bridge

### Architecture

```
TNS Client                                ENS Gateway
    │                                          │
    │  resolve("alice.eth")                    │
    │─────────────────────────────────────────>│
    │                                          │
    │  Gateway checks:                          │
    │  1. ENS namehash(alice.eth) exists       │
    │  2. ENS resolver points to tacit resolver │
    │  3. tacit resolver stores view_pub        │
    │     + spend_pub                          │
    │                                          │
    │  Kind 39020 with resolver record          │
    │  + ENS proof (Merkle or RPC sig)          │
    │<─────────────────────────────────────────│
    │                                          │
    │  Client verifies ENS proof                │
    │  Uses view_pub + spend_pub for payment    │
```

### ENS Resolver Contract (Solidity Reference)

An ENS resolver contract on Ethereum that stores tacit-compatible keys:

```solidity
// TacitENSResolver.sol — ENS resolver for tacit keys
contract TacitENSResolver is IERC165 {
    mapping(bytes32 => TacitKeys) private _keys;

    struct TacitKeys {
        bytes32 viewPubHash;   // keccak256 of 33-byte compressed pubkey
        bytes32 spendPubHash;  // keccak256 of 33-byte compressed pubkey
    }

    function setTacitKeys(bytes32 node, bytes calldata viewPub, bytes calldata spendPub) external {
        require(msg.sender == ENS.owner(node), "not name owner");
        _keys[node] = TacitKeys(keccak256(viewPub), keccak256(spendPub));
    }

    function getTacitKeys(bytes32 node) external view returns (bytes memory, bytes memory) {
        TacitKeys storage k = _keys[node];
        // Returns both pubkeys (requires off-chain retrieval of actual bytes)
    }
}
```

The ENS gateway queries this contract, hashes the returned pubkeys against ENS proofs, and publishes kind 39020.

## NIP-05 Bridge

NIP-05 (`user@domain.com`) is already ICANN-based. The bridge extends the NIP-05 response to include tacit keys.

### NIP-05 Response Format (Extended)

```json
// GET https://domain.com/.well-known/nostr.json?name=alice
{
  "names": {
    "alice": "npub1..."
  },
  "tacit": {
    "alice": {
      "view_pub": "02abc123...",
      "spend_pub": "03def456..."
    }
  }
}
```

### Verification

1. Client fetches `https://domain.com/.well-known/nostr.json?name=alice`
2. Verifies HTTPS certificate (TLS — ICANN trust anchor)
3. Checks `names.alice` matches a Nostr event for the user (optional)
4. Extracts `tacit.alice.view_pub` and `tacit.alice.spend_pub`
5. Caches as kind 39020 on a Nostr relay for future fast resolution

## DNS/DNSSEC Oracle

For plain ICANN domains (`.com`, `.org`, etc.):

```
TXT Record:   _tacit.alice.com.  TXT  "v=1;view_pub=02abc...;spend_pub=03def..."
```

A DNS oracle service:
1. Monitors DNS TXT records via DNSSEC-validated zone transfers
2. Publishes kind 39020 when records change
3. Includes DNSSEC proof chain in the event proof field

### DNSSEC Proof Chain

```
kind 39020 "proof": {
  "type": "dnssec",
  "data": {
    "domain": "alice.com",
    "rrset": "TXT _tacit.alice.com",
    "rrsig": "base64-encoded RRSIG",
    "dnskey": "base64-encoded DNSKEY",
    "ds": "base64-encoded DS record",
    "chain": ["root KSK", "com ZSK", "com ZSK signature", ...]
  }
}
```

The client verifies the DNSSEC chain up to the ICANN root. No trusted third party needed for DNS resolution.

## WNS Bridge

WNS (`.wei`, `.is`) resolves via L2 relay:

1. WNS gateway queries the WNS registry on its L2 chain
2. Gateway publishes kind 39020 with the resolver record
3. Proof = WNS state proof (L2 → L1 → Bitcoin — future)

## Resolution Priority (Cascading)

```
1. On-chain T_NAME_ETCH (namehash match)
   → Authoritative, trustless
   → Privacy-preserving (namehash hides name)

2. Nostr kind 39020 (addressable event)
   → Trusted gateway or signed by well-known relay
   → Proof chain included in event

3. NIP-05 direct query
   → TLS-authenticated (ICANN trust anchor)
   → Falls back to HTTPS fetch

4. DNS oracle query
   → DNSSEC-verified
   → Falls back to direct DNS TXT query

5. ENS gateway query
   → Ethereum RPC proof
   → Falls back to ENS gateway API
```

The client tries each path in order, using the first successful resolution. This ensures maximum availability — if ENS is down, NIP-05 might work; if Nostr is down, on-chain registry still works.
