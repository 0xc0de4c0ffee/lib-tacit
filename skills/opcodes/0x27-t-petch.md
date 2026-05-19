# Skill: T_PETCH / T_PMINT — Fair Launch Assets

## Domain Knowledge

Fair-launch assets provide **permissionless, capped supply** on the tacit protocol. Instead of a hidden initial supply (CETCH), the issuer declares a lifetime `cap_amount` and fixed `mint_limit` per mint. Anyone can mint exactly `mint_limit` tokens per `T_PMINT` during a defined height window. The (amount, blinding) are **public**, so any chain reader can audit cumulative supply against the cap.

## T_PETCH — Deploy

### Wire Format

```
  T_PETCH(1)       — 0x27
  ticker_len(1)    — 1–16
  ticker           — UTF-8
  decimals(1)      — 0–8
  cap_amount(8)    — lifetime supply cap (LE u64)
  mint_limit(8)    — tokens per T_PMINT (LE u64)
  mint_start_height(4) — first block where mints are valid
  mint_end_height(4)   — last block where mints are valid
  image_len(2)     — image URI byte length
  image_uri        — ≤256 bytes UTF-8
```

### Rules

- `cap_amount % mint_limit == 0` (cap must be reachable by fixed mint units)
- `mint_start_height ≥ deployment_height + 1` (deployer cannot mint in the same block)
- `asset_id = SHA256(reveal_txid_BE || 0_LE)` — same derivation as CETCH
- Produces **zero tokens** at deploy time — no supply UTXO

### Implementation

```typescript
payload = encodePEtch({
  ticker: 'FAIR',
  decimals: 2,
  capAmount: 1_000_000n,
  mintLimit: 1000n,
  mintStartHeight: 800_000,
  mintEndHeight: 900_000,
});
// asset_id derived from reveal tx
```

## T_PMINT — Permissionless Mint

### Wire Format

```
  T_PMINT(1)       — 0x28
  asset_id(32)     — target fair-launch asset
  etch_txid(32)    — originating T_PETCH reveal txid
  commitment(33)   — C = mint_limit·H + blinding·G
  amount(8)        — LE u64, must equal T_PETCH.mint_limit (PUBLIC)
  blinding(32)     — pedersen blinding scalar (PUBLIC)
```

### Rules

- No signature required — anyone can mint
- `amount == T_PETCH.mint_limit` (validator rejects otherwise)
- Confirmed height must be within `[mint_start, mint_end]`
- Credit only at depth ≥ 3 (Bitcoin reorg safety)
- Cumulative supply ≤ `cap_amount` enforced from canonically-ordered chain history
- The (amount, blinding) are public — recovery is trivial (match P2WPKH output)

### Implementation

```typescript
payload = encodePMint({
  assetId,
  etchTxid: hexToBytes(petchTxid),
  commitment: pointToBytes(pedersenCommit(mintLimit, blinding)),
  amount: mintLimit,
  blinding,
});
```

## Indexer Supply Tracking

The indexer (any conforming implementation) tracks cumulative minted supply:

```
cumulative_minted = Σ(all confirmed T_PMINT amounts for this asset_id)
mints_remaining = (cap_amount − cumulative_minted) / mint_limit
```

Enforcement:
- Canonical chain order (by `(height, tx_index, txid)`)
- Reorg-safe at depth ≥ 3
- Cross-indexer cap gate: worker + dapp + optional tacitscan.io endpoint

## User Stories

- **Bootstrap**: deploy without allocating yourself any tokens
- **Permissionless mint**: anyone claims a fixed tranche during the window
- **Public auditability**: cumulative supply and cap are visible to everyone
- **Post-mint**: first CXFER from a T_PMINT UTXO re-blinds it into confidential transfer mode
