# Skill: CETCH — Asset Creation (Etch)

## Domain Knowledge

CETCH (0x21) creates a new confidential asset on the tacit protocol. It produces a **single supply UTXO** — a Pedersen commitment hiding the initial supply — and optionally marks the asset as **mintable** by publishing the etcher's pubkey as the mint authority.

## Wire Format

```
  CETCH(1)        — 0x21
  ticker_len(1)   — 1–16
  ticker          — UTF-8
  decimals(1)     — 0–8
  commitment(33)  — compressed Pedersen point C = supply·H + r·G
  amount_ct(8)    — XOR-encrypted supply
  rp_len(2)       — rangeproof byte length (LE u16)
  rangeproof      — m=1 Bulletproofs proof (~688 bytes for n=64)
  mint_authority(32) — x-only pubkey (all-zero = non-mintable)
  image_len(2)    — image URI byte length (LE u16)
  image_uri       — UTF-8 (≤256 bytes)
```

## Implementation Workflow

1. **Generate keypair** if not already available
2. **Fund the wallet** with enough sats for the commit + reveal tx fees
3. **Select a commit input** — a UTXO whose outpoint becomes the `anchor`
4. **Derive the etch blinding**: `r = HMAC(priv, "tacit-etch-v1" || anchor) % N`
5. **Derive the amount keystream**: `ks = HMAC(priv, "tacit-etch-amount-v1" || anchor)[0..8]`
6. **Compute Pedersen commitment**: `C = supply·H + r·G`
7. **Encrypt the supply**: `ct = supply XOR ks`
8. **Generate bulletproof**: `bpRangeAggProve([supply], [r])`
9. **Build the CETCH payload**: `encodeCEtch({ ticker, decimals, commitment: C, encryptedAmount: ct, rangeproof, mintAuthority })`
10. **Wrap in taproot envelope**: `encodeEnvelopeScript(xonlyPubkey, payload)`
11. **Construct commit tx** — P2TR output tweaked to the envelope script
12. **Construct reveal tx** — spends commit via script-path, exposes envelope
13. **Broadcast** both transactions

## Validation Rules

- `ticker` must be 1–16 UTF-8 bytes
- `decimals` must be 0–8
- `supply` must be in `[0, 2^64)`
- Bulletproof must verify (commitment is in-range)
- `asset_id = SHA256(reveal_txid_BE || vout=0_LE)`
- If `mint_authority` is all-zero, the asset is **non-mintable** permanently
- If non-zero, that pubkey can later sign T_MINT envelopes

## Recovery Path

The etcher can recover the supply from chain + privkey alone:
1. Find the commit tx via the reveal tx's `vin[0]`
2. Derive `anchor = commit_tx.vin[0].txid_BE || commit_tx.vin[0].vout_LE`
3. Re-derive `r` and `ks` from privkey + anchor
4. Decrypt `supply = decryptAmount(ct, ks)`
5. Verify `pedersenCommit(supply, r) == on_chain_commitment`

## Common Pitfalls

- The commit anchor must be from **before** the envelope is known — uses the commit tx's first input
- Forgetting the privkey loses the ability to recover the supply opening
- Mintable flag is **permanent** — cannot be changed after CETCH
