# Skill: T_CXFER_BPP (0x22) — Confidential Transfer with Bulletproofs+

## Domain Knowledge

T_CXFER_BPP is byte-identical to [CXFER (0x23)](./0x23-cxfer.md) except the rangeproof uses Bulletproofs+ instead of Bulletproofs. ~14% smaller witnesses across `m ∈ {1,2,4,8}`.

## Key Properties

- Same kernel sig (`tacit-kernel-v1`), same Pedersen commitments
- Same ECDH amount recovery
- Same aggregation caps N ∈ {1,2,4,8}
- Mixed-ancestry walks dispatch to correct verifier per opcode byte
- BP+ generators reuse `tacit-generator-H-v1` / `tacit-bp-{G,H,Q}-v1` from §3.1
- Not yet implemented in @tacit/lib. Reference: `tacit-specs/dapp/bulletproofs-plus.js`
