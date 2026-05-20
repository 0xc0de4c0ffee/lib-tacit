# CXFER (0x23) — Confidential Transfer

**Status:** ✅ Shipped (SPEC §5.2)

## Wire Format

```
CXFER(1) || asset_id(32) || kernel_sig(64) || N(1) ||
(C_i(33) || amount_ct_i(8))*N || rp_len(2) || rangeproof(rp_len)
```

N ∈ {1, 2, 4, 8} (power of 2 for aggregation).

## Constraints

- `asset_id`: 32 bytes
- `kernel_sig`: 64-byte BIP-340 Schnorr
- N must be power of 2 in {1,2,4,8}
- Aggregated bulletproof covers all N outputs

## TypeScript Interface

```typescript
interface Output {
  commitment: Uint8Array;      // 33 bytes compressed point
  encryptedAmount: Uint8Array; // 8 bytes
}

interface CXFERInput {
  assetId: Uint8Array;
  kernelSig: Uint8Array;
  outputs: Output[];
  rangeproof: Uint8Array;
}

function encodeCXfer(input: CXFERInput): Uint8Array;
function decodeCXfer(payload: Uint8Array): CXFEROutput | null;
```

## Blinding Derivation

```
// Recipient output
r_recip  = HMAC(SHA256(ECDH(sender, recip)), "tacit-blind-v1" || anchor || vout) % N
ks_recip = HMAC(SHA256(ECDH(sender, recip)), "tacit-amount-v1"  || anchor || vout)[0..8]

// Change output
r_change  = HMAC(sender.priv, "tacit-change-v1"       || anchor || vout) % N
ks_change = HMAC(sender.priv, "tacit-amount-self-v1"  || anchor || vout)[0..8]
```

## Kernel Signature

```
excess = Σr_out − Σr_in mod N
E' = ΣC_out − ΣC_in
msg = SHA256("tacit-kernel-v1" || asset_id || input_count || inputs* || output_count || outputs* || burned_LE)
sig = signSchnorr(msg, excess)
// Verify sig under E'.xonly()
```

## Shielded Recipient (Opt-in, §5.2.1)

CXFER recipients can opt into **address-graph privacy** via the shielded address primitive (SPEC-BLINDED-PUBKEY amendment, class-2). The on-the-wire bytes are unchanged. The difference is at the recipient output's `scriptPubKey`:

```
classical: vout[i].script = P2WPKH(hash160(recipient_pubkey))
shielded:  vout[i].script = P2WPKH(hash160(commit))
  commit = recipient_pubkey + b·G
  b      = HMAC(ECDH_seed, "tacit-cxfer-stealth-v1" || network_tag || tx_anchor || vout_LE)
```

Recipients publish a bech32m handle (`tcs1…` mainnet, `tcsts1…` signet). Amount-channel ECDH continues to use the underlying `recipient_pubkey` — the two channels remain orthogonal.

