# Kernel Signatures (Mimblewimble-style)

Kernel signatures prove **conservation of supply** — that `Σamounts_out = Σamounts_in` for confidential transfers (CXFER) or `burned + Σout = Σin` for burns (BURN). They replace traditional spending authorizations: instead of proving "I own this UTXO", they prove "I know the blinding scalars such that the commitments balance."

## Soundness

A Pedersen commitment is `C = a·H + r·G`. Summing commitments:

```
E' = ΣC_out + burned·H − ΣC_in
   = (Σa_out + burned − Σa_in)·H + (Σr_out − Σr_in)·G
   = Δ_amount·H + excess·G
```

If amounts don't balance (`Δ_amount ≠ 0`), the Schnorr signer would need to know `log_G(H)` to produce a valid signature. Since H is a NUMS generator with **no known discrete log**, an unbalanced `E'` is **unsigned**. A valid signature under `E'` proves `Δ_amount = 0`.

## Kernel Message Construction

The kernel message binds the signature to a specific set of inputs, outputs, asset, and burn amount:

```
msg = SHA256(
  "tacit-kernel-v1"
  || asset_id(32)
  || input_count(1)
  || for each input: txid_BE(32) || vout_LE(4)
  || output_count(1)
  || for each output: commitment(33)
  || burned_amount_LE(8)     // 0 for CXFER
)
```

## Implementation

```typescript
import { computeKernelMsg, signKernel, verifyKernel, computeExcessPoint } from 'lib-tacit';

// CXFER: burnedAmount=0
const msg = computeKernelMsg(assetId, inputOutpoints, outputCommitments, 0n);
const sig = signKernel(msg, modN(Σr_out − Σr_in));
verifyKernel(sig, assetId, inputOutpoints, inputCommitments, outputCommitments, 0n);

// BURN: burnedAmount > 0
const burnMsg = computeKernelMsg(assetId, inputOutpoints, outputCommitments, 400n);
const burnSig = signKernel(burnMsg, modN(r_change − Σr_in));
verifyKernel(burnSig, assetId, inputOutpoints, inputCommitments, outputCommitments, 400n);

// Compute E' point directly
const EPrime = computeExcessPoint(outputCommitments, inputCommitments, burnedAmount);
```

## Mint Authorization Message (separate domain)

T_MINT uses a different domain tag (`tacit-mint-v1`) and binds to the commit anchor to prevent envelope replay:

```
mintMsg = SHA256("tacit-mint-v1" || asset_id(32) || commit_anchor(36) || commitment(33) || encrypted_amount(8))
```
