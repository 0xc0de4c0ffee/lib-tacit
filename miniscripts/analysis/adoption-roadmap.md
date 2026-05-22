# Adoption Roadmap: Integrating Miniscript into Tacit

## Overview

This document maps what needs to change in the tacit codebase at each phase of miniscript adoption. Each phase builds on the previous one and is independently deployable.

---

## Phase 0 (Prerequisite): Internal Key Management

**Current state:** The taproot internal key is a NUMS point (`H = lift_x(hex:0250929b...)`). No one can spend via the key path because no one knows the discrete log of the NUMS point.

**Target:** The internal key is the tacit kernel verifying key (or a MuSig2 aggregate).

### Changes Required

#### 1. `src/envelope/script.ts`

Replace the NUMS internal key with the kernel verifying key:

```typescript
// Before:
const INTERNAL_KEY = tryBytesToPoint(nusmH) // NUMS point

// After:
function buildTaprootOutput(kernelPubKey: Uint8Array): { address: string; outputScript: Uint8Array } {
  const internalKey = kernelPubKey // 32 B x-only public key
  // ...
}
```

#### 2. `src/crypto/kernel.ts`

The kernel signature currently produces a signature that is verified against the kernel key within the script. After Phase 0, the kernel signature becomes a **BIP 340 Schnorr signature** over the taproot key-path message (`SIGHASH_DEFAULT`).

```typescript
// New: kernel sign produces a key-path signature
function signKeyPath(kernelPrivKey: Uint8Array, tx: Transaction): Uint8Array {
  // BIP 340 sighash over the transaction
  const sighash = taprootSighash(tx, SIGHASH_DEFAULT)
  // Standard Schnorr signature
  return schnorrSign(kernelPrivKey, sighash)
}
```

#### 3. Transaction building

The input witness changes from a script-path satisfaction to a key-path satisfaction:

```
// Before (script path):
Input: <kernel_sig + sighash> <envelope_script> <control_block>

// After (key path):
Input: <kernel_sig>
```

### Risks
- Key-path spends are subject to **signature adaptor** malleability (anyone can compute a valid signature for a related key if they know the nonce). Standard BIP 340 implementations are not vulnerable.
- If the kernel key is compromised, all assets are at risk. A MuSig2 aggregate with a hardware-backed key mitigates this.

### Revert Strategy
The NUMS internal key can coexist: some UTXOs use the old envelope format, some use the new key-path format. The wallet tracks which format each UTXO uses.

---

## Phase 1: Single-Leaf Miniscript (Timelocked Recovery)

Add a single miniscript leaf to the taproot tree for timelocked recovery.

### Miniscript Policy

```
and_v(v:pk(recovery_key), older(52560))
```

This means: recovery_key must sign **and** the nLockTime/nSequence must be ≥ 52560 (approximately 1 year).

### Changes Required

#### 1. New module: `src/miniscript/`

```
src/miniscript/
├── index.ts            # Barrel export
├── policies.ts         # Miniscript policy definitions (as string or AST)
├── builder.ts          # Build taproot tree from policies
└── satisfy.ts          # Satisfy miniscript leaves for spend
```

#### 2. `src/crypto/kernel.ts`

- Add recovery key derivation: `m/48h/0h/0h/2h` (custom BIP 48-like key path — project-internal convention, not a BIP standard)
- Kernel key still the primary signer; recovery key only used after timelock

#### 3. `src/transaction/sighash.ts`

- Add tapscript sighash computation for leaf spends
- The kernel key signs via the key path (no leaf sighash needed for normal spends)

#### 4. `src/wallet/keypair.ts`

- Derive recovery key from the same seed at a different BIP 32 path
- Export recovery key descriptor for backup

#### 5. Wallet UI (`src/wallet/` or external)

- On first transaction, prompt user to set up recovery:
  - "Enter a recovery public key (or generate from wallet)"
  - "Select timelock duration (1 month / 3 months / 1 year)"
  - Show recovery descriptor for paper backup

### No Changes To

- Opcode wire formats (CXFER, MINT, BURN etc. remain unchanged)
- Kernel validation rules
- Asset ID computation
- Range proofs

### Testing

- Test that key-path spend still works for normal transfers
- Test that after timelock expiry, recovery key can spend the UTXO
- Test that before timelock expiry, recovery key cannot spend the UTXO
- Test that a bad recovery key cannot spend at any time

---

## Phase 2: Multi-Leaf Support (Escrow, Hashlock, Threshold)

Add additional miniscript leaves and wire-protocol support for selecting which leaf to use.

### Miniscript Leaves

```
Leaf 0: and_v(v:pk(recovery_key), older(52560))
Leaf 1: thresh(2, pk(escrow_a), pk(escrow_b), pk(escrow_c))
Leaf 2: and_v(v:pk(counterparty), sha256(H))
Leaf 3: or_d(pk(kernel_default), and_v(v:pk(recovery_key), older(52560))) // superset
```

### Changes Required

#### 1. New opcode or envelope extension field

Add a **new variant opcode** or an **envelope extension field** that conveys the leaf selection:

```
New CXFER variant payload (proposed):
  policy_commitment (32 B) | leaf_index (1 B) | asset_id (32 B) | amount_ct (16 B) | ...
```

This is a new opcode variant (not a modification of the existing shipped CXFER wire format), ensuring backward compatibility with existing validators.

