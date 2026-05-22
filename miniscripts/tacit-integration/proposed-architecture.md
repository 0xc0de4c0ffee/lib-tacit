# Proposed Architecture: Tacit + Miniscript

> Replacing tacit's NUMS-only taproot envelope with a Miniscript-powered taproot tree.
> Status: Research / early design — nothing implemented.

## Key Insight

Tacit's current envelope (`src/envelope/script.ts`) uses a **NUMS internal key** for the P2TR output. Because nobody knows the discrete log of this key, every tacit UTXO must be spent via the script path. The script path contains the entire envelope (magic, version, payload), and the witness reveals a Schnorr signature under a different ephemeral key.

Replace the NUMS internal key with a **meaningful key** that the tacit wallet controls:

```
tr(tacit_internal_key, { leaf_1, leaf_2, ..., leaf_N })
```

Now the wallet can spend via:
- **Key path**: Fast, cheap, private — just a 64-byte Schnorr signature + 1-byte parity
- **Script path leaves**: Auxiliary conditions — recovery, multisig, timelocks, hash locks

## New Model: `tr()` with Tacit Internal Key

### Internal Key Path

The internal key is derived from the tacit wallet's key material — either:
- A dedicated **kernel signing key** (the wallet's primary spend key)
- A **MuSig2 aggregate** of N wallet keys (for threshold signing at the protocol level)

Key-path spend consumes the tacit envelope payload from the **witness stack** rather than the **script**. The envelope overhead (45 B) vanishes — the payload is inferred from the witness structure alone:

```
Witness stack (key path):
  [signature]          # 64 B BIP-340 Schnorr under internal key
  [tacit payload]      # opcode + fields + kernel sig + rangeproof
```

The indexer recognizes a key-path tacit spend by noticing the output has a `tr()` script with the known tacit internal key and a witness that contains the bip-340 signature + tacit payload bytes.

### Script Path Leaves

When the key path is unavailable (e.g., wallet is lost, M-of-N threshold not met, timelock not yet satisfied), the spender uses a script path leaf. Each leaf is a Miniscript expression embedded in the taproot Merkle tree.

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
1. Happy path: buyer + seller cooperate → key-path spend
2. Dispute: either party invokes script path with their sig + arbiter's sig
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
tr(tacit_internal_key, {
  and_v(v:pk(recovery_key), older(52560)),
  thresh(2, pk(buyer), pk(seller), pk(arbitrator)),
  and_v(v:pk(seller), sha256(bid_secret_hash)),
  thresh(3, pk(gov1), pk(gov2), pk(gov3), pk(gov4), pk(gov5))
})
```

The taproot Merkle tree root commits to all four leaves. The internal key path is the efficient default; script paths are opt-in fallbacks that reveal only the leaf being used (the others remain hidden under the Merkle root).

## Envelope Payload Repositioning

Currently, the entire tacit envelope (magic + version + payload) lives in the **script** as a concatenation of pushed data chunks (see `encodeEnvelopeScript` in `src/envelope/script.ts`).

In the proposed model:

| Spend Path | Envelope Location | Access Pattern |
|---|---|---|
| Key path | Witness stack element | 0 overhead — pay 1 B for element count only |
| Script path | Witness stack element (revealed with leaf) | Control block ~33 B + script + envelope in witness |

The indexer identifies tacit spends by:
1. **Key path**: Recognizing the internal key as a known tacit key, then parsing the witness payload
2. **Script path**: Recognizing the `"TACIT"` magic bytes in the revealed script leaf's witness element

The kernel sig, opcode, commitments, rangeproof — all of these remain structurally identical. They just move from the script to the witness stack.

## Benefits

### 45 B Saved on Key-Path Spends

For every key-path tacit spend, the 45 B of envelope framing (xonly push, OP_CHECKSIG, OP_FALSE OP_IF, magic, version, OP_ENDIF) is eliminated. At protocol scale, this is meaningful:

| Metric | Current | Key-Path Model | Savings |
|---|---|---|---|
| CXFER N=2 on-chain size | 879 B | 834 B | 5.1% |
| CXFER N=8 on-chain size | 1563 B | 1518 B | 2.9% |
| T_PETCH on-chain | 76 B | 31 B | 59.2% |
| T_BURN N=0 on-chain | 153 B | 108 B | 29.4% |

Small-opcode transactions (PETCH, BURN) benefit disproportionately because the fixed overhead dominates their on-chain footprint.

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

An observer learns which spending condition was used. Key-path spends reveal nothing — the indexer sees only "a key-path taproot spend with tacit payload in witness."

### Cost 2: Larger Witness for Script-Path Spends

| Item | Key Path | Script Path (1 leaf) | Script Path (4 leaves) |
|---|---|---|---|
| Sig | 64 B | 64 B | 64 B |
| Control block | 0 B | ~33 B | ~65 B |
| Leaf script | 0 B | ~50 B | ~50 B |
| Envelope payload | variable | variable | variable |
| **Total overhead** | **64 B** | **~147 B** | **~179 B** |

For a CXFER N=2 (834 B payload + overhead):
- Key path: 898 B (paying only the sig + 1 B witness count)
- Script path: ~981 B (additional 83 B for control block + script)

### Cost 3: Internal Key Complexity

The internal key must be:
- Deterministically derivable from the wallet seed (so recovery works)
- Verifiable by indexers as "this is a tacit key" (to distinguish tacit from arbitrary P2TR)
- Possibly a MuSig2 aggregate (for multi-key path spends)

Indexers need to know which P2TR outputs are "tacit" and which are vanilla Bitcoin. Options:
1. **Key derivation convention**: All tacit keys follow `m/tacit'/...` (a BIP 43 purpose)
2. **On-chain marker**: A minimal magic marker in the witness (OP_RETURN-style, but less overhead)
3. **Indexer configuration**: User tells the indexer "this xpub is my tacit wallet"

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

1. **Key-path-only tacit transaction format**: What exactly goes in the witness stack? Can we reuse the current payload encoding (opcode byte, fields, kernel sig, rangeproof) as-is, or does the absence of envelope framing require a new wire format?

2. **Indexer detection of key-path spends**: How does an indexer distinguish a "tacit key-path spend" from "someone randomly signing under a key that happens to be tacit-provisioned"? Options include a 1-byte magic prefix in the witness or a well-known key derivation path.

3. **MuSig2 for the internal key**: If the internal key is a MuSig2 aggregate of N wallet participants, then key-path spends become N-of-N multisig. But MuSig2 requires a signing protocol (interactive or preprocessed nonces). Does the UX tradeoff of interactive signing outweigh the bytes saved vs. a script-path threshold leaf?

4. **Backwards compatibility**: Existing tacit UTXOs on mainnet use the NUMS internal key. The new scheme produces outputs that look different at the script level. Can a single indexer validate both? Can old wallets spend new outputs (if the envelope payload format stays the same)?

5. **Standardization**: Should tacit adopt a BIP 388 wallet policy for hardware wallet support? The miniscript leaves could be registered as a BIP 388 policy on Ledger/BitBox02/Jade, enabling hardware signing of tacit protocol operations.
