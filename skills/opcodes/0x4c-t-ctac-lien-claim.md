# Skill: T_CTAC_LIEN_CLAIM — Burn cBTC.tac for Pro-Rata LP-Share

## Domain Knowledge

T_CTAC_LIEN_CLAIM (0x4C) lets anyone burn cBTC.tac to mint pro-rata LP-share tokens from a claim pool. This is the exit path for depositors who want to convert their cBTC.tac back into LP-share exposure.

## Wire Format

```
opcode(1) || network_tag(1) || share_count(1) ||
share_nullifiers(N × 32) || share_commits(N × 33) ||
share_burn_amount(8) || share_balance_proof_len(2) || share_balance_proof ||
claim_TAC(8) || recipient_commit(33) || bind_hash(32) ||
proof_len(2) || proof
```

## Key Constraints

- `share_count` ∈ {1..16}
- `share_burn_amount` > 0; `claim_TAC` > 0
- All 33-byte commits must be valid secp256k1 points

## Implementation

```typescript
const payload = encodeCTacLienClaim({
  networkTag, shareNullifiers, shareCommits, shareBurnAmount,
  shareBalanceProof, claimTAC, recipientCommit, bindHash, proof,
});
const decoded = decodeCTacLienClaim(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.39.
