# TNS Pricing: Anti-Sybil Economics

## Pricing Model

TNS uses **exponential per-byte pricing** denominated in satoshis. The price is enforced by the Bitcoin miner fee — short names require higher-value inputs (higher fee) to confirm against competing transactions.

### Base Formula

```
price = len(label) × 4^max(0, 7 - len(label)) satoshis
```

| Label length | Multiplier | Price (sats) | Example |
|-------------|-----------|-------------|---------|
| 1 | 4096× | 4,096 | `x.tac` |
| 2 | 1024× | 2,048 | `ab.tic` |
| 3 | 256× | 768 | `abc.tacit` |
| 4 | 64× | 256 | `abcd` |
| 5 | 16× | 80 | `alice` |
| 6 | 4× | 24 | `alice` (with dot) |
| 7+ | 1× (base) | 7+ | `alice.tacit` |

### Duration Multiplier

Registration years multiply the base price:

```
total_price = base_price × years_multiplier

years_multiplier:
  1 year:  1×
  2 years: 2.5×
  3 years: 4.5×
  5 years: 10×
  10 years: 25×
```

### Proquint Pricing

Proquint names (pronounceable 4-byte identifiers like `babab-dabab`) are priced per-byte of data encoded:

```
proquint price = encoded_bytes × 4^max(0, 7 - encoded_bytes) satoshis

4 bytes → 64× multiplier → 256 sats
```

## Fee Enforcement

The indexer checks:

```
min_fee = total_price(sats)
if tx.miner_fee < min_fee:
    reject("insufficient registration fee")

// Additional check for short names:
if label_length < 5:
    if tx.confirm_height < min_confirm_height:
        reject("height delay not met: " + min_confirm_height)
```

### Height-Gated Registration

Short names have a confirmation height delay:

| Length | Min confirm height delay | Description |
|--------|------------------------|-------------|
| 1-3 | 144 blocks (~1 day) | Prevents rapid re-registration after expiry |
| 4 | 12 blocks (~2 hours) | Moderate delay |
| 5 | 3 blocks (~30 min) | Minimal delay |
| 6+ | 0 blocks | Immediate |

The delay is measured from the registration transaction's first confirmation. This prevents front-running at low fee rates — a squatter can't register a 3-char name at 1 sat/vB and have it confirm before a legitimate bidder at 50 sat/vB.

## Expiry & Renewal

### Expiry Timeline

```
Registration ──────── Expiry ──── Grace (30d) ──── Premium (65d) ──── Available
     │                   │            │                 │                │
     │  owner can use    │  can renew │  decaying premium│  anyone can   │
     │  & transfer       │  only      │  re-registration │  register     │
```

- **Expiry**: `registration_height + (years × 52560 blocks)` (1 year ≈ 52560 Bitcoin blocks)
- **Grace period** (30 days): owner can still renew, resolver still resolves
- **Premium period** (65 days, from proquint.eth): anyone can re-register at decaying surcharge:

  ```
  premium_pct = 100% × (1 - days_into_premium / 65)
  re_reg_fee = base_price × (1 + premium_pct / 100)
  ```

  **50% of premium goes to the previous owner** (recoverable via Nostr notification kind 39022).

- **After 365 days**: fully available (no premium, no owner claim)

### Renewal

```
Renewal cost = base_price × new_years × renewal_multiplier
Renewal multiplier = 0.8× (20% discount for existing owners)
```

Renewal extends the expiry from the current expiry date (not from the renewal date).

## Anti-Squat Comparison

| System | Short name cost | Annual fee | Transfer penalty | Expiry recovery |
|--------|----------------|------------|-----------------|-----------------|
| ENS | Same as long | $5-50/yr ETH | None | None (no expiry) |
| Namecoin | Auction | ~0.01 NMC/yr | None | After 36k blocks |
| Proquint.eth | Exponential ETH | None | 7 days/transfer | Grace + premium |
| **TNS** | **Exponential sats** | **None (one-time)** | **7 days/transfer** | **Grace + premium + owner split** |
| Handshake | Auction HNS | None | None | After 1 year |
| Sats Names | Same as long | None | None | None |

## Economic Security

### Why Exponential Pricing Works

1. **Short names are scarce**: 26³ = 17,576 three-letter names. Exponential pricing allocates them to those who value them most.
2. **No protocol fee**: The fee is the Bitcoin miner fee. TNS doesn't collect rent — the market price of block space determines name value.
3. **No oracle needed**: Unlike ENS (needs ETH/USD oracle for "fair" pricing), TNS uses native Bitcoin sats. The price is absolute, not relative to a fiat peg.
4. **Anti-squat without auction**: Auctions (Namecoin) require multiple transactions and time. Exponential pricing is a single transaction — simpler UX.

### Graceful Degradation

If the Bitcoin fee market makes registration prohibitively expensive:

1. **Layer 2 registration**: Names can be registered via Nostr (kind 39020, off-chain) at zero cost
2. **Bridge to L2**: Lightning Network or federated peg for cheap registration
3. **Fee market adapts**: As block space gets expensive, shorter names naturally consolidate to high-value uses
