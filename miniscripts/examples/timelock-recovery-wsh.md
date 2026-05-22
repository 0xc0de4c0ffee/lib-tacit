# P2WSH Descriptor with Timelocked Recovery

While Taproot is the preferred architecture for tacit (key-path spends, privacy, multi_a), P2WSH Miniscript is simpler, more widely supported by hardware wallets, and provides a gentler migration path. This document walks through a concrete P2WSH descriptor with timelocked recovery.

---

## The Descriptor

```
wsh(and_v(v:pk([abcd1234/48h/0h/0h/2h]xpub6A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d/0/*),or_d(pk([efgh5678/48h/0h/0h/2h]xpub6E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d0e1f2g/0/*),older(52560))))
```

### Policy Breakdown

```
wsh(
  and_v(
    v:pk([cold]xpub_cold/0/*),      // Primary: cold storage always signs
    or_d(
      pk([rec]xpub_rec/0/*),          // Recovery backup key
      older(52560)                     // OR wait 52560 blocks (1 year)
    )
  )
)
```

| Fragment | Role | Origin |
|----------|------|--------|
| `v:pk([abcd1234]xpub_cold/0/*)` | **Primary** — always required, cold storage | `abcd1234` fingerprint |
| `pk([efgh5678]xpub_rec/0/*)` | **Recovery** — secondary authorization | `efgh5678` fingerprint |
| `older(52560)` | **Timelock** — 52560 blocks ≈ 365 days | — |

### Spending Rules

| Scenario | Primary | Recovery | nSequence |
|----------|---------|----------|-----------|
| **Normal operation** | Required | Required | 0 |
| **After timelock** | Required | Not needed | ≥ 52560 |

The `v:pk(primary)` in `and_v` is a `CHECKSIGVERIFY` — the primary key is **always** required. The `or_d` branch decides the second requirement:

- **Before timelock:** `or_d` evaluates `pk(recovery)`. If recovery signs → 1, `IFDUP` → 1 1, `NOTIF` doesn't trigger. Both keys needed.
- **After timelock (nSequence ≥ 52560):** `pk(recovery)` fails → 0, `IFDUP` → 0, `NOTIF` triggers → `older(52560)` succeeds via CSV. Primary key alone is sufficient.

**Important:** This is NOT a "lost primary key" recovery pattern. The primary key is always required. For lost-primary-key recovery, use the Liana pattern with `or_i` or a Taproot key-path escape hatch.

---

## Address Derivation

Using Bitcoin Core:

```
getdescriptorinfo "wsh(and_v(v:pk(02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b),or_d(pk(03b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d),older(52560))))"
```

**Response:**
```json
{
  "descriptor": "wsh(and_v(v:pk(02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b),or_d(pk(03b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d),older(52560))))#0qz8x7mp",
  "checksum": "0qz8x7mp",
  "issolvable": true
}
```

**Address derivation:**
```
deriveaddresses "wsh(...)#0qz8x7mp" "[0,0]"
→ bc1q2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f
```

The address is a P2WSH address (BIP 141) encoding SHA256(witness_script).

### Descriptor Checksum

The `#0qz8x7mp` is the BIP 380 checksum using a custom base-32 code (8 chars). It detects all single-character errors and most transposition errors.

---

## Script Structure

### Miniscript

```
and_v(v:pk(primary), or_d(pk(recovery), older(52560)))
```

### Compiled Bitcoin Script (P2WSH with 33-byte compressed keys)

```
<primary_pubkey> OP_CHECKSIGVERIFY
<recovery_pubkey> OP_CHECKSIG
OP_IFDUP
OP_NOTIF
  <52560> OP_CHECKSEQUENCEVERIFY
OP_ENDIF
```

### Assembly with Hex

```
21 <33B primary>  ad    — CHECKSIGVERIFY primary (35 B)
21 <33B recovery> ac    — CHECKSIG recovery (35 B)
73                      — OP_IFDUP (1 B)
64                      — OP_NOTIF (1 B)
  03 50cd00 b2          — CHECKSEQUENCEVERIFY (5 B)
68                      — OP_ENDIF (1 B)
```

**Script hex:**
```
2102a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1bad
2103b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3dac
73
64
0350cd00b2
68
```

### Script Size: 78 B

| Component | Bytes |
|-----------|-------|
| Primary key push (1 + 33) + CHECKSIGVERIFY | 35 |
| Recovery key push (1 + 33) + CHECKSIG | 35 |
| IFDUP + NOTIF + ENDIF | 3 |
| 52560 push + CHECKSEQUENCEVERIFY | 5 |
| **Total script** | **78 B** |

### Witness Stacks

**Normal spend (both keys sign):**
```
witness[0] = <primary_sig>     — 71-73 B ECDSA sig
witness[1] = <recovery_sig>    — 71-73 B ECDSA sig
```
Total: ~144-146 B witness. Weight: ~147 WU = 36.75 vB.

