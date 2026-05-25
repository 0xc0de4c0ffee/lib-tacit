# Taproot + Miniscript

This document covers how Taproot (BIP 340, 341, 342) and Miniscript (BIP 379, 386) work together, and what this means for Tacit's existing envelope architecture.

## 1. Taprefresher: Taproot Output Structure

A P2TR output (BIP 341) has the structure:

```
tr(internal_key, script_tree)
```

Where:
- **`internal_key`** — an x-only public key (32 bytes). The output's tweaked key is `Q = P + t·G` where `P` is the internal key and `t = tagged_hash("TapTweak", P || merkle_root)`.
- **`script_tree`** — a binary merkle tree of leaf scripts. Each leaf is a Tapscript (BIP 342) that can be spent by revealing the leaf + control block (merkle proof).

### Spend Paths

```
Taproot output (P2TR)
├── Key path
│     Spend with a single Schnorr signature from the tweaked private key.
│     On-chain: just a 64-byte sig + 1-byte annex flag.
│     Privacy: indistinguishable from any other P2TR spend.
│
└── Script path
      Spend by revealing:
        1. Control block (~33+ bytes): internal key + merkle proof path
        2. Leaf script: the actual miniscript/tapscript
        3. Witness stack: values satisfying the leaf script
      Privacy: reveals which leaf was used and its script contents.
```

The key insight: **key-path spends look identical to all other P2TR spends** on-chain. If you never use the script paths, no observer can tell you had any. Script-path spends reveal the leaf script and thus the spending policy.

## 2. Key Path

The key path is the simplest and cheapest spend path. The witness is:

```
witness[0] = <schnorr_sig> (64 bytes)
witness[1] = <annex_flag>  (optional, 0x50 + annex bytes)
```

The signature is a BIP-340 Schnorr signature over the sighash, verified against the tweaked output key `Q`.

**For Tacit:** The existing envelope uses the BIP-341 NUMS point as the internal key (`50929b74...`), which has no known private key. This means the key path is **deliberately disabled** — every tacit spend must go through the script path. A Miniscript-enhanced Tacit could instead use a MuSig2-aggregate key as the internal key (see §5 below), enabling key-path spends for the common case.

## 3. Script Path

The script path requires a control block, a leaf script, and witness stack elements:

```
witness[0] = <witness_element_n>  (top of stack = last pushed)
...
witness[n] = <witness_element_1>
witness[n+1] = <leaf_script>
witness[n+2] = <control_block>
```

### Control Block Structure (BIP 341)

The control block commits to the internal key, the merkle proof path, and the leaf version:

```
control_block = parity_byte(0x8x) || internal_key(32B) || merkle_proof_hashes(32B each)
```

- Parity byte: `0x80 + (script_tree_depth & 0x7F) + (leaf_version == 0xC0 ? 0x00 : 0x20)`. For standard Tapscript (leaf version 0xC0), the top bit is set, so the first byte is `0xC0 + depth` — wait, no: BIP 341 says the control block is `{p, internal_key, hash_1, ..., hash_n}` where `p = (leaf_version & 1) ? 0x20 + depth_bit : 0xC0 + depth_bit`. For leaf version 0xC0 (Tapscript), that's `0xC0 + depth`. Hmm, let me be precise.

The byte is `(leaf_version & 0xFE) == 0x00 ? 0x20 | depth : 0xC0 | depth` for Tapscript leaves where `leaf_version = 0xC0`. Actually, the standard control block for leaf version 0xC0 has the first byte `0xC0 | depth`. For a single leaf (depth 0), this is `0xC0`.

### Fee Impact

For a key-path spend: ~65 bytes of witness data (sig + annex flag).

For a script-path spend:

| Component | Size |
|-----------|------|
| Control block | 33 + 32·depth bytes (33 for depth=0, 65 for depth=1, etc.) |
| Leaf script | variable (the miniscript bytecode) |
| Witness stack | variable (signatures, preimages, etc.) |
| **Total (typical)** | **~120–400+ bytes** of witness data |

