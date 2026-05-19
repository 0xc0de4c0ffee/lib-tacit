# Skill: Signing Flows

## Complete Signing Flow Reference

This document provides the end-to-end signing flows for every opcode type in the tacit protocol. It assumes familiarity with the [kernel signatures](kernel-signatures.md) and [Pedersen commitments](pedersen-commitments.md) skills.

---

## 1. CETCH — Asset Creation

```
WALLET SETUP:
  etcher = generateKeypair()
  fund wallet with sats

ETCH:
  // 1. Pick commit input (pre-existing UTXO)
  anchor = commit_tx.vin[0].txid_BE || commit_tx.vin[0].vout_LE

  // 2. Derive blinding and keystream
  r = HMAC(etcher.priv, "tacit-etch-v1"          || anchor) % N
  ks = HMAC(etcher.priv, "tacit-etch-amount-v1"  || anchor)[0..8]

  // 3. Commit to supply
  C = supply·H + r·G
  ct = supply XOR ks

  // 4. Prove range
  { proof, commitments } = bpRangeAggProve([supply], [r])

  // 5. Build envelope
  payload = encodeCEtch({ ticker, decimals, C, ct, proof, mint_authority })
  script = encodeEnvelopeScript(etcher.xonly, payload)

  // 6. Broadcast
  commit_tx → taproot_output(script)
  reveal_tx → spend script-path, expose witness → asset_id = SHA256(reveal_txid_BE || 0_LE)
```

## 2. CXFER — Confidential Transfer

```
  // 1. Select asset inputs
  input_outpoints = [utxo1, utxo2, ...]
  input_commitments = [C1, C2, ...]
  input_blindings = [r1, r2, ...]
  input_amounts = [a1, a2, ...]

  // 2. Define outputs
  recipient_amount = 700
  change_amount = total_input - 700
  anchor = first_input_txid_BE || first_input_vout_LE

  // 3. Derive per-output blindings
  r_recip = HMAC(SHA256(ECDH(sender, recip).x), "tacit-blind-v1"        || anchor || vout(0)) % N
  r_change = HMAC(sender.priv,                 "tacit-change-v1"       || anchor || vout(1)) % N

  // 4. Derive per-output keystreams
  ks_recip = HMAC(SHA256(ECDH(sender, recip).x), "tacit-amount-v1"      || anchor || vout(0))[0..8]
  ks_change = HMAC(sender.priv,                  "tacit-amount-self-v1" || anchor || vout(1))[0..8]

  // 5. Commit + encrypt
  C_recip = recipient_amount·H + r_recip·G
  C_change = change_amount·H + r_change·G
  ct_recip = recipient_amount XOR ks_recip
  ct_change = change_amount XOR ks_change

  // 6. Prove range
  { proof } = bpRangeAggProve([recipient_amount, change_amount], [r_recip, r_change])

  // 7. Kernel sig
  excess = (r_recip + r_change - Σr_in) % N
  msg = computeKernelMsg(asset_id, input_outpoints, [C_recip, C_change])
  sig = signSchnorr(msg, bytes32(excess))

  // 8. Encode + broadcast
  payload = encodeCXfer({ asset_id, kernel_sig, outputs: [{C_recip, ct_recip}, {C_change, ct_change}], proof })
```

## 3. T_MINT — Mintable Supply

```
  // 1. Anchor from commit tx's first input
  commit_anchor = commit_tx.vin[0].txid_BE || commit_tx.vin[0].vout_LE

  // 2. Derive mint blinding/keystream
  r = HMAC(issuer.priv, "tacit-mint-blind-v1"  || commit_anchor) % N
  ks = HMAC(issuer.priv, "tacit-mint-amount-v1" || commit_anchor)[0..8]

  // 3. Commit + encrypt
  C = mintAmount·H + r·G
  ct = mintAmount XOR ks

  // 4. Prove range
  { proof } = bpRangeAggProve([mintAmount], [r])

  // 5. Mint authorization sig
  msg = computeMintMsg(asset_id, commit_anchor, C, ct)
  sig = signSchnorr(msg, issuer.priv)

  // 6. Encode + broadcast
  payload = encodeCMint({ asset_id, etch_txid, C, ct, proof, sig })
```

## 4. T_BURN — Destroy Supply

```
  // Same as CXFER but with burned_amount > 0
  // Kernel msg includes burned_amount as 8-byte LE suffix

  msg = computeKernelMsg(asset_id, input_outpoints, output_commitments, burned_amount)
  // E' = ΣC_out + burned·H - ΣC_in
  sig = signSchnorr(msg, bytes32(excess))
```

## Recovery Flow (Recipient)

```
  // 1. Scan chain for outputs paying my pubkey
  // 2. For each output:
  anchor = first_asset_input_txid_BE || first_asset_input_vout_LE
  sender_pub = reveal_tx.vin[1].witness[1]  // 33-byte compressed

  // 3. Trial-decrypt
  for vout in 0..N-1:
    ks = HMAC(SHA256(ECDH(my_priv, sender_pub).x), "tacit-amount-v1" || anchor || vout)[0..8]
    candidate = ct XOR ks
    r = HMAC(SHA256(ECDH(my_priv, sender_pub).x), "tacit-blind-v1" || anchor || vout) % N
    if pedersenCommit(candidate, r) == on_chain_commitment:
      return (vout, candidate)  // found my output

  // 4. For change (if I'm the sender):
  for vout in 0..N-1:
    ks = HMAC(my_priv, "tacit-amount-self-v1" || anchor || vout)[0..8]
    candidate = ct XOR ks
    r = HMAC(my_priv, "tacit-change-v1" || anchor || vout) % N
    if pedersenCommit(candidate, r) == on_chain_commitment:
      return (vout, candidate)  // found my change
```

## Domain Tag Reference

All domain tags are defined in `src/constants/domains.ts`. Each is a unique v1 tag string:

| Tag | Purpose | HMAC Key Source |
|-----|---------|----------------|
| `tacit-blind-v1` | Recipient blinding | SHA256(ECDH.x) |
| `tacit-change-v1` | Change blinding | wallet privkey |
| `tacit-etch-v1` | Etch supply blinding | wallet privkey |
| `tacit-mint-blind-v1` | Mint blinding | wallet privkey |
| `tacit-amount-v1` | Recipient amount keystream | SHA256(ECDH.x) |
| `tacit-amount-self-v1` | Change amount keystream | wallet privkey |
| `tacit-etch-amount-v1` | Etch amount keystream | wallet privkey |
| `tacit-mint-amount-v1` | Mint amount keystream | wallet privkey |
| `tacit-kernel-v1` | Kernel sig message | n/a |
| `tacit-mint-v1` | Mint auth message | n/a |
| `tacit-bp-v1` | Bulletproof transcript | n/a |
