# Proposed Architecture: Tacit + Miniscript

> Replacing tacit's NUMS-only taproot envelope with a Miniscript-powered taproot tree.
> Status: Research / early design — nothing implemented.

## Key Insight

Tacit's current envelope (`src/envelope/script.ts`) uses a **NUMS internal key** for the P2TR output. Because nobody knows the discrete log of this key, every tacit UTXO must be spent via the script path. The script path contains the entire envelope (magic, version, payload), and the witness reveals a Schnorr signature under a different ephemeral key.

The v2 miniscript-native model keeps the NUMS internal key. Instead of replacing it with a meaningful key, we add semantically meaningful script leaves:

```
tr(NUMS_key, { <kernel_pubkey> CHECKSIGVERIFY, leaf_2, ..., leaf_N })
```

Every spend goes through the script path:
- **Kernel leaf** (`<kernel_pubkey> CHECKSIGVERIFY`): the kernel sig (64 B) proves supply conservation
- **Auxiliary leaves**: recovery, multisig, timelocks, hash locks — composed with the kernel check
- **Key path**: Not usable for confidential outputs — a key-path spend carries only one witness element (the 64 B sig), with no room for commitments or rangeproofs

## New Model: `tr()` with Tacit Internal Key

### Kernel-in-Script Design

The kernel signature lives in a dedicated tapscript leaf as `<kernel_pubkey> CHECKSIGVERIFY`. This is the **kernel-in-script** model (see tacit-v2-rethink.md §5.x). Bitcoin consensus rejects any spend with an invalid kernel sig because the script explicitly checks it.

```
Leaf 0 (standard spend):
  <kernel_pubkey> CHECKSIGVERIFY
```

The internal key remains the protocol NUMS key. Nobody can sign for it, so the key path is never used for confidential outputs. All spends reveal a script, but that script is minimal (34 B).

**Why not key path?**
A P2TR key-path spend can carry exactly one witness element (the 64 B signature). There is no room for the Pedersen commitment (33 B), encrypted amount (8 B), rangeproof (688+ B), or any other protocol data. The key-path and kernel sig serve fundamentally different purposes:
- **Key-path sig**: Proves ownership of the output key (Bitcoin consensus layer)
- **Kernel sig**: Proves supply conservation across the transaction (tacit protocol layer)

They cannot be the same signature because they sign different messages (taproot sighash vs kernel message).

### Script Path Leaves

Since the NUMS key path is never usable, all tacit spends use a script path leaf. Each leaf is a Miniscript expression embedded in the taproot Merkle tree. The kernel leaf (`<kernel_pubkey> CHECKSIGVERIFY`) is the default; auxiliary leaves are opt-in alternatives for recovery, escrow, etc.

**Leaf 1: Timelocked Recovery**

```
and_v(v:pk(recovery_key), older(52560))
```

Permits the recovery key to spend **after** 52560 blocks (~1 year). The leaf encoding in the taproot tree:

```
tr(tacit_internal_key, {
  and_v(v:pk(recovery_xonly), older(52560))
})
```

Recovery flow:
1. User loses access to tacit wallet
2. After 52560 blocks, user (or heir) signs with the pre-declared recovery key
3. Miniscript leaf requires both the recovery key AND the timelock to be satisfied
4. Witness reveals the tacit envelope payload (kernel sig still validates supply conservation)

**Leaf 2: Dispute Escrow**

```
thresh(2, pk(buyer_key), pk(seller_key), pk(arbitrator_key))
```

2-of-3 multi-sig for atomic settlement disputes:

```
tr(tacit_internal_key, {
  thresh(2, pk(buyer_xonly), pk(seller_xonly), pk(arbitrator_xonly))
})
```

Settlement flow:
1. Happy path: buyer + seller cooperate → kernel leaf spend
2. Dispute: either party invokes escrow leaf with their sig + arbiter's sig
3. Arbiter detects who is entitled to the funds and co-signs

**Leaf 3: Hashlock Preauth**

```
and_v(v:pk(seller_key), sha256(bid_secret_hash))
```

Hash-linked authorization for preauth flows:

```
tr(tacit_internal_key, {
  and_v(v:pk(seller_xonly), sha256(bid_secret_32_bytes))
})
```

Preauth settlement flow (from T_PREAUTH_BID, `src/opcodes/preauth-bid.ts`):
1. Buyer creates a bid with a secret `s`, commits to `SHA256(s)` off-chain
2. Buyer pre-signs their BTC input under `SIGHASH_SINGLE_ACP` (as in current SPEC-PREAUTH-BID-AMENDMENT §5.7.11)
3. Seller collects the bid signature off-chain; broadcasts when ready
4. Witness reveals `s` — the script verifies `SHA256(s) == bid_secret_hash`
5. Seller's signature + revealed secret satisfies the leaf

This replaces the current OP_RETURN-based bid-context binding with an on-chain script-enforced hashlock.

**Leaf 4: DAO Governance**

