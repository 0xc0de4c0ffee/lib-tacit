# Anchor Outputs for CPFP Fee Bumping

## Status: R&D — Standard Pattern, Not Yet Integrated

Tacit transactions carry confidential amounts, Pedersen commitments, Bulletproofs range proofs, and kernel signatures. A typical
CXFER (confidential transfer, opcode 0x23) weighs:

| Component          | Size (B)     | Notes                              |
|--------------------|--------------|-------------------------------------|
| Inputs             | ~64 × n_in   | Outpoints + sequences               |
| Outputs            | ~64 × n_out  | Value commitments, blinding factors |
| Kernel sig         | 64           | BIP-340 Schnorr                     |
| Bulletproof        | ~738         | Classic BP (0x23) or BP+ (0x22)     |
| Envelope script    | ~33          | TACIT magic + pushdata              |
| **Total**          | **~800–1400**| Typical 1-in/1-out CXFER            |

With miniscript leaves (vaults, DAO governance), per-output overhead increases:

| Additional component     | Size (B)  | Notes                             |
|--------------------------|-----------|-----------------------------------|
| Miniscript leaf (simple) | ~35–200   | Script, varies with complexity    |
| Control block            | ~33–65    | Merkle proof depth × 32 B         |
| Extra signatures         | ~64 × n   | M-of-N signatures                 |
| **Total (vault)**        | **~900–1800**| 1-in/1-out CXFER with vault leaf |

---

## The Fee Estimation Problem

Larger transactions pay higher absolute fees. If the feerate rises between PSBT assembly and broadcast:

1. The transaction is broadcast at too-low feerate.
2. It sits in the mempool, unconfirmed.
3. If RBF is not possible (e.g., timelocked vault output), the transaction is stuck.

**Why RBF may be impossible:**

- **Relative timelocks** (`OP_CSV`, `older(N)`) — the transaction cannot be replaced with a higher-feerate version because the
  timelock height has not yet been reached. The transaction was already broadcast at the earliest possible height.
- **First-seen safety** — some wallets use opt-in RBF (BIP-125), but the replacement must pay a higher fee, and some relay
  policies reject conflicting replacements.
- **Miniscript complexity** — crafting an RBF replacement for a transaction with a complex miniscript witness requires
  reconstructing the same witness with a different fee — operationally hard, especially if M-of-N signers are involved.

---

## Solution: P2A Anchor Output

A **Pay-to-Anchor (P2A)** output is a keyless, anyone-can-spend output added to the transaction solely for CPFP (Child-Pays-For-Parent)
fee bumping.

### P2A Script

```
OP_1 <0x4e73>
```

**Byte representation:**
```
51 04 4e73
```

**Human-readable address (mainnet):**
```
bc1pfeessrawgf
```

The script is:
- `OP_1` (`0x51`) — taproot version 1 (P2TR).
- `0x04` — 4-byte data push.
- `0x4e73` — the point with unknown discrete log (NUMS), ensuring no one can key-path spend.

The NUMS point `4e73` is derived from the SHA256 hash of "P2A":

```python
import hashlib
h = hashlib.sha256(b"P2A").digest()
# 0x4e73... (first 32 bytes, interpreted as an X-only public key)
```

Since the discrete log of `P2A_NUMS` is unknown, **no one can spend via the key path**. The only spend path is the script path,
and the P2A script is simply `OP_TRUE` — anyone can spend.

**Validity:**

```
P2A output:     OP_1 <0x4e73>       → 34 vbytes
Spending input: <witness_data>       → script path spend with OP_TRUE leaf
```

The witness for spending is:
```
<no signatures required>
<leaf script = OP_TRUE>
<control block proving inclusion in taproot tree>
```

Since `OP_TRUE` is the leaf script, anyone can satisfy it — no signature needed.

### Standardization

