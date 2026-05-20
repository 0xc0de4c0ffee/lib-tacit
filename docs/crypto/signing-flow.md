# Signing Flows

Every operation in the tacit protocol requires a signature binding the transaction to its cryptographic commitments. The signing mechanism differs by opcode type but follows consistent patterns.

## Kernel Signatures (CXFER, T_AXFER, T_BURN)

Mimblewimble-style kernel signatures prove **conservation of supply** without revealing individual amounts.

### Construction

```
excess = (Σr_out − Σr_in) mod SECP_N
E' = ΣC_out − ΣC_in            (for CXFER)
E' = ΣC_out + burned·H − ΣC_in  (for BURN)
msg = computeKernelMsg(asset_id, input_outpoints, output_commitments, burned_amount)
sig = signSchnorr(msg, excess)
```

### Verification

```
msg = computeKernelMsg(asset_id, input_outpoints, output_commitments, burned_amount)
E' = ΣC_out + burned·H − ΣC_in   (burned = 0 for CXFER)
Verify sig under E'.xonly() with msg
Reject if E'.xonly() == 0 (degenerate kernel)
```

`verifyKernel` in lib-tacit returns `false` on invalid commitments (does not throw). See [validation.md](./validation.md).

### Kernel Message Construction

```
msg = SHA256(
  "tacit-kernel-v1"
  || asset_id(32)
  || input_count(1)
  || for each input: txid_BE(32) || vout_LE(4)
  || output_count(1)
  || for each output: commitment(33)
  || burned_amount_LE(8)
)
```

This binds the sig to:
- **A specific asset** (asset_id prevents cross-asset replay)
- **Specific input outpoints** (prevents same-sig replay against different UTXOs)
- **Specific output commitments** (prevents output-substitution attacks)
- **Burn amount** (CXFER uses burned=0, BURN uses the actual public burned amount)

### Soundness

The kernel sig proves `Σa_out = Σa_in` (CXFER) or `Σa_out + burned = Σa_in` (BURN). If the amounts don't balance, E' has a non-zero H-component:

```
E' = (Σa_out − Σa_in)·H + excess·G
```

A valid Schnorr sig under E'.xonly() requires knowledge of the discrete log of E' wrt G. Since the prover knows `excess` but not `log_G(H)`, they cannot sign unless the H-component is zero — i.e., amounts balance.

## Mint Authorization (T_MINT)

The mint authority (etcher's pubkey) signs a message binding the new supply commitment to a specific commit/reveal pair.

### Construction

```
commit_anchor = commit_tx.vin[0].txid_BE(32) || commit_tx.vin[0].vout_LE(4)
msg = SHA256(
  "tacit-mint-v1"
  || asset_id(32)
  || commit_anchor(36)
  || commitment(33)
  || encrypted_amount(8)
)
sig = signSchnorr(msg, mint_authority_privkey)
```

### Verification

```
msg = computeMintMsg(asset_id, commit_anchor, commitment, ct)
Verify sig under mint_authority.xonly() with msg
```

The `commit_anchor` binding prevents envelope-replay into a different commit/reveal pair.

## Taproot Commit/Reveal (CETCH, T_PETCH, T_PMINT, T_DROP, T_DCLAIM)

All opcodes use the same two-transaction commit/reveal pattern:

1. **Commit tx**: Funds are sent to a P2TR output tweaked to the envelope script
2. **Reveal tx**: Spends the P2TR via script-path, exposing the envelope in the witness

The spending signature is a standard BIP-340 Schnorr under the key-path (tweaked key), signed as part of the Bitcoin transaction's input witness.

## Blinding Derivation Flows

### Recipient Blinding (CXFER)

```
shared_secret = ECDH(sender_priv, recipient_pub)
seed = SHA256(shared_secret.x)
r_recipient = HMAC-SHA256(seed, "tacit-blind-v1" || anchor(36) || vout_LE(4)) % SECP_N
```

The same derivation is symmetric — recipient can compute it using `ECDH(recipient_priv, sender_pub)`.

### Change Blinding (CXFER, BURN)

```
r_change = HMAC-SHA256(my_priv, "tacit-change-v1" || anchor(36) || vout_LE(4)) % SECP_N
```

### Etch Supply Blinding (CETCH)

```
r_supply = HMAC-SHA256(etcher_priv, "tacit-etch-v1" || anchor(36)) % SECP_N
```

### Amount Encryption (All opcodes)

```
keystream = HMAC-SHA256(key, domain || anchor(36) || vout_LE(4)).slice(0, 8)
amount_ct = amount XOR keystream    (8-byte XOR-OTP)
```

Key source depends on context:
- **Recipient**: SHA256(ECDH.x) from sender/recipient key exchange
- **Change**: wallet privkey directly
- **Etch supply**: wallet privkey directly

## Domain Separation

Every HMAC, BIP-340 message, and BP transcript uses a unique v1 domain tag. This makes cross-context replays cryptographically impossible:

- `tacit-blind-v1` — recipient blinding scalar
- `tacit-change-v1` — change blinding scalar
- `tacit-etch-v1` — etch supply blinding
- `tacit-mint-blind-v1` — mint blinding
- `tacit-amount-v1` — recipient amount keystream
- `tacit-amount-self-v1` — change amount keystream
- `tacit-etch-amount-v1` — etch amount keystream
- `tacit-mint-amount-v1` — mint amount keystream
- `tacit-kernel-v1` — kernel message hash
- `tacit-mint-v1` — mint authorization message
- `tacit-bp-v1` — bulletproof Fiat-Shamir transcript
- `tacit-deposit-v1` — T_DEPOSIT kernel message
- `tacit-pool-init-v1` — POOL_INIT signature message
- `tacit-drop-v1` — T_DROP kernel message
- `tacit-drop-reclaim-v1` — T_DROP reclaim message
- `tacit-disclosure-v1` — range disclosure message
- `tacit-wrapper-attest-v1` — wrapper attestation message
- `tacit-withdraw-bind-v1` — T_WITHDRAW bind_hash (SHA256 domain)
- `tacit-axintent-{v1,claim-v2,fulfilment-v1,cancel-v1}` — atomic intent messaging
- `tacit-axintent-blinding-v1` — AXINTENT fulfilment encryption keystream
