# Skill: T_DROP (0x2B) — Public-Claim Airdrop Pools

## Domain Knowledge

T_DROP (0x2B) implements **public-claim airdrop pools**. A holder locks existing supply into a pool, declaring `(per_claim, cap_amount, merkle_root)` in the envelope. Recipients self-claim fixed `per_claim` tranches on a first-come-first-served basis. Supply-preserving: tokens shift from depositor to pool to claimant with no destruction or re-mint.

A **reclaim shape** (SPEC §5.12.1) uses `per_claim = 0` sentinel, allowing the depositor to reclaim unclaimed supply after expiry.

## Standard Drop Wire Format

```
T_DROP(1) || asset_id(32) || cap_amount_LE(8) || per_claim_LE(8) ||
merkle_root(32) || expiry_height_LE(4) || ticker_len(1) || ticker(tlen) ||
decimals(1) || asset_input_count(1) || kernel_sig(64)
```

## Reclaim Wire Format (per_claim = 0 sentinel)

```
T_DROP(1) || asset_id(32) || cap_amount_LE(8) || per_claim_LE(8)=0 ||
reclaim_drop_id(32) || reclaim_sig(64) || cap_blinding(32)
```

## Constraints

- `cap_amount % per_claim == 0` (standard shape)
- `merkle_root` all-zero = open (no eligibility gate)
- Reclaim: `cap_blinding` must be non-zero, signed by depositor

## TypeScript Implementation

```typescript
// Standard drop
import { encodeCDrop, decodeCDrop, encodeCDropReclaim } from 'lib-tacit';
const payload = encodeCDrop({ assetId, capAmount, perClaim, merkleRoot, expiryHeight, ticker, decimals, assetInputCount, kernelSig });
const dec = decodeCDrop(payload); // { kind: 'cdrop', ... }

// Reclaim
const reclaimPayload = encodeCDropReclaim({ assetId, capAmount, reclaimDropId, reclaimSig, capBlinding });
const decReclaim = decodeCDrop(reclaimPayload); // { kind: 'cdrop-reclaim', ... }
```

The decoder returns a union `DecodedDrop`. Check `kind` field to discriminate.
