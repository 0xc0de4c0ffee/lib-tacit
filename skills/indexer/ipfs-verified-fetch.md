# Skill: Verified IPFS Fetch

## Domain Knowledge

Content-addressed IPFS retrieval with CID integrity checking. Two backends:
1. **@helia/verified-fetch** — libp2p + trustless gateways (preferred)
2. **HTTP gateway fallback** — multi-gateway with client-side SHA256 re-validation

Always canonicalizes to CIDv1 internally. CIDv0 inputs are auto-converted.

## Comparison with tacit-specs

| Aspect | tacit-specs (dapp) | lib-tacit |
|--------|-------------------|-----------|
| Transport | HTTP gateways only | @helia/verified-fetch + gateway fallback |
| CID format | Accepts both v0/v1 | **Canonicalizes to CIDv1** |
| CIDv0→v1 | Manual | `cidToV1()` auto-converts |
| Gateway chain | `IPFS_GATEWAYS_FALLBACK` (hardcoded) | Configurable (defaults provided) |
| CID verification | `_ipfsCidMatches` | `ipfsCidMatches` (same algorithm) |
| Peer-to-peer | ❌ | ✅ via libp2p |

## Key Functions

`src/indexer/ipfs.ts`:
- `ipfsFetchVerified(cid)` — fetch via helia (preferred) or gateway fallback
- `ipfsFetchBatch(cids)` — parallel batch fetch
- `ipfsCidMatches(cid, bytes)` — verify bytes against CID (shared across both backends)
- `cidToV1(cid)` — CIDv0 → CIDv1 conversion (no-op if already v1)

## CID Format Notes

- CIDv0 (`Qm...`): base58, 46 chars, sha256-only, deprecated
- CIDv1 (`baf...`): base32 lower, supports any multihash, preferred
- Always store/pass CIDv1 in new code
- `cidToV1` reconstructs the CID from the embedded multihash — doesn't need the content bytes

## Test Fixtures

`tests/fixtures/ipfs/index.ts` provides offline test objects so CID-verification tests don't need network access.