- `policy_commitment`: hash of the miniscript policy tree (ensures the output's policy is fixed at creation)
- `leaf_index`: which leaf the recipient should use when spending (0 = key path default, 1 = recovery, 2 = escrow, 3 = hashlock)

#### 2. `src/envelope/script.ts`

- Build the taproot tree from multiple miniscript policies
- Compute the policy commitment hash
- Encode/decode `policy_commitment` and `leaf_index` in the envelope payload

#### 3. `src/crypto/kernel.ts`

- Kernel signature verification must check that the leaf being spent matches the `leaf_index` committed to in the output
- If spending via the key path, no leaf check is needed (key path = kernel is always correct)

#### 4. Protocol change: leaf-locked kernel validation

New rule: the kernel message includes the `leaf_index` and `policy_commitment`. A kernel signature over a particular leaf index is only valid for spends that satisfy that leaf. This prevents:

- Creating an output with `policy_commitment = H(escrow policy)` but actually spending via the key path without consensus
- Switching leaves after the output is created

### Implementation Notes

- The `policy_commitment` must be computed deterministically from the set of leaves and their ordering
- A single-output transaction (e.g., MINT) may have no leaf selection (it uses the default key path)
- The leaf index is relative to a specific tree topology that both sender and receiver agree on

---

## Phase 3: DAO Governance

Integrate T_GOV_* opcodes with miniscript thresh() leaves for on-chain DAO treasury management.

### Miniscript Policy

```
thresh(3, pk(gov_a), pk(gov_b), pk(gov_c), pk(gov_d), pk(gov_e))
```

A 3-of-5 governance multisig. The governance leaf is treated as an independent spending path in the taproot tree.

### Changes Required

#### 1. `src/opcodes/gov-drafts.ts`

- Define wire format for governance proposals committed to a taproot leaf
- Governance proposal = `(target_asset, target_amount, recipient_policy)`

#### 2. New module: `src/miniscript/governance.ts`

- Build governance thresh() policies
- Satisfy governance proposals via aggregated signatures
- Verify governance satisfaction without revealing individual votes (if using MuSig2)

#### 3. Wallet

- Display governance proposals to signers
- Collect partial signatures
- Broadcast final transaction when threshold is met

### Benefit

- Replaces off-chain vote tallying with **on-chain miniscript satisfaction**
- The spender only reveals the governance leaf when spending via that leaf
- All other DAO UTXOs are indistinguishable from single-key P2TR

---

## Phase 4: Full Miniscript Policy Language

Users can specify arbitrary miniscript policies for their tacit UTXOs.

### Policy Specification

```text
wsh(or_d(pk(kernel_key), and_v(v:pk(recovery_key), older(52560))))
```

Or more complex:

```text
tr(MuSig2Agg(kernel, recovery), {
  and_v(v:pk(escrow_a), older(4320)),
  thresh(2, pk(spouse), pk(lawyer), pk(notary)),
  or_d(pk(kernel), and_v(v:pk(recovery), older(52560)))
})
```

### Changes Required

#### 1. Policy descriptor parsing

- Accept BIP 388 wallet policies as input
- Parse into internal miniscript AST
- Validate against tacit constraints (must include kernel key, must have a key-path fallback)

#### 2. Policy commitment

The full policy descriptor is committed to in the envelope (as a hash) or derived from a BIP 388 descriptor synchronized out of band.

Two approaches:
- **Tacit-hosted**: policy descriptor is stored in the envelope payload (adds bytes but is self-contained)
- **Out-of-band**: policy descriptor is shared via a side channel; only a 32 B hash is on-chain

#### 3. Spending

- The spender selects a leaf from the tree
- The wallet constructs the satisfaction for that leaf
- If using the key path, only the kernel signature is required

### UX Implications

- Policy creation should be **guided** (not free-form) to prevent dangerous policies (e.g., a policy without the kernel key)
- Common policy templates: "basic recovery", "2-of-3 with delay", "dead man's switch"
- Advanced users can specify raw miniscript via a policy editor

### Security

- The kernel key must **always** be one of the authorized spenders (prevents permanent loss)
- The kernel policy must be satisfiable (at least one leaf that doesn't require external keys)
- Timelock values should have reasonable bounds (1 block to ~2 years)

---

## Migration Strategy

### Output Compatibility

| Phase | Old UTXOs | New UTXOs |
|---|---|---|
| Phase 0 | Envelope (key path not usable) | Envelope (key path usable) |
| Phase 1 | Envelope (key path not usable) | Taproot with miniscript leaf |
| Phase 2 | Envelope or Phase 1 | Taproot with multi-leaf |
| Phase 3 | Any previous | Taproot with governance |
| Phase 4 | Any previous | User-defined policy |

During migration, the wallet must:
1. Track the **output type** for each UTXO (envelope, phase 1, phase 2, etc.)
2. Know how to spend each type
3. Allow users to **consolidate** old-format UTXOs into new-format outputs at their convenience

### Consolidation Transaction

A consolidation transaction spends old-format UTXOs as inputs and creates new-format UTXOs as outputs:

```
Inputs:  [envelope_utxo_1, envelope_utxo_2, ...]
Outputs: [taproot_miniscript_utxo_1, ...]
```

This can be done gradually as users spend their tacit balances. No forced migration.

---

## Effort Estimate

| Phase | Effort | Risk | Value |
|---|---|---|---|
| Phase 0 | 2–3 weeks | Low | High (privacy + fee savings) |
| Phase 1 | 3–4 weeks | Low | High (recovery UX) |
| Phase 2 | 4–6 weeks | Medium | Medium (escrow/hashlock) |
| Phase 3 | 3–4 weeks | Medium | Medium (DAO) |
| Phase 4 | 6–8 weeks | High | High (full flexibility) |
| **Total** | **18–25 weeks** | | |

Phase 0 and Phase 1 are the highest-value, lowest-risk changes and should be prioritized.
