# Skill: T_SLOT_ROTATE (0x45) — Slot Rotate

## Domain Knowledge

T_SLOT_ROTATE combines a burn of the old slot with an immediate mint of a new slot in one atomic opcode. The old owner authorises the rotation via `old_owner_sig`. Payment fields and a new `k_btc_xonly` are included for the BTC cost leg.

## Wire Format

```
opcode(1) || nt(1) || asset_id(32) || denom_LE(8) ||
old_merkle_root(32) || old_nullifier_hash(32) || old_recipient_commitment(33) ||
old_r_leaf(32) || old_bind_hash(32) || old_proof_len_LE(2) || old_proof(VAR) ||
new_recipient_commit(33) || new_leaf_hash(32) || new_k_btc_xonly(32) ||
payment_asset_id(32) || payment_amount_LE(8) ||
old_owner_pubkey(33) || old_owner_sig(64)
[0x01 || note(122)]
```

## TypeScript Implementation

```typescript
import { encodeSlotRotate, decodeSlotRotate } from 'src/opcodes/slot.js';

const payload = encodeSlotRotate({
  networkTag: 1,
  assetId: new Uint8Array(32),
  denomination: 100n,
  oldMerkleRoot: new Uint8Array(32),
  oldNullifierHash: new Uint8Array(32),
  oldRecipientCommitment: new Uint8Array(33),
  oldRLeaf: new Uint8Array(32),
  oldBindHash: new Uint8Array(32),
  oldProof: new Uint8Array(50),
  newRecipientCommit: new Uint8Array(33),
  newLeafHash: new Uint8Array(32),
  newKBtcXOnly: new Uint8Array(32),
  paymentAssetId: new Uint8Array(32),
  paymentAmount: 200n,
  oldOwnerPubkey: new Uint8Array(33),
  oldOwnerSig: new Uint8Array(64),
  encryptedNote: null,
});
const dec = decodeSlotRotate(payload); // SlotRotateOutput | null
```
