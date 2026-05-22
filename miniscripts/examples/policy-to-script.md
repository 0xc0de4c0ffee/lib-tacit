# Policy → Miniscript → Bitcoin Script Compilation

Concrete examples tracing the full pipeline from human-readable spending policy through Miniscript intermediate representation to raw Bitcoin Script bytecode, with witness satisfaction and byte-level sizing.

All examples use **32-byte x-only public keys** (BIP 340 / Tapscript) unless otherwise noted.

---

## Example 1: Single Key

The simplest spending condition: a single public key must supply a valid signature.

```
Policy:      pk(A)
Miniscript:  pk(A)
Script ASM:  <A> CHECKSIG
Script Hex:  20 <32B A> ac
Size:        34 B script + 64 B sig = 98 B
```

### Compilation Pipeline

| Layer | Representation |
|-------|---------------|
| Policy | `pk(A)` |
| Miniscript | `pk(A)` — trivially a valid fragment, no wrapping |
| Bitcoin ASM | `<A> OP_CHECKSIG` |
| Bitcoin Hex | `20a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0bac` |
| Witness | `[<sig_A>]` |
| Satisfaction cost | 1 × (64 B Schnorr sig) |

### Script Hex Breakdown

```
20                                        — OP_PUSHBYTES_32
  a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5      — 32-byte x-only pubkey A
  e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
ac                                        — OP_CHECKSIG
```

### Witness Stack

```
<sig_A>    (64-byte BIP-340 Schnorr signature)
```

Execution: `CHECKSIG` pops `<sig_A>` and `<A>` (pushed by script), verifies, pushes `1`.

### Size Breakdown

| Component | Bytes | Weight Units |
|-----------|-------|-------------|
| Script: key push (1 + 32) | 33 | — |
| Script: OP_CHECKSIG | 1 | — |
| **Script total** | **34 B** | 34 × 4 = 136 WU |
| Witness: element count | 1 | 1 WU |
| Witness: signature | 64 | 64 WU |
| **Total input** | | **~201 WU ≈ 50.25 vB** |

---

## Example 2: Timelocked Recovery

A primary signing key can spend freely. After 52560 blocks (~1 year), the timelock is also satisfied, allowing a recovery key to spend.

```
Policy:      and(pk(A), older(52560))
Miniscript:  and_v(v:pk(A), older(52560))
Script ASM:  <A> CHECKSIGVERIFY <52560> CHECKSEQUENCEVERIFY
Script Hex:  20 <32B A> ad 03 50cd00 b2
Size:        ~39 B script + 64 B sig = ~103 B
```

### Compilation Walkthrough

```
          and(pk(A), older(52560))
         /                       \
   pk(A)                    older(52560)
   ───────                  ────────────
   <A> CHECKSIG (B)         <52560> CSV (V)
        │
   v:wrapper (B→V)
        │
   <A> CHECKSIGVERIFY (V)
        │
        └──── and_v(X, Y) — sequence X then Y — both must verify ────
```

### Script Hex Breakdown

```
20                                        — push 32 bytes
  a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5      — pubkey A
  e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
ad                                        — OP_CHECKSIGVERIFY
03                                        — push 3 bytes
  50  cd  00                              — 52560 as CScriptNum LE
b2                                        — OP_CHECKSEQUENCEVERIFY
```

### Timelock Encoding

52560 blocks = 0xCD50. As CScriptNum: minimum bytes in little-endian with sign bit in the most significant byte. Since 0xCD has bit 7 set (0xCD = 11001101), we prepend 0x00 to indicate positive: `50 CD 00`.

### Witness Stack

```
<sig_A>    (64 B Schnorr signature)
```

Timelock is implicitly satisfied by transaction `nSequence`. The spender sets `nSequence = 52560` (bits 31 and 22 disabled, bit 21 set for relative locktime in blocks). `OP_CHECKSEQUENCEVERIFY` reads this from the transaction, not the stack — no witness element needed.

### Execution Trace

```
Stack init: [sig_A]
→ <A> CHECKSIGVERIFY: pops sig_A, verifies → continues (void)
→ <52560> CSV: pushes 52560, validates nSequence ≥ 52560 → continues
→ Script passes
```

