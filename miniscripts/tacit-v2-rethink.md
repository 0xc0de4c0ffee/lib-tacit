# Tacit v2: Miniscript-Native Redesign

> Not "how to bolt Miniscript onto tacit." How tacit would be designed if Miniscript were the starting point.

## 1. Thesis

Tacit v1 wraps everything in a custom Taproot envelope (45 B of "TACIT" magic, version, chunked pushdata overhead). The envelope is a **general-purpose data carrier** — it doesn't use Bitcoin Script's semantic capabilities. The opcode byte dispatches to custom validation logic, the wire format is parsed by custom code, and the spending conditions are always the same: "provide a valid kernel sig."

**Tacit v2 flips this:** the Bitcoin Script *is* the protocol. Each protocol operation is a distinct tapscript leaf. The confidential payload (commitments, rangeproofs) moves to the witness stack. Miniscript policies express spending conditions natively.

### What stays the same

| Primitive | Module | Unchanged? |
|-----------|--------|------------|
| Pedersen commitments `C = a·H + r·G` | `src/crypto/pedersen.ts` | ✅ Math unchanged |
| NUMS generator H | `src/constants/generators.ts` | ✅ Pinned vector |
| Kernel sigs (BIP-340 over kernel message) | `src/crypto/kernel.ts` | ✅ Same hash structure |
| Classic BP range proofs | `src/crypto/bulletproofs.ts` | ✅ Same verification |
| BP+ range proofs | `src/crypto/bulletproofs-plus.ts` | ✅ Same prover/verifier |
| ECDH blinding + amount encryption | `src/crypto/ecdh.ts` | ✅ Same keystream |
| Asset ID derivation | `src/crypto/kernel.ts:assetIdFor` | ✅ SHA256 of (reveal_txid, vout) |
| Stealth address DH | `src/crypto/stealth.ts` | ✅ Same one-time key derivation |

### What changes fundamentally

| v1 (current) | v2 (Miniscript-native) |
|---|---|
| Custom "TACIT" envelope in taproot script | Miniscript policy leaves, no envelope |
| Opcode byte dispatches to parser | Tapscript leaf index dispatches |
| Internal key = NUMS (nobody can spend) | Internal key = protocol key or kernel key |
| Wire format parsed by custom `decode*` functions | Bitcoin Core/descriptors understand the output |
| Spending policy always "kernel sig + nothing" | Composable: kernel sig AND/OR timelock/multisig/hashlock |
| No recovery path | Every UTXO has a recovery leaf (by default) |
| Single-key only | Native k-of-n via `thresh()` |
| Requires custom indexer for all validation | Miniscript satisfaction + kernel proof = validation |
| No hardware wallet support | BIP 388 descriptors → Ledger/BitBox02/Jade support |

---

## 2. v2 Output Structure

### Single-key confidential output (the common case)

```
tr(NUMS_protocol_key, {
    <kernel_pubkey> CHECKSIGVERIFY
})
```

**Witness for a valid spend:**
```
[kernel_sig_64B] [commitment_33B] [encrypted_amount_8B] [rangeproof_688B] [control_block_33B]
```

The script is 35 B (`<32B_xonly> CHECKSIGVERIFY`). The kernel sig is the only cryptographic witness the script touches. The remaining witness elements (commitment, encrypted amount, rangeproof) are **protocol-level data** — the script doesn't reference them, but the tacit validator checks them. This is the same "layered validation" model as v1 (layer 2 = wire, layer 3 = crypto), just expressed differently.

### Output with timelocked recovery

```
tr(NUMS_protocol_key, {
    <kernel_pubkey> CHECKSIGVERIFY,                              // Leaf 0: standard spend
    and_v(v:pk(recovery_pubkey), older(52560))                    // Leaf 1: recovery after ~1yr
})
```

### Atomic swap output (hashlock)

