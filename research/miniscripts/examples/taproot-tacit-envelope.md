# Taproot + Tacit Envelope with Miniscript Leaves

Combining taproot Miniscript leaves with the tacit envelope for confidential token spends. This document shows the merged structure, control block construction, witness stacks, and leaf version handling.

---

## Current Tacit Envelope (Reference)

The existing tacit protocol encodes every opcode inside a Taproot script-path envelope defined in `src/envelope/script.ts`:

```
<xonly_pubkey> OP_CHECKSIG OP_FALSE OP_IF "TACIT" <0x01> <payload_chunks...> OP_ENDIF
```

| Component | Purpose |
|-----------|---------|
| `<xonly_pubkey> OP_CHECKSIG` | BIP-340 Schnorr signature check against an ephemeral signing key |
| `OP_FALSE OP_IF ... OP_ENDIF` | Non-executing branch containing the protocol data (the "hiding" technique) |
| `"TACIT" <0x01>` | Magic marker + version, recognized by tacit indexers |
| `<payload_chunks...>` | Fragmented opcode payload (opcode byte, kernel sig, Pedersen commitments, rangeproofs) |

The internal key is a NUMS point (`50929b74...3ac0` with no known discrete log), so every tacit spend **must** go through the script path. There is no key path.

On-chain for a CXFER:

```
Taproot output: tr(NUMS, { envelope_script })

Witness stack:
  [0] <signature>          — BIP-340 Schnorr sig for the envelope's pubkey
  [1] <envelope_script>    — the script above
  [2] <control_block>      — merkle proof (depth 0 = ~33 B)
```

---

## Proposed Merged Structure

