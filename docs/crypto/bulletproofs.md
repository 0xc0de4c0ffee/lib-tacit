# Bulletproofs Aggregated Range Proofs

Bulletproofs (Bünz et al. 2017, §3 IPA + §4.3) are zero-knowledge range proofs used in the tacit protocol to prove that Pedersen-committed amounts lie in `[0, 2^64)`. The implementation supports **aggregation** — one proof simultaneously covers m ∈ {1,2,4,8} outputs.

## Protocol Parameters

| Parameter | Value | SPEC Reference |
|-----------|-------|----------------|
| Bit-length `n` | 64 | §3.3 |
| Aggregation `m` | {1, 2, 4, 8} | §3.3 |
| Proof size (m=1) | 688 B | `4×33 + 3×32 + 6×66 + 64` |
| Proof size (m=2) | 754 B | `4×33 + 3×32 + 7×66 + 64` |
| Generator domain G | `tacit-bp-G-v1` | §3.1 |
| Generator domain H | `tacit-bp-H-v1` | §3.1 |
| Generator domain Q | `tacit-bp-Q-v1` | §3.1 |
| Transcript domain | `tacit-bp-v1` | §3.3 |

## Fiat-Shamir Transcript

All challenges are deterministically derived using a length-prefixed (4-byte LE u32) transcript:

```
append("domain", "tacit-bp-v1")
append("n", [64])
append("m", [m])
append("V", V_j)   // each commitment
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
for k in 0..log(nm):
    append("L", L_k)
    append("R", R_k)
    u_k = challenge("u")
```

## Optimizations

- **Pippenger MSM**: signed-digit windowed (c=3 for ≤32 pts, c=4 for ≤128, c=5 for >128)
- **Verifier collapse**: reduce log(nm) IPA rounds to a single multi-scalar multiplication
- **Batch verification**: combine N proofs via random α, β per proof — failure prob ≤ 2⁻²⁵⁵

## Implementation

```typescript
import { bpRangeAggProve, bpRangeAggVerify, bpRangeAggBatchVerify } from 'lib-tacit';

// Single proof
const { proof, commitments } = bpRangeAggProve([1000n, 500n], [r1, r2]);
bpRangeAggVerify(commitments, proof); // true

// Batch verify
bpRangeAggBatchVerify([
  { commitments, proof },
  { commitments: otherCommits, proof: otherProof },
]);
```