```
tr(NUMS_protocol_key, {
    <kernel_pubkey> CHECKSIGVERIFY,                              // Leaf 0: standard
    and_v(v:pk(seller_pubkey), sha256(swap_hash))                  // Leaf 1: swap with preimage
})
```

### Escrow output (multi-party)

```
tr(NUMS_protocol_key, {
    <kernel_pubkey> CHECKSIGVERIFY,                              // Leaf 0: standard
    thresh(2, pk(buyer_pubkey), pk(seller_pubkey), pk(arb_pubkey)) // Leaf 1: dispute resolution
})
```

### Multi-sig DAO treasury

```
tr(NUMS_protocol_key, {
    thresh(3, pk(K1), pk(K2), pk(K3), pk(K4), pk(K5)),            // Leaf 0: 3-of-5 board
    and_v(v:pk(emergency_key), older(65535))                       // Leaf 1: emergency after ~1.25yr
})
```

---

## 3. Operation-to-Leaf Mapping

In v1, every protocol action (CETCH, CXFER, BURN, etc.) has a unique opcode byte and a corresponding `encode*`/`decode*` function pair. In v2, each action maps to a **leaf index** in the taproot tree:

| v1 opcode | v2 leaf | Leaf script | Purpose |
|---|---|---|---|
| 0x21 CETCH | 0 | `<issuer_pub> CHECKSIGVERIFY` | Asset creation |
| 0x23 CXFER | 1 | `<kernel_pub> CHECKSIGVERIFY` | Confidential transfer |
| 0x24 MINT | 2 | `<issuer_pub> CHECKSIGVERIFY` | Mint additional supply |
| 0x25 BURN | 3 | `<kernel_pub> CHECKSIGVERIFY` | Destroy supply |
| 0x26 AXFER | 4 | `<kernel_pub> CHECKSIGVERIFY` | Atomic settlement |
| 0x2B DROP | 5 | `<drop_creator_pub> CHECKSIGVERIFY` | Public-claim pool |
| 0x2C DCLAIM | 6 | `<claimer_pub> CHECKSIGVERIFY` | Claim from pool |
| 0x5B PREAUTH_BID | 7 | `and_v(v:pk(buyer), sha256(bid_hash))` | Preauth settlement |
| — | 8 | `and_v(v:pk(recovery), older(N))` | **Default recovery leaf** |

Each leaf's script is minimal (the kernel/pubkey check). The heavy cryptographic data (Pedersen commitments, rangeproofs) is never in the script — it's in the witness, validated off-chain by the tacit protocol.

This means the on-chain script for any tacit operation is always **at most 40 bytes** (even for the most complex operations). Compare with v1 where CETCH payload is ~800 B of script.

### Leaf numbering convention

The taproot tree uses depth-first ordering. For a tree with `N` leaves, leaf index `i` maps to spending condition `i`. The tacit protocol defines:

- **Leaf 0**: always reserved for the "standard" spend (kernel sig only)
- **Leaves 1–31**: protocol operations (CETCH, CXFER, MINT, ...)
- **Leaf 32**: default recovery path (present on every UTXO unless explicitly removed)
- **Leaf 33+**: user-defined auxiliary conditions (escrow, hashlock, multisig, etc.)

In practice, most outputs have 2-5 leaves (standard + 1-3 protocol operations + recovery + maybe one aux condition). The merkle tree depth for 5 leaves is 3 levels → control block = 33 + 32 = 65 B (2 merkle siblings at different depths). For 32 leaves (all shipped opcodes), depth = 6 → control block = 33 + 32×5 = 193 B. Still manageable.

### Mixed-operation outputs

In v1, each output carries a single opcode. In v2, an output can have **multiple operation leaves**, meaning the same UTXO can be spent via different protocol operations depending on context:

```
tr(NUMS_protocol_key, {
    <kernel_pub> CHECKSIGVERIFY,          // Leaf 0: CXFER (transfer to another)
    <issuer_pub> CHECKSIGVERIFY,           // Leaf 1: MINT (mint more supply)
    and_v(v:pk(recovery), older(52560))    // Leaf 2: recovery
})
```