### Size Breakdown

| Component | Bytes |
|-----------|-------|
| Script: key push + CHECKSIGVERIFY | 34 |
| Script: 52560 push (4 bytes) | 4 |
| Script: OP_CHECKSEQUENCEVERIFY | 1 |
| **Script total** | **39 B** |
| Schnorr signature (witness) | 64 B |
| **Total input contribution** | **~103 B** |

---

## Example 3: 2-of-3 Escrow

Three parties (buyer, seller, arbitrator). Any 2 of the 3 must sign to spend.

```
Policy:      thresh(2, pk(A), pk(B), pk(C))
Miniscript:  thresh(2, pk(A), s:pk(B), s:pk(C))
Script ASM:  <A> CHECKSIG SWAP <B> CHECKSIG ADD SWAP <C> CHECKSIG ADD 2 EQUAL
Script Hex:  21 <33B A> ac 7c 21 <33B B> ac 93 7c 21 <33B C> ac 93 52 87
Size:        ~108 B script + 128 B sigs = ~236 B
```

### Compilation Walkthrough

```
thresh(2, pk(A), pk(B), pk(C))
│
├── pk(A)         →  <A> CHECKSIG          leaves 0/1
├── pk(B)         →  <B> CHECKSIG
│      s:wrapper  →  SWAP <B> CHECKSIG     (swap for accumulator)
├── pk(C)         →  <C> CHECKSIG
│      s:wrapper  →  SWAP <C> CHECKSIG
│
└── thresh(2,..)  →  accumulate ADD, check 2 EQUAL
```

The `s:` (swap) wrapper is needed because thresh evaluates children left-to-right but the stack accumulation pattern requires swapping between evaluations. Without `s:`, the boolean results would stack in the wrong order for the final `k EQUAL` check.

### Script Hex (P2WSH with compressed keys)

Shown with 33-byte compressed keys (required for P2WSH — 33 bytes ≈ 34 B push):

```
21                                        — OP_PUSHBYTES_33
  02a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5    — compressed pubkey A (0x02 prefix)
  e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
ac                                        — OP_CHECKSIG (A)
7c                                        — OP_SWAP
21 ... ac                                 — pk(B) with s: wrapper
93                                        — OP_ADD
7c                                        — OP_SWAP
21 ... ac                                 — pk(C) with s: wrapper
93                                        — OP_ADD
52                                        — OP_2
87                                        — OP_EQUAL
```

### Script Hex (Tapscript with multi_a, BIP 386)

Under BIP 386, Tapscript emits `multi_a(2, A, B, C)` using `OP_CHECKSIGADD` (0xba). This saves bytes by eliminating SWAP wrappers and using 32-byte x-only keys:

```
20 <32B A xonly> ac   — OP_CHECKSIG (initializes accumulator)
20 <32B B xonly> ba   — OP_CHECKSIGADD (adds to accumulator)
20 <32B C xonly> ba   — OP_CHECKSIGADD
52 87                  — OP_2 OP_EQUAL
```

**Savings:** ~108 B → ~90 B script, and witness drops placeholders (only actual signers).

### Witness Stack (P2WSH, A+B sign, C does not)

```
wit[0] = 0                    (deepest — placeholder for C, "not signing")
wit[1] = <sig_B>              (for pk(B), swapped before evaluation)
wit[2] = <sig_A>              (top of stack — for pk(A), first to execute)
```

Witness array: `[0, sig_B, sig_A]` — ordering determined by the miniscript satisfaction algorithm so that stack pops match the script's left-to-right evaluation.

### Execution Trace (P2WSH)

```
Stack init: [0, sig_B, sig_A]
→ <A> CHECKSIG: pops sig_A, verifies → 1               Stack: [0, sig_B, 1]
→ SWAP:  │                                               Stack: [0, 1, sig_B]
→ <B> CHECKSIG: pops sig_B → 1                          Stack: [0, 1, 1]
→ ADD: 1+1=2                                             Stack: [0, 2]
→ SWAP:  │                                               Stack: [2, 0]
→ <C> CHECKSIG: pops C_key, pops 0 (invalid) → 0        Stack: [2, 0]
→ ADD: 0+2=2                                             Stack: [2]
→ 2 EQUAL: pushes 2, checks 2==2 → 1                    Stack: [1]
→ Script passes
```

