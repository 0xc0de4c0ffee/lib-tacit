# CETCH (0x21) — Asset Creation

**Status:** ✅ Shipped (SPEC §5.1)

## Wire Format

```
CETCH(1) || ticker_len(1) || ticker(tlen) || decimals(1) ||
commitment(33) || amount_ct(8) || rp_len(2) || rangeproof(rp_len) ||
mint_authority(32) || image_len(2) || image_uri(image_len)
```

## Constraints

- `ticker`: 1–16 bytes UTF-8
- `decimals`: 0–8
- `commitment`: 33-byte compressed Pedersen point `C = supply·H + r·G`
- `amount_ct`: 8-byte XOR-encrypted supply
- `rangeproof`: m=1 Bulletproofs proof (n=64 bits, ~688 bytes)
- `mint_authority`: 32-byte x-only pubkey; all-zero = non-mintable
- `image_uri`: ≤256 bytes UTF-8 (optional)

## TypeScript Interface

```typescript
interface CEtchInput {
  ticker: string;
  decimals: number;
  commitment: Uint8Array;      // 33 bytes
  encryptedAmount: Uint8Array; // 8 bytes
  rangeproof: Uint8Array;
  mintAuthority?: Uint8Array | null; // 32 bytes or null
  imageUri?: string | null;
}

function encodeCEtch(input: CEtchInput): Uint8Array;
function decodeCEtch(payload: Uint8Array): CEtchOutput | null;
```

## Blinding Derivation

```
r_supply = HMAC(priv, "tacit-etch-v1" || anchor) % N
ks       = HMAC(priv, "tacit-etch-amount-v1" || anchor)[0..8]
```

## Key Properties

- `asset_id = SHA256(reveal_txid_BE || 0_LE)`
- mintable flag is **permanent** (cannot be changed after CETCH)
- Supply hidden behind Pedersen commitment; issuer can publish opening via attestation
