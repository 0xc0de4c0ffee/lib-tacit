# T_MINT (0x24) — Issuer Mint

**Status:** ✅ Shipped (SPEC §5.3)

## Wire Format

```
T_MINT(1) || asset_id(32) || etch_txid(32) ||
commitment(33) || amount_ct(8) || rp_len(2) || rangeproof(rp_len) ||
issuer_sig(64)
```

## Constraints

- `asset_id` must match a valid CETCH asset with `mintable = true`
- `issuer_sig` must verify under the CETCH's `mint_authority` pubkey
- `commit_anchor` binding prevents envelope replay into different commit/reveal

## TypeScript Interface

```typescript
interface CMintInput {
  assetId: Uint8Array;
  etchTxid: Uint8Array;
  commitment: Uint8Array;
  encryptedAmount: Uint8Array;
  rangeproof: Uint8Array;
  issuerSig: Uint8Array;
}

function encodeCMint(input: CMintInput): Uint8Array;
function decodeCMint(payload: Uint8Array): CMintOutput | null;
```

## Authorization Message

```
msg = SHA256("tacit-mint-v1" || asset_id(32) || commit_anchor(36) || commitment(33) || encrypted_amount(8))
sig = signSchnorr(msg, mint_authority_privkey)
```