This is redundant in most cases but enables interesting patterns like "spend this output either by transferring it (CXFER leaf) or by using it as a pool initialization (DEPOSIT leaf)."

---

## 4. The Witness-as-Payload Model

### v1: payload in script

```
Script (880 B): <xonly> CHECKSIG OP_FALSE OP_IF "TACIT" <0x01> <chunk1_520B> <chunk2_309B> OP_ENDIF
Witness (n/a): [script]
```

All 880 B go in the script (witness = 880 WU).

### v2: payload in extra witness elements

```
Script (35 B): <kernel_xonly> CHECKSIGVERIFY
Witness: [kernel_sig_64B] [commitment_33B] [ct_8B] [rangeproof_688B] [control_block_33B]
```

Script size: 35 B in witness = 35 WU.
Crypto payload: 64+33+8+688 = 793 WU.
Both are witness data (1 WU/B). The total witness contribution is identical (828 WU in v2 vs 880 WU in v1). The savings come from removing the 45 B envelope overhead and chunking inefficiency.

### Confidential data encoding

Each extra witness element follows a fixed schema that the tacit validator knows:

| Witness position | Element | Size | Present in |
|---|---|---|---|
| 0 | Kernel signature (BIP-340) | 64 B | All operations |
| 1 | Pedersen commitment C | 33 B (compressed point) | All confidential ops |
| 2 | Encrypted amount | 8 B | CETCH, CXFER, MINT, AXFER |
| 3 | Rangeproof | 688–886 B (BP) / 591–789 B (BP+) | CETCH, CXFER, MINT, AXFER, BURN |
| 4 | Control block (merkle proof) | 33–193 B | Always present in script-path spend |

The validator reads the leaf index from the control block to determine which operation is being performed, then validates the witness elements accordingly.

### Why extra witness elements are standardness-valid

P2TR key-path spends must have exactly one witness item (the sig). But **script-path spends** can have any number of witness items — the script only pops what it needs, and the rest are ignored. The tacit validator reads all items, but the Bitcoin script engine only touches the first (kernel sig).

This is the key insight: **extra witness elements on a script-path spend are standard.** They don't affect script execution, they don't violate standardness rules, and they're accessible to off-chain validators.

---

## 5. Composable Conditions

The real power of Miniscript isn't byte savings — it's composition. Each spending condition can be combined with others using Miniscript's combinator fragments.

### Condition catalog for tacit v2

| Condition | Miniscript | Script cost | Witness cost | Present in |
|---|---|---|---|---|
| Kernel sig | `<K> CHECKSIGVERIFY` | 34 B | 64 B | Every tacit op |
| Recovery | `pk(recovery_key)` + `older(N)` | ~40 B | 64 B | Default leaf 32 |
| Hashlock | `sha256(H)` | ~36 B | 32 B (preimage) | Atomic swap, preauth |
| k-of-n multisig | `thresh(k, pk(K1), ..., pk(Kn))` | ~(33+1)n+10 B | k×64 B | DAO, escrow |
| Time-delayed escrow | `or_i(thresh(2, ...), and_v(v:pk(plaintiff), older(N)))` | ~120 B | 128 B | Dispute resolution |
| Oracle gate | `and_v(v:pk(user), and_v(v:pk(oracle), older(N)))` | ~80 B | 128 B | Conditional release |
| Emergency veto | `and_v(v:pk(guardian), older(N))` | ~43 B | 64 B | DAO treasury |

### Composition examples

**"A 3-of-5 DAO treasury that degrades to 1-of-1 after 1 year":**
```
and_v(
    thresh(3, pk(K1), pk(K2), pk(K3), pk(K4), pk(K5)),
    or_d(
        pk(emergency_key),
        older(52560)
    )
)
```
Compiled: ~130 B script. This is a single taproot leaf. The entire spending policy is in the script.