Replace the NUMS internal key with a **meaningful key** (the tacit wallet's aggregate key). The script tree contains both the existing envelope (for backward compat) and new Miniscript leaves:

```
tr(tacit_internal_key, {
  // Leaf 1: tacit envelope (preserved for backward compat)
  //   Leaf version: 0xc0 (Tapscript)
  OP_FALSE OP_IF "TACIT" <0x01> <payload_chunks...> OP_ENDIF,

  // Leaf 2: timelocked recovery
  //   Leaf version: 0xc0 (Tapscript)
  <recovery_key> CHECKSIGVERIFY <52560> CHECKSEQUENCEVERIFY,

  // Leaf 3: 2-of-3 escrow
  //   Leaf version: 0xc0 (Tapscript)
  <buyer> CHECKSIG SWAP <seller> CHECKSIG ADD SWAP <arb> CHECKSIG ADD 2 EQUAL
})
```

### Internal Key

The internal key `P` can be:
- **MuSig2 aggregate** of N wallet participants — key-path spend requires all N to co-sign, producing a single 64 B Schnorr signature
- **Single tacit kernel key** — simpler but single point of failure for the key path

The tweaked output key is `Q = P + t·G` where `t = TaggedHash("TapTweak", P || merkle_root)`.

### Key Insight

The tacit kernel key (or MuSig2 aggregate) becomes the internal key, enabling **key-path spends** that look like normal P2TR on chain. The Miniscript leaves are only revealed when auxiliary conditions are used (recovery, escrow, dispute). For the vast majority of normal tacit spends, the wallet uses the key path:

- **Cheaper**: ~16 vB for the key-path witness vs ~50+ vB for script-path (sig + control block + leaf script)
- **Private**: no script revealed — looks like any other P2TR key-path spend

---

## Control Block Construction

### Merkle Tree

Given 3 leaf scripts, the taproot Merkle tree is:

```
           root = TaggedHash("TapBranch", left || right)
          /                                            \
   h1 = TaggedHash("TapBranch", l1 || l2)            l3
      /                   \
   l1                    l2
   │                     │
   Leaf 1                Leaf 2                  Leaf 3
   (envelope)            (recovery)              (escrow)
```

Each leaf hash: `TaggedHash("TapLeaf", leaf_version || script_size || script)`.

For leaf version 0xc0 (Tapscript), the tagged hash computation:
```
leaf_hash = sha256(sha256("TapLeaf") || sha256("TapLeaf") || 0xc0 || compact_size(script) || script)
```

### Control Block by Leaf

The control block format (BIP 341):
```
control_block = parity_byte || internal_key(32B) || merkle_proof_hashes(32B each)
```

| Leaf Used | Path | Control Block Size | Merkle Proof |
|-----------|------|-------------------|--------------|
| Leaf 1 (envelope) | l1 → root | 33 B (depth 1) | `h2 = TaggedHash("TapBranch", l2 || l3)` |
| Leaf 2 (recovery) | l2 → root | 33 B (depth 1) | `h2' = TaggedHash("TapBranch", l1 || l3)`... wait, the tree structure matters. |

Let me be precise about the tree. The standard taproot tree construction from `tr(key, { A, B, C })`:

The compiler builds a binary tree. For 3 leaves, the tree is:

```
          N3 (root)
         /          \
       N2           L3
      /  \
    L1    L2
```

Where `L1 = TapLeaf(0xc0, script_1)`, etc., and:
- `N2 = TapBranch(L1, L2)`
- `N3 = TapBranch(N2, L3)`

**Control block for Leaf 1 (envelope):**
```
parity_byte = 0xC0 | 1    (leaf ver 0xc0, depth 1)
proof = [L2_hash, L3_hash]
control_block = 0xC1 || internal_key(32B) || L2_hash(32B) || L3_hash(32B) = 97 B
```

Wait, the parity byte structure: BIP 341 says the first byte encodes the leaf version's parity and the depth. For leaf version 0xC0 (even), `p = 0xC0 | depth`. For depth 1: `0xC1`.

Actually wait, let me re-read BIP 341:

> The control block is `{p, internal_key, hash_1, ..., hash_n}` where:
> - `p` is: if `(leaf_version & 1) == 0` then `0xC0 + depth` else `0x20 + depth`

For leaf version 0xC0 (which is even), `p = 0xC0 + depth`.

- Depth 0 (single leaf tree): `p = 0xC0`, control block = 33 B
- Depth 1 (2-3 leaves): `p = 0xC1`, control block = 65 B
- Depth 2 (4-7 leaves): `p = 0xC2`, control block = 97 B

**Control block sizes per leaf:**

| Leaf | Depth | Parity Byte | Proof Hashes | Control Block Size |
|------|-------|------------|-------------|-------------------|
| Leaf 1 (envelope) | 1 | 0xC1 | `[L2, L3]` (64 B) | 1 + 32 + 64 = **97 B** |
| Leaf 2 (recovery) | 1 | 0xC1 | `[L1, L3]` (64 B) | **97 B** |
| Leaf 3 (escrow) | 0 | 0xC0 | `[N2]` (32 B) | 1 + 32 + 32 = **65 B** |

Leaf 3 has the smallest control block because it's at depth 0 in the binary tree. The compiler typically places the most-likely-used leaf at depth 0 for smallest control block.

**Optimal leaf ordering**: Place the most-frequently-used leaf at the deepest position... wait, depth 0 is the shallowest (fewest proof hashes). So the most-frequently-used leaf should be at depth 0 (first in the tree construction). For tacit:
- Leaf 3 (escrow) at depth 0 if escrow is the most common auxiliary path
- Or reorder to put the most-used leaf at a terminal position

In practice, for a tacit wallet:
```
tr(key, {
  recovery_leaf,          // at depth 0 — if this is used rarely, the control block is small
  escrow_leaf,            // at depth 0 as well? No, only one leaf can be at depth 0 in a binary tree.
})
```

Actually, for 2 leaves: both are at depth 1 (each needs 1 hash proof). Wait, no. For 2 leaves:

```
       root
      /    \
    L1      L2
```

L1 depth = 1 (needs 1 proof hash: L2)
L2 depth = 1 (needs 1 proof hash: L1)

For 3 leaves as above:
L3 depth = 0 (needs proof: N2 = 2 hashes concatenated? No, 1 hash: N2)

Wait, I need to be precise. The Merkle proof for a leaf is the **sibling hashes on the path from the leaf to the root**. Each step contributes one 32-byte hash.

L3: path to root = [L3 → N3]. Sibling = N2. Proof = [N2]. Size = 32 B = 1 hash.
N2 is itself a computed hash (TaggedHash("TapBranch", L1 || L2)), not two separate hashes.

So:
- L3 control block = p(0xC0) || internal_key(32) || N2(32) = **65 B**
- L1 control block = p(0xC1) || internal_key(32) || L2(32) || L3(32) = **97 B**

Wait, L1 path: [L1 → N2 → N3]. Sibling 1 = L2. Sibling 2 = L3. Proof = [L2, L3]. Size = 64 B.
L1 control block = 1 + 32 + 64 = **97 B** ✓

OK, that's correct now.

---

## Witness Stack per Leaf

### Key Path Spend (Normal Tacit Operation)

```
Witness stack:
  [0] <schnorr_sig>     — 64 B, BIP-340 signature, verified against tweaked output key Q
```

No control block, no leaf script. The indexer recognizes a tacit key-path spend by the structure of the witness: 64-byte sig followed by the tacit payload in the remaining witness elements.

The tacit payload (opcode, kernel sig, commitments, rangeproof) moves from the **script** to the **witness stack** — but the encoding is structurally unchanged. This is the big win: the 45 B of envelope framing disappears.

### Script Path — Leaf 1: Tacit Envelope (Backward Compat)

```
Witness stack:
  [0] <signature>           — BIP-340 sig for the envelope's embedded pubkey
  [1] <envelope_script>     — the OP_FALSE OP_IF "TACIT" ... OP_ENDIF script
  [2] <control_block>       — 65 B or 97 B (depending on tree depth)
```

This is identical to the current tacit spend. Indexers that don't understand the new key path can still parse this leaf.

### Script Path — Leaf 2: Timelocked Recovery

```
Witness stack:
  [0] <recovery_signature>  — 64 B Schnorr sig from recovery key
  [1] <leaf_script>         — <recovery_key> CHECKSIGVERIFY <52560> CSV  (~39 B)
  [2] <control_block>       — ~97 B
```

The timelock is satisfied by `nSequence` in the transaction input, not from the witness.

### Script Path — Leaf 3: 2-of-3 Escrow

```
Witness stack:
  [0] <sig_arb>             — arbitrator's sig (or 0 if not signing)
  [1] <sig_seller>          — seller's sig
  [2] <sig_buyer>           — buyer's sig
  [3] <leaf_script>         — the thresh script (~108 B P2WSH, ~90 B multi_a)
  [4] <control_block>       — ~65 B
```

With `multi_a(2, buyer, seller, arb)` under Tapscript:
```
Witness stack:
  [0] <sig_seller>          — only actual signers (no placeholders)
  [1] <sig_buyer>
  [2] <leaf_script>         — multi_a script (~90 B)
  [3] <control_block>
```

---

## Leaf Version Discussion

### Current Envelope: OP_FALSE OP_IF "Hiding"

The existing tacit envelope uses `OP_FALSE OP_IF ... OP_ENDIF` as a mechanism to embed non-executing protocol data:

```
<xonly> OP_CHECKSIG OP_FALSE OP_IF <data...> OP_ENDIF
```

The `OP_FALSE OP_IF` creates a branch that never executes (because `OP_FALSE` leaves 0 on stack, `OP_IF` pops 0 and skips to `OP_ENDIF`). This was necessary because the data payload is not a valid spending condition — it's protocol metadata.

### Under Taproot: Direct Leaf Version 0xC0

Under BIP 341, each taproot leaf has a **leaf version** byte:
- `0xC0` = Tapscript (standard Bitcoin Script with BIP 342 rules)
- `0x00`–`0xBF`, `0xC1`–`0xFE` = Reserved for future extensions
- `0xFF` = Reserved

For the tacit envelope under taproot, the leaf version determines how the leaf script is interpreted:

| Leaf | Leaf Version | Script Type | Validation |
|------|-------------|-------------|------------|
| Envelope (backward compat) | 0xC0 | Tapscript | Standard BIP 342 rules apply. The `OP_FALSE OP_IF` branch still works. |
| Miniscript leaves | 0xC0 | Tapscript | Standard Tapscript miniscript. OP_CHECKSIGADD available. |
| Future: native envelope leaf | 0x00–0xBF | Custom | Could define a leaf version where the script IS the tacit payload. Not explored here. |

**The OP_FALSE OP_IF trick is unnecessary in taproot.** Each leaf is explicitly a separate script in the Merkle tree. The envelope data never executes as script — it exists as a leaf that happens to pass (because the `OP_CHECKSIG` outside the `OP_FALSE OP_IF` provides the actual spending condition).

However, if we want backward compatibility with existing indexers that look for the `OP_FALSE OP_IF "TACIT"` pattern, we keep the envelope leaf as-is.

### Future Direction: Native Envelope Leaf

A cleaner approach would use a custom leaf version where the leaf script IS the tacit payload directly, without the OP_FALSE OP_IF wrapper:

```
Leaf version: 0x00 (or any non-Tapscript version)
Leaf script:  "TACIT" <0x01> <payload_chunks...>
```

The leaf version tells the validator "this is not Bitcoin Script — don't execute it." The indexer parses it directly. This eliminates the 8-byte `OP_CHECKSIG OP_FALSE OP_IF ... OP_ENDIF` overhead but requires consensus-critical leaf version assignment.

---

## Concrete Example: Spending via Recovery Leaf

Full trace of a timelocked recovery spend:

**Setup:**
```
tr(tacit_internal_key, {
  0: OP_FALSE OP_IF "TACIT" <0x01> <payload> OP_ENDIF,
  1: <recovery_key> CHECKSIGVERIFY <52560> CHECKSEQUENCEVERIFY
})
```

**Merkle tree:**
```
      root = TapBranch(L1, L2)
     /                      \
   L1 (TapLeaf 0xC0)      L2 (TapLeaf 0xC0)
   envelope script         recovery script
```

**Spending via Leaf 2 (recovery):**

Transaction input `nSequence` = 52560 (or greater).

Witness stack (from bottom to top of stack):

| Element | Size | Description |
|---------|------|-------------|
| `<recovery_sig>` | 64 B | BIP-340 sig by recovery key |
| `<recovery_script>` | ~39 B | Miniscript leaf bytecode |
| `<control_block>` | 65 B | `0xC1` + internal_key(32) + L1_hash(32) |

Total witness: 64 + 39 + 65 = 168 WU + 1 (count) = 169 WU ≈ 42.25 vB.
Plus 41 B outpoint + sequence + output = ~83 vB total input contribution.

**Verification:**
1. Consensus: verify leaf script against control block (merkle proof), execute script (CHECKSIGVERIFY + CSV)
2. Indexer: detect `nSequence ≥ 52560`, identify the recovery key, note the tacit output is being swept

---

## Summary

| Aspect | Current Tacit | Proposed Merged |
|--------|--------------|----------------|
| Internal key | NUMS (no key path) | Tacit kernel key / MuSig2 aggregate |
| Key path spend | Impossible | ~57 vB input, private |
| Script path leaves | 1 (envelope) | N (envelope + miniscript conditions) |
| Envelope overhead | 45 B | 0 B on key path |
| Recovery | None | `and_v(v:pk(recovery), older(N))` |
| Escrow | None | `multi_a(k, key1..keyN)` |
| Backward compat | — | Envelope leaf preserved |
