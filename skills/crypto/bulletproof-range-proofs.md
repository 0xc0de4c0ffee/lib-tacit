# Skill: Bulletproofs Range Proofs

## Domain Knowledge

Bulletproofs (Bünz et al. 2017) are zero-knowledge range proofs that prove a committed value lies in `[0, 2^n)` without revealing the value. Tacit uses n=64 bits with aggregation across m ∈ {1,2,4,8} outputs. The aggregated proof simultaneously proves all m values are in range.

## Key Concepts

- **n = 64 bits**: range `[0, 2^64)`
- **Aggregation**: m outputs share one proof (~688 B for m=1, grows slowly)
- **IPA (Inner Product Argument)**: the log-sized proof system inside Bulletproofs
- **Pippenger MSM**: signed-digit windowed multi-scalar multiplication for O(N) verification

## Prover

```typescript
import { bpRangeAggProve } from '@tacit/lib';

const values = [1000n, 500n];      // amounts to prove in-range
const blindings = [r1, r2];        // Pedersen blinding scalars

const { proof, commitments } = bpRangeAggProve(values, blindings);
// proof: Uint8Array (≈754 bytes for m=2)
// commitments: secp.ProjectivePoint[] (Pedersen commitments)
```

## Verifier

```typescript
import { bpRangeAggVerify, bpRangeAggBatchVerify } from '@tacit/lib';

// Single proof
const valid = bpRangeAggVerify(commitments, proof);

// Batch verify (combine N proofs into one multi-exp)
const valid = bpRangeAggBatchVerify([
  { commitments: C1, proof: p1 },
  { commitments: C2, proof: p2 },
]);
```

## Proof Size Formula

```
proof_size = 4×33 + 3×32 + log₂(n·m)×(2×33) + 2×32
           = 132 + 96 + log₂(n·m)×66 + 64
```

| m | nm | log₂(nm) | Size (bytes) |
|---|----|----------|-------------|
| 1 | 64 | 6 | 292 + 396 = 688 |
| 2 | 128 | 7 | 292 + 462 = 754 |
| 4 | 256 | 8 | 292 + 528 = 820 |
| 8 | 512 | 9 | 292 + 594 = 886 |

## Fiat-Shamir Transcript

The BP proof uses a deterministic Fiat-Shamir transcript with domain `tacit-bp-v1`. Every element is length-prefixed (4-byte LE u32) for cross-implementation compatibility:

```
append("domain", "tacit-bp-v1")
append("n", [64])
append("m", [m])
append("V", V_j)   // for each commitment
append("A", A)
append("S", S)
y = challenge("y")
z = challenge("z")
append("T1", T1)
append("T2", T2)
x = challenge("x")
append("t_hat", t_hat)
append("tau_x", tau_x)
append("mu", mu)
w = challenge("w")
// IPA rounds:
append("L", L_k); append("R", R_k); challenge("u")   // for k=0..log(nm)-1
```

## Batch Verification

Batch verification combines N rangeproofs into one multi-scalar multiplication using random linear combination with per-proof α (t̂ check) and β (IPA check). Soundness: failure probability ≤ 2/order ≈ 2⁻²⁵⁵.

## Generator Vectors

BP uses 512 generator vectors each for G and H (n=64, m_max=8, nm_max=512):
- `G_vec[i]` derived via `"tacit-bp-G-v1" || i_LE || counter`
- `H_vec[i]` derived via `"tacit-bp-H-v1" || i_LE || counter`
- `Q` derived via `"tacit-bp-Q-v1"`

Canonical vectors are pinned in `src/constants/generators.ts`.

## Common Pitfalls

- Values must be in `[0, 2^64)` — out-of-range values throw errors in prover
- Aggregation size must be power of 2 in {1,2,4,8}
- Transcript divergence between implementations silently breaks interop
- Pippenger MSM window size auto-selected: c=3 for ≤32 points, c=4 for 33-128, c=5 for >128
- BP+ variant (not yet ported) gives ~14% smaller proof sizes