### Witness Stack (Tapscript multi_a, A+B sign)

```
<sig_A>
<sig_B>
```

No placeholder for C — `multi_a` uses `OP_CHECKSIGADD` which doesn't need dummy elements. Only actual signers appear in the witness.

### Size Breakdown

| Component | P2WSH | Tapscript multi_a |
|-----------|-------|-------------------|
| Script | ~108 B | ~90 B |
| Signatures | 128 B (2 × 64) | 128 B (2 × 64) |
| Dummy elements | 1 B | 0 |
| **Total witness** | **129 B** | **128 B** |
| **Total input** | **~236 B** | **~218 B** |

---

## Example 4: Hashlocked Swap

The atomic swap primitive: a recipient can spend by providing both their signature and the preimage to a SHA256 hash. The atomicity guarantee: revealing the preimage on one chain enables spending on the other.

```
Policy:      and(pk(B), sha256(H))
Miniscript:  and_v(v:pk(B), sha256(H))
Script ASM:  <B> CHECKSIGVERIFY SIZE 32 EQUALVERIFY SHA256 <H> EQUAL
Script Hex:  20 <32B B> ad 82 5c 20 88 a8 20 <32B H> 87
Size:        ~73 B script + 96 B witness = ~169 B
```

### Compilation Walkthrough

The `sha256(H)` Miniscript fragment compiles to more than just `SHA256 <H> EQUAL`. It also enforces the preimage is exactly 32 bytes (`SIZE 32 EQUALVERIFY`), preventing malleability:

```
sha256(H) → OP_SIZE <32> EQUALVERIFY OP_SHA256 <H> OP_EQUAL
               │          │            │         │     │
               │          │            │         │     └── verify hash matches
               │          │            │         └── expected hash H
               │          │            └── compute SHA256 of preimage
               │          └── preimage must be exactly 32 bytes
               └── check preimage length
```

Without the `SIZE 32 EQUALVERIFY` guard, a preimage longer than 32 bytes could still match the hash (due to hash function padding), creating a malleability vector.

### Script Hex Breakdown

```
20                                        — push B
  <32B B xonly>
ad                                        — OP_CHECKSIGVERIFY
82                                        — OP_SIZE
5c 20                                     — OP_PUSHDATA1 push byte 0x20 (= 32)
88                                        — OP_EQUALVERIFY
a8                                        — OP_SHA256
20 <32B H>                                — push expected hash H
87                                        — OP_EQUAL
```

### Witness Stack

```
<preimage_32B>    (exactly 32 bytes — the SHA256 preimage)
<sig_B>           (B's signature)
```

Witness array: `[<preimage>, <sig_B>]`.

### Execution Trace

```
Stack init: [preimage, sig_B]
→ <B> CHECKSIGVERIFY: pops sig_B, verifies → continues
→ SIZE: pushes preimage length (32)
→ 32 EQUALVERIFY: 32 == 32 → continues
→ SHA256: pops preimage, pushes SHA256(preimage) = computed_hash
→ <H> EQUAL: computed_hash == H? → 1
→ Script passes
```

### Real-World Usage

This is the script half of an HTLC:

```
or(
  and(pk(recipient), sha256(H)),      // recipient claims with preimage
  and(pk(sender), older(144))          // sender refunds after ~1 day
)
```

The atomic swap protocol:
1. Sender locks tacit UTXO with `and(pk(recipient), sha256(H))`
2. Recipient reveals preimage `s` on Bitcoin base layer to claim
3. Sender observes `s` on Bitcoin, uses it to claim the tacit asset
4. If recipient never claims, sender reclaims after 144 blocks (refund)

### Size Breakdown

| Component | Bytes |
|-----------|-------|
| Script: B key + CHECKSIGVERIFY | 34 |
| Script: SHA256 check (SIZE + EQUALVERIFY + SHA256 + H + EQUAL) | ~39 |
| **Script total** | **~73 B** |
| Preimage (witness) | 32 B |
| Signature (witness) | 64 B |
| **Total input** | **~169 B** |

