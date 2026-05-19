# Skill: T_WITHDRAW (0x2A) — Shielded Pool Withdrawal

## Domain Knowledge

T_WITHDRAW anonymously withdraws a fixed denomination from a shielded mixer pool. Uses a Groth16 proof of unspent-leaf membership in the pool's Poseidon merkle tree to break the on-chain link between deposit and withdrawal.

## Wire Format

```
T_WITHDRAW(1) || asset_id(32) || denomination(8) ||
merkle_root(32) || nullifier_hash(32) ||
recipient_commitment(33) || r_leaf(32) || bind_hash(32) ||
proof_len(2) || proof(Groth16, ~256B)
```

## Validation (All Must Pass)

1. Pool registered for `(asset_id, denomination)`
2. `merkle_root` ∈ pool's last 32 canonical roots
3. `nullifier_hash` NOT already spent
4. `bind_hash` recomputes: `SHA256("tacit-withdraw-bind-v1" || asset_id || denom_LE || nullifier_hash || recipient_commit || r_leaf)`
5. Groth16 proof verifies under pool's vk
6. `denom·H + r_leaf·G == recipient_commitment` (closes inflation attack)

## TypeScript Implementation

```typescript
import { encodeWithdraw, decodeWithdraw } from 'lib-tacit';
const payload = encodeWithdraw({
  assetId, denomination: 1000n,
  merkleRoot, nullifierHash,
  recipientCommitment, rLeaf, bindHash, proof,
});
const dec = decodeWithdraw(payload);
// dec.kind === 'withdraw'
```