```
thresh(M, pk(K1_xonly), pk(K2_xonly), ..., pk(KN_xonly))
```

M-of-N governance for treasury DAOs:

```
tr(tacit_internal_key, {
  thresh(3, pk(gov1), pk(gov2), pk(gov3), pk(gov4), pk(gov5))
})
```

A DAO tacit UTXO requires 3-of-5 council signatures to spend. The kernel sig still ensures supply conservation — the script only controls *who* may authorize a spend, not *what* the spend does.

### Composite Taproot Tree

All leaves together:

```
tr(NUMS_key, {
  <kernel_pubkey> CHECKSIGVERIFY,                             // Leaf 0: standard spend
  and_v(v:pk(recovery_key), older(52560)),                    // Leaf 1: recovery
  thresh(2, pk(buyer), pk(seller), pk(arbitrator)),           // Leaf 2: escrow
  and_v(v:pk(seller), sha256(bid_secret_hash)),               // Leaf 3: hashlock
  thresh(3, pk(gov1), pk(gov2), pk(gov3), pk(gov4), pk(gov5)) // Leaf 4: DAO
})
```

The taproot Merkle tree root commits to all four leaves. The kernel leaf is the default spend path; auxiliary leaves are opt-in alternatives that reveal only the leaf being used (the others remain hidden under the Merkle root). The NUMS key path is never used for confidential outputs.

## Envelope Payload Repositioning

Currently, the entire tacit envelope (magic + version + payload) lives in the **script** as a concatenation of pushed data chunks (see `encodeEnvelopeScript` in `src/envelope/script.ts`).

In the proposed (script-path-always) model:

| Spend Path | Envelope Location | Access Pattern |
|---|---|---|
| Kernel leaf | Extra witness elements | Control block ~33 B + leaf script ~34 B + protocol data in witness |
| Auxiliary leaf | Extra witness elements | Same as above, with additional satisfaction data |

The indexer identifies tacit spends by recognizing the NUMS internal key, then parsing the control block and extra witness elements to extract protocol data:

1. Check if the output's internal key matches the tacit NUMS key
2. Read the leaf script from the revealed control block
3. Extract protocol data from extra witness elements (commitment, encrypted amount, rangeproof)
4. Run the same cryptographic validations as v1

The kernel sig, opcode, commitments, rangeproof — all of these remain structurally identical. They just move from the script to the witness stack.

## Key-path vs script-path decision

A key-path spend carries exactly one witness element (the 64 B key-path sig).
There is NO room for kernel sig, commitments, or rangeproofs. Therefore:

- **Confidential outputs** (CXFER, MINT, BURN with rangeproofs) MUST use script-path
  with a NUMS internal key. The kernel sig goes in the leaf script as CHECKSIGVERIFY.
- **Metadata-only outputs** (T_PETCH) COULD use key-path if protocol data is embedded
  via a different mechanism (tweaked output key, OP_RETURN).

## Benefits

### 45 B Saved on Kernel Leaf Spends

For every kernel-leaf spend, the 45 B of envelope framing (xonly push, OP_CHECKSIG, OP_FALSE OP_IF, magic, version, OP_ENDIF) is eliminated. At protocol scale, this is meaningful:

| Metric | Current envelope | Kernel leaf | Savings |
|---|---|---|---|
| CXFER N=2 on-chain size | 879 B | 834 B | 5.1% |
| CXFER N=8 on-chain size | 1563 B | 1518 B | 2.9% |
| T_PETCH on-chain | 76 B | 31 B | 59.2% |
| T_BURN N=0 on-chain | 153 B | 108 B | 29.4% |

Note: CXFER comparisons above use script-path spends (kernel leaf). Key-path is NOT viable for confidential outputs — it cannot carry commitments or rangeproofs. Small-opcode transactions (PETCH, BURN) benefit disproportionately because the fixed overhead dominates their on-chain footprint.

### UTXO Recovery Path

The single biggest UX improvement: tacit UTXOs are no longer unrecoverable. If the wallet key is lost:
1. Wait for the timelock to expire
2. Spend via recovery key (stored in a safe deposit box, split with Shamir, held by a lawyer, etc.)
3. The indexer sees a valid script-path spend with a valid kernel sig → supply conservation holds

This also enables **inheritance** — a tacit wallet can designate a heir's key with a long timelock.

### Complex Multi-Party Protocols

The Miniscript leaves enable entirely new protocol flows:

| Protocol | Miniscript Leaf | Currently Possible? |
|---|---|---|
| Multi-sig tacit wallet | `thresh(M, pk(K1), ..., pk(KN))` | No — single-key kernel sig only |
| Atomic swap with hashlock | `and_v(v:pk(seller), sha256(h))` | No — only cooperative single-tx ATOMIC |
| Escrow settlement | `thresh(2, pk(buyer), pk(seller), pk(arb))` | No — no third-party arbitration |
| Time-locked vesting | `and_v(v:pk(vestee), older(N))` | No — no timelocks |
| DAO treasury | `thresh(M, pk(K1), ..., pk(KN))` | No — single-key kernel sig |
| Subscription/Membership | `and_v(v:pk(issuer), older(N))` with rotating keys | No |

