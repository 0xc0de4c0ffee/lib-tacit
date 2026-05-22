# Privacy Analysis: Script-Path vs Key-Path Spends

## Background

Taproot outputs (`tr(N, leaves)`) enable two spending paths:
- **Key path**: provide a single Schnorr signature valid under the internal key `N`
- **Script path**: provide a script from the merkle tree + a satisfaction satisfying it + a merkle proof connecting it to the output

The spender chooses which path to use at spend time. An observer only sees what the spender reveals.

---

## Taproot Key Path Spend

```
Input:  <sig>
Script: (none — key path)
```

**What observers learn:**
- The output is a standard P2TR key-path spend
- Nothing about the existence of any script tree
- Nothing about tacit, miniscript policies, or asset types

**Anonymity set:** All P2TR spends across the entire Bitcoin network. As of 2026, ~30–40% of all Bitcoin transactions use P2TR outputs. This is a large and growing anonymity set.

**Implications for tacit:**
- A tacit transfer using the key path is **indistinguishable** from a normal Bitcoin payment, an Ordinals transfer, a Lightning channel open, or any other P2TR usage
- No chain analysis heuristic can identify tacit activity from key-path spends alone
- This is a **strict privacy improvement** over the current envelope approach

---

## Taproot Script Path Spend

```
Input:  <satisfaction> <script> <control_block>
Script: <leaf_script>
```

**What observers learn:**
- The **full leaf script** — the exact spending policy (e.g., `and_v(v:pk(ABC...), older(52560))`)
- All **public keys** embedded in the leaf script
- The **exact timelock value** (if any)
- The **hash preimage** (if hashlock leaf)
- The **merkle tree structure** — number of leaves, their ordering, and depth in the tree (via the control block)
- The **internal key** (contained in the control block)

**Anonymity set:** Other spends using the same or similar leaf script structure. For a common pattern like `and_v(v:pk, older(52560))`, this could be thousands of UTXOs (e.g., all Liana recovery spends). For tacit-specific leaves, the set could be much smaller.

**Implications for tacit:**
- Script-path spends reveal tacit participation if the leaf script contains tacit-specific structure (e.g., kernel key fingerprints, tacit-specific opcodes)
- Solution: use **generic miniscript patterns** that look identical to non-tacit scripts (e.g., a simple timelocked recovery looks the same whether the funds are tacit or Bitcoin)
- The **first spend** from an address always reveals the script tree; subsequent observations can link addresses to the same spender

---

## P2WSH Spend

```
Input:  <satisfaction> <script>
Script: <script>
```

**What observers learn:**
- The **full script** and all public keys
- The exact spending policy
- No merkle tree to hide behind — the script is fully revealed

**Anonymity set:** Other P2WSH spends using the exact same script. Since P2WSH scripts are content-addressed (script hash), identical scripts are indistinguishable. But the script itself reveals everything.

**Implications for tacit:**
- **Essentially zero privacy** — the spending policy, keys, and timelocks are fully visible
- Only mitigable by using common script templates shared with other protocols (e.g., standard multisig looks like any other multisig)

---

## What the Current Envelope Reveals

The current tacit taproot envelope outputs always reveal:
- The **TACIT magic bytes** (4 B) — definitive evidence of tacit usage
- The **version byte** (1 B)
- The **opcode wire format payload** (variable) — asset IDs, amounts, blindings
- The **inner opcode semantics** — e.g., "this is a CXFER of asset X with amount Y"

This is the **worst privacy profile** of all approaches: the output format is unique to tacit and fully distinctive.

---

## Mitigations for Tacit

### Default to Key Path

The single highest-impact privacy improvement. If >99% of tacit spends use the key path, then tacit activity is invisible to chain surveillance.

- Key-path spend = kernel signature only
- No miniscript leaves revealed unless necessary (recovery, dispute, multisig)
- Requires the internal key to be a real key (kernel key or MuSig2 aggregate), not NUMS

### MuSig2 Key Aggregation

Aggregate the kernel key with auxiliary keys into a single internal key:
- `internal_key = MuSig2Agg(kernel_key, recovery_key, ...)`
- Key-path spend proves control of the aggregate, without revealing which sub-keys signed
- Individual sub-keys can sign independently for script-path leaves

### Decoy Leaves

Add meaningless leaves to the taproot merkle tree to confuse observers:
- `and_v(v:pk(decoy_key), older(999999))` - a timelock far in the future
- `sha256(random_hash)` - a hashlock with no known preimage
- Observers cannot distinguish which leaf was actually intended for spending

### Script Hiding

For sensitive policies, use a hash-locked reveal:
- Leaf script: `<hash_of_policy> OP_DROP <actual_miniscript>`
- The policy is only revealed if the spender chooses to publish it
- Requires a commitment scheme and out-of-band policy distribution

---

## Summary

| Spend Type | Anonymity Set | Reveals Tacit? | Fee Efficiency |
|---|---|---|---|
| Key path (taproot) | All P2TR (~30%+ of txs) | No | Highest |
| Script path (generic leaf) | Similar miniscript spends | Possibly | Medium |
| Script path (tacit-specific leaf) | Tacit users only | Yes | Medium |
| P2WSH | Identical scripts only | Yes (likely) | Low-Medium |
| Current envelope | Tacit users only | **Definitively yes** | Medium |

The move from envelope-based to key-path-dominant spending is a **fundamental privacy upgrade** for tacit users.
