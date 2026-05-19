# Skill: T_DEPOSIT (0x29) — Shielded Pool Deposit

## Domain Knowledge

T_DEPOSIT locks a fixed-denomination tacit asset UTXO into a shielded mixer pool. Two shapes share opcode 0x29:
- **POOL_INIT** (`denomination = 0`): Creates a new pool keyed by `(asset_id, denomination)`.
- **DEPOSIT** (`denomination > 0`): Consumes a UTXO and appends a Poseidon leaf commitment.

## Wire Format

### POOL_INIT (denomination = 0)

```
T_DEPOSIT(1) || asset_id(32) || denomination=0(8) ||
pool_denom(8) || vk_cid_len(1) || vk_cid || ceremony_cid_len(1) || ceremony_cid || init_sig(64)
```

### DEPOSIT (denomination > 0)

```
T_DEPOSIT(1) || asset_id(32) || denomination(8) ||
leaf_commitment(32) || kernel_sig(64)
```

## TypeScript Implementation

```typescript
import { encodeDeposit, decodeDeposit, encodePoolInit, isPoolInit } from 'lib-tacit';

// Deposit
const payload = encodeDeposit({ assetId, denomination: 100n, leafCommitment, kernelSig });
const dec = decodeDeposit(payload); // { kind: 'deposit', ... }

// Pool init
const initPayload = encodePoolInit({ assetId, poolDenom: 500n, vkCid, ceremonyCid, initSig });
const isInit = isPoolInit(initPayload); // true
const decInit = decodeDeposit(initPayload); // { kind: 'pool-init', ... }
```
