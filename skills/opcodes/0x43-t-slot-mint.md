# Skill: T_SLOT_MINT (0x43) — Slot Mint

## Domain Knowledge

T_SLOT_MINT atomically creates a new self-custody-slot wrapper. The mint commits to a recipient, a leaf hash in the slot Merkle tree, a payment asset and amount (the BTC cost), and an x-only pubkey for cooperative-dispute resolution. A 122-byte encrypted note is optional.

## Wire Format

```
opcode(1) || nt(1) || asset_id(32) || denom_LE(8) ||
recipient_commit(33) || leaf_hash(32) ||
payment_asset_id(32) || payment_amount_LE(8) ||
minter_pubkey(33) || minter_sig(64) || k_btc_xonly(32)
[0x01 || note(122)]
```

## TypeScript Implementation

```typescript
import { encodeSlotMint, decodeSlotMint } from 'src/opcodes/slot.js';

const payload = encodeSlotMint({
  networkTag: 1,
  assetId: new Uint8Array(32),
  denomination: 100n,
  recipientCommit: new Uint8Array(33),
  leafHash: new Uint8Array(32),
  paymentAssetId: new Uint8Array(32),
  paymentAmount: 200n,
  minterPubkey: new Uint8Array(33),
  minterSig: new Uint8Array(64),
  kBtcXOnly: new Uint8Array(32),
  encryptedNote: null,
});
const dec = decodeSlotMint(payload); // SlotMintOutput | null
```
