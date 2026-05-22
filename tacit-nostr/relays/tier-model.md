# Relay Tier Model

> **Ref:** `src/interfaces/chain-client.ts`, `src/crypto/kernel.ts`, `src/crypto/bulletproofs-plus.ts`
> **Nostr NIPs:** [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md) (AUTH), [NIP-70](https://github.com/nostr-protocol/nips/blob/master/70.md) (Protected)

## Tier 1 — Pass-Through Relay

Standard Nostr relay. Stores and forwards events. No tacit-specific validation.

| Property | Value |
|----------|-------|
| Storage | All events (or by kind filter) |
| Validation | NIP-01 signature only |
| Event size limit | Relay-configured (typically 64 KB) |
| AUTH required | No |
| Rejection reason | Standard NIP-01 errors only |
| Revenue model | Donation, paid access, NIP-11 fees |

**Usage in tacit-nostr:** Sufficient for public events (listings, bids, DROP announces). Insufficient for wrapped events (relay needs AUTH to serve them privately).

## Tier 2 — Tacit-Validating Relay

A Nostr relay that additionally validates embedded tacit data before accepting events.

| Property | Value |
|----------|-------|
| Storage | Valid events only |
| Validation | NIP-01 + tacit validation + chain state query |
| Event size limit | Larger (256 KB for BP+ proofs) |
| AUTH required | Yes (for wrapped events) |
| Rejection reason | `"invalid: kernel sig failed"`, `"invalid: UTXO already spent"`, etc. |
| Revenue model | Micro-fee per accepted event, subscription |

### Validation performed at publish time

1. ✓ NIP-01 event signature
2. ✓ Parse `content` JSON, extract tacit fields
3. ✓ Opcode check: `content.opcode === 0x5B` (etc.)
4. ✓ Kernel sig: `verifyKernel(...)` from `src/crypto/kernel.ts`
5. ✓ Bulletproof: `bppRangeVerify(...)` from `src/crypto/bulletproofs-plus.ts`
6. ✓ Chain query: `fetchOutspend(txid, vout)` for pre-signed inputs
7. ✓ Asset check: `assetIdFor(txid, vout)` matches a confirmed CETCH/PETCH

### Rejection errors

| Error prefix | Condition |
|-------------|-----------|
| `invalid: nostr-sig` | NIP-01 signature doesn't verify |
| `invalid: kernel-sig` | `verifyKernel` returned false |
| `invalid: bulletproof` | `bppRangeVerify` or `bpRangeAggVerify` returned false |
| `invalid: utxo-spent` | Pre-signed input is already spent on chain |
| `invalid: asset-not-found` | Referenced asset doesn't exist on chain |
| `invalid: expired` | Event has `expiration` tag and it's past |
| `invalid: malformed-json` | Content is not valid JSON or missing required fields |

## Tier 3 — Tacit Indexer Relay

Full-featured market relay that maintains orderbook state, provides API for market data, and may offer bonded validation.

| Property | Value |
|----------|-------|
| Storage | Full orderbook state (active orders only) |
| Validation | Full + state tracking (knows which bids are filled) |
| AUTH required | Yes |
| API | REST/WebSocket for aggregated market data |
| Bonding | Operator stakes TAC tokens as SLASHable bond |
| Revenue model | API subscription, bonded validation fees |

Tier 3 is beyond the scope of this R&D document. It would require a bonded worker (per `SPEC-WORKER-BOND-AMENDMENT`) that runs on Nostr instead of a custom worker API.

## Relay Discovery

Clients discover tacit-aware relays via:

1. **NIP-66 (Relay Discovery)** — query known relay directories for relays that support kinds 39000-39010
2. **NIP-65 (Relay Lists)** — users publish a kind 10002 event listing their read/write relays
3. **Bootstrapping** — a well-known set of tacit-operated relays (analogous to the current worker URL)