**"A confidential transfer that can be claimed by the recipient OR returned via hashlock OR recovered by the sender after 1 year":**
```
// Leaf 0: Recipient can spend
<K_recipient> CHECKSIGVERIFY,
// Leaf 1: Hashlock swap
and_v(v:pk(swap_partner), sha256(swap_hash)),
// Leaf 2: Sender recovery
and_v(v:pk(sender_recovery), older(52560))
```
This is 3 leaves in a taproot tree. The total script size across all leaves is ~120 B.

**"An atomic settlement with escrow":**
```
// Leaf 0: Standard kernel spend (buyer pays seller)
<K_seller> CHECKSIGVERIFY,
// Leaf 1: Dispute resolution (2-of-3)
thresh(2, pk(buyer), pk(seller), pk(arbitrator)),
// Leaf 2: Buyer recovery
and_v(v:pk(buyer_recovery), older(1008))
```
3 leaves, ~115 B total script. Compare with v1's T_AXFER which has no dispute resolution at all (~800 B payload, all in script).

---

### 5.x Security model: kernel-in-script vs kernel-in-witness

Throughout this document, the kernel sig appears in two roles:
1. **Checked by Bitcoin consensus** (in the leaf script via `CHECKSIGVERIFY`)
2. **Checked only by indexers** (in the witness as an opaque element)

These have fundamentally different security guarantees:

| Model | On-chain cost | Security guarantee |
|---|---|---|
| Kernel-in-script | ~34 B/leaf extra | Bitcoin consensus rejects invalid kernel sigs — miners CANNOT include a tx with a bad kernel |
| Kernel-in-witness | ~34 B saved | Indexer-only validation — a miner COULD include a tx with a bad kernel, and only indexers (not full nodes) would detect it |

**Recommendation: kernel-in-script for all confidential leaves.** The 34 B cost per leaf is
negligible (rangeproofs are 688+ B). The consensus-layer guarantee is critical for supply
conservation — without it, a miner could inflate tacit supply by including a tx with a fake
kernel sig.

**Exception:** Metadata-only leaves (PETCH, DROP config data) can use kernel-in-witness
since there's no confidential value at stake. The kernel sig in those cases is a
protocol-level optimization, not a supply conservation proof.

Every leaf specification in this document assumes kernel-in-script unless explicitly noted.
The `CHECKSIGVERIFY kernel_pubkey` wrapper is always implied.

---

## 6. Leaf Index vs. Opcode Byte

### v1 dispatch

The opcode byte `0x21`–`0x5C` is a single byte at position 0 of every payload. The decoder reads it and dispatches to `decodeCEtch`, `decodeCXfer`, etc.

### v2 dispatch

The leaf index is **implicit** — it's encoded in the control block (which leaf in the merkle tree is being revealed). The validator:

1. Reads the control block from the witness
2. Reconstructs the leaf path → determines leaf index
3. Leaf index 0 = CXFER, leaf index 1 = MINT, etc.
4. Validates the extra witness elements according to the leaf's schema

This means the same Bitcoin UTXO can be spent by different tacit operations depending on which leaf is revealed.

### The validation function

```typescript
type TacitValidation = {
  leafIndex: number;       // Which operation
  kernelSig: Uint8Array;   // Witness[0]
  commitment: Point;       // Witness[1]
  encryptedAmount: Uint8Array | null;  // Witness[2]  (null for operations without amounts)
  rangeproof: Uint8Array;  // Witness[3]
};

function validateTacitWitness(tx: Transaction, inputIndex: number): boolean {
  const wit = tx.ins[inputIndex].witness;
  const { leafIndex } = parseControlBlock(wit[wit.length - 1]); // Last element
  
  // Determine operation from leaf index
  const op = opcodeFromLeafIndex(leafIndex);
  
  // Extract protocol data from the extra witness elements
  // (elements that the script didn't consume — everything beyond position 0)
  const data = extractTacitData(wit, op);
  
  // Validate using the same crypto as v1
  switch (op) {
    case 'cxfer':
      return verifyKernelSig(data) && verifyRangeProof(data);
    case 'mint':
      return verifyIssuerSig(data) && verifyRangeProof(data);
    // ...
  }
}
```

