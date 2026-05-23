# Verified IPFS Fetch

## Overview

Content-addressed IPFS fetching with CID integrity checking. Always uses **CIDv1** (`baf...`) as the canonical format internally — CIDv0 (`Qm...`) inputs are automatically converted to CIDv1 via `cidToV1`.

Two transport backends:
1. **@helia/verified-fetch** (preferred) — libp2p + trustless gateway routing, content-addressed by design
2. **HTTP gateway fallback** — multi-gateway with client-side SHA256 CID re-validation (matches tacit-specs pattern)

## Why Verified Fetch Matters

tacit-specs/dapp uses raw HTTP gateways (ipfs.io, dweb.link) with manual CID re-validation via `_ipfsCidMatches`. This is vulnerable to:
- Gateway censorship and observation
- No peer-to-peer redundancy
- Single point of failure per gateway

`@helia/verified-fetch` solves this with:
- **Trustless gateways**: bytes are verified by hash before returning
- **libp2p routing**: fetch from peers directly when available
- **Content-addressed**: CID integrity is built into the protocol, not bolted on

## Library Implementation

✅ `src/indexer/ipfs.ts`:

| Function | Description |
|----------|-------------|
| `ipfsFetchVerified(cid)` | Fetch via helia (preferred) or HTTP gateway fallback |
| `ipfsFetchBatch(cids)` | Fetch multiple CIDs in parallel |
| `ipfsCidMatches(cid, bytes)` | Verify bytes match a CID without fetching |
| `cidToV1(cid)` | Convert CIDv0 → CIDv1 (no-op if already CIDv1) |

## CID Format

Always use CIDv1 (`baf...`) in new code. CIDv0 (`Qm...`) is deprecated:
- CIDv0: base58-encoded, 46 chars, `Qm...` prefix, sha256 only
- CIDv1: base32 lower, variable length, `b` prefix, supports any multihash

`cidToV1` handles the conversion: it decodes the CIDv0 multihash, wraps it in a CIDv1 binary structure (raw codec `0x55`), and re-encodes as base32.

## Test Fixtures

`tests/fixtures/ipfs/index.ts` provides offline test objects:
- `FIXTURE_JSON` — small known-good JSON blob
- `FIXTURE_CID_V0` — CIDv0 for the fixture
- `FIXTURE_CID_V1` — CIDv1 for the same content
- `FIXTURE_CORRUPT_JSON` — tampered content for negative testing

## Usage

```typescript
import { ipfsFetchVerified, cidToV1 } from 'lib-tacit';

// Auto-detects CID version, converts to CIDv1 internally
const r1 = await ipfsFetchVerified('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
// r1.cid → "baf..."

const r2 = await ipfsFetchVerified('bafybei...');
// r2.source → "helia" or "gateway"

// Convert CIDv0 to CIDv1
const v1 = cidToV1('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
```
