# Skill: T_CBTC_TAC_FORCE_CLOSE — Permissionless Lien Transfer

## Domain Knowledge

T_CBTC_TAC_FORCE_CLOSE (0x4B) allows a liquidator to force-transfer a cBTC.tac lien when the LP position is underwater (value < 1.2× slot). The liquidator pays out the BTC equivalent via AMM, receiving the cBTC.zk slot and its bonded TAC.

## Wire Format

```
opcode(1) || network_tag(1) || target_leaf_hash(32) ||
liquidator_payout_pk(33) || amm_swap_min_BTC_out(8) || bind_hash(32)
```

Fixed 107 bytes.

## Key Constraints

- `liquidator_payout_pk` must be valid secp256k1 point
- `amm_swap_min_BTC_out` ≥ 0

## Implementation

```typescript
const payload = encodeCBtcTacForceClose({
  networkTag, targetLeafHash, liquidatorPayoutPk,
  ammSwapMinBtcOut, bindHash,
});
const decoded = decodeCBtcTacForceClose(payload);
```

See SPEC-CBTC-TAC-AMENDMENT §5.38.