At 4 sat/vB, an extra 200 witness bytes costs ~200 WU × 4 sat/vB = 200 × 0.25 vB × 4 = 200 satoshis... wait. Weight units: witness bytes count at 1 WU each, vs 4 WU for script bytes. At 4 sat/vB (1 vB = 4 WU), that's 1 sat/WU. So 200 extra witness bytes = 200 sats.

For Tacit's typical use (confidential asset transfers), the **key path is always cheaper** and more private. Miniscript leaves are used for exceptional conditions (recovery, dispute resolution, timeouts).

## 4. Tapscript Miniscript Features

### `multi_a(k, key_1, ..., key_n)` (BIP 386)

The most important Tapscript-only miniscript fragment. It compiles to:

```
<key_1> OP_CHECKSIG
<key_2> OP_CHECKSIG
...
<key_n> OP_CHECKSIG
<n> OP_EQUAL  // wait, no — multi_a uses CHECKSIGADD
```

Actually, `multi_a(k, key_1, ..., key_n)` in Tapscript compiles to:

```
<key_1> OP_CHECKSIG
OP_SWAP
<key_2> OP_CHECKSIGADD
OP_SWAP
...
<key_n> OP_CHECKSIGADD
<k> OP_EQUAL
```

Or more precisely, using the accumulator pattern:

```
<key_1> OP_CHECKSIG                  (leaves 0 or 1 on stack)
<key_2> OP_CHECKSIGADD               (adds 0 or 1 to accumulator)
...
<key_n> OP_CHECKSIGADD
<k> OP_EQUAL
```

Advantages over P2WSH `CHECKMULTISIG`:
- **No 20-key limit** — `multi_a` can handle 100+ keys (limited only by standardness script size)
- **No bug-to-fix dummy element** — `checkmultisig` required an unused dummy element (the infamous OP_0 bug)
- **Clearer semantics** — `CHECKSIGADD` accumulates counts directly
- **Lower sigop count** — each `OP_CHECKSIGADD` counts as 1 sigop, not `n` for an n-of-n `CHECKMULTISIG`

For Tacit: `multi_a` is the natural expression for:
- Multisig governance of an asset's mint authority
- Escrow with multiple arbitrators
- DAO treasury vaults

### Other Tapscript Differences from P2WSH

| Feature | P2WSH | Tapscript |
|---------|-------|-----------|
| Pubkey format | 33-byte compressed | 32-byte x-only |
| CHECKSIG | Existing | Existing, but sig validation uses BIP 340 |
| CHECKSIGADD | Not available | New opcode (BIP 342) |
| CHECKMULTISIG | Available | Not available (removed in BIP 342) |
| OP_SUCCESSx | None | Several new no-ops for future extensions |
| Script size limit | 10,000 B (consensus), 3,600 B (standardness pre-v24) | 10,000 B (consensus and standardness) |
| Push limit | 520 B | 10,000 B (no more OP_PUSHDATA4 splitting!) |

The 10 KB push limit in Tapscript means large SAP signatures, multi-sig witnesses, and even tacit's concatenated range proofs could be handled more natively.

## 5. MuSig2 × Miniscript: The Ideal Tacit Pattern

