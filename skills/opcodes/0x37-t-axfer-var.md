# Skill: T_AXFER_VAR (0x37) — Variable-Amount Atomic Settlement

## Domain Knowledge

T_AXFER_VAR extends [T_AXFER](./0x26-t-axfer.md) with continuous-amount partial-fill semantics. The taker fills any amount in `[min_fill, max_amount]`. N=2 outputs exactly (recipient + change), with mandatory OP_RETURN(80) for dual-party recovery.

## Key Difference from T_AXFER

- N=2 exactly (recipient + change), never 1, 4, or 8
- `asset_input_count = 1` (single asset input)
- Mandatory OP_RETURN(80) carries encrypted `(amount, blinding)` for both parties
- Maker's change blinding uses `tacit-axintent-change-v1` domain
- On-chain recovery via `tacit-axintent-onchain-(amount|blinding)-v1` keystreams