---

## 7. Key-Path vs. Script-Path Tension

### The tension

The ideal v2 design uses key-path spends (single Schnorr sig, no script revealed, looks like a normal P2TR transaction). But key-path spends can only carry **one witness element** (the 64 B sig). There's nowhere to put the commitment, encrypted amount, or rangeproof.

### Resolution: script-path-always with optimization

The practical resolution is **script-path always** for all tacit outputs. The internal key is a NUMS key (no one can sign for it). The script is always revealed. We optimize the script to be as small as possible (the ~35 B `pubkey CHECKSIGVERIFY` pattern).

This means v2 outputs always look like "script-path P2TR spends" on-chain. Observers see a control block and a script. They don't see the "TACIT" magic, but they can see a small script being executed.

### Impact on privacy

| Aspect | v1 envelope | v2 miniscript |
|--------|-------------|---------------|
| On-chain footprint | 880 B script | 35 B script + 33 B control block |
| Distinguishable? | Yes ("TACIT" magic is unique) | Less so (small kernel check is common) |
| Anonymity set | Only tacit outputs | All P2TR script-path spends (~5% of txns) |

V2 is marginally more private than v1 (no "TACIT" magic string), but still distinguishable from key-path P2TR. True privacy (indistinguishable from any P2TR) requires a key-path model with hidden commitment data, which isn't standardness-valid with current rules.

### Future: OP_CAT or OP_CTV could enable key-path

If `OP_CAT` is soft-forked, the commitment data could be hashed into the output key:
```
internal_key = kernel_pubkey + tagged_hash("tacit/v2/commitment", C || ct || rp_hash) * G
```

The commitment data is revealed at spend time in a separate witness element (not the key-path sig). The protocol validates that the revealed data matches the hash embedded in the output key. This is similar to Taproot Assets' approach.

In the meantime, the script-path-always model is viable and standard today.

---

## 8. v1 → v2 Migration

### Problem

Existing tacit assets live in v1 UTXOs with the old envelope structure. v2 outputs use a completely different script format. They can't coexist in the same validation scope unless migration is explicitly handled.

### Approach: conversion output

A **T_CONVERT** operation moves value from a v1 UTXO to a v2 UTXO:

```
v1 envelope { op: 0xC0, payload: { v1_commitment, v1_rangeproof, ... } }
   ↓
v2 P2TR with leaf { <K> CHECKSIGVERIFY }
   + witness: { kernel_sig, v2_commitment, v2_encrypted_amount, v2_rangeproof }
```

The conversion validates:
1. The v1 input's kernel sig (proves the old UTXO is valid tacit)
2. Supply conservation: v1 input commitment amount == v2 output commitment amount
3. The v1 rangeproof (proves the amount was in range)
4. The v2 witness data is internally consistent

### Timeline

| Phase | v1 UTXOs | v2 UTXOs | Validation |
|---|---|---|---|
| 0 (today) | ✅ Create + spend | ❌ | v1 only |
| 1 (convert) | ✅ Convert to v2 | ✅ Create + spend | Both, linked via CONVERT |
| 2 (sunset v1) | ❌ Cannot create new | ✅ Only v2 | v2 only |

During Phase 1, both formats exist. Indexers validate both. During Phase 2 (after a protocol-wide cutoff height), only v2 UTXOs are valid for new transactions. v1 UTXOs must be converted before spending.

---

## 9. Descriptor Representation

A v2 tacit output is fully representable by a Bitcoin descriptor. This means:

1. **Hardware wallets can display tacit policies** (via BIP 388)
2. **Bitcoin Core can track tacit UTXOs** without custom indexer plugins
3. **Standard PSBT flow** with no custom fields

