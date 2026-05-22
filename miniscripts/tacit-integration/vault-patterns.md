# Vault Patterns for High-Value Tacit Assets

## Status: R&D — Not Yet Implemented

Tacit's UTXO model is single-key by default: each output is controlled by a kernel key that authorizes spends via a BIP-340
Schnorr signature. For small amounts this is acceptable. For high-value tacit assets (large confidential amounts, DAO treasuries,
wrapped BTC positions), single-key custody is fragile:

- **Key compromise** → total loss of funds.
- **Single point of failure** → no recovery path if key is lost.
- **No inheritance** → funds are inaccessible if keyholder dies.

---

## The Vault Concept

A _vault_ is a UTXO with two or more spend paths:

1. **Fast path** — hot key, immediate spend (daily operations).
2. **Slow path** — cold key, delayed by a timelock (recovery / inheritance).

This is inspired by [Revault](https://github.com/re-vault/revault) and [Liana](https://wizardsardine.com/liana/), adapted for
taproot and tacit's asset model.

---

## Basic Tacit Vault

```
tr(vault_internal_key, {
    and_v(
        v:pk(hot_key),
        or_d(
            pk(cold_key),
            older(144)
        )
    )
})
```

**Miniscript semantics:**
- `and_v(v:pk(hot_key), or_d(pk(cold_key), older(144)))` — The hot key must always sign.
- `or_d(pk(cold_key), older(144))` — The cold key can sign _immediately_ (hot+cold, 2-of-2), OR the hot key can spend alone
  _after_ 144 blocks (~1 day).

**In practice:**

| Path              | Signers     | Timelock | Use Case               |
|-------------------|-------------|----------|------------------------|
| Hot + Cold        | hot + cold  | none     | Routine operations,    |
| (2-of-2)          |             |          | co-signed withdrawal   |
| Hot only           | hot only    | 144      | Emergency recovery if  |
| (after timelock)   |             | blocks   | cold key is lost       |

**Tapscript compilation:**

```
<hot_key> OP_CHECKSIGVERIFY
<cold_key> OP_CHECKSIG
OP_IFDUP
OP_NOTIF
    <144> OP_CHECKSEQUENCEVERIFY
OP_ENDIF
```

**Witness size (hot-only after timelock):**
- Script: ~35 B
- Signature: 64 B
- Control block (internal key + merkle proof): ~33 B (1 branch)
- **Total weight:** 132 WU ≈ 33 vbytes (witness discount) + 10 vbytes (non-witness overhead) ≈ **43 vbytes**

**Witness size (hot+cold):**
- Script: ~35 B
- Two signatures: 128 B
- Control block: ~33 B
- **Total weight:** 196 WU ≈ 49 vbytes + non-witness ≈ **59 vbytes**

---

## Decaying Multisig (Liana-Inspired)

A more sophisticated vault starts as M-of-N and decays to M'-of-N after a timelock. This is useful for key rotation or when a
signer is expected to become unavailable.

```
thresh(2, pk(K1), s:pk(K2), s:older(52560))
```

**Semantics:**
- Before 52560 blocks (~1 year): Must satisfy `thresh(2, pk(K1), pk(K2))` — 2-of-2.
- After 52560 blocks: The `s:` (sorted) wrapper on `pk(K2)` is combined with `s:older(52560)` to create an alternative:
  `thresh(2, pk(K1), and_v(v:pk(K2), older(52560)))` effectively — but in Liana's pattern, the `s:` allows the key to be used
  with or without the timelock.

**More precisely (Liana descriptor):**

```
wsh(thresh(2, pk(K1), s:pk(K2), s:older(52560)))
```

This is a P2WSH descriptor, not taproot. The taproot equivalent would use multiple leaves:

```
tr(internal_key, {
    and_v(v:pk(K1), and_v(v:pk(K2), older(0))),       // immediate 2-of-2
    and_v(v:pk(K1), older(52560)),                     // K1 only after 1 year
    and_v(v:pk(K2), older(52560))                      // K2 only after 1 year
})
```

**Use case:** A team of two founders starts with 2-of-2. If one founder disappears, the remaining founder can recover funds
after 1 year. If both are active, they spend immediately with 2-of-2.

---

## Recovery Set (Geographically Distributed)

A recovery set splits the cold key across multiple locations, each with its own timelock:

```
tr(vault_key, {
    and_v(v:pk(hot_key), or_d(
        and_v(v:pk(hardware_1), and_v(v:pk(hardware_2), older(144))),  // HSM co-sign after 1 day
        and_v(v:pk(paper_1), and_v(v:pk(paper_2), older(52560)))       // paper backup after 1 year
    ))
})
```

**Structure:**
- Hot key can always spend (must sign all paths).
- Hardware wallet co-sign: two hardware keys after 144 blocks (~1 day).
- Paper backup: two paper wallet keys after 52560 blocks (~1 year).

This provides defense in depth: an attacker would need to compromise the hot key _and_ either both hardware wallets or both paper
wallets (each with significant access friction).

---

## Oracle-Guided Vault

A timelocked withdrawal can be gated by an oracle attestation (e.g., price feed, identity verification, legal judgment):

```
tr(vault_key, {
    and_v(v:pk(user), and_v(v:pk(oracle), older(1008)))
})
```

- **User** signs to initiate recovery.
- **Oracle** consigns only if conditions are met (e.g., identity verified, court order presented).
- **Timelock** of 1008 blocks (~1 week) gives the user time to cancel if the oracle acts maliciously.

The oracle key should be a MuSig2-aggregated key (BIP 327) to avoid a single point of compromise.

**Oracle integration via tacit opcodes:**

The oracle attestation could be embedded as a tacit opcode payload. For example, a T_ORACLE_ATTEST opcode would carry:

```
T_ORACLE_ATTEST:
  ┌──────────┬─────────────┬──────────────┬───────────────┐
  │ opcode   │ oracle_id   │ timestamp    │ attestation   │
  │ (1B)     │ (32B)       │ (8B)         │ (variable)    │
  └──────────┴─────────────┴──────────────┴───────────────┘
```

The oracle signs the concatenated attestation bytes with its Schnorr key. Inside the vault leaf, `op_checksig` verifies the
oracle signature against a pre-committed oracle public key.

---

## Integration with Tacit Kernel

The critical design insight: **the miniscript leaf and the tacit kernel are orthogonal.**

```
tr(vault_internal_key, {
    // miniscript authorization leaf
    and_v(v:pk(hot_key), or_d(pk(cold_key), older(144))),
    // tacit kernel always applies
})
```

The tacit kernel signature proves:

```
ΣC_out − ΣC_in = ephemeral_excess · G + burned · H
```

This is **independent of which authorization path is used**:

| Path              | Who signs the kernel? | What the kernel proves                     |
|-------------------|----------------------|--------------------------------------------|
| Hot + Cold (fast) | hot_key signs kernel | Supply conservation, amount integrity       |
| Hot only (delay)  | hot_key signs kernel | Same — kernel is the same, just delayed    |
| Recovery (cold)   | cold_key signs kernel| Same — kernel is independent of auth path  |

The kernel key is the same as the hot key (or a derived key). The miniscript leaf enforces _who_ may broadcast; the kernel sig
enforces _what_ the broadcast does. An attacker with a valid kernel sig but no miniscript authorization cannot spend. An
authorized signer creating an invalid kernel (e.g., creating money from nothing) will be rejected by all tacit validators.

This means **vaults can be retrofitted onto existing tacit spends** by wrapping the kernel key in a taproot tree:

1. Take an existing tacit key `K`.
2. Deploy it to `tr(K, { vault_leaf_1, vault_leaf_2, ... })`.
3. The key-path spend (`K` signs directly) is the original tacit behavior — no miniscript overhead.
4. If recovery is needed, the leaf path is used instead.

---

## Comparison: Liana vs. Tacit Vault

| Feature               | Liana (P2WSH)                              | Tacit Vault (Taproot)                       |
|-----------------------|--------------------------------------------|---------------------------------------------|
| **Script type**       | P2WSH (BIP-141)                            | P2TR (BIP-341)                              |
| **Descriptor**        | `wsh(thresh(2, pk(K1), s:pk(K2), ...))`    | `tr(K, { leaf1, leaf2, ... })`              |
| **Multi-leaf**        | Single script (all paths in one)           | Multiple leaves (tree), revealed on spend   |
| **Key-path spend**    | No (always reveals script)                 | Yes (key spend = tacit default, 16 B sig)   |
| **Privacy**           | Script revealed at spend                   | Leaf revealed only if script path used      |
| **Complexity**        | Lower (known, audited)                     | Higher (more options, more footguns)        |
| **Asset model**       | BTC only                                   | BTC + tacit confidential assets             |
| **Kernel constraint** | None                                       | Supply conservation (kernel sig)            |

**Why taproot matters for vaults:**
- The key-path spend is a single 64 B Schnorr signature — **no script revealed**. This means daily operations (hot key spends)
  are indistinguishable from any other taproot spend.
- Only when recovery is needed (leaf path) does the vault policy become visible. This protects privacy for vault holders who
  never trigger recovery.

---

## Fee Considerations (see also: anchor-outputs.md)

Vault spends, especially recovery paths with timelocks, need reliable fee bumping:

1. **Timelocked transactions** cannot be replaced by the original key (RBF is impossible if the timelock is relative).
2. **CPFP** is required: a child transaction spends the vault output (or an anchor output) to add fees.

Every vault output should be paired with a P2A anchor output (`OP_1 <0x4e73>`) to enable CPFP fee bumping. See
[anchor-outputs.md](./anchor-outputs.md) for details.

**Descriptor pairing:**

```
tr(vault_internal_key, { vault_leaf }),
wsh(and_v(v:pk(bump_key), older(0)))  // P2A anchor — spendable by anyone
```

The anchor is a P2WSH output (or simply a P2TR keyless output) that the fee bumper can spend. The anchor's value is a small
amount (e.g., 500–1000 sats) dedicated to fees.

---

## References

- BIP-141: SegWit v0 (P2WSH)
- BIP-341: Taproot (P2TR)
- BIP-342: Tapscript
- BIP 327: MuSig2 Multisig
- Liana: https://wizardsardine.com/liana/
- Revault: https://github.com/re-vault/revault
- tacit SPEC §5 — Opcode Wire Formats
- [anchor-outputs.md](./anchor-outputs.md) — P2A CPFP fee bumping
