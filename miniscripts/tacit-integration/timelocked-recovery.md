# Timelocked Recovery for Tacit UTXOs

> **Branch:** `research/miniscript-integration`
> **Status:** R&D — design proposal

## 1. Problem

Tacit confidential UTXOs are controlled by a **kernel key pair** (used for BIP-340 Schnorr signatures). If this key is lost — due to hardware failure, forgotten backup, or death — the UTXO is **permanently unspendable**. Unlike Bitcoin itself (which has no built-in recovery), tacit protocol manages user assets, making key loss catastrophic.

Current tacit has **no recovery mechanism**. The kernel sig is the only way to spend a tacit UTXO.

## 2. Solution: Timelocked Recovery Leaf

Add a Miniscript leaf to the taproot tree that allows a **recovery key** to spend the UTXO after a timelock:

```
Taproot output = internal_key (tacit kernel pubkey) + Merkle root of:
  Leaf 1: and_v(v:pk(recovery_pubkey), older(N))  // timelocked recovery
```

### Relative timelock (CSV) — recommended

```
<recovery_pubkey> CHECKSIGVERIFY <N> CHECKSEQUENCEVERIFY
```

`and_v(v:pk(K), older(N))` in Miniscript notation.

- Requires the UTXO to be **matured** relative to its confirmation height
- Survives chain reorganizations (sequence number is relative)
- Default for wallet recovery use cases

### Absolute timelock (CLTV) — alternative

```
<N> CHECKLOCKTIMEVERIFY <recovery_pubkey> CHECKSIG
```

`and_v(v:pk(K), older(N))` — wait, CLTV compiles differently. In Miniscript:

```
and_v(v:pk(K), after(N))  →  <N> CHECKLOCKTIMEVERIFY <K> CHECKSIG
```

- Absolute block height or timestamp
- Useful for contract-enforced deadlines
- Less flexible for recovery (fixed date)

## 3. Script Sizing

| Component | Relative timelock (CSV) | Absolute timelock (CLTV) |
|-----------|------------------------|-------------------------|
| Leaf script | `and_v(v:pk(K), older(52560))` | `and_v(v:pk(K), after(52560))` |
| Script bytes | ~43 B | ~43 B |
| Signature (witness) | 65 B | 65 B |
| Sequence / nLockTime field | 4 B (in transaction) | 4 B (in transaction) |
| Control block | 33 B | 33 B |
| **Total recovery spend** | **~141 vB** | **~141 vB** |

### Witness structure (spending via recovery leaf)

```
witness: [
  <recovery_sig>,          // 64-65 B (BIP-340 or ECDSA)
  <recovery_script>,       // ~43 B
  <control_block>          // 33 B (1-leaf tree)
]
```

## 4. Concrete Example: 1-Year Recovery (52560 blocks)

### Parameters

| Parameter | Value |
|-----------|-------|
| Recovery timelock | 52560 blocks (~365 days at 10 min/block) |
| Recovery key | Derived from BIP-39 seed phrase, m/48'/0'/0'/2' |
| Kernel key | Standard tacit key derivation |
| Script | `and_v(v:pk(recovery_pubkey), older(52560))` |

### Script (compiled)

```
<recovery_pubkey>    // 33 B (0x20 || 32-byte xonly)
CHECKSIGVERIFY       // 1 B
52560                // 3 B (0x02 0xCD 0xCD, 52560 = 0xCD50, little-endian)
CHECKSEQUENCEVERIFY  // 1 B
```

Total: **38 B** (3 fewer than estimate — depends on OP_PUSH encoding of N)

### Taproot tree structure

```
Internal key: tacit_kernel_pubkey (spendable at any time via 64 B sig)
  ├── Key path: tacit_kernel_pubkey spend (default)
  └── Script path: recovery_leaf
       └── Script: <recovery_pubkey> CHECKSIGVERIFY 52560 CHECKSEQUENCEVERIFY
```

### Recovery flow

1. **Normal operation**: All spends use key path (tacit kernel sig) — 98 vB total
2. **Key lost**: User waits 52560 blocks from the UTXO's confirmation
3. **Recovery**: User (or heir) spends via script path with recovery key signature
4. **Wait period**: The timelock gives the real owner time to notice and move funds before recovery is possible

## 5. Decaying Recovery (2-of-2 → 1-of-1)

A more sophisticated pattern: start as 2-of-2 between primary and secondary keys, but decay to 1-of-1 (primary only) after the timelock.

### Miniscript

```
or_i(
  thresh(2, pk(primary), s:pk(secondary)),
  and_v(v:pk(primary), older(N))
)
```

### Compiled script

```
<primary> CHECKSIG <secondary> CHECKSIG ADD 2 EQUAL
IF_NOT
  <primary> CHECKSIGVERIFY <N> CHECKSEQUENCEVERIFY
ENDIF
```

