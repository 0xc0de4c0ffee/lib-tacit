# BIP 388 Wallet Policies

> How hardware wallets register and enforce spending policies using compact miniscript templates.
> Reference: BIP 388 (Wallet Policies for Descriptor Wallets).

## Problem Statement

Hardware wallets have small screens and limited input capabilities. A raw descriptor like:

```
wsh(and_v(v:pk([abcd1234/48h/0h/0h/2h]xpub6.../0/*),or_d(pk([ef567890/48h/0h/0h/2h]xpub6.../0/*),older(52560))))
```

is 300+ characters of dense hex and notation — impossible to display, verify, or manually enter on a device. Hardware wallets need something compact that:

- Fits on a small screen for user confirmation
- Is deterministic (same logical policy → same template)
- Is versionable (can evolve without breaking parsers)
- Cryptographically binds every signing session to the originally registered policy

## BIP 388 Solution: Policy Map

BIP 388 replaces raw descriptors with a **policy map**: a JSON object with a miniscript template using `@0/**`, `@1/**`, ... placeholders for keys, plus the actual key material.

### Policy Map Structure

```json
{
  "policy": "wsh(thresh(2,pk(@0/**),s:pk(@1/**),s:pk(@2/**)))",
  "keys": [
    "[abcd1234/48h/0h/0h/2h]xpub6A...",
    "[ef567890/48h/0h/0h/2h]xpub6B...",
    "[01234567/48h/0h/0h/2h]xpub6C..."
  ]
}
```

- `@0/**`, `@1/**`, `@2/**` are key placeholders referencing `keys[0]`, `keys[1]`, `keys[2]`
- `/**` means "all derivation indices" — resolved to specific indices at address-derivation time
- The policy string is the **abstract miniscript** with keys stripped out

### Why This Works on Hardware

The hardware wallet receives:

| What | Size | Purpose |
|---|---|---|
| Policy template | ~80 bytes | Pure miniscript, no keys — parsable, displayable, concise |
| Key origins | ~120 bytes each | Fingerprint + derivation path — enough to identify the master seed |
| Key fingerprints | 4 bytes each | Shows on screen: "This 2-of-3 uses keys abcd, ef56, 0123" |

The user sees a condensed human-readable summary on the device:
- "2-of-3 Multisig"
- "Derivation: m/48h/0h/0h/2h"
- "Fingerprints: abcd1234, ef567890, 01234567"

No hex scripts, no raw public keys, no xpub strings to verify.

## Registration Flow

```
Wallet App                     Hardware Device
     │                               │
     │  1. Build policy map          │
     │     from user config          │
     │                               │
     │  2. Send policy map ─────────→│
     │                               │  3. Parse policy
     │                               │  4. Identify local keys
     │                               │     (check fingerprints
     │                               │      against stored seeds)
     │                               │  5. Display summary:
     │                               │     "2-of-3 Multisig"
     │                               │     "Keys: abcd, ef56, 0123"
     │                               │     "Your key: abcd"
     │                               │
     │  ←──── 6. User confirms ──────│
     │                               │  7. Store HMAC(policy)
     │                               │     under policy map ID
     │                               │
     │  8. Store policy map          │
     │     + policy map ID           │
     │     locally                   │
```

After registration, the wallet can derive addresses from the policy map without the hardware device. Address derivation is local — only signing requires hardware interaction.

## Signing Flow

```
Wallet App                     Hardware Device
     │                               │
     │  1. Create PSBT with          │
     │     inputs, outputs, paths    │
     │                               │
     │  2. Send PSBT ──────────────→│
     │     + policy map ID           │
     │     + policy map (optional)   │
     │                               │  3. Look up stored policy
     │                               │     by policy map ID
     │                               │  4. Verify HMAC matches
     │                               │     stored HMAC
     │                               │  5. Check input paths
     │                               │     against policy keys
     │                               │  6. Display spend details
     │                               │     (amount, address)
     │                               │
     │  ←── 7. User signs ──────────│
     │                               │  8. Produce partial sigs
     │                               │
     │  9. Combine signatures        │
     │  10. Finalize PSBT            │
     │  11. Broadcast tx             │
```

Step 4 is critical: the hardware device uses an **HMAC** computed over the policy map to verify that the PSBT being signed matches the policy the user originally approved. An attacker who compromises the wallet app cannot trick the hardware into signing under a different policy.

## Supported Hardware

| Device | Support Since | Notes |
|---|---|---|
| Ledger (app-bitcoin-new) | v2.1.0+ | Full BIP 388 support via Ledger Live or CLI |
| BitBox02 | v9.15.0+ | Swiss-made, open-source firmware |
| Blockstream Jade | v1.0.24+ | Fully open-source, supports air-gap via QR |

## BIP 388 `@` Derivation Notation

`@` placeholders carry **derivation scope** through the `*` wildcard:

| Placeholder | Meaning | Resolves To |
|---|---|---|
| `@0/**` | All addresses | `key_0/0/i` and `key_0/1/i` |
| `@0/0/**` | Receive only | `key_0/0/i` for `i = 0, 1, 2, ...` |
| `@0/1/**` | Change only | `key_0/1/i` for `i = 0, 1, 2, ...` |

BIP 389 multi-path (`<0;1>`) is implicit in `@0/**` — the `**` tells the wallet to use both branches.

### Allowed `@` Forms

| Form | Example | Use |
|---|---|---|
| `@i/**` | `@0/**` | Both receive and change |
| `@i/0/*` | `@0/0/*` | Receive only |
| `@i/1/*` | `@0/1/*` | Change only |
| `@i/<M;N>/*` | `@0/<0;1>/*` | Explicit multi-path |

Hardware wallets only need to store the **policy template** (the `@`-based miniscript) and the **key origins** (fingerprint + path to xpub). The full xpubs are not stored on the device — they are regenerated from the device's master seed at signing time. This means the policy map format is not just compact for display; it also minimizes persistent storage on constrained hardware.
