# Miniscript Basics

This is a complete primer on Bitcoin Miniscript sufficient to understand the Tacit integration R&D. For the canonical specification see [BIP 379](https://github.com/bitcoin/bips/blob/master/bip-0379.mediawiki).

## 1. Policy Language

The policy language is a high-level DSL that describes *what* conditions must be satisfied to spend an output. Every policy expression compiles to a Miniscript fragment.

### Base Policies

| Policy | Meaning | Miniscript |
|--------|---------|------------|
| `pk(key)` | Public key must sign | `pk(key)` |
| `pkh(key)` | Pubkey hash must match + sign | `pkh(key)` |
| `older(n)` | n blocks must pass (BIP 68, `CHECKSEQUENCEVERIFY`) | `older(n)` |
| `after(t)` | Must be after timestamp t (BIP 65, `CHECKLOCKTIMEVERIFY`) | `after(t)` |

### Hash Policies

| Policy | Meaning | Miniscript |
|--------|---------|------------|
| `sha256(h)` | Preimage of SHA256(h) must be provided | `sha256(h)` |
| `hash256(h)` | Preimage of SHA256(SHA256(h)) must be provided | `hash256(h)` |
| `ripemd160(h)` | Preimage of RIPEMD160(h) must be provided | `ripemd160(h)` |
| `hash160(h)` | Preimage of RIPEMD160(SHA256(h)) must be provided | `hash160(h)` |

### Composition

| Policy | Meaning |
|--------|---------|
| `and(p1, p2)` | Both p1 and p2 must be satisfied |
| `or(p1, p2)` | Either p1 or p2 must be satisfied |
| `thresh(k, p1, ..., pn)` | At least k of the n sub-policies must be satisfied |

## 2. Miniscript Fragment Catalog

Miniscript fragments are the building blocks. Each has a well-defined type, a canonical Script translation, and a cost in weight units.

### Core Fragments

| Fragment | Script | Type | Description |
|----------|--------|------|-------------|
| `0` | `OP_FALSE` | B | Always fails |
| `1` | `OP_TRUE` | B | Always passes |
| `pk_k(key)` | `<key>` | K | Push a public key (raw) |
| `pk_h(key)` | `OP_DUP OP_HASH160 <hash160(key)> OP_EQUALVERIFY` | K | Push pubkey hash, check match |
| `pk(key)` | `<key> OP_CHECKSIG` | B | Check signature against key |
| `pkh(key)` | `OP_DUP OP_HASH160 <hash160(key)> OP_EQUALVERIFY OP_CHECKSIG` | B | Check pubkey matches hash, then check sig |
| `older(n)` | `<n> OP_CHECKSEQUENCEVERIFY` | V | Verify n relative timelock |
| `after(t)` | `<t> OP_CHECKLOCKTIMEVERIFY` | V | Verify t absolute timelock |

### Hash Fragments

| Fragment | Script | Type | Description |
|----------|--------|------|-------------|
| `sha256(h)` | `OP_SIZE <32> OP_EQUALVERIFY OP_SHA256 <h> OP_EQUAL` | B | Verify preimage hashes to h via SHA256 |
| `hash256(h)` | `OP_SIZE <32> OP_EQUALVERIFY OP_SHA256 OP_SHA256 <h> OP_EQUAL` | B | Double-SHA256 |
| `ripemd160(h)` | `OP_SIZE <32> OP_EQUALVERIFY OP_RIPEMD160 <h> OP_EQUAL` | B | RIPEMD160 |
| `hash160(h)` | `OP_SIZE <32> OP_EQUALVERIFY OP_RIPEMD160 OP_SHA256 <h> OP_EQUAL` | B | HASH160 (RIPEMD160 after SHA256) |

### Compositors

These combine sub-fragments into larger trees.

| Fragment | Script Pattern | Type | Meaning |
|----------|---------------|------|---------|
| `and_v(X, Y)` | `X Y` | V(B, V) → V | X must verify, then Y must verify |
| `and_b(X, Y)` | `X Y BOOLAND` | B(B, B) → B | Both must be true |
| `andor(X, Y, Z)` | `X NOTIF Y ELSE Z ENDIF` | B(B, B, B) → B | If X then Y else Z |
| `or_b(X, Y)` | `X Y BOOLOR` | B(B, B) → B | At least one must be true |
| `or_c(X, Y)` | `X IF 1 ELSE Y ENDIF` | B(B, B) → B | If X succeeds, done; else Y |
| `or_d(X, Y)` | `X IFDUP NOTIF Y ENDIF` | B(B, B) → B | X with drop; if X fails try Y |
| `or_i(X, Y)` | `IF X ELSE Y ENDIF` | B(B, B) → B | Choose X or Y with a boolean input |
| `thresh(k, X1, ..., Xn)` | `X1 ... Xn k BOOLAND ...` | varies | At least k of n must be true |

### Wrappers

Wrappers modify the behavior of a fragment. They're written as a prefix with a colon, e.g. `a:pk(key)`.

| Wrapper | Effect | Type Change |
|---------|--------|-------------|
| `a:X` | Move X to altstack, then drop | B → B |
| `s:X` | Swap top two stack items, then X | B → B |
| `c:X` | Append `OP_CHECKSIG` | B → B |
| `v:X` | Append `OP_VERIFY` | B → V |
| `d:X` | `OP_DUP OP_IF X OP_ENDIF` | B → B |
| `j:X` | `OP_SIZE 0 OP_EQUAL NOTIF X ENDIF` | B → B |
| `n:X` | `OP_SIZE 0 OP_EQUAL NOTIF X ENDIF` (same as j) | B → B |
| `l:X` | `X` as left child of `or_` | internal |
| `u:X` | `X` as right child of `or_` | internal |

## 3. Type System

Every fragment has one of four types, which determines how it can be composed:

| Type | Meaning | Stack Effect |
|------|---------|-------------|
| **B** (Base) | Leaves a non-zero value on the stack (or fails) | `R → x` |
| **K** (Key) | Leaves a public key on the stack | `R → key` |
| **V** (Verify) | Passes or fails, leaves nothing | `R → ∅` |
| **W** (Wrapped) | Wrapped B that can be swapped/altstacked | `R → x` |

Composition rules:
- `and_v(X, Y)` requires `X: B → V`, `Y: V`
- `or_d(X, Y)` requires `X: B`, `Y: B`, and `X` must have the HASSIG property
- `thresh(k, X1..Xn)` requires each `Xi: B`

## 4. Compilation Example

Policy:
```
and(pk(A), or(pk(B), older(1000)))
```

The compiler must decide the **`or` strategy**. Several choices exist:

| Strategy | Miniscript | Script Size |
|----------|------------|-------------|
| `or_d` (drop) | `and_v(v:pk(A), or_d(pk(B), older(1000)))` | compact |
| `or_c` (cascade) | `and_v(v:pk(A), or_c(pk(B), older(1000)))` | medium |
| `or_i` (input-select) | `and_v(v:pk(A), or_i(pk(B), older(1000)))` | largest |

The `or_d` variant is typically chosen — it is the most compact when the left branch is the likely case.

Generated Script for `or_d`:
```
<A> OP_CHECKSIGVERIFY
<B> OP_CHECKSIG
OP_IFDUP
OP_NOTIF
<1000> OP_CHECKSEQUENCEVERIFY
OP_ENDIF
```

### Satisfaction (Witness)

For the `pk(B)` path (fast spend):
```
<sig_B>
```

For the `older(1000)` path (recovery after 1000 blocks, no B signature):
```
<sig_A>
```

Both paths require `sig_A` because `and_v` demands both branches. Wait — that's wrong. Let me walk through it:

- `and_v(v:pk(A), or_d(pk(B), older(1000)))`
- `v:pk(A)` pushes `<A> CHECKSIGVERIFY` — this consumes one sig, but the `v:` wrapper converts B → V (no stack item left).
- `or_d(pk(B), older(1000))` — left branch `pk(B)` leaves a 1 on stack; right branch `older(1000)` leaves nothing (it's a V fragment).
- The `or_d` execution: `X IFDUP NOTIF Y ENDIF`. If `X` (`pk(B)`) leaves 1, `IFDUP` produces `1 1`, `NOTIF` drops both and skips Y. If X fails (leaves 0), `IFDUP` leaves 0, `NOTIF` triggers and runs Y.

So to satisfy with `pk(B)`: provide `sig_B` and `sig_A`. Stack: `<sig_B> <sig_A>` → script consumes A's CHECKSIGVERIFY, then B's CHECKSIG produces 1, IFDUP dupes it, NOTIF doesn't trigger, done.

To satisfy with `older(1000)`: provide `sig_A` (no sig_B). Stack: `<sig_A>` → A's CHECKSIGVERIFY passes, then pk(B) fails (no sig), IFDUP: 0, NOTIF: triggers and runs `1000 CSV`, done.

## 5. Non-Malleability

The critical property: **HASSIG** — every satisfaction of a miniscript must contain at least one signature check. Without this, an adversary could witness a valid satisfaction and derive a different valid satisfaction for the same script (malleability).

`or_d(X, Y)` requires that the *left* branch X has HASSIG. In `or_d(pk(B), older(1000))`, the left branch `pk(B)` contains a CHECKSIG, so HASSIG holds.

Malleable fragment that Miniscript forbids: `or_b(pk(A), pk(B))` — both CHECKSIG outputs are booleans that could be re-ordered. The compiler would reject this and suggest `or_c(pk(A), pk(B))` or `or_i(pk(A), pk(B))` instead.

## 6. Resource Limits

### P2WSH (BIP 141)

| Resource | Limit |
|----------|-------|
| Max script size | 3,600 bytes (standardness) |
| Max witness elements | 100 |
| Max sigops | 201 per block (legacy counting) |

### P2TR / Tapscript (BIP 342)

| Resource | Limit |
|----------|-------|
| Max script size | 10,000 bytes (standardness; 4,200 for P2WSH via `max_script_size` = 10 KB in v24+) |
| Max witness elements | 1,000 (Tapscript) vs 100 (P2WSH) |
| Max sigops | 201, but `OP_CHECKSIGADD` counts as 1 sigop per key (not n-of-n like CHECKMULTISIG) |

Tapscript is significantly more generous, which matters for tacit miniscripts that may involve multiple keys, hash preimages, and timelocks.

## 7. P2WSH vs Tapscript Miniscript

### P2WSH

```
wsh(miniscript)
```

- Compressed public keys (33 bytes)
- `CHECKMULTISIG` for k-of-n (limited to 20 keys, standardness)
- Larger scripts hit standardness limits sooner
- No key path — every spend reveals the script

Descriptor example:
```
wsh(and_v(v:pk(xpub6...), or_d(pk(xpub6...), older(52560))))
```

### Tapscript (BIP 342, BIP 386)

```
tr(key, { miniscript_leaf_1, miniscript_leaf_2, ... })
```

- X-only public keys (32 bytes)
- `multi_a(k, key1, key2, ..., keyN)` — no 20-key limit, uses `OP_CHECKSIGADD`
- Coexistence of key path + multiple script leaves
- Key-path spends reveal nothing (privacy)
- Script-path spends reveal only the one leaf executed

Descriptor example:
```
tr([fingerprint/86h/0h/0h]xpub.../0/*, { and_v(v:pk(xpub...), older(52560)) })
```

For Tacit, Tapscript is the natural home: tacit already targets P2TR outputs, and the existing envelope structure is already a tapscript leaf.
