# Skill: T_CBTC_TAC_WITHDRAW — cBTC.tac Cooperative Unwind

## Domain Knowledge

T_CBTC_TAC_WITHDRAW (0x4A) cooperatively unwinds a cBTC.tac position. Burn nullifiers reference the cBTC.tac UTXOs being destroyed, releasing the lien and spending the cBTC.zk slot. An insurance claim may mint additional TAC if the bond exceeds the slot value.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
burn_count(1) || burn_nullifiers(N × 32) || burn_commits(N × 33) ||
burn_amount(8) || burn_balance_proof_len(2) || burn_balance_proof ||
insurance_claim_TAC(8) || bond_return_commit(33) ||
bind_hash(32) || proof_len(2) || proof
```

## Key Constraints

- `burn_count` ∈ {1..16}
- `insurance_claim_TAC` ≥ 0
- All 33-byte commits must be valid secp256k1 points

## Implementation

```typescript
const payload = encodeCBtcTacWithdraw({
  networkTag, targetLeafHash, burnNullifiers, burnCommits,
  burnAmount, insuranceClaimTAC, burnBalanceProof,
  bondReturnCommit, bindHash, proof,
});
const decoded = decodeCBtcTacWithdraw(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.37.
