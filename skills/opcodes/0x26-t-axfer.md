# Skill: T_AXFER — Atomic OTC Settlement

## Domain Knowledge

T_AXFER (0x26) is a CXFER variant that enables **trustless single-Bitcoin-tx OTC settlement**. The maker signs their envelope and tacit asset inputs with `SIGHASH_SINGLE | ANYONECANPAY` (0x83), which binds only the envelope-bearing input and its same-index output. The taker can then append BTC funding inputs/outputs with `SIGHASH_ALL`, settling both sides atomically. Neither party can grief the other.

## Wire Format

```
  T_AXFER(1)          — 0x26
  asset_id(32)        — target asset
  asset_input_count(1) — how many vin[1..] are tacit asset inputs
  kernel_sig(64)      — BIP-340 Schnorr
  N(1)                — output count ∈ {1,2,4,8}
  (C_i(33) || amount_ct_i(8))*N  — outputs
  rp_len(2) || rangeproof        — aggregated bulletproof
```

## Signing Flow

### Maker Side

```
// 1. Build envelope + tacit outputs (same as CXFER)
payload = encodeAXfer({ asset_id, asset_input_count, kernel_sig, outputs, rangeproof })

// 2. Place envelope at vin[0], tacit asset inputs at vin[1..1+asset_input_count]
// Maker signs with SIGHASH_SINGLE | ANYONECANPAY (=0x83):
//   - Binds only input[0] (envelope) + output[0] (tacit change/recipient)
//   - Leaves all other inputs/outputs unbound
sighash = sighashV0WithType(tx, 0, scriptCode, value, 0x83)
maker_sig = schnorr.sign(sighash, maker_priv)

// Optional: maker also signs each asset input with SIGHASH_SINGLE_ACP
```

### Taker Side

```
// 1. Append BTC funding inputs and BTC change output
// 2. Sign the complete tx with SIGHASH_ALL (=0x01):
sighash = sighashV0(tx, btcInputIdx, scriptCode, btcValue, 0x01)
taker_sig = schnorr.sign(sighash, taker_priv)

// 3. Broadcast — both sides settle in one tx
```

## Security Properties

- **Maker can't redirect**: maker's `SIGHASH_SINGLE_ACP` binds the envelope + output[0]; any attempt to change the BTC payment destination would invalidate the maker's sig
- **Taker can't steal tokens**: the kernel sig ensures supply conservation — taker can't inflate their tacit output beyond what the maker committed
- **Atomic**: either both sides confirm in the same block, or neither does

## Variable-Amount Variant (T_AXFER_VAR, 0x37)

T_AXFER_VAR allows the taker to fill any amount in `[min_fill, max_amount]` instead of a fixed amount. The maker signs an intent record off-chain advertising "up to X tokens at price P, minimum Y"; the taker fills any amount in range and settles via a single `T_AXFER_VAR` reveal. Same N=2 cryptography as CXFER.

```
  T_AXFER_VAR(1)     — 0x37
  asset_id(32)       — target asset
  asset_input_count(1) — always 1 (single asset input)
  kernel_sig(64)     — BIP-340 Schnorr (excess-based, same as CXFER)
  N=2(1)             — exactly 2 outputs (recipient + change)
  C_recip(33) || ct_recip(8)
  C_change(33) || ct_change(8)
  rp_len(2) || rangeproof  — m=2 aggregated bulletproof
```

## Validation Rules

- Same as CXFER for the kernel sig and bulletproof
- `asset_input_count` distinguishes tacit assets from auxiliary BTC inputs
- T_AXFER: N ∈ {1,2,4,8}; T_AXFER_VAR: N = 2 exactly
- `SIGHASH_SINGLE_ACP` binding verified per Bitcoin consensus
- The maker's BTC payout output must match the offer price
