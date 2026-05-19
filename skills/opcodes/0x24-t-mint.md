# Skill: T_MINT — Mint Additional Supply

## Domain Knowledge

T_MINT (0x24) issues additional supply on a mintable asset. Only the holder of the `mint_authority` private key (published at CETCH time) can sign T_MINT envelopes. The mint is **irreversible** — once the reveal tx confirms, the new supply is permanently part of the asset's total supply.

## Wire Format

```
  T_MINT(1)       — 0x24
  asset_id(32)    — target asset
  etch_txid(32)   — originating CETCH reveal txid (BE wire bytes)
  commitment(33)  — C = mint_amount·H + r·G
  amount_ct(8)    — XOR-encrypted mint amount
  rp_len(2)       — rangeproof byte length (LE u16)
  rangeproof      — m=1 Bulletproofs (~688 bytes for n=64)
  issuer_sig(64)  — BIP-340 Schnorr under mint_authority key
```

## Implementation Workflow

```
// 1. Derive commit anchor from commit tx's first input
commit_anchor = commit_tx.vin[0].txid_BE(32) || commit_tx.vin[0].vout_LE(4)

// 2. Derive mint blinding and keystream
r = HMAC(issuer.priv, "tacit-mint-blind-v1"  || commit_anchor) % N
ks = HMAC(issuer.priv, "tacit-mint-amount-v1" || commit_anchor)[0..8]

// 3. Commit + encrypt
C = mintAmount·H + r·G
ct = mintAmount XOR ks

// 4. Prove range
{ proof } = bpRangeAggProve([mintAmount], [r])

// 5. Build mint auth message
msg = computeMintMsg(asset_id, commit_anchor, pointToBytes(C), ct)
// msg = SHA256("tacit-mint-v1" || asset_id || commit_anchor || C || ct)

// 6. Sign with mint_authority key
sig = signSchnorr(msg, issuer.priv)

// 7. Build payload + envelope
payload = encodeCMint({ asset_id, etch_txid, C, ct, proof, sig })
script = encodeEnvelopeScript(issuer.xonly, payload)
```

## Validation Rules

- `asset_id` must match a valid CETCH asset (recursively validated)
- The CETCH's `mint_authority` must be non-zero
- `issuer_sig` must verify under `mint_authority.xonly()` with the correct msg
- `commit_anchor` binds the sig to a specific commit/reveal pair (prevents envelope replay)
- Bulletproof must verify the new commitment is in-range
- The CETCH ancestor must have `mintable = true`

## Recovery

The issuer can recover the mint amount from chain + privkey alone:
1. Read `commit_anchor` from the reveal tx's `vin[0]`
2. Derive `commit_anchor = commit_tx.vin[0].txid_BE || commit_tx.vin[0].vout_LE`
3. Derive `r = HMAC(priv, "tacit-mint-blind-v1" || commit_anchor) % N`
4. Derive `ks = HMAC(priv, "tacit-mint-amount-v1" || commit_anchor)[0..8]`
5. Decrypt `mintAmount = decryptAmount(ct, ks)`
6. Verify `pedersenCommit(mintAmount, r) == on_chain_commitment`

## Wallet Display

For wallet/dapp indexing, T_MINT creates a new UTXO that the issuer can spend. Parse `asset_id` from the envelope, walk the ancestry to find the CETCH root, and verify the mint authority chain. The mint UTXO is indistinguishable from a regular CXFER output once spent — the first CXFER from it re-blinds the amount.
