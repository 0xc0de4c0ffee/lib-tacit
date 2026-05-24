# Skill: T_SLOT_BURN (0x44) — Slot Burn

## Domain Knowledge

T_SLOT_BURN redeems a slot wrapper by proving membership in the slot Merkle tree (via `merkle_root`, `nullifier_hash`, `r_leaf`, `bind_hash`, and a zero-knowledge proof). The slot is consumed; value is returned to the recipient.

## Wire Format

```
opcode(1) || nt(1) || asset_id(32) || denom_LE(8) ||
merkle_root(32) || nullifier_hash(32) ||
recipient_commitment(33) || r_leaf(32) || bind_hash(32) ||
proof_len_LE(2) || proof(VAR)
```

## TypeScript Implementation

```typescript
import { encodeSlotBurn, decodeSlotBurn } from 'src/opcodes/slot.js';

const payload = encodeSlotBurn({
  networkTag: 1,
  assetId: new Uint8Array(32),
  denomination: 100n,
  merkleRoot: new Uint8Array(32),
  nullifierHash: new Uint8Array(32),
  recipientCommitment: new Uint8Array(33),
  rLeaf: new Uint8Array(32),
  bindHash: new Uint8Array(32),
  proof: new Uint8Array(100),
});
const dec = decodeSlotBurn(payload); // SlotBurnOutput | null
```