### Simple CXFER descriptor

```
tr(NUMS_key, { pk(kernel_key) })
```

Where `NUMS_key` is the protocol's NUMS key (a constant, same for all tacit outputs of this type).

### CXFER with recovery

```
tr(NUMS_key, { pk(kernel_key), and_v(v:pk(recovery_key), older(52560)) })
```

### DAO treasury

```
tr(NUMS_key, { thresh(3, pk(K1), pk(K2), pk(K3), pk(K4), pk(K5)) })
```

### BIP 388 wallet policy

```json
{
  "policy": "tr(NUMS_key, { pk(@0/**), and_v(v:pk(@1/**), older(52560)) })",
  "keys": {
    "@0": "xpub6A...",
    "@1": "xpub6B..."
  }
}
```

The hardware wallet displays: "This policy is a tacit confidential token wallet. Standard spends use key 0. Recovery after ~1 year uses key 1."

---

## 10. Comparison Summary

### Byte cost per operation

| Operation | v1 on-chain (B) | v2 script-path (vB) | v2 key-path (vB) | Notes |
|---|---|---|---|---|
| CXFER (N=1, classic BP) | 879 | ~258 | N/A | Rangeproof dominates both |
| CXFER (N=1, BP+) | 782 | ~215 | N/A | BP+ saves ~43 vB in v2 too |
| T_PETCH (metadata only) | 76 | ~50 | ~16 | Metadata-only; key-path possible via OP_RETURN |
| T_BURN (full, N=0) | 153 | ~60 | N/A | Carries commitment; key-path cannot fit it |
| T_DEPOSIT (pool join) | 184 | ~80 | N/A | Carries routing data; key-path cannot fit it |
| T_WRAPPER_ATTEST (no payload) | 146 | ~55 | ~16 | No confidential data; key-path possible |

V2 key-path is listed as "N/A" for any operation carrying confidential data (commitments, rangeproofs). The `~16 vB` entries for key-path represent metadata-only operations that could use OP_RETURN or tweaked output keys.

### Feature comparison

| Feature | v1 | v2 | v2 advantage |
|---|---|---|---|
| Confidential amounts | ✅ | ✅ | Same crypto |
| Supply conservation | ✅ | ✅ | Same kernel sigs |
| Range proofs | ✅ (BP/BP+) | ✅ (BP/BP+) | Same verifiers |
| Timelocked recovery | ❌ | ✅ | `and_v(v:pk(recovery), older(N))` |
| k-of-n multisig | ❌ | ✅ | `thresh(k, pk(K1), ..., pk(Kn))` |
| Hashlock swaps | ❌ | ✅ | `and_v(v:pk(partner), sha256(H))` |
| Escrow/dispute | ❌ | ✅ | `thresh(2, pk(A), pk(B), pk(arb))` |
| Hardware wallet | ❌ | ✅ | BIP 388 descriptor registration |
| Standard relay | Partial | ✅ | No custom script |
| PSBT compatibility | ❌ | ✅ | Standard BIP 371 Taproot fields |
| Custom indexer required | ✅ | Partial | Miniscript parsing handles script; kernel proof still custom |
| Privacy (vs non-tacit P2TR) | Low (TACIT magic) | Medium (small script) | No magic string, but script path still visible |
| On-chain bytes (CXFER) | 879 B | ~258 vB (script-path) | ~70% reduction |
| No custom codec | ❌ | ✅ | Descriptors + PSBT |
| DAO composition | Drafted (0x50-0x53) | ✅ | Arbitrary thresh() policies |

### What v2 CAN'T do that v1 can

- **Key-path spends (today)**: v1 can't either (NUMS key), so this is a wash
- **Custom opcode payload encoding**: v1 has a rich wire format with variable-length fields, images, tickers. v2 would encode these in the witness or in OP_RETURN data
- **Batch output (N>1)**: v2 can represent multiple output commitments — each output is a separate P2TR UTXO. The batch is at the transaction level, not the UTXO level.

