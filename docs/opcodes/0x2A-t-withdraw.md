# T_WITHDRAW (0x2A) — Shielded Pool Withdrawal

**Status:** ✅ Shipped (SPEC §5.11)

## Wire Format

```
T_WITHDRAW(1) || asset_id(32) || denomination(8) ||
merkle_root(32) || nullifier_hash(32) ||
recipient_commitment(33) || r_leaf(32) || bind_hash(32) ||
proof_len(2) || proof(Groth16, ~256B)
```

## Implementation Status

Not yet implemented in `@tacit/lib`. Requires Poseidon hash and Groth16 verifier (optional snarkjs dep).