**Timelock recovery (primary key only, nSequence ≥ 52560):**
```
witness[0] = <primary_sig>     — 71-73 B ECDSA sig
```
Total: ~73 B witness. Weight: 74 WU = 18.5 vB.

### Execution Trace

**Normal spend (both sign):**
```
Stack: [sig_primary, sig_recovery]
→ CHECKSIGVERIFY: pops sig_primary, verifies → continues
→ CHECKSIG: pops sig_recovery, verifies → 1
→ IFDUP: 1 → 1 1
→ NOTIF: 1 1 (NOTIF pops 1, doesn't trigger) → continues
→ Script passes
```

**Timelock recovery (nSequence ≥ 52560):**
```
Stack: [sig_primary]
→ CHECKSIGVERIFY: pops sig_primary, verifies → continues
→ CHECKSIG: pops nothing valid → 0 (recovery key check fails)
→ IFDUP: 0 → 0
→ NOTIF: triggered (pops 0) → runs inner block
→ 52560 CSV: nSequence ≥ 52560 → continues
→ ENDIF
→ Script passes
```

---

## The Two Policy Patterns

The descriptor above shows one pattern, but there are two distinct timelock recovery patterns worth understanding:

### Pattern A: Decaying 2-of-2 to 1-of-1 (this descriptor)

```
and_v(v:pk(primary), or_d(pk(recovery), older(52560)))
```

| Time | Required |
|------|----------|
| Before timelock | primary + recovery |
| After timelock | primary only |

Primary key always required. Recovery key becomes optional after timeout. Useful when the recovery key is a second factor that should step away after a proving period.

### Pattern B: True recovery (Liana style)

```
or_i(
  and_v(v:pk(primary), pk(recovery)),    // normal: both sign
  and_v(v:pk(recovery), older(52560))    // recovery: recovery key alone after timeout
)
```

| Time | Required |
|------|----------|
| Before timelock | primary + recovery |
| After timelock | recovery only (primary can be lost) |

The `or_i` needs an input selector (0 or 1) in the witness to choose which branch executes. This is the true "lost key recovery" pattern.

---

## Taproot Equivalent

```
tr([09a1b2c3/86h/0h/0h]xpub6.../0/*, {
  and_v(v:pk([a2b3c4d5/86h/1h/0h]xpub_rec.../0/*), older(52560))
})
```

### Comparison

| Aspect | P2WSH | Taproot |
|--------|-------|---------|
| Keys | 33-byte compressed | 32-byte x-only |
| Signatures | ECDSA (71-73 B) | Schnorr (64 B) |
| Key path | None | Yes — normal spends use key path |
| Privacy | Script revealed on every spend | Key-path spends reveal nothing |
| Control block | Not needed | ~33-65 B (script path only) |
| Script size | ~78 B (33B keys) | ~39 B (32B xonly keys) |
| Normal spend vSize | ~51 vB (2 ECDSA sigs) | ~57 vB (key path, 1 Schnorr sig) |
| HW wallet support | Broad (Ledger, Trezor, ColdCard, BitBox) | Growing (Ledger 2.2+, BitBox02, Jade) |
| Standardness | Since 2016 (SegWit v0) | Since 2021 (SegWit v1) |

### Key Path Advantage

In the taproot version, the internal key provides a **key-path spend** requiring just one 64-byte Schnorr sig. This is the normal tacit operation. The miniscript recovery leaf is only revealed if the key path becomes unavailable. The leaf:

```
and_v(v:pk([recovery]xpub_rec/0/*), older(52560))
```

With 32-byte x-only keys: ~39 B script + 64 B sig + 33 B control block = ~136 B witness for a recovery spend.

**Key path spend:** 64 B sig = 65 WU = 16.25 vB (no script, no control block).

This is the economics that matter for tacit: the key path is ~3-4x cheaper than any P2WSH or script-path alternative.

---

## Tradeoffs Summary

### P2WSH Pros
- Broadest hardware wallet support (Ledger, Trezor, ColdCard, BitBox02, Jade, Specter)
- No key-path vs script-path distinction — simpler mental model
- Mature tooling: rust-miniscript, Bitcoin Core descriptor wallets, HWI
- No control block overhead

### P2WSH Cons
- Script revealed on every spend (privacy loss)
- ECDSA signatures are ~9 B larger than Schnorr
- Compressed keys are 1 B larger than x-only
- No key-path escape hatch for lost primary key
- Larger script only gets larger as conditions grow

### For Tacit

Taproot is the natural home for tacit miniscript:

1. Tacit already targets P2TR outputs — the envelope structure is a taproot script leaf
2. Kernel signatures are BIP-340 Schnorr — same curve as key-path spends
3. Key-path spends eliminate the 45 B envelope overhead
4. Miniscript leaves are "break glass" paths — only revealed when used
5. MuSig2 aggregate internal key enables threshold key path without multisig script

P2WSH is useful for simpler deployments, hardware wallet compatibility testing, and as a stepping stone before full taproot miniscript integration.