### What v2 ENABLES that v1 can't

- **Any tacit UTXO can have recovery**: Not just a special opcode — recovery is a first-class property of every output
- **Hardware wallet verification**: Before signing, the device displays the tacit policy in plain language
- **Composable conditions**: Mix and match timelocks, multisig, hashlocks, oracles on the same output
- **Standard fee estimation**: Bitcoin Core's `GetSatisfactionSize()` works directly
- **P2A anchor outputs for CPFP**: Every tacit tx can add a change output for fee bumping
- **Multisig tacits**: A 3-of-5 board controls a treasury output with no off-chain coordination
- **Script hiding with decoy leaves**: Add fake tapscript leaves to confuse observers about which condition is being used

---

## 11. Edge Cases and Open Problems

### 11.1 Multiple outputs in one transaction (batch inefficiency)

v1 CXFER supports N outputs (1, 2, 4, 8) in a single transaction sharing ONE rangeproof.
v2 creates N independent P2TR UTXOs, each carrying its own proof at spend time.

**The batch cost is asymmetric:**
- v1: 8 outputs, 1 rangeproof (886 B classic, m=8), 1 kernel sig → ~886 B proof total
- v2: 8 outputs, 8 rangeproofs at first spend → ~5504 B proof total (6.2× more)

**This is the single biggest v1 → v2 regression.**

The mitigation mentioned in section 5 (BP+ cross-transaction aggregation) requires a
protocol-level change: the BP+ verifier must accept a proof that covers commitments spread
across multiple UTXOs. This changes the verification API from:

```
bppRangeVerify([C_out1, C_out2, ..., C_out8], proof)  // single tx, all outputs known
```

to:

```
bppRangeVerify([C_from_tx1_input, C_from_tx2_input, ...], proof, txid_set)
```

This is a research problem, not a specification detail. Until solved:
- **Batch transfers (N≥2) should use v1 envelope format**, even in a v2 ecosystem
- v2 is for single-output transfers (the common case: most CXFERs are 1:1)
- A hybrid model: v2 for outputs, v1-style batch for the transaction envelope

### 11.2 Metadata (tickers, image URIs, descriptions)

v1 encodes metadata directly in the opcode payload (PETCH has ticker, decimals, image URI, etc.). In v2, there's no payload in the script.

**Options for metadata in v2:**
1. **OP_RETURN in the creation transaction**: Metadata goes in a separate OP_RETURN output, linked by txid
2. **Encoding in the creation transaction's witness (recommended)**: Metadata goes in the
   reveal transaction's witness as extra elements. Indexers read it when the output is first
   created. The script doesn't touch the metadata elements — they are standardness-valid
   extra witness items on a script-path spend.
3. **Off-chain (indexer/API)**: Metadata is stored off-chain, pinned by the creation txid

**Recommendation**: Option 2 (creation-tx witness encoding). Metadata is visible at creation
time because it lives in the reveal transaction's witness stack. An example CETCH witness:

```
Witness for CETCH creation tx:
[issuer_sig_64B] [commitment_33B] [encrypted_amount_8B] [rangeproof_688B] [metadata_push] [control_block_33B]

Where metadata_push = [ticker_LE(2)] [ticker_data] [image_len_LE(2)] [image_data] [mint_authority_32B]
```

