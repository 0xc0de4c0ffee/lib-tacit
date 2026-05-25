# Tradeoffs: P2WSH vs Taproot vs Envelope for Tacit UTXOs

## Approach A: Current Tacit (Taproot Envelope with NUMS Key)

The current implementation uses a taproot output with the **NUMS internal key** (no one can spend via key path) and the opcode wire format encoded in a single tapscript leaf.

```
tr(NUMS_key, {
  <opcode_payload>
})
```

**Pros:**
- Works today on mainnet — no new dependencies or protocol changes
- Well-tested through the tacit test suite and reference implementation
- No miniscript dependency required
- Simple: one script leaf, one purpose

**Cons:**
- **45 B envelope overhead** (TACIT magic bytes + version + length prefix) on every UTXO
- **No key-path spend** — every spend reveals the full script and proves tacit usage
- **No auxiliary conditions** — no timelocks, no multisig, no hashlocks
- **Single-key only** — all tacit UTXOs are controlled by one kernel key; no recovery path

---

## Approach B: P2WSH Miniscript

Replace the taproot envelope with a native P2WSH output wrapping a miniscript policy.

```
wsh(and_v(v:pk(kernel_key), or_d(pk(recovery_key), older(52560))))
```

**Pros:**
- **Widest hardware wallet support** — Ledger, BitBox02, Jade all support BIP 388 wallet policies and P2WSH miniscript spending
- **No envelope overhead** — the miniscript itself encodes the spending conditions; no TACIT magic bytes
- **Liana-scale complexity limits** — proven production use at Wizardsardine with thousands of UTXOs
- **BIP 379 type system** — non-malleable satisfaction guarantees

**Cons:**
- **No key-path spend** — the script is always revealed on-chain
- **Script size limit** — 3,600 B (less of an issue for tacit's compact opcodes, but constraining for future expansion)
- **CHECKMULTISIG key limit** — ≤20 keys in a single thresh() clause
- **No tacit kernel integration** — the kernel key is just one of potentially multiple miniscript keys; no built-in understanding of kernel validation

---

## Approach C: Taproot + Miniscript (Proposed)

The internal key becomes the tacit kernel verifying key (or a MuSig2 aggregate), and spending conditions become tapscript leaves.

```
tr(kernel_key, {
  and_v(v:pk(recovery_key), older(52560)),
  thresh(2, pk(escrow_a), pk(escrow_b), pk(escrow_c)),
  sha256(H)
})
```

**Pros:**
- **Key-path spend** — indistinguishable from any other P2TR transaction (privacy win)
- **Key path = kernel validation** — the tacit kernel signature serves directly as the key-path signature
- **Unlimited script complexity** — taproot merkle tree supports many leaves; no practical script size limit (~400 KB)
- **Unlimited multisig** — MuSig2 key aggregation or tapscript thresh() with 100+ keys
- **Richest feature set** — timelocks, hashlocks, threshold policies, all coexisting as separate leaves

**Cons:**
- **Fewer hardware wallets** support tapscript miniscript (ecosystem maturing)
- **Larger control block** — each script-path spend reveals the leaf script + merkle proof (~65 B overhead per leaf level)
- **Less mature ecosystem** — fewer production wallets, fewer toolchains, less audited

---

## Decision Matrix

| Criterion | Envelope (Current) | P2WSH Miniscript | Taproot Miniscript |
|---|---|---|---|
| On-chain bytes (CXFER) | 879 B | ~850 B | ~850 B |
| Key-path spend | No | No | **Yes** |
| Timelocked recovery | No | **Yes** | **Yes** |
| Multisig | No | **Yes** (≤20) | **Yes** (unlimited) |
| Hashlock | No | **Yes** | **Yes** |
| Hardware wallet support | N/A | **Good** | Limited |
| Script size limit | 520 B/chunk | 3,600 B | ~400 KB |
| Privacy (looks like normal tx) | No | No | **Yes** (key path) |
| Code complexity | Current | New module | New module |
| Kernel sig integration | Native | Ad-hoc leaf | **Native** (key path) |
| Maturity | **Production** | Production (Liana) | Experimental |

---

## Recommendation

**Taproot + miniscript is the long-term target.** It offers the best privacy (key-path spends), the richest feature set (timelocks, multisig, hashlocks as separate leaves), and native kernel-sig integration (key path = kernel signature).

**P2WSH miniscript is a practical intermediate step** — it maximizes hardware wallet compatibility today and lets tacit users secure UTXOs with timelocked recovery while the taproot miniscript ecosystem matures.

The current envelope approach remains viable for simple transfers but should be deprecated once miniscript paths are stable.

---

## Open Questions

1. Can the kernel verification key be aggregated with a recovery key via MuSig2 into a single internal key, so both key-path and recovery-leaf spends are possible?
2. Should the miniscript policy be committed to in the envelope, or derived from a BIP 388 descriptor synchronized out of band?
3. How do we handle the transition period where some UTXOs are envelope-based and some are miniscript-based?
