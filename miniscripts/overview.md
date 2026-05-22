# Why Miniscript Matters for Tacit

## What Is Miniscript?

[Miniscript](https://bitcoin.sipa.be/miniscript/) (BIP 379, Draft 2023) is a structured, typed, composable language for expressing Bitcoin Script spending conditions. It sits at the top of a three-layer compilation pipeline:

```
Policy language  ──►  Miniscript  ──►  Bitcoin Script
   (human-readable)    (structured IR)   (bytecode)
```

- **Policy language:** A high-level DSL with `and()`, `or()`, `thresh()`, `older()`, `after()`, `sha256()`, etc. Users write `and(pk(A), or(pk(B), older(1000)))`.
- **Miniscript:** A canonical intermediate representation with a well-defined type system (B/K/V/W), composable fragments, and non-malleability guarantees. The compiler maps policies to optimal miniscripts.
- **Bitcoin Script:** The raw bytecode that executes on-chain.

The key innovation: Miniscript guarantees that for any correctly typed script, the *satisfaction* (witness) is non-malleable — an adversary cannot transform a valid witness into a different valid witness for the same script. This is the **HASSIG** property.

## Production Readiness

Despite being a draft BIP, Miniscript is stable and deployed in production:

- **Bitcoin Core v25.0+** — native miniscript support in the wallet (descriptor-based)
- **Wallets:**
  - [Liana](https://wizardsardine.com/liana/) — timelocked recovery, full miniscript + descriptors
  - [Sparrow](https://sparrowwallet.com/) — multi-sig, miniscript policy editor
  - [Specter](https://specter.solutions/) — DIY multisig, miniscript descriptor import
  - [MyCitadel](https://mycitadel.io/) — miniscript-first desktop wallet
- **Hardware wallet support via BIP 388 (Wallet Policy Template):**
  - Ledger (v2.2.0+) — miniscript policy signing via `ledgerjs`
  - BitBox02 — miniscript descriptor support
  - Jade (Blockstream) — miniscript + multisig via BIP 388

## Why Tacit Should Care

Every tacit UTXO lives inside a Taproot script-path envelope. The on-chain script is (from `src/envelope/script.ts` + `tacit-specs/SPEC.md` §5):

```
<signing_pub_xonly> OP_CHECKSIG OP_FALSE OP_IF <TACIT> <0x01> <payload_chunks...> OP_ENDIF
```

The internal key is the BIP-341 NUMS point (`50929b...3ac0`), which has no known private key — so **every** spend must go through the script path. The entire tacit protocol (CXFER, MINT, BURN, AMM, etc.) rides in the `OP_FALSE OP_IF` branch that never executes.

Miniscript could **replace or coexist with** this envelope structure to express Cryptographically richer spending conditions. Three use-case categories emerge:

### 1. Recovery — Timelocked Fallback Paths

Today, losing the signing key means losing access to tacit UTXOs. There is no recovery mechanism. A Miniscript leaf could encode:

```
and(
  pk(signing_key),                    // normal tacit spend
  or(
    pk(recovery_key),                 // recovery key (cold storage)
    older(52560)                      // or wait ~1 year and spend with any key
  )
)
```

Compiled: `and_v(v:pk(signing_key), or_d(pk(recovery_key), older(52560)))`.

The signing key continues to work for normal spends (short witness, privacy-preserving). The recovery path only activates after the timelock, and only the recovery key can spend before the full timeout. This is the [Liana](https://wizardsardine.com/liana/) pattern, applied to each tacit UTXO.

### 2. Multi-Party — Escrow, Multisig Governance, Dispute Resolution

Tacit assets governed by a DAO or multi-sig could use:

```
thresh(2, pk(alice), pk(bob), pk(charlie))
```

Compiled: `thresh(2, pk(alice), pk(bob), pk(charlie))` → miniscript `multi_a(2, alice, bob, charlie)` in Tapscript (using `OP_CHECKSIGADD`).

More complex: a dispute-resolution tree:

```
and(
  pk(party_a_agent),
  pk(party_b_agent),
  or(
    pk(arbitrator),
    and(pk(party_a), pk(party_b))
  )
)
```

The arbitrator can force-resolve a dispute; if both parties cooperate they can spend without the arbitrator.

### 3. Atomicity — Hashlocked Swaps

Miniscript natively supports hash locks (`sha256()`, `hash256()`, `ripemd160()`, `hash160()`). A Tacit atomic swap could use:

```
and(
  pk(recipient),
  sha256(preimage_hash)
)
```

Combined with a timelock refund:

```
or(
  and(pk(recipient), sha256(preimage_hash)),
  and(pk(sender), older(144))
)
```

This mirrors the script structure of a classic HTLC, but expressed in composable miniscript. The preimage reveal atomicity binds the tacit asset transfer to the Bitcoin base-layer payment without requiring off-chain coordination infrastructure.

## What This Means for the Protocol

- Existing tacit validators (kernel sig, range proofs, supply conservation) are **unchanged** — miniscript lives at the Bitcoin Script layer, not inside the envelope payload.
- The `signing_pub_xonly` in the canonical envelope is replaced with a Miniscript root (a tapleaf) that requires the kernel sig *as one of its branches*.
- Recovery, multisig, and atomicity can be composed freely, per-UTXO, without any change to the tacit opcode wire format.
