# Skill: T_SLOT_MERGE (0x47) — Slot Merge

## Domain Knowledge

T_SLOT_MERGE atomically merges 2–16 slot inputs into one new slot output. Σdenom_old ≥ denom_new; surplus is implicitly burned. The new slot may carry an optional 122-byte encrypted note.

## Wire Format

```
opcode(1) || nt(1) || N_inputs(1) ||
{ asset_id(32) || denom_old_LE(8) ||
  old_merkle_root(32) || old_nullifier_hash(32) || old_recipient_commitment(33) ||
  old_r_leaf(32) || old_bind_hash(32) || proof_len_LE(2) || proof(VAR) } × N ||
new_asset_id(32) || denom_new_LE(8) ||
new_recipient_commit(33) || new_leaf_hash(32) ||
new_owner_pubkey(33) || new_owner_sig(64)
[0x01 || note(122)]
```

## TypeScript Implementation

```typescript
import { encodeSlotMerge, decodeSlotMerge } from 'src/opcodes/slot.js';

const payload = encodeSlotMerge({
  networkTag: 1,
  inputs: [
    {
      assetIdOld: new Uint8Array(32), denomOld: 50n,
      oldMerkleRoot: new Uint8Array(32), oldNullifierHash: new Uint8Array(32),
      oldRecipientCommitment: new Uint8Array(33), oldRLeaf: new Uint8Array(32),
      oldBindHash: new Uint8Array(32), oldProof: new Uint8Array(40),
    },
    {
      assetIdOld: new Uint8Array(32), denomOld: 50n,
      oldMerkleRoot: new Uint8Array(32), oldNullifierHash: new Uint8Array(32),
      oldRecipientCommitment: new Uint8Array(33), oldRLeaf: new Uint8Array(32),
      oldBindHash: new Uint8Array(32), oldProof: new Uint8Array(40),
    },
  ],
  assetIdNew: new Uint8Array(32), denomNew: 100n,
  newRecipientCommit: new Uint8Array(33), newLeafHash: new Uint8Array(32),
  newOwnerPubkey: new Uint8Array(33), newOwnerSig: new Uint8Array(64),
  encryptedNote: null,
});
const dec = decodeSlotMerge(payload); // SlotMergeOutput | null
```
