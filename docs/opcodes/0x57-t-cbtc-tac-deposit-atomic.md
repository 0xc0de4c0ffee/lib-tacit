# T_CBTC_TAC_DEPOSIT_ATOMIC (0x57) — cBTC.tac Deposit Atomic

**Status:** ✅ Shipped (SPEC-CBTC-TAC-AMENDMENT §5.48)

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

## Constraints

- `network_tag` ∈ {0, 1, 2}
- `mint_amount` must equal `slot_denom_sats`
- All 33-byte commitment fields must encode valid secp256k1 points
- Outpoints are 36 bytes (txid_BE(32) || vout_LE(4))
- `proof` length 1..65535
- Reference: SPEC-CBTC-TAC-AMENDMENT §5.48
