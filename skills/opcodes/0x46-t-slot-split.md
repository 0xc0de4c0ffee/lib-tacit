# Skill: T_SLOT_SPLIT (0x46) — Slot Split

## Domain Knowledge

T_SLOT_SPLIT atomically splits a single slot into 2–16 new slots. The old slot is consumed; new slots are created with `Σdenom_new ≤ denom_old`. Each output gets its own asset ID, denomination, recipient commitment, and leaf hash. An optional bitmap-indexed note tail appends 122-byte notes per output.

## Wire Format

```
opcode(1) || nt(1) || old_asset_id(32) || denom_old_LE(8) ||
old_merkle_root(32) || old_nullifier_hash(32) || old_recipient_commitment(33) ||
old_r_leaf(32) || old_bind_hash(32) || old_proof_len_LE(2) || old_proof(VAR) ||
N(1) ||
{ asset_id(32) || denom_LE(8) || recipient_commit(33) || leaf_hash(32) } × N ||
old_owner_pubkey(33) || old_owner_sig(64)
[bitmap(⌈N/8⌉) || notes(VAR)]
```

## TypeScript Implementation

```typescript
import { encodeSlotSplit, decodeSlotSplit } from 'src/opcodes/slot.js';

const payload = encodeSlotSplit({
  networkTag: 1,
  assetIdOld: new Uint8Array(32),
  denomOld: 100n,
  oldMerkleRoot: new Uint8Array(32),
  oldNullifierHash: new Uint8Array(32),
  oldRecipientCommitment: new Uint8Array(33),
  oldRLeaf: new Uint8Array(32),
  oldBindHash: new Uint8Array(32),
  oldProof: new Uint8Array(50),
  outputs: [
    { assetIdNew: new Uint8Array(32), denomNew: 60n, newRecipientCommit: new Uint8Array(33), newLeafHash: new Uint8Array(32) },
    { assetIdNew: new Uint8Array(32), denomNew: 40n, newRecipientCommit: new Uint8Array(33), newLeafHash: new Uint8Array(32) },
  ],
  oldOwnerPubkey: new Uint8Array(33),
  oldOwnerSig: new Uint8Array(64),
  encryptedNotes: null,
});
const dec = decodeSlotSplit(payload); // SlotSplitOutput | null
```
