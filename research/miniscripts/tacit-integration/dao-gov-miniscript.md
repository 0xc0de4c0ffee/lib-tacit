# DAO Governance via Miniscript

## Status: R&D — Drafted Tacit Opcodes (0x50–0x53), No Implementation

Tacit defines four governance opcodes in the drafted range (SPEC §1.1):

| Opcode | Mnemonic     | Status     | Purpose                        |
|--------|--------------|------------|--------------------------------|
| 0x50   | T_GOV_PROPOSAL | Drafted  | Submit on-chain proposal hash  |
| 0x51   | T_GOV_VOTE     | Drafted  | Cast a vote (weighted by supply)|
| 0x52   | T_GOV_VETO     | Drafted  | Veto an approved proposal      |
| 0x53   | T_GOV_EXECUTE  | Drafted  | Execute approved proposal      |

Current design assumes off-chain vote tallying: proposals are submitted as a hash, votes are cast on-chain, and a trusted party (or
multisig) triggers EXECUTE once tallying confirms threshold. There is **no on-chain enforcement** of _which_ keys may execute, _how
many_ signatures are required, or _what delay_ applies to veto — all of that is deferred to application-layer policy.

---

## Problem: Missing Enforcement Layer

A DAO treasury held as a tacit UTXO is controlled by a single kernel signature (a single secp256k1 key). This means:

1. **Single point of failure** — one compromised key drains the treasury.
2. **No quorum enforcement** — nothing on-chain prevents a minority from executing.
3. **No timelock on veto** — a veto authority can act immediately, with no governance delay.
4. **No tiered access** — operational vs. large vs. emergency spending are indistinguishable on-chain.

The tacit kernel proves supply conservation (`ΣC_out − ΣC_in = 0 + burned·H`) but does not constrain _who_ signs. The governance
layer is entirely off-chain.

---

## Miniscript Solution: thresh() Leaves

Bitcoin Miniscript compiles to taproot script leaves that enforce multi-party authorization at the consensus layer. For a DAO
treasury, the output script is:

```
tr(dao_internal_key, {
    <GOV_EXECUTE_LEAF>
})
```

### 3-of-5 Board Execution

The simplest leaf enforces M-of-N signing for the EXECUTE path:

```
thresh(3, pk(K1), pk(K2), pk(K3), pk(K4), pk(K5))
```

This compiles to the following Tapscript (BIP-342):

```
<K1> OP_CHECKSIG
<K2> OP_CHECKSIGADD
<K3> OP_CHECKSIGADD
<K4> OP_CHECKSIGADD
<K5> OP_CHECKSIGADD
3 OP_EQUAL
```

**Size:** ~173 B (script: 5 × (1 + 32) + 5 opcodes + 3 overhead) + 64 B × 3 Schnorr sigs + 33 B control block = 398 WU total for the witness. At 1 WU/B witness discount, this contributes ~398 WU ≈ 100 vB. Plus input overhead (41 vB non-witness): ~141 vB per input.

The leaf is revealed on-chain only during spends. Before execution, the DAO treasury output is indistinguishable from any other
taproot output (key-path spend could be used for routine operations — see tiered access below).

---

## Proposal Execution Flow

```
  Off-chain                          On-chain
  ──────────                       ──────────
  1. Proposal drafted
     (forum / snapshot)
         │
  2. Vote tallying
     (simple majority,
      quorum ≥ 20%)
         │
  3. M board members
     sign PSBT
     ──────────────►  4. PSBT assembled with M sigs
                      5. Spend tx satisfies thresh() leaf
                      6. Broadcast: treasury → proposal
                         payload via T_GOV_EXECUTE (0x53)
```

**Step-by-step:**

1. **Proposal created** — Off-chain governance forum or Snapshot vote. Contains destination addresses, amounts, and tacit asset
   amounts (etched asset ID, minted quantities).
2. **Vote tallying** — Determine approval. A simple heuristic: `yes_votes / total_supply > 50%` and quorum `> 20%` of supply votes.
   Tacit's T_GOV_VOTE opcode carries a weight equal to the voter's tacit asset balance.
