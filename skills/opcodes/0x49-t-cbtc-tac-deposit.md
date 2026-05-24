# Skill: T_CBTC_TAC_DEPOSIT — cBTC.tac LP-Share Lien Mint

## Domain Knowledge

T_CBTC_TAC_DEPOSIT (0x49) locks a cBTC.zk slot and LP-share lien into a cBTC.tac position. The depositor provides a bond (TAC) that creates a mint of cBTC.tac at 1:1 with the slot denomination. This is the entry point for the cBTC.tac protocol.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
slot_denom_sats(8) || bond_amount_TAC(8) || bond_source_outpoint(36) ||
bond_commit(33) || depositor_recovery_commit(33) ||
mint_amount(8) || mint_recipient_commit(33) || bind_hash(32) ||
proof_len(2) || proof
```

## Key Constraints

- `mint_amount` must equal `slot_denom_sats`
- `network_tag` ∈ {0, 1, 2}
- All 33-byte fields must be valid compressed secp256k1 points
- `bond_source_outpoint` = txid_BE(32) || vout_LE(4)

## Implementation

```typescript
const payload = encodeCBtcTacDeposit({
  networkTag, targetLeafHash, slotDenomSats, bondAmountTAC,
  bondSourceOutpoint, bondCommit, depositorRecoveryCommit,
  mintAmount, mintRecipientCommit, bindHash, proof,
});
const decoded = decodeCBtcTacDeposit(payload);
// decoded.kind === 'cbtc-tac-deposit'
```

See SPEC-CBTC-TAC-AMENDMENT §5.36.