### Composable Security

The taproot tree is **additive** — each leaf adds a spending condition without affecting others. A wallet might use:

- **Key path**: Daily spending (fast, cheap)
- **Leaf 1**: Recovery (only after timelock)
- **Leaf 2**: Multi-sig co-signed by a cold wallet (large amounts)
- **Leaf 3**: DAO governance (only for protocol-treasury UTXOs)

Witness reveals only the leaf being used. An observer sees a recovery spend but doesn't learn about the DAO leaf.

## Costs and Tradeoffs

### Cost 1: Script Path Reveals Policy

When spending via a script path leaf, the witness reveals:
1. The leaf script itself (~30–100 B)
2. A control block containing the Merkle proof (~33 B per tree depth level)
3. The witness elements (signatures, preimages, etc.)

An observer learns which spending condition was used. Key-path spends (not viable for confidential outputs — cannot carry protocol data) would reveal nothing, but confidential tacit outputs always use the script path.

### Cost 2: Larger Witness for Script-Path Spends

| Item | Key Path (hypothetical — not viable) | Script Path (1 leaf) | Script Path (4 leaves) |
|---|---|---|---|
| Sig | 64 B | 64 B | 64 B |
| Control block | 0 B | ~33 B | ~65 B |
| Leaf script | 0 B | ~50 B | ~50 B |
| Envelope payload | variable | variable | variable |
| **Total overhead** | **64 B** | **~147 B** | **~179 B** |

For a CXFER N=2 (834 B payload + overhead):
- Key path: N/A — key-path cannot carry commitments or rangeproofs (shown for reference only)
- Script path: ~981 B (includes 83 B for control block + leaf script)
- **Bottom line**: Key-path is not a viable spend path for confidential tacit outputs. All confidential spends use the script path. The "key path" column in the table above is informational only.

### Cost 3: NUMS Internal Key Detection

Since the internal key is a protocol-wide NUMS key (not a wallet-derived key), indexers detect tacit outputs via the NUMS key directly:

1. **NUMS key registration**: The tacit protocol's NUMS key is a well-known constant (see tacit-v2-rethink.md §11.5). Indexers check if the output's internal key matches.
2. **Key tag in witness**: An optional 1-byte protocol tag in the witness confirms the output is tacit (defense against false positives).
3. **Indexer configuration**: User tells the indexer "scan for outputs matching the tacit NUMS key"

### Cost 4: No Free Lunch on Kernel Sig

The kernel signature remains **mandatory** regardless of spend path. Moving to Miniscript controls *who* can spend a UTXO (the authorization layer), but does not replace the cryptographic proof that the spend conserves supply (the accounting layer). The kernel sig is always ≥64 B of the witness.

### Cost 5: Codebase Impact

Implementing this changes tacit at a deep level:

| Module | Change |
|---|---|
| `src/envelope/script.ts` | New `encodeMiniscriptEnvelope` that builds a `tr()` with miniscript leaves |
| `src/envelope/script.ts` | Decoder recognizes both old (NUMS) and new (tacit key) envelopes |
| `src/crypto/kernel.ts` | Unchanged — kernel sig is independent of spend path |
| `src/transaction/sighash.ts` | New sighash logic for script-path spends (BIP 342) |
| `src/wallet/keypair.ts` | New key derivation scheme for tacit internal key |
| `src/wallet/utxo-manager.ts` | Must track "control block + leaf script" for each UTXO |
| `src/validation/validator.ts` | Must evaluate Miniscript leaves + taproot consensus rules |
| `src/indexer/ancestry.ts` | Must trace through script-path spends (control block → leaf) |
| `tests/` | Entire new test suite for miniscript-enabled tacit spends |

## Open Questions

1. **Script-path witness layout**: What exactly goes in the witness stack for script-path spends? Can we reuse the current payload encoding (opcode byte, fields, kernel sig, rangeproof) as-is, or does the absence of envelope framing require a new wire format?

2. ~~Indexer detection of key-path spends~~: **Resolved** — key-path is not viable for confidential outputs. Indexers detect script-path spends by checking the NUMS internal key. Moot point.

3. ~~MuSig2 for the internal key~~: **Not applicable** — the internal key is a protocol-wide NUMS key with no discrete log. No one can sign for it. MuSig2 belongs on the script leaves as `thresh()` conditions, not on the internal key.

4. **Backwards compatibility**: Existing tacit UTXOs on mainnet use the NUMS internal key. The new scheme produces outputs that look different at the script level. Can a single indexer validate both? Can old wallets spend new outputs (if the envelope payload format stays the same)?

5. **Standardization**: Should tacit adopt a BIP 388 wallet policy for hardware wallet support? The miniscript leaves could be registered as a BIP 388 policy on Ledger/BitBox02/Jade, enabling hardware signing of tacit protocol operations.