---

## Example 5: Decaying Multisig

A 2-of-2 that decays to 1-of-1 after a timelock. Before 52560 blocks, both A and B must sign. After the timelock, A alone can spend.

```
Policy:      thresh(2, pk(A), pk(B), older(52560))
Miniscript:  thresh(2, pk(A), s:pk(B), s:older(52560))
Script ASM:  <A> CHECKSIG SWAP <B> CHECKSIG ADD SWAP <52560> CHECKSEQUENCEVERIFY 0NOTEQUAL ADD 2 EQUAL
Script Hex:  21 <33B A> ac 7c 21 <33B B> ac 93 7c 03 50cd00 b2 92 93 52 87
Size:        ~108 B script + 128 B or 64 B witness
```

### Compilation Walkthrough

The `older(52560)` fragment is type `V` (verify), but `thresh(k, ...)` requires each child to be type `B` (base, producing a boolean). The `s:older(52560)` fragment wraps `older()` with swap semantics, and the `0NOTEQUAL` opcode (0x92) converts CSV's nondeterministic stack result to a clean 0/1 boolean.

```
thresh(2, pk(A), pk(B), older(52560))

pk(A)         →  <A> CHECKSIG                          → leaves bool
pk(B)         →  SWAP <B> CHECKSIG (s:wrapper)         → leaves bool
older(52560)  →  SWAP <52560> CSV 0NOTEQUAL (s:wrapper)→ leaves bool
                →  ... 2 EQUAL
```

The `0NOTEQUAL` converts anything on the stack after CSV to a clean 0/1. CSV may leave nothing (if it pre-verified and consumed the value) or leave the value itself, depending on implementation. `0NOTEQUAL` normalizes this.

### Script Hex (P2WSH with compressed keys)

```
21  <33B A>  ac        — pk(A)
7c                      — SWAP
21  <33B B>  ac  93    — s:pk(B) + ADD
7c                      — SWAP
03 50cd00  b2  92  93  — s:older(52560) + 0NOTEQUAL + ADD
52  87                  — 2 EQUAL
```

### Witness Stack (Before Timelock — Both Keys)

```
<sig_A>
<sig_B>
<0>               (placeholder for older — evaluates to 0/false before timelock)
```

Witness array: `[0, sig_B, sig_A]`.

### Witness Stack (After Timelock — A Alone)

```
<sig_A>
<0>               (placeholder for B — not needed)
<empty>           (older satisfied by nSequence)
```

Witness array: `[<empty>, 0, sig_A]`. The empty element for `older()` means "satisfied by nSequence, no explicit witness needed."

The execution: pk(A) → 1, pk(B) with 0 → 0, ADD → 1, older(52560) with empty → CSV succeeds (nSequence ≥ 52560), 0NOTEQUAL → 1, ADD → 2, 2 EQUAL → true.

### Correct Miniscript Alternative

The `thresh` approach with `s:older()` is a simplified representation. A production compiler (e.g., `rust-miniscript`) would generate a different structure. The canonical decaying multisig uses `or_d`:

```
or_d(
  and_v(v:pk(A), pk(B)),        // Before timelock: A + B both sign
  and_v(v:pk(A), older(52560)) // After timelock: A alone + timelock
)
```

Compiled: `and_v(v:pk(A), or_d(pk(B), older(52560)))` — the same structure as the Liana recovery wallet pattern.

### Size Breakdown

| Component | Before Timelock | After Timelock |
|-----------|----------------|----------------|
| Script | ~108 B | ~108 B |
| Signatures | 128 B (2 × 64) | 64 B |
| Placeholders | 1 B | 1 B |
| **Total witness** | **129 B** | **65 B** |
| **Total input** | **~237 B** | **~173 B** |

---

## Example 6: Oracle-Published Price Feed

A spend requires authorization from two independent parties (A and B), plus an absolute timelock ensuring a specific block height has been reached. This models a scenario where an oracle publishes a price at a known height, and the spend is only valid after that publication.

