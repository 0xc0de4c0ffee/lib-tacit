# Skill: Kernel Signatures

## Domain Knowledge

Mimblewimble-style kernel signatures prove conservation of supply in confidential transfers. Unlike traditional signatures that authorize spending, kernel sigs prove that `Σamounts_out = Σamounts_in` — the key insight that makes confidential transactions auditable without revealing individual amounts.

## Key Concepts

- **Excess**: `excess = Σr_out − Σr_in mod N` (scalar)
- **Excess point**: `E' = ΣC_out − ΣC_in` (point on secp256k1)
- **For BURN**: `E' = ΣC_out + burned·H − ΣC_in`
- **Degenerate kernel**: `E' = 0` is always rejected (prover reveals no secret)

## Implementation

```typescript
import {
  computeKernelMsg, signKernel, verifyKernel,
  computeCxferExcess, computeMintMsg, assetIdFor,
} from 'lib-tacit';

// Compute the kernel message (binds to asset, inputs, outputs, burn)
const msg = computeKernelMsg(assetId, inputOutpoints, outputCommitments, burnedAmount);

// Sign with the excess blinding scalar
const excess = computeCxferExcess(outBlindings, inBlindings);
const sig = signKernel(msg, excess);  // 64-byte BIP-340 Schnorr sig

// Verify (returns false on bad points — never throws)
const valid = verifyKernel(sig, assetId, inputOutpoints, inputCommitments, outputCommitments, burnedAmount);

// Parse untrusted commitment bytes before other curve ops
import { tryBytesToPoint } from 'lib-tacit';
const P = tryBytesToPoint(commitment33);
```

`inputOutpoints.length` must equal `inputCommitments.length`.

## Soundness Proof

```
E' = ΣC_out + burned·H − ΣC_in
   = Σ(a_out·H + r_out·G) + burned·H − Σ(a_in·H + r_in·G)
   = (Σa_out + burned − Σa_in)·H + (Σr_out − Σr_in)·G
   = Δ_amount·H + excess·G
```

If `Δ_amount ≠ 0` (amounts don't balance), then:
```
E' = Δa·H + excess·G
```

A valid Schnorr sig under `E'.xonly()` proves the prover knows the discrete log of `E'` wrt `G`:
```
E' = k·G  for some secret k
    = Δa·H + excess·G
→ k·G − excess·G = Δa·H
→ (k − excess)·G = Δa·H
→ G = Δa/(k−excess)·H
→ log_G(H) = (k−excess)/Δa
```

Since H is a NUMS generator with **no known discrete log**, the prover cannot produce a valid sig unless `Δa = 0` — i.e., amounts balance.

## Mint Message

Separate from kernel messages. Used when the mint authority signs T_MINT:

```
msg = SHA256(
  "tacit-mint-v1"
  || asset_id(32)
  || commit_anchor(36)     // binds to specific commit/reveal
  || commitment(33)
  || encrypted_amount(8)
)
sig = signSchnorr(msg, mint_authority_privkey)
```

The `commit_anchor` binding prevents an attacker who reads a past T_MINT from rewrapping the on-chain payload into their own commit/reveal pair.

## Asset ID Derivation

```
asset_id = SHA256(reveal_txid_BE(32) || reveal_vout_LE(4))
```

where `reveal_vout = 0` for CETCH and T_PETCH. This deterministically derives a 32-byte asset identifier from the etch reveal transaction.

## Common Pitfalls

- `verifyKernel` must not throw on adversarial wire bytes — use it as a boolean verifier
- E' = 0 (degenerate) must be rejected — it means the prover knows nothing
- Kernel message MUST include all input outpoints — swapping inputs against the same sig is a replay attack
- Output commitment order matters in the kernel hash — different order = different msg = sig won't verify
- For CXFER, `burnedAmount = 0n` — this is always included as 8 LE bytes
- The same `tacit-kernel-v1` domain tag is used for CXFER and BURN; they differ by the `burnedAmount` suffix
