# Skills Directory

AI agent skills for the tacit protocol. Each skill file contains domain knowledge and implementation workflows for a specific opcode or cryptographic primitive.

## Opcode Skills

| Opcode | Skill File | Status | Description |
|--------|-----------|--------|-------------|
| CETCH (0x21) | [0x21-cetch.md](opcodes/0x21-cetch.md) | ✅ Shipped | Asset creation with hidden initial supply |
| T_CXFER_BPP (0x22) | [0x22-cxfer-bpp.md](opcodes/0x22-cxfer-bpp.md) | ✅ Shipped | Confidential transfer with BP+ |
| CXFER (0x23) | [0x23-cxfer.md](opcodes/0x23-cxfer.md) | ✅ Shipped | Confidential transfer (classic BP) |
| T_MINT (0x24) | [0x24-t-mint.md](opcodes/0x24-t-mint.md) | ✅ Shipped | Mint additional supply |
| T_BURN (0x25) | [0x25-t-burn.md](opcodes/0x25-t-burn.md) | ✅ Shipped | Destroy supply |
| T_AXFER (0x26) | [0x26-t-axfer.md](opcodes/0x26-t-axfer.md) | ✅ Shipped | Atomic OTC settlement |
| T_PETCH (0x27) | [0x27-t-petch.md](opcodes/0x27-t-petch.md) | ✅ Shipped | Fair-launch deployment |
| T_PMINT (0x28) | [0x28-t-pmint.md](opcodes/0x28-t-pmint.md) | ✅ Shipped | Permissionless mint |
| T_DEPOSIT (0x29) | [0x29-t-deposit.md](opcodes/0x29-t-deposit.md) | ✅ Shipped | Shielded pool deposit |
| T_WITHDRAW (0x2A) | [0x2a-t-withdraw.md](opcodes/0x2a-t-withdraw.md) | ✅ Shipped | Shielded pool withdrawal |
| T_DROP (0x2B) | [0x2b-t-drop.md](opcodes/0x2b-t-drop.md) | ✅ Shipped | Public-claim pool |
| T_DCLAIM (0x2C) | [0x2c-t-dclaim.md](opcodes/0x2c-t-dclaim.md) | ✅ Shipped | Permissionless claim |
| T_LP_ADD (0x2D) | [0x2d-t-lp-add.md](opcodes/0x2d-t-lp-add.md) | 📝 Drafted | Add AMM liquidity |
| T_LP_REMOVE (0x2E) | [0x2e-t-lp-remove.md](opcodes/0x2e-t-lp-remove.md) | 📝 Drafted | Remove AMM liquidity |
| T_SWAP_BATCH (0x2F) | [0x2f-t-swap-batch.md](opcodes/0x2f-t-swap-batch.md) | 📝 Drafted | Batch swap settlement |
| T_INTENT_ATTEST (0x30) | [0x30-t-intent-attest.md](opcodes/0x30-t-intent-attest.md) | 📝 Drafted | Preconfirmation attestation |
| T_PROTOCOL_FEE_CLAIM (0x31) | [0x31-t-protocol-fee-claim.md](opcodes/0x31-t-protocol-fee-claim.md) | 📝 Drafted | Protocol fee claim |
| T_SWAP_VAR (0x32) | [0x32-t-swap-var.md](opcodes/0x32-t-swap-var.md) | 📝 Drafted | Variable-amount AMM swap |
| T_AXFER_VAR (0x37) | [0x37-t-axfer-var.md](opcodes/0x37-t-axfer-var.md) | ✅ Shipped | Variable-amount atomic settlement |
| T_WRAPPER_ATTEST (0x38) | [0x38-t-wrapper-attest.md](opcodes/0x38-t-wrapper-attest.md) | ✅ Shipped | Wrapper attestation |
| T_AXFER_BPP (0x3C) | [0x3c-t-axfer-bpp.md](opcodes/0x3c-t-axfer-bpp.md) | 📝 Drafted | BP+ atomic settlement |
| T_AXFER_VAR_BPP (0x3D) | [0x3d-t-axfer-var-bpp.md](opcodes/0x3d-t-axfer-var-bpp.md) | 📝 Drafted | BP+ variable-amount settlement |
| T_PREAUTH_BID (0x5B) | [0x5b-t-preauth-bid.md](opcodes/0x5b-t-preauth-bid.md) | ✅ Shipped | Buyer-offline preauth bid |
| T_PREAUTH_BID_VAR (0x5C) | [0x5c-t-preauth-bid-var.md](opcodes/0x5c-t-preauth-bid-var.md) | ✅ Shipped | Variable-amount preauth bid |

## Crypto Skills

| Skill | File | Description |
|-------|------|-------------|
| Pedersen Commitments | [crypto/pedersen-commitments.md](crypto/pedersen-commitments.md) | Amount-hiding commitments |
| Bulletproof Range Proofs | [crypto/bulletproof-range-proofs.md](crypto/bulletproof-range-proofs.md) | Zero-knowledge range proofs |
| Kernel Signatures | [crypto/kernel-signatures.md](crypto/kernel-signatures.md) | Supply conservation proofs |
| Signing Flows | [crypto/signing-flow.md](crypto/signing-flow.md) | Complete signing flow reference |
| Blinded-Pubkey Stealth | [crypto/blinded-pubkey-stealth.md](crypto/blinded-pubkey-stealth.md) | Class-2 stealth recipient markers (CXFER/AXFER) |
| ECDH Blinding | [crypto/ecdh-blinding.md](crypto/ecdh-blinding.md) | Amount key derivation and encryption |
| MSM (Pippenger) | [crypto/msm.md](crypto/msm.md) | Multi-scalar multiplication |
| BIP-352 Silent Payments | [crypto/silent-payments.md](crypto/silent-payments.md) | BIP-352 sender-side sats sending |
| Poseidon Hash | [crypto/poseidon.md](crypto/poseidon.md) | BN254-friendly hash for mixer |
| Groth16 Verifier | [crypto/groth16.md](crypto/groth16.md) | Optional snarkjs-based zk verification |
| Validation layers | [../docs/crypto/validation.md](../docs/crypto/validation.md) | Wire decode vs crypto verify |

## Using Skills

Each skill follows a consistent structure:
- **Domain knowledge**: what it is and why it exists
- **Wire format**: exact byte layout of the envelope payload
- **Implementation workflow**: step-by-step code flow
- **Validation rules**: what the indexer checks
- **Recovery path**: how to recover from privkey + chain data alone
- **Common pitfalls**: what goes wrong in practice