```
Policy:      and(and(pk(A), pk(B)), after(1000000))
Miniscript:  and_v(and_v(v:pk(A), pk(B)), after(1000000))
Script ASM:  <A> CHECKSIGVERIFY <B> CHECKSIG <1000000> CHECKLOCKTIMEVERIFY
Script Hex:  20 <32B A> ad 20 <32B B> ac 04 40420f00 b1
Size:        ~72 B script + 128 B sigs = ~200 B
```

### Compilation Walkthrough

```
          and(and(pk(A), pk(B)), after(1000000))
         /                                       \
   and(pk(A), pk(B))                       after(1000000)
   /               \                       └── absolute locktime
pk(A)            pk(B)
│                 │
v:wrapper        (no wrapper)
│                 │
<A> CHECKSIGVERIFY  <B> CHECKSIG

and_v(v:pk(A), pk(B))  →  <A> CHECKSIGVERIFY <B> CHECKSIG  (V from V·B)

and_v(above, after(1000000))  →  <A> CHECKSIGVERIFY <B> CHECKSIG <1000000> CLTV
```

### Script Hex Breakdown

```
20 <32B A xonly> ad                    — pk(A) with v:wrapper → CHECKSIGVERIFY
20 <32B B xonly> ac                    — pk(B) → CHECKSIG
04 40420f00 b1                          — after(1000000) → CLTV
```

The inner `and_v(v:pk(A), pk(B))` produces a type `V` (verify) because the first child is wrapped with `v:` (converting B→V), and `and_v(V, B)` → `V`. The outer `and_v(V, after(...))` → `V`.

### Witness Stack

```
<sig_A>
<sig_B>
```

Witness array: `[sig_B, sig_A]` (top = sig_A for first verification).

### Execution Trace

```
Stack init: [sig_B, sig_A]
→ <A> CHECKSIGVERIFY: pops sig_A, verifies → continues
→ <B> CHECKSIG: pops sig_B, verifies → 1 (leaves bool)
→ <1000000> CLTV: pushes 1000000, validates nLockTime ≥ 1000000 → continues
→ 1 left on stack → Script passes
```

### Locktime Encoding

1000000 = 0x000F4240. As 4-byte LE CScriptNum: `40 42 0f 00`. The push: `04 40420f00`.

The transaction must set `nLockTime >= 1000000`. This is an absolute block height locktime (values < 500000000 are block heights; values ≥ 500000000 are Unix timestamps).

### Use Case: Oracle-Bound Settlement

This pattern enables an oracle to set a floor/ceiling price for a tacit asset:

1. Oracle commits to publishing a price attestation at block 1000000
2. Both parties pre-sign a settlement transaction with `after(1000000)`
3. At block 1000000, the oracle's price data becomes available off-chain
4. Both parties sign the settlement, which is only valid after the oracle's deadline
5. If either party reneges before the deadline, the settlement cannot be broadcast

### Size Breakdown

| Component | Bytes |
|-----------|-------|
| Script: A key + CHECKSIGVERIFY | 34 |
| Script: B key + CHECKSIG | 34 |
| Script: 1000000 push + CLTV | 6 |
| **Script total** | **~74 B** |
| Signatures (2 × 64) | 128 B |
| **Total input** | **~202 B** |

---

## Summary Table

| # | Policy | Script Size | Witness Size | Total | Key Feature |
|---|--------|------------|-------------|-------|-------------|
| 1 | `pk(A)` | 34 B | 64 B | ~98 B | Single key |
| 2 | `and(pk(A), older(52560))` | 39 B | 64 B | ~103 B | Timelocked recovery |
| 3 | `thresh(2, pk(A), pk(B), pk(C))` | ~108 B | 129 B | ~237 B | 2-of-3 escrow |
| 4 | `and(pk(B), sha256(H))` | ~73 B | 96 B | ~169 B | Hashlocked swap |
| 5 | `thresh(2, pk(A), pk(B), older(52560))` | ~108 B | 65–129 B | ~173–237 B | Decaying multisig |
| 6 | `and(and(pk(A), pk(B)), after(1000000))` | ~74 B | 128 B | ~202 B | Oracle price feed |

All sizes are approximate and depend on key encoding (x-only vs compressed), CScriptNum sizes, and compiler optimization choices.
