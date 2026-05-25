# Adoption Roadmap: Integrating Miniscript into Tacit

## Overview

This document maps what needs to change in the tacit codebase at each phase of miniscript adoption. Each phase builds on the previous one and is independently deployable.

---

## Phase 0 (Prerequisite): NUMS Standardization + Kernel Leaf

**Current state:** The taproot internal key is a NUMS point (`H = lift_x(hex:0250929b...)`). No one can spend via the key path because no one knows the discrete log of the NUMS point. The kernel sig is embedded inside the custom envelope script rather than being a first-class tapscript check.

### Phase 0a: Kernel-In-Script Leaf

Add a dedicated `CHECKSIGVERIFY kernel_pubkey` leaf to the taproot tree. The kernel sig moves from inside the custom envelope payload to a proper Miniscript leaf that Bitcoin consensus verifies directly.

```
tr(NUMS_key, {
    <kernel_pubkey> CHECKSIGVERIFY    // Leaf 0: standard spend
})
```

**Witness for a valid spend:**
```
[kernel_sig_64B] [commitment_33B] [encrypted_amount_8B] [rangeproof_688B] [control_block_33B]
```

The script is 34 B. The kernel sig is checked by Bitcoin consensus. The remaining witness elements are protocol-level data (commitments, rangeproof) that the tacit indexer validates.

### Phase 0b: NUMS Key Standardization

Standardize the NUMS internal key across all tacit v2 outputs. The key must be:
1. Deterministically generated (hash_to_curve with a protocol tag)
2. No known discrete log
3. Recognizable by indexers (they check if the output's internal key matches)

**Proposal:** `NUMS_key = hash_to_curve("tacit/v2/nums-internal-key")` (see tacit-v2-rethink.md §11.5).

### Key-path is NOT possible for confidential outputs

A P2TR key-path spend carries exactly one witness element (the 64 B sig). There is no room for Pedersen commitments (33 B), encrypted amounts (8 B), or rangeproofs (688+ B). Key-path spends of confidential outputs would require OP_CAT (to embed data hashes in the output key), which is not yet available on Bitcoin.

**Key-path and kernel sig serve different purposes:**
- **Key-path sig**: Proves ownership of the output key (Bitcoin consensus layer)
- **Kernel sig**: Proves supply conservation across the transaction (tacit protocol layer)

They sign different messages (taproot sighash vs kernel message) and cannot be the same signature.

**Future consideration:** If OP_CAT is soft-forked, the commitment data could be hashed into the output key, enabling key-path tacit spends. This is tracked in the Future Phase.

### Changes Required

#### 1. `src/envelope/script.ts`

Add a new `buildKernelLeaf` function that creates the taproot tree with a CHECKSIGVERIFY leaf:

```typescript
function buildTaprootOutput(kernelPubKey: Uint8Array): { address: string; outputScript: Uint8Array } {
  const internalKey = NUMS_KEY // Protocol-wide NUMS constant, not wallet key
  const leafScript = buildLeafScript(kernelPubKey) // <kernel_pubkey> CHECKSIGVERIFY
  // Build tr(NUMS_key, { leaf_script })
}
```

#### 2. `src/crypto/kernel.ts`

The kernel signature message stays the same (supply conservation proof). The verification path changes: the kernel sig is now checked by Bitcoin consensus via `CHECKSIGVERIFY` rather than by the custom decoder. The actual signing algorithm (BIP-340 Schnorr) is unchanged.

#### 3. Transaction building

The input witness is a script-path satisfaction (not key-path). All spends go through the script path:

```
Input (script path): <kernel_sig> <commitment> <encrypted_amount> <rangeproof> <leaf_script> <control_block>
```

### Risks
- No new key-path malleability concerns (key path is never used)
- The NUMS key is well-known and cannot be compromised (no discrete log)
- Script-path spends reveal the leaf script and control block, increasing witness size vs a hypothetical key-path model

### Revert Strategy
The old envelope format can coexist: existing v1 UTXOs use the envelope, new v2 UTXOs use the kernel leaf format. The wallet tracks which format each UTXO uses.

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
- The kernel key signs via the kernel leaf (CHECKSIGVERIFY in the tapscript, not the key path)

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

- Test that kernel leaf spend still works for normal transfers
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
- `leaf_index`: which leaf the recipient should use when spending (0 = kernel leaf, 1 = recovery, 2 = escrow, 3 = hashlock)

#### 2. `src/envelope/script.ts`

- Build the taproot tree from multiple miniscript policies
- Compute the policy commitment hash
- Encode/decode `policy_commitment` and `leaf_index` in the envelope payload

#### 3. `src/crypto/kernel.ts`

- Kernel signature verification must check that the leaf being spent matches the `leaf_index` committed to in the output
- If spending via the kernel leaf, no leaf index check is needed (kernel leaf = standard spend path)

#### 4. Protocol change: leaf-locked kernel validation

New rule: the kernel message includes the `leaf_index` and `policy_commitment`. A kernel signature over a particular leaf index is only valid for spends that satisfy that leaf. This prevents:

- Creating an output with `policy_commitment = H(escrow policy)` but actually spending via a different leaf without consensus
- Switching leaves after the output is created

### Implementation Notes

- The `policy_commitment` must be computed deterministically from the set of leaves and their ordering
- A single-output transaction (e.g., MINT) may have no leaf selection (it uses the default kernel leaf)
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
- Validate against tacit constraints (must include kernel key, must have a kernel leaf fallback)

#### 2. Policy commitment

The full policy descriptor is committed to in the envelope (as a hash) or derived from a BIP 388 descriptor synchronized out of band.

Two approaches:
- **Tacit-hosted**: policy descriptor is stored in the envelope payload (adds bytes but is self-contained)
- **Out-of-band**: policy descriptor is shared via a side channel; only a 32 B hash is on-chain

#### 3. Spending

- The spender selects a leaf from the tree
- The wallet constructs the satisfaction for that leaf
- If using the kernel leaf, only the kernel signature is required

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
| Phase 0 | Envelope (key path not usable) | Kernel leaf (script path) |
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