P2A was standardized in **Bitcoin Core v28.0** (PR #30352) as a standard relay policy. Previous policy would treat P2A outputs as
non-standard and reject them from the mempool. As of v28.0+, P2A is standard and relay-friendly.

---

## CPFP with P2A

The fee-bumping workflow:

```
Parent TX (tacit vault spend):
  Input:  vault_utxo (100000 sats, miniscript leaf)
  Output: destination_output (99000 sats)
  Output: P2A_anchor (500 sats)       ← added for CPFP

  ↓ (not confirmed)

Child TX (fee bump):
  Input:  P2A_anchor (500 sats)
  Output: miner_fees (500 sats)        ← goes entirely to fees
  Fee:    500 sats                     ← child fee = parent fee + 500
```

The child transaction spends only the P2A anchor. The child's feerate adds to the parent's feerate for mining purposes (CPFP
aggregation). The combined package feerate = `(parent_fee + child_fee) / (parent_vsize + child_vsize)`.

### Cost Breakdown

| Item                     | Vsize (vB) | Notes                            |
|--------------------------|------------|----------------------------------|
| P2A output creation      | 43         | Output creation is non-witness data (4 WU/B). A P2A output [value(8) + scriptPubKeyLen(1) + scriptPubKey(34)] = 43 B non-witness = 43 × 4 = 172 WU = 43 vB |
| P2A spend input          | 68         | 41 WU witness + 36 B outpoint    |
| Child tx overhead         | 10         | Version, locktime, markers       |
| **Total CPFP overhead**  | **~109 vB**|                                   |

At 50 sat/vB: `109 vB × 50 sat/vB = 5450 sats` for reliable fee bumping.

### With Cluster Mempool (Bitcoin Core v31.0+)

Bitcoin Core v31.0 introduces cluster mempool (PR #30493), which:

1. **Removes CPFP carveout** — previously, CPFP gave a 1-input/1-output carveout for the child. With cluster mempool, the
   carveout is unnecessary because cluster limits (max 100 transactions per cluster) prevent DoS.
2. **Introduces TRUC (Topologically Restricted Until Confirmation, v3)** — TRUC transactions (nVersion=3) can replace their
   ancestors unilaterally. This means:
   - A parent + child can be **replaced together** with a new pair at a higher feerate.
   - No need to broadcast the child separately — broadcast the replacement pair.
   - TRUC replaces the old mempool entry entirely.
3. **Sibling eviction** — if the parent is in the mempool and a new child is broadcast that conflicts with an existing child,
   the higher-feerate sibling evicts the lower one.

**Impact on P2A:**

- P2A remains useful with TRUC: the anchor output allows the child to be replaced without touching the parent's inputs.
- With TRUC v3, you can broadcast `(parent + child_1)` and replace it with `(parent + child_2)` paying higher fees.
- Without P2A, you'd need to replace the entire parent transaction (RBF), which may be impossible for timelocked vaults.

---

## Integration with Tacit Vaults / Miniscript Leaves

Every tacit output that uses a miniscript leaf should be paired with a P2A change output:

### Descriptor Pair

```
tr(vault_internal_key, { vault_leaf }),       // vault output
tr(NUMS, { OP_TRUE })                          // P2A anchor output
```

### Transaction Structure

```
Tacit Vault TX:
  Input[0]: vault_utxo           (100000 sats)
  Input[1]: funding_utxo         (2000 sats)  ← funds the P2A anchor
  Output[0]: destination          (99000 sats, tacit confidential)
  Output[1]: P2A_anchor          (500 sats, OP_1 <0x4e73>)
  Output[2]: change               (1000 sats, tacit confidential)
  Fee:                           1500 sats

  ↓

CPFP Child TX:
  Input[0]: P2A_anchor           (500 sats)
  Output[0]: <miner>             (500 sats)
  Fee:                           500 sats
```

### For Miniscript Vaults Specifically

The recovery path (timelocked) must include a P2A output to ensure fee bumping is possible:

```
Vault output:
  tr(vault_key, {
      and_v(v:pk(hot_key), or_d(pk(cold_key), older(144)))  // vault leaf
  })

Change (always included):
  tr(NUMS, { OP_TRUE })   // P2A anchor — 31 vbytes
```

**Why the recovery path needs P2A:**
- The cold key recovery transaction is broadcast at height `H + 144`.
- At that height, the cold key signs and broadcasts.
- But what if at height `H + 144`, the feerate is 200 sat/vB and the original fee was set for 50 sat/vB?
- Without P2A: the transaction is stuck. The cold key cannot RBF (timelock is not retrollable). The only option is to wait for a
  feerate dip or use a miner out-of-band.
- With P2A: the cold key (or anyone) broadcasts a CPFP child spending the anchor, paying the market feerate. The transaction
  confirms.

---

## P2A as a Standard Pattern

P2A is already used in production:

| Project              | Usage                                   |
|----------------------|-----------------------------------------|
| Lightning (DLGP/DLC) | P2A anchors for DLC settlements         |
| Bitcoin Core v28+    | Standard relay policy for P2A           |
| Discreet Log Contract| P2A for CPFP on oracle attestation txs  |

For tacit, P2A is the natural fit because:

1. **Keyless** — no additional key management for fee bumping. Anyone can bump.
2. **Small** — 31 vbytes per output, negligible vs. tacit transaction sizes (800–1400 B).
3. **Standard** — relayed by Bitcoin Core v28.0+, no custom policy needed.
4. **Composable** — pairs naturally with taproot key-path spends (key spend = tacit default, P2A anchor = CPFP).

---

## Cost Analysis

### Per-Transaction Cost of P2A

Assume a typical 1-in/2-out tacit CXFER at 1000 vB, feerate 50 sat/vB:

| Scenario              | Fee (sats) | Total vB | Feerate (sat/vB) | Notes                             |
|-----------------------|------------|----------|------------------|-----------------------------------|
| No anchor             | 50000      | 1000     | 50               | Cannot bump if stuck              |
| With anchor           | 50000      | 1031     | 48.5             | 31 vB overhead, slight reduction  |
| CPFP bump to 200      | 50000+500  | 1031+109 | 48.5 → 200       | Child fee: 500 sats               |
| TRUC replace (v3)     | 50000+2150 | 1031     | 50 → 200         | Replace pair: 2150 extra (TRUC)   |

Even in the worst case (CPFP at 200 sat/vB), the fee bump cost (500 sats) is **0.5% of the anchor value** if the anchor is
100k sats. For a vault holding 10 BTC, 500 sats is negligible.

### Anchor Value Sizing

The anchor output should be large enough to pay for a reasonable CPFP bump but small enough not to waste UTXO space:

| Anchor value (sats) | CPFP capacity (at 200 sat/vB) | Recommendation          |
|---------------------|-------------------------------|-------------------------|
| 300                 | ~2.7 vB child (impossible)    | Too small               |
| 1000                | ~9 vB child (too small)       | Minimum viable          |
| 5000                | ~45 vB child (adequate)       | Good for most cases     |
| 10000               | ~91 vB child (generous)       | Conservative            |
| 50000               | ~458 vB child (excessive)     | Wasteful                |

**Recommendation:** Anchor value = `3 × estimated_child_vsize × target_feerate`. For a 109 vB child at 200 sat/vB:
`3 × 109 × 200 = 65400` — but this is excessive. Instead, anchor = 5000 sats, and if more fee is needed, use TRUC replacement
to bump the entire package (parent + child) rather than relying solely on the anchor value.

---

## Open Questions

1. **P2A dust policy** — Bitcoin Core v28.0 treats P2A as relay-standard, but does it have a dust limit? P2A outputs below 300
   sats may be considered dust and not relayed. Need to check policy (likely `minrelaytxfee` applies).
2. **Anchor-only child** — Some miners may not relay child transactions that spend only a P2A output (no other inputs). Need to
   verify relay policy in v28.0+.
3. **Tacit integration** — How does the P2A anchor interact with the tacit kernel? The kernel proves supply conservation for the
   asset amounts, but the P2A anchor is BTC (not a tacit asset). The anchor should be excluded from the kernel calculation.
   Suggested approach: the anchor is a plain BTC output (no TACIT envelope), so it is invisible to tacit validators.

---

## References

- BIP-125: Opt-in RBF
- BIP-341: Taproot (P2TR)
- Bitcoin Core PR #30352: Add P2A to standard relay policy (v28.0)
- Bitcoin Core PR #30493: Cluster mempool (v31.0)
- TRUC (v3 transactions): https://github.com/bitcoin/bitcoin/blob/master/doc/topologically-restricted-transactions.md
- Cluster mempool: https://delvingbitcoin.org/t/cluster-mempool-definitions-theory/20
- tacit SPEC §5 — Wire formats (CXFER, kernel)
- [vault-patterns.md](./vault-patterns.md) — Vault patterns using P2A for CPFP
