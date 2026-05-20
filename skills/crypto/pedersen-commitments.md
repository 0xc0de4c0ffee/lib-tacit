# Skill: Pedersen Commitments

## Domain Knowledge

Pedersen commitments are the fundamental privacy primitive in the tacit protocol. A commitment `C = a·H + r·G` hides the amount `a` behind a random blinding scalar `r`. The commitment is:
- **Perfectly hiding**: for any possible amount `a'`, there exists an `r'` that opens `C` to `a'`
- **Computationally binding**: finding two different openings `(a, r)` and `(a', r')` for the same `C` requires computing `log_G(H)`, which is infeasible if H is a NUMS generator

## Key Concepts

- **G**: standard secp256k1 base point — the *blinding generator*
- **H**: NUMS generator derived via `SHA256("tacit-generator-H-v1")` — the *value generator*
- **Homomorphic**: `C(a₁, r₁) + C(a₂, r₂) = C(a₁+a₂, r₁+r₂)`
- **Amount encryption**: `amount_ct = amount XOR HMAC(key, domain || anchor || vout)[0..8]`

## Implementation

```typescript
import { pedersenCommit, pedersenVerify, G, H, pointToBytes, bytesToPoint } from 'lib-tacit';

// Commit to an amount
const amount = 1000n;
const blinding = randomScalar();
const C = pedersenCommit(amount, blinding);

// Verify an opening
const valid = pedersenVerify(C, amount, blinding); // true

// Serialization
const compressed = pointToBytes(C);  // 33 bytes
const restored = bytesToPoint(compressed);

// Homomorphic addition
const C1 = pedersenCommit(100n, r1);
const C2 = pedersenCommit(200n, r2);
const Csum = pedersenCommit(300n, modN(r1 + r2));
C1.add(C2).equals(Csum); // true
```

## NUMS Generator Derivation

H is derived by try-and-increment with domain tag `"tacit-generator-H-v1"`:
```
seed = SHA256("tacit-generator-H-v1")
for counter in 0..255:
    x = SHA256(seed || counter_LE)
    candidate = 0x02 || x
    if parse_point(candidate) succeeds and != ZERO: return it
```

The canonical H is pinned at:
```
02bd7bf40fb5db2f7e0a1e8660ca13df55bb0d9f904e36e6297361f00376865e56
```

## Security Properties

1. **Hiding**: `C` is uniformly distributed regardless of `a` (perfect/IT hiding)
2. **Binding**: Breaking binding = computing `log_G(H)` (computational, under DLog)
3. **Domain separation**: Each blinding derivation uses a unique HMAC domain tag
4. **Anchor binding**: Each commitment's blinding is bound to `(anchor, vout)`, preventing cross-tx correlation via `C₁ − C₂ = (a₁−a₂)·H`

## Common Pitfalls

- Using the wrong H (e.g., from a different domain tag) silently breaks all proof verification
- The Pedersen commitment alone proves nothing about range — must be paired with a bulletproof
- Zero-knowledge property depends on the blinding being uniformly random — deterministic derivations from HMAC are secure
- `C(a, 0) = a·H` — without a blinding factor, this reveals nothing about `a` (the point is still uniform) but loses the binding property if the receiver knows `log_G(H)`