3. **PSBT signing** — M board members independently validate the proposal, then sign a PSBT with their respective
   `OP_CHECKSIG` inputs. Each signer uses BIP-340 Schnorr (compatible with BIP 327 MuSig2 key aggregation if desired).
4. **Witness assembly** — The PSBT collector compresses M Schnorr signatures into the script witness stack, revealing the
   `thresh(3, ...)` leaf.
5. **Broadcast** — The transaction spends the DAO treasury UTXO, with the tacit kernel signature proving supply conservation:
   `ΣC_out − ΣC_in = ephemeral_excess · G + burned · H`. The kernel sig is the aggregate of the miniscript signatures (leaf
   validation) _plus_ the kernel excess signature (tacit validation).

---

## Time-locked Veto

A veto power allows a designated key to cancel an approved proposal, but only after a timelock. This prevents unilateral blocking
of legitimate proposals while allowing a security council to intervene if a proposal is malicious.

```
or_i(
    thresh(3, pk(K1), pk(K2), pk(K3), pk(K4), pk(K5)),   // normal execute
    and_v(
        v:pk(veto_key),                                    // veto authority
        older(4320)                                        // ~30 days (4320 blocks)
    )
)
```

**Interpretation:**
- M-of-N board executes immediately
- Veto key can cancel _only after_ 4320 blocks (~30 days at 10 min/block)
- During the veto window, any board member can execute; after the window, veto can override

The `or_i` combiner gives the first clause priority: if the board signs, their spend succeeds before the veto timelock expires.
Only if no board action occurs does the veto path become available.

**Caveat:** This is a one-spend output — once either path is taken, the output is spent. The veto cannot _reverse_ an execution;
it can only _preempt_ it by spending to an alternative (e.g. a refund address) before the board executes.

---

## Treasury Categorization

A single DAO can issue multiple outputs with different miniscript policies:

### Operational Budget — 2-of-3 Board

```
tr(dao_op_key, {
    thresh(2, pk(Board1), pk(Board2), pk(Board3))
})
```

- **Purpose:** Day-to-day expenses, service payments, gas fees.
- **Threshold:** 2 of 3 — fast, low ceremony.
- **Typical amount:** ≤ 5% of treasury. Small enough that compromise is contained.

### Large Expenditure — 4-of-7 (Board + Treasury Committee)

```
tr(dao_large_key, {
    thresh(4, pk(Board1), pk(Board2), pk(Board3), pk(Board4),
             pk(Board5), pk(Treasury1), pk(Treasury2))
})
```

- **Requires:** 4 of 7 — board (5 members) + treasury committee (2 members).
- **Purpose:** Grants, large purchases, protocol upgrades.
- **Typical amount:** > 5% of treasury. Higher security, broader quorum.

### Emergency — Timelocked Safe

```
tr(dao_emergency_key, {
    and_v(
        v:pk(MultisigSafe),
        older(144)
    )
})
```

- **Behavior:** A designated safe key can spend _after_ 144 blocks (~1 day).
- **Purpose:** Emergency pause / freeze. If a vulnerability is discovered, the safe can move funds to a secure address after a
  24-hour delay, giving the board time to counter-sign if the safe key is compromised.
- **Key rotation:** The safe key should be a MuSig2-aggregated key (BIP 327) held by a separate set of signers.

### Combined Output (All Policies in One UTXO)

```
tr(dao_treasury_key, {
    thresh(2, pk(B1), pk(B2), pk(B3)),                           // operational
    thresh(4, pk(B1), pk(B2), pk(B3), pk(B4), pk(B5), pk(T1), pk(T2)), // large
    and_v(v:pk(Safe), older(144)),                                // emergency
    and_v(v:pk(Veto), older(4320))                                // governance veto
})
```

Each leaf is revealed only when used. The key path (`dao_treasury_key`) can remain unused, hiding all governance structure until
the first spend.

---

## Comparison: Miniscript DAO vs. Token-Voting DAO