~66 B script (approximate).

### Behavior

| Condition | Spendable by | Signature count | Wait |
|-----------|-------------|----------------|------|
| Before N blocks | Primary + secondary | 2 sigs | 0 |
| After N blocks | Primary alone | 1 sig | N blocks |
| After N blocks | Primary + secondary | 2 sigs | 0 (still works) |

### Security model

- **Before timeout**: Both primary and secondary must cooperate (2-of-2). Secondary acts as a backup guardian — could be a hardware wallet, a trusted friend, or a inheritance service.
- **After timeout**: Primary can recover alone. The timeout prevents the secondary from blocking access forever.
- The secondary cannot steal funds alone at any point.
- The primary cannot steal funds alone until the timeout expires.

## 6. Integration with Tacit Wallet

### Recovery key derivation

```
Purpose:   m/48'          (Miniscript-compatible)
Coin type: m/48'/0'       (Bitcoin mainnet)
Account:   m/48'/0'/0'    (tacit recovery)
Key type:  m/48'/0'/0'/2' (key type 2 = recovery, per BIP-48)
```

Alternative (simpler):

```
m/84'/0'/0'/0/*   → kernel keys (standard tacit)
m/84'/0'/1'/0/*   → recovery keys (same seed, different account)
```

### Backup phrase

The BIP-39 seed phrase covers **both** kernel keys and recovery keys. No separate backup needed.

### Wallet UX

- **Setup**: Wallet generates recovery leaf during UTXO creation
- **Default**: Recovery timelock = 52560 blocks (1 year)
- **Configurable**: User can set shorter/longer timelocks per UTXO
- **Display**: Wallet shows "Recovery available at block height X" per UTXO

### UTXO creation overhead

| Component | Bytes | Cost |
|-----------|-------|------|
| Recovery leaf script | ~38 B | Added to taproot tree |
| Control block impact | +1 hash | Merkle tree depth increases by 1; control block grows from 32 to 33 B |
| Witness (recovery spend) | +65 B sig + 38 B script + 33 B cb | Only incurred if recovery is needed |

**Key path spend is unaffected** — the taproot output still spends with a single 64 B sig at the same cost. The extra leaf only matters if someone spends via script path.

## 7. Fee Implications

### Normal spend (key path)

```
Input:  41 B (outpoint + sequence)
Witness: 65 B (1 sig, no control block)
Output: 34 B (1P2TR)
----
Total:  140 vB  × fee_rate = fee
```

### Recovery spend (script path)

```
Input:  41 B (outpoint + sequence)
Witness: 65 B (sig) + 38 B (script) + 33 B (control block) = 136 B
Output: 34 B (1P2TR)
----
Total:  211 vB  × fee_rate = fee
```

Recovery is **~71 vB more expensive** than normal spend. During high fee periods (500 sat/vB), recovery costs ~0.000105 BTC extra. Mitigation:

- **P2A anchor output**: Include a `OP_RETURN` or `OP_TRUE` anchor for CPFP fee bumping
- **Recommended**: Set recovery timelock to a period where fees are historically predictable

## 8. Limitations

| Concern | Mitigation |
|---------|-----------|
| Recovery key also lost | Multi-layer recovery (N timelocked addresses at escalating intervals) |
| Timelock too short (theft) | Default 1 year; user can increase |
| Timelock too long (death) | Will/heir can be given recovery key directly |
| Fee spike at recovery time | P2A anchor + CPFP |
| Privacy: recovery leaf reveals timelock on-chain | Use a single dummy leaf with `pk(H)` if no recovery desired (hides tree size) |

## 9. Alternative: Multi-Layer Recovery

For inherited wealth or high-value UTXOs, use multiple recovery leaves at different timelocks:

```
Leaf 1: and_v(v:pk(heir_1), older(52560))    // 1 year — trusted heir
Leaf 2: and_v(v:pk(heir_2), older(105120))    // 2 years — contingency
Leaf 3: and_v(v:pk(lawyer), older(157680))     // 3 years — legal channel
```

Each leaf is independently spendable by its respective key after its timelock. The control block grows slightly (33–37 B for 1–4 leaves), but key path cost remains unchanged.

## 10. Recommendation

| Scenario | Recommended pattern |
|----------|-------------------|
| Default wallet | `and_v(v:pk(recovery), older(52560))` |
| High-value / inheritance | Multi-layer recovery (3 leaves, escalating timelocks) |
| Corporate custody | Decaying recovery: `or_i(thresh(2, A, B), and_v(v:A, older(52560)))` |
| Minimalist / privacy-focused | Single leaf `pk(H)` to hide tree size; no recovery |

**Priority for tacit wallet implementation**: Single-layer timelocked recovery. It is the simplest, adds minimal overhead, and solves the most common failure mode (lost kernel key).