[MuSig2](https://eprint.iacr.org/2020/1261) (BIP 327) is a multi-signature scheme that produces a single aggregated public key and a single aggregated signature. It is the natural complement to Taproot's key path.

### The Architecture

```
tr(MuSig2_aggregate, [ Miniscript_leaf_1, Miniscript_leaf_2, ... ])
```

- **Internal key** = MuSig2 aggregate of `N` co-signers
- **Script leaves** = fallback policies (recovery, dispute, timelocked)

### Normal operations (key path)

All `N` co-signers produce a single MuSig2 partial signature. These are aggregated into a single 64-byte BIP-340 signature. The spend looks like a normal single-sig P2TR on chain — cheap and private.

The protocol flow:
1. Each co-signer computes a MuSig2 nonce
2. Nonces are exchanged and aggregated
3. Each co-signer produces a partial signature over the common nonce and message (sighash)
4. Partial signatures are aggregated into a final Schnorr signature
5. Broadcast: `[sig_agg, annex_flag]` — indistinguishible from any other P2TR

### Recovery / exceptional operations (script path)

When one co-signer is unavailable or the policy requires a timelock:
1. The available co-signer(s) produce a miniscript satisfaction for the relevant leaf
2. Witness includes the control block, leaf script, and signatures satisfying the leaf
3. The script path reveals the policy on-chain

### Comparison for Tacit

Tacit's current architecture:
- Internal key = BIP 341 NUMS (key path disabled)
- Single script leaf: `signing_pub_xonly OP_CHECKSIG OP_FALSE OP_IF <payload> OP_ENDIF`
- Every tacit spend reveals the envelope and the signing pubkey

With MuSig2 + Miniscript:
- Internal key = MuSig2 aggregate of the tacit wallet's keys (or wallet + backup)
- Recovery leaf: `and_v(v:pk(recovery_key), older(52560))`
- Envelope leaf (optional, for backward compat): the existing `OP_CHECKSIG OP_FALSE OP_IF ... OP_ENDIF`
- **Key path**: normal tacit spends — no envelope revealed, no leaf revealed, single 64-byte sig
- **Recovery path**: after 1-year timeout, recovery key can sweep all UTXOs

This is strictly superior: cheaper normal-case spends, better privacy, and a built-in recovery mechanism.

## 6. Descriptor Format for Tacit Miniscripts

Bitcoin descriptors (BIP 380) provide a standard way to express output scripts. A Tacit miniscript descriptor might look like:

```
tr(
  [fingerprint/86h/0h/0h]xpub6.../0/*,
  {
    and_v(
      v:pk([fingerprint/86h/1h/0h]xpub6.../0/*),
      older(52560)
    )
  }
)
```

For a more complex escrow setup:

```
tr(
  [fingerprint/86h/0h/0h]xpub6.../0/*,
  {
    multi_a(2, [fingerprint/86h/0h/1h]xpub.../0/*, [fingerprint/86h/0h/2h]xpub.../0/*, [fingerprint/86h/0h/3h]xpub.../0/*),
    and_v(v:pk([fingerprint/86h/1h/0h]xpub.../0/*), older(52560))
  }
)
```

Key-path spend: all 3 parties co-sign via MuSig2 → one 64-byte signature, no script revealed.

2-of-3 multisig leaf: any 2 parties sign for a script-path spend (e.g., if one party goes offline).

Timelocked recovery: after 1 year, the recovery key can sweep.

## 7. BIP References

| BIP | Title | Relevance |
|-----|-------|-----------|
| [BIP 340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) | Schnorr Signatures for secp256k1 | Key-path spends; tacit already uses Schnorr for kernel sigs |
| [BIP 341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki) | Taproot: SegWit v1 Outputs | P2TR structure, control blocks, NUMS point |
| [BIP 342](https://github.com/bitcoin/bips/blob/master/bip-0342.mediawiki) | Validation of Taproot Scripts | Tapscript semantics, OP_CHECKSIGADD, no CHECKMULTISIG |
| [BIP 327](https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki) | MuSig2 Multi-Signatures | Aggregate key path for Tacit normal-case spends |
| [BIP 379](https://github.com/bitcoin/bips/blob/master/bip-0379.mediawiki) | Miniscript | The language itself |
| [BIP 386](https://github.com/bitcoin/bips/blob/master/bip-0386.mediawiki) | Multi-A and Tr Descriptors | `multi_a` fragment, `tr()` descriptor syntax |
| [BIP 388](https://github.com/bitcoin/bips/blob/master/bip-0388.mediawiki) | Wallet Policy Templates | Hardware wallet miniscript support |
