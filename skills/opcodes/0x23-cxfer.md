# Skill: CXFER — Confidential Transfer

## Domain Knowledge

CXFER (0x23) transfers confidential value between parties. The envelope carries an aggregated bulletproof covering all N outputs, plus a kernel signature proving conservation of supply. Amounts are hidden behind Pedersen commitments; each output's amount is XOR-encrypted under an ECDH-derived keystream so only the intended recipient can decrypt it.

## Wire Format

```
  CXFER(1)        — 0x23
  asset_id(32)    — SHA256(reveal_txid || 0)
  kernel_sig(64)  — BIP-340 Schnorr
  N(1)            — output count ∈ {1,2,4,8}
  (C_i(33) || amount_ct_i(8))*N  — output commitments + encrypted amounts
  rp_len(2)       — rangeproof byte length (LE u16)
  rangeproof      — aggregated bulletproof
```

## Implementation Workflow

1. **Select asset input UTXOs** — must be of the correct `asset_id`
2. **Compute anchor**: `anchor = first_asset_input.txid_BE || first_asset_input.vout_LE`
3. **For each recipient output**:
   - Derive blinding: `r = deriveBlinding(sender.priv, recipient.pub, anchor, vout)`
   - Derive keystream: `ks = deriveAmountKeystreamECDH(sender.priv, recipient.pub, anchor, vout)`
   - Encrypt amount: `ct = encryptAmount(amount, ks)`
4. **For change output**:
   - Derive blinding: `r_change = deriveChangeBlinding(sender.priv, anchor, vout)`
   - Derive keystream: `ks_change = deriveAmountKeystreamSelf(sender.priv, anchor, vout)`
   - Encrypt amount: `ct_change = encryptAmount(change_amount, ks_change)`
5. **Pad to nearest power of 2** (N ∈ {1,2,4,8}) with zero-amount outputs
6. **Generate aggregated bulletproof**: `bpRangeAggProve(values, blindings)`
7. **Compute kernel excess**: `excess = Σr_out − Σr_in mod N`
8. **Compute kernel message**: `computeKernelMsg(asset_id, input_outpoints, output_commitments, 0)`
9. **Sign kernel sig**: `signSchnorr(computeKernelMsg, bigintToBytes32(excess))`
10. **Build CXFER payload**: `encodeCXfer(...)`
11. **Wrap in envelope, construct commit/reveal txs, broadcast**

## Validation Rules

- N must be in {1, 2, 4, 8}
- All N outputs must have valid commitments (33 bytes each)
- Aggregated bulletproof must verify
- Kernel sig must verify under `E'.xonly()` where `E' = ΣC_out − ΣC_in`
- `E'` must not be zero (degenerate kernel — all amounts AND blindings balance = no proof)
- `asset_id` must match across all asset inputs

## Recovery Path

**Recipient** recovers amount from chain + privkey alone:
1. Find the sender's pubkey at `reveal_tx.vin[1].witness[1]`
2. Compute `ks = deriveAmountKeystreamECDH(my_priv, sender_pub, anchor, vout)`
3. Decrypt `candidate = decryptAmount(ct, ks)`
4. Compute `r = deriveBlinding(my_priv, sender_pub, anchor, vout)`
5. Verify `pedersenCommit(candidate, r) == on_chain_commitment`
6. If mismatched, move to next vout (trial-decrypt)

**Sender** recovers change:
1. Compute `ks = deriveAmountKeystreamSelf(my_priv, anchor, vout)`
2. Decrypt and verify as above

## Common Pitfalls

- Inputs and outputs must sum to the same total (supply conservation)
- Anchor must be unique per CXFER (Bitcoin prevents double-spends)
- ECDH derivation requires sender's pubkey in the witness — it's there at `vin[1].witness[1]`
- Padding outputs (N=4 with only 2 real outputs) have amount=0 and use self-derived blindings
