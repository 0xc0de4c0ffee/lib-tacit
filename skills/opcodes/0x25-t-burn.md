# Skill: T_BURN — Destroy Supply

## Domain Knowledge

T_BURN (0x25) destroys part or all of a holder's balance. Unlike CXFER where amounts are hidden, the `burned_amount` is **public** — this lets observers audit the total supply reduction. The kernel signature proves `burned = Σin - Σout`, binding the public burn amount to the hidden input/output balances.

## Wire Format

```
  T_BURN(1)       — 0x25
  asset_id(32)    — target asset
  burned_amount(8) — LE u64, PUBLIC
  kernel_sig(64)  — BIP-340 Schnorr
  N(1)            — output count ∈ {0, 1, 2, 4, 8}
  (C_i(33) || amount_ct_i(8))*N  — change outputs (empty if N=0)
  [rp_len(2) || rangeproof]      — omitted if N=0
```

## Implementation Workflow

```
// 1. Select asset inputs
in_amounts = [a1, a2, ...]
in_blindings = [r1, r2, ...]
in_commitments = [C1, C2, ...]

// 2. Compute change
total_in = Σin_amounts
change = total_in - burned_amount
has_change = change > 0

// 3. For change output (if has_change)
anchor = first_input_txid_BE || first_input_vout_LE
r_change = deriveChangeBlinding(priv, anchor, 0)
ks_change = deriveAmountKeystreamSelf(priv, anchor, 0)
C_change = change·H + r_change·G
ct_change = change XOR ks_change

// 4. Kernel sig
// E' = C_change + burned·H - ΣC_in  (with change)
// E' = burned·H - ΣC_in               (full burn, no change)
excess = Σr_out - Σr_in  (r_out = r_change or 0)
msg = computeKernelMsg(asset_id, input_outpoints, output_commitments, burned_amount)
sig = signKernel(msg, excess)
```

## Validation Rules

- `burned_amount` must be in `[0, 2^64)` (LE u64)
- N (output count) must be in `{0, 1, 2, 4, 8}` where 0 = full burn
- Bulletproof required if N > 0, omitted if N = 0
- Kernel sig verifies under `E' = ΣC_out + burned·H - ΣC_in`
- `E'` must not be zero
- `asset_id` must match across all input UTXOs

## Key Difference from CXFER

The kernel message hash includes a non-zero `burned_amount` as an 8-byte LE suffix. This domain-separates BURN from CXFER even if all other fields are identical — a CXFER kernel sig cannot accidentally validate a BURN envelope and vice versa.

```
msg_cxfer = SHA256("tacit-kernel-v1" || ... || 00 00 00 00 00 00 00 00)
msg_burn  = SHA256("tacit-kernel-v1" || ... || burned_08 LE bytes)
```

## Recovery

Same as CXFER change recovery: the spender can recover change outputs from chain + privkey alone using the same `deriveChangeBlinding` and `deriveAmountKeystreamSelf` derivations. There is no recipient in a BURN — only the burner and optionally their change output.
