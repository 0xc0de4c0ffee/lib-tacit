# Skill: T_CBTC_TAC_WITHDRAW_ATOMIC — Atomic cBTC.tac Withdraw + LP_REMOVE

## Domain Knowledge

T_CBTC_TAC_WITHDRAW_ATOMIC (0x58) atomically combines a cBTC.tac withdraw with an LP_REMOVE in a single envelope. It burns cBTC.tac nullifiers and receives cBTC.zk and TAC outputs while removing LP-share exposure.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
slot_denom_sats(8) || burn_count(1) ||
burn_nullifiers(N × 32) || burn_commits(N × 33) ||
burn_amount(8) || lp_share_amount(8) ||
recv_cbtc_zk_commit(33) || recv_tac_commit(33) ||
bind_hash(32) || proof_len(2) || proof
```

## Key Constraints

- `burn_count` ∈ {1..16}
- `burn_amount` must equal `slot_denom_sats`
- All 33-byte commits must be valid secp256k1 points

## Implementation

```typescript
const payload = encodeCBtcTacWithdrawAtomic({
  networkTag, targetLeafHash, slotDenomSats,
  burnNullifiers, burnCommits, burnAmount, lpShareAmount,
  recvCbtcZkCommit, recvTacCommit, bindHash, proof,
});
const decoded = decodeCBtcTacWithdrawAtomic(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.49.