| Dimension             | Miniscript DAO                              | Token-Voting DAO (e.g. Compound, Uniswap) |
|-----------------------|---------------------------------------------|-------------------------------------------|
| **Authorization**     | Fixed key set (board members)               | Token-weighted vote                       |
| **Vote delegation**   | Impossible (keys are not transferable)      | Possible (delegation contracts)           |
| **Sybil resistance**  | Inherent (keys cost money, KYC'd)           | Requires token distribution               |
| **On-chain cost**     | ~72 vbytes per spend (witness discount)     | Hundreds of thousands of gas (complex calls) |
| **Privacy**           | Leaf hidden until spend (taproot)           | All votes visible on-chain immediately    |
| **Trust model**       | Board is known, accountable                 | "Whales" can be pseudonymous              |
| **Governance speed**  | Fast (board signs when ready)               | Slow (voting period + timelock)           |
| **Censorship resist.**| Low (board controls all spends)             | High (anyone can propose, token-holders vote) |
| **Complexity**        | Low (Bitcoin Script, audited)               | High (Solidity, upgradeable proxies)      |

**Key insight:** A Miniscript DAO is not a replacement for token-voting DAOs — it is a different trust model. It is suitable for
foundations, endowments, and boards where keyholders have legal identity and fiduciary duty. Token-voting DAOs are suitable for
decentralized, permissionless governance.

---

## Integration with Tacit Opcodes

The T_GOV_EXECUTE opcode (0x53) would reference the miniscript leaf rather than carrying signatures inline:

### Current (Drafted) EXECUTE Wire Format

```
T_GOV_EXECUTE:
  ┌──────────┬───────────┬──────────────┬─────────────┐
  │ opcode   │ proposal  │ execute_sig  │ asset_id    │
  │ (1B)     │ hash (32B)│ (64B)        │ (32B)       │
  └──────────┴───────────┴──────────────┴─────────────┘
```

### Proposed Miniscript-Aware EXECUTE Wire Format

```
T_GOV_EXECUTE (miniscript-aware):
  ┌──────────┬───────────┬─────────────┬───────────────┬───────────────┐
  │ opcode   │ proposal  │ leaf_hash   │ n_sigs        │ sigs[]        │
  │ (1B)     │ hash (32B)│ (32B)       │ (1B)          │ (64B × n)     │
  └──────────┴───────────┴─────────────┴───────────────┴───────────────┘
```

- **`leaf_hash`** — The tapleaf hash of the miniscript policy being satisfied. The validator fetches the DAO's output script from the
  referenced UTXO, extracts tapleaves, matches leaf_hash, and verifies the witness.
- **`n_sigs`** — Number of Schnorr signatures (M in M-of-N).
- **`sigs[]`** — The actual signatures, placed in witness order matching the leaf script.

The kernel signature continues to prove supply conservation as before:

```
verifyKernel(ΣC_out, ΣC_in, burned, kernel_excess, kernel_sig)
```

The miniscript signatures prove authorization; the kernel sig proves balance. Both are independent constraints on the same
transaction.

---

## Privacy Considerations

- **Pre-spend:** The DAO treasury is a taproot output with `tr(dao_internal_key, { ... })`. The internal key can be a NUMS point
  (e.g. `H` from tacit's generator set), making the output indistinguishable from a key-path-only spend.
- **Post-spend:** The executed leaf is revealed on-chain, exposing the miniscript policy (M-of-N board composition). Board member
  public keys are visible to chain analysis.
- **Mitigation:** Board members could use BIP-32 unhardened derivation (xpub) so each spend uses fresh public keys under the same
  policy root. The leaf script changes each time, but the thresh() structure is the same — a determined analyst can cluster them.

---

## References

- BIP-340: Schnorr Signatures for secp256k1
- BIP-341: Taproot: SegWit v1 Outputs
- BIP-342: Tapscript: SegWit v1 Script Validation
- BIP 327: MuSig2 Multisig
- Bitcoin Miniscript: https://bitcoin.science/miniscript
- tacit SPEC §1.1 — Opcode Table (governance range 0x50–0x56)
