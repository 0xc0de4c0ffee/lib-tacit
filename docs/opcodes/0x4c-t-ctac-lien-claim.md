# T_CTAC_LIEN_CLAIM (0x4C) — cTAC Lien Claim

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.39)

## Wire Format

```
opcode(1) || network_tag(1) || share_count(1) ||
share_nullifiers(share_count × 32) || share_commits(share_count × 33) ||
share_burn_amount(8) || share_balance_proof_len(2) || share_balance_proof ||
claim_TAC(8) || recipient_commit(33) || bind_hash(32) ||
proof_len(2) || proof
```

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `share_count` ∈ {1..16}
- `share_burn_amount` > 0; `claim_TAC` > 0
- All 33-byte commitment fields must encode valid secp256k1 points
- `share_balance_proof` and `proof` lengths 1..65535
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.39