Total metadata in witness: variable (same as v1's payload). But it's in witness (1 WU/B) instead of script (1 WU/B), so the on-chain cost is identical. Note: metadata is NOT delayed until first spend — it is published when the output is created.

### 11.3 Kernel message scope

In v1, the kernel message binds `(assetId, inputOutpoints, outputCommitments, burnedAmount)`. This proves the sum of inputs = sum of outputs across the entire transaction.

In v2, each output is a separate UTXO with separate validation. The kernel message must span all the v2 UTXOs in the same transaction. The kernel sig goes in the **first input's witness**, and all other inputs reference the same sig (or provide their own for independent spends).

**Protocol rule**: A transaction spending multiple v2 tacit UTXOs must:
1. Include a kernel sig in the first input's witness
2. List the output commitments of ALL v2 outputs being created in the kernel message
3. Each subsequent tacit input references the first input's kernel sig

This matches the v1 model (the kernel sig is in the CXFER/BURN payload, not per-output).

### 11.4 Leaf index collision

If two different protocols use the same leaf index, indexers can't distinguish them. The `NUMS_protocol_key` ensures only outputs created by the tacit protocol are validated as tacit. A non-tacit output using the same leaf index with a different NUMS key is simply not a tacit asset.

### 11.5 NUMS key standardization

All tacit v2 outputs use the same NUMS key as the internal key. This key must be:
1. Deterministically generated (same formula as v1's H generator)
2. No known discrete log
3. Recognizable by indexers (they check if the output's internal key matches)

**Proposal**: `NUMS_key = hash_to_curve("tacit/v2/nums-internal-key")` — a verifiably random point with no known private key.

The tag domain ensures the NUMS key is unique to tacit v2 and not reusing any other protocol's NUMS key.

### 11.6 Indexer changes

V1 indexers parse the custom envelope to extract opcodes and payloads. V2 indexers:
1. Check if the tx output's internal key matches the tacit NUMS key
2. Read the leaf (from the control block when spent) to determine the operation
3. Extract protocol data from extra witness elements
4. Run the same cryptographic validations (kernel sig, rangeproof, etc.)

For unspent outputs, the indexer can't determine the leaf type (it's only revealed at spend time). The indexer just notes "this is a tacit UTXO with internal key = NUMS" and waits for the spend to classify it.

**Unspent output classification**: Without knowing the leaf type, the indexer stores the output with a generic "tacit v2" marker. When spent, the leaf index reveals the operation type for retroactive classification.

### 11.7 Stakeholder migration

Different stakeholders have different migration priorities:

| Stakeholder | Priority | v2 benefit |
|---|---|---|
| End user | Recovery, HW wallet support | "My tacit wallet can now recover from seed phrase" |
| Exchange | Auditability, standard PSBT | "We use the same PSBT flow as BTC" |
| DAO | Multisig treasury | "3-of-5 board controls tacit treasury with Miniscript" |
| Developer | Simpler validation | "Standard descriptors, no custom envelope parser" |
| Indexer | Consistency | "Same kernel proof, leaf index instead of opcode" |

---

## 12. Open Questions

1. **Witness size optimization**: Can the control block be omitted for single-leaf trees? (Yes, BIP 341 allows a single-leaf tree where the leaf IS the script and no control block is needed beyond the leaf version byte.)

2. **NUMS key rotation**: If the NUMS key's discrete log is discovered, all v2 outputs are compromisable. How to handle NUMS key rotation? (The key is verifiably random, so this is a theoretical risk only.)

3. **Cross-input rangeproof aggregation**: BP+ supports m=8 aggregation. Can a single rangeproof cover 8 v2 outputs in the same transaction, even though each is a separate UTXO? (Technically yes, because the rangeproof covers the set of commitments, not the UTXOs themselves. The proof bytes go in any one input's witness and the protocol validator shares it across all outputs.)

4. **Compatibility with future opcodes (OP_CAT, OP_CTV, OP_CSFS)**: If `OP_CAT` is soft-forked, key-path tacit spends become possible (embed commitment hash in output key). If `OP_CTV` is soft-forked, tacit covenant patterns become possible. The Miniscript foundation means any new opcode that Miniscript supports (via a new fragment) is automatically available to tacit.

5. **Envelope-less metadata for DApps**: Current tacit DApps read the envelope from the script. In v2, the metadata is in the witness. DApps need to read the witness to extract metadata. This is a different API surface.
