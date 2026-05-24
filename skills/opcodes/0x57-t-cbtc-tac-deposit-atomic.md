# Skill: T_CBTC_TAC_DEPOSIT_ATOMIC — Atomic LP_ADD + cBTC.tac Deposit

## Domain Knowledge

T_CBTC_TAC_DEPOSIT_ATOMIC (0x57) atomically combines an LP_ADD operation with a cBTC.tac deposit in a single envelope. The depositor provides a cBTC.zk input and a TAC input, receives LP-share tokens, and mints cBTC.tac in one atomic operation.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
slot_denom_sats(8) || pool_id(32) ||
delta_cbtc_zk(8) || delta_tac(8) || share_amount(8) ||
cbtc_zk_input_outpoint(36) || cbtc_zk_input_commit(33) ||
tac_input_outpoint(36) || tac_input_commit(33) ||
lp_share_commit(33) || depositor_recovery_commit(33) ||
mint_amount(8) || mint_recipient_commit(33) || bind_hash(32) ||
proof_len(2) || proof
```

## Key Constraints

- `mint_amount` must equal `slot_denom_sats`
- All 33-byte commits must be valid secp256k1 points
- `pool_id` is 32 bytes

## Implementation

```typescript
const payload = encodeCBtcTacDepositAtomic({
  networkTag, targetLeafHash, slotDenomSats, poolId,
  deltaCbtcZk, deltaTac, shareAmount,
  cbtcZkInputOutpoint, cbtcZkInputCommit,
  tacInputOutpoint, tacInputCommit,
  lpShareCommit, depositorRecoveryCommit,
  mintAmount, mintRecipientCommit, bindHash, proof,
});
const decoded = decodeCBtcTacDepositAtomic(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.48.
