# Skill: T_DCLAIM (0x2C) — Permissionless Claim Event

## Domain Knowledge

T_DCLAIM claims a fixed `per_claim` tranche from a public-claim pool (the parent [T_DROP](./0x2b-t-drop.md)). Anyone may broadcast, subject to the optional merkle eligibility gate.

## Wire Format

```
T_DCLAIM(1) || asset_id(32) || drop_reveal_txid(32) ||
commitment(33) || amount_LE(8) || blinding(32) ||
witness_len_LE(2) || witness(witness_len)
```

## Key Properties

- `amount == T_DROP.per_claim` (validator enforces)
- If `merkle_root` is non-zero, witness must prove merkle inclusion
- `(amount, blinding)` are public — recovery is trivial
- Supply-preserving: tokens shift from depositor → pool → claimant

## Merkle Witness Format

```
recipient_pub(33) || leaf_index_LE(4) || eth_address(20) || eth_sig(65) || proof_len(1) || proof_path(proof_len*32)
```
