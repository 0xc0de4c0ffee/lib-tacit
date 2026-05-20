# Skills Directory

AI agent skills for the tacit protocol. Each skill file contains domain knowledge and implementation workflows for a specific opcode or cryptographic primitive.

## Opcode Skills (per-opcode naming)

| Opcode | Skill File | Description |
|--------|-----------|-------------|
| CETCH (0x21) | [0x21-cetch.md](opcodes/0x21-cetch.md) | Asset creation with hidden initial supply |
| T_CXFER_BPP (0x22) | [0x22-cxfer-bpp.md](opcodes/0x22-cxfer-bpp.md) | Confidential transfer with BP+ |
| CXFER (0x23) | [0x23-cxfer.md](opcodes/0x23-cxfer.md) | Confidential transfer with Bulletproofs |
| T_MINT (0x24) | [0x24-t-mint.md](opcodes/0x24-t-mint.md) | Mint additional supply on mintable assets |
| T_BURN (0x25) | [0x25-t-burn.md](opcodes/0x25-t-burn.md) | Destroy part or all of a balance |
| T_AXFER (0x26) | [0x26-t-axfer.md](opcodes/0x26-t-axfer.md) | Trustless single-Bitcoin-tx OTC settlement |
| T_PETCH (0x27) | [0x27-t-petch.md](opcodes/0x27-t-petch.md) | Fair-launch asset deployment |
| T_PMINT (0x28) | [0x28-t-pmint.md](opcodes/0x28-t-pmint.md) | Permissionless mint against T_PETCH |
| T_DEPOSIT (0x29) | [0x29-t-deposit.md](opcodes/0x29-t-deposit.md) | Shielded pool deposits |
| T_WITHDRAW (0x2A) | [0x2a-t-withdraw.md](opcodes/0x2a-t-withdraw.md) | Shielded pool withdrawals (Groth16) |
| T_DROP (0x2B) | [0x2b-t-drop.md](opcodes/0x2b-t-drop.md) | Public-claim airdrop pools |
| T_DCLAIM (0x2C) | [0x2c-t-dclaim.md](opcodes/0x2c-t-dclaim.md) | Permissionless claims |
| T_AXFER_VAR (0x37) | [0x37-t-axfer-var.md](opcodes/0x37-t-axfer-var.md) | Variable-amount atomic settlement |
| T_WRAPPER_ATTEST (0x38) | [0x38-t-wrapper-attest.md](opcodes/0x38-t-wrapper-attest.md) | Wrapper attestation |

## Crypto Skills

| Skill | File | Description |
|-------|------|-------------|
| Pedersen Commitments | [crypto/pedersen-commitments.md](crypto/pedersen-commitments.md) | Amount-hiding commitments |
| Bulletproof Range Proofs | [crypto/bulletproof-range-proofs.md](crypto/bulletproof-range-proofs.md) | Zero-knowledge range proofs |
| Kernel Signatures | [crypto/kernel-signatures.md](crypto/kernel-signatures.md) | Supply conservation proofs |
| Signing Flows | [crypto/signing-flow.md](crypto/signing-flow.md) | Complete signing flow reference |
| Validation layers | [../docs/crypto/validation.md](../docs/crypto/validation.md) | Wire decode vs crypto verify |

## Using Skills

Each skill follows a consistent structure:
- **Domain knowledge**: what it is and why it exists
- **Wire format**: exact byte layout of the envelope payload
- **Implementation workflow**: step-by-step code flow
- **Validation rules**: what the indexer checks
- **Recovery path**: how to recover from privkey + chain data alone
- **Common pitfalls**: what goes wrong in practice
