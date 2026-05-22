# Byte Comparison: Tacit Wire Format vs. Miniscript Alternatives

> **Branch:** `research/miniscript-integration`
> **Status:** R&D — exploratory sizing analysis

## 1. Current Tacit Envelope Overhead

Every tacit opcode payload is embedded in a **taproot envelope** script:

```
<xonly_pubkey> CHECKSIG OP_FALSE OP_IF "TACIT" <version> <payload> OP_ENDIF
```

### Fixed envelope bytes

| Component | Bytes | Notes |
|-----------|-------|-------|
| X-only pubkey push | 33 | `0x20 <32-byte xonly key>` |
| OP_CHECKSIG | 1 | `0xAC` |
| OP_FALSE OP_IF | 2 | `0x00 0x63` |
| "TACIT" magic | 6 | `0x06 0x54 0x41 0x43 0x49 0x54` |
| Version byte | 2 | `0x02 <version>` (pushed as 1-byte data) |
| OP_ENDIF | 1 | `0x68` |
| **Fixed subtotal** | **45 B** | |

### Chunking overhead (payload push)

| Payload range | Push opcode bytes | Example |
|--------------|-------------------|---------|
| ≤75 B | +1 B | OP_DATA_N |
| 76–255 B | +2 B | OP_PUSHDATA1 + length |
| 256–520 B | +3 B | OP_PUSHDATA2 + 2-byte length |
| 521–1040 B | +5 B | OP_PUSHDATA2 + 2-byte length (non-standard push) |

> Envelope overhead = 45 B + push-chunk overhead.

## 2. Primitive Byte Sizes

| Primitive | Bytes | Notes |
|-----------|-------|-------|
| Opcode byte | 1 | `0x21`–`0xFF` |
| Asset ID | 32 | SHA256 of genesis outpoint |
| Compressed point (secp256k1) | 33 | `0x02/0x03 || x` |
| Encrypted amount | 8 | 64-bit XOR keystream |
| Kernel BIP-340 signature | 64 | `r || s` (Schnorr) |
| u64 LE amount | 8 | Unencrypted |
| Blinding scalar | 32 | `s` in Pedersen `r*G + v*H` |
| Rangeproof (classic BP, m=1) | 690 | 688 + 2-byte length prefix |
| Rangeproof (BP+, m=1) | 593 | 591 + 2-byte length prefix |
| BIP-340 signature (witness) | 64 | Placed in taproot witness |
| ECDSA signature (witness) | 71–73 | For legacy compatibility |

## 3. Current Opcode On-Chain Totals (Minimum)

### Confidential opcodes (rangeproof-dominated)

| Opcode | Total bytes | Rangeproof share | Envelope share | Payload share |
|--------|-------------|------------------|----------------|---------------|
| CETCH (0x21) | 821 | 690 (84.0%) | 47 (5.7%) | 84 (10.2%) |
| CXFER (0x23) | 879 | 690 (78.5%) | 49 (5.6%) | 140 (15.9%) |
| T_CXFER_BPP (0x22) | 782 | 593 (75.8%) | 49 (6.3%) | 140 (17.9%) |
| T_MINT (0x24) | 910 | 690 (75.8%) | 49 (5.4%) | 171 (18.8%) |
| T_AXFER (0x26) | 880 | 690 (78.4%) | 49 (5.6%) | 141 (16.0%) |
| T_AXFER_VAR (0x37) | 987 / 890 | 690/593 (69.9%/66.6%) | 52 (5.3%/5.8%) | 245 (24.8%/27.5%) |
| T_PREAUTH_BID (0x5B) | 969 / 872 | 690/593 (71.2%/68.0%) | 52 (5.4%/6.0%) | 227 (23.4%/26.0%) |
| T_PREAUTH_BID_VAR (0x5C) | 1006 / 909 | 690/593 (68.6%/65.2%) | 52 (5.2%/5.7%) | 264 (26.2%/29.0%) |

### Non-confidential / metadata opcodes

| Opcode | Total bytes | Envelope share | Notes |
|--------|-------------|----------------|-------|
| T_BURN N=0 (0x25) | 153 | 47 (30.7%) | Simple burn proof |
| T_PETCH (0x27) | 76 | 47 (61.8%) | Fair-launch deployment |
| T_PMINT (0x28) | 185 | 47 (25.4%) | Permissionless mint |
| T_DEPOSIT (0x29) | 184 | 47 (25.5%) | Pool deposit |
| T_WITHDRAW (0x2A) | ~507 | 47 (9.3%) | With Groth16 proof (~300 B) |
| T_DROP (0x2B) | 199 | 47 (23.6%) | Public-claim pool |
| T_DCLAIM (0x2C) | 187 | 47 (25.1%) | Permissionless claim |
| T_WRAPPER_ATTEST (0x38) | 146 | 47 (32.2%) | Wrapper attestation |

> **Observation:** For confidential opcodes, rangeproofs account for 65–84% of on-chain bytes. The envelope is noise for these.
> For metadata opcodes, the envelope is 9–62% of total bytes — the impact is meaningful but often acceptable.

## 4. Miniscript Leaf Script Sizes

| Miniscript pattern | Script bytes | Witness bytes | Total vB |
|--------------------|-------------|---------------|----------|
| `pk(K)` | ~34 | 65 (sig) | ~99 |
| `pk(K)` + control block (1 leaf) | ~34 | 65 (sig) + 33 (cb) | ~132 |
| `and_v(v:pk(K), older(N))` | ~43 | 65 (sig) + 4 (n) | ~112 |
| `and_v(v:pk(K), sha256(H))` | ~69 | 65 (sig) + 34 (preimage) | ~168 |
| `thresh(2, pk(A), s:pk(B), s:pk(C))` | ~108 | 130 (2 sigs) + 33 (cb) | ~271 |
| `or_i(thresh(2, pk(A), pk(B), pk(C)), and_v(v:pk(A), older(N)))` | ~142 | 130 (2 sigs) + 33 (cb) | ~305 |

### Key script patterns — compiled templates

**pk(K)** — single pubkey check:
```
<K> CHECKSIG
```
33 B (key push) + 1 B (opcode) = **34 B**

**and_v(v:pk(K), older(N))** — timelocked recovery:
```
<K> CHECKSIGVERIFY <N> CHECKSEQUENCEVERIFY
```
33 + 1 + 1–3 (N push) + 1 = **~37–39 B** (varies with N size)

**and_v(v:pk(K), sha256(H))** — hashlock:
```
<K> CHECKSIGVERIFY SIZE 32 EQUALVERIFY SHA256 <H> EQUAL
```
33 + 1 + 1 + 1 + 1 + 1 + 33 + 1 = **~73 B**

> Note: Miniscript compiler output varies. The `sha256(H)` wrapper adds `SIZE 32 EQUALVERIFY` to enforce 32-byte preimages.

**thresh(2, pk(A), s:pk(B), s:pk(C))** — 2-of-3:
```
<A> CHECKSIG <B> CHECKSIG ADD <C> CHECKSIG ADD 2 EQUAL
```
33×3 + 6 opcodes = **~105 B**

## 5. Cross-Comparison Table

| Feature | Tacit today (B) | Miniscript alt (B) | Savings (B) | Savings (%) | Notes |
|---------|----------------|--------------------|-------------|-------------|-------|
| Envelope overhead | 45 + chunk | 0 (pure script) | ~47 | 100% | Envelope removed; Miniscript IS the script |
| Single pubkey check (fast path) | 33 (key) + 64 (sig) = 97 | 34 (pk leaf) + 64 (sig) + 33 (cb) = 131 | **−34** | **−35%** | Key path spend is cheaper (no control block). Taproot key-path wins here. |
| Timelocked recovery | Not possible | ~80 leaf + 65 sig + 33 cb = 178 | N/A | — | New capability |
| 2-of-3 escrow | Not possible (T_AXFER needs both parties) | ~108 leaf + 130 sigs + 33 cb = 271 | N/A | — | New capability |
| Hashlock atomic swap | Not possible (needs preauth-bid protocol) | ~73 leaf + 99 sig+preimage + 33 cb = 205 | N/A | — | New capability |
| Full burn (T_BURN N=0) | 153 | ~60 (pk + OP_RETURN) | ~93 | 61% | Miniscript replaces envelope + payload |
| Fair launch (T_PETCH) | 76 | ~50 (data pushes + OP_DROP) | ~26 | 34% | Minor savings |
| Permissionless mint (T_PMINT) | 185 | ~160 (pk + metadata pushes) | ~25 | 14% | Modest |
| Pool deposit (T_DEPOSIT) | 184 | ~160 (pk + routing data) | ~24 | 13% | Modest |
| Permissionless claim (T_DCLAIM) | 187 | ~160 (pk + claim data) | ~27 | 14% | Modest |
| Multi-sig DAO vote | Not implemented | ~108 + keys × 33 B | N/A | — | New capability |

### Key-path vs. script-path costs

Using **key path spend** (the tacit kernel sig) avoids the control block entirely:

```
Key path:  33 (xonly) + 1 (CHECKSIG) + 64 (witness sig) = 98 vB
Script path (1 leaf): 34 (script) + 65 (sig witness) + 33 (control block) = 132 vB
```

The key path is **34 vB cheaper** per spend. For high-volume opcodes like CXFER, this matters.

## 6. Detailed Breakdown — Selected Opcodes

### T_BURN N=0 (153 B → ~60 B)

```
Current tacit wire format (153 B):
   45 B envelope overhead
   + 2 B push overhead
   + 1 B opcode (0x25)
   + 32 B asset ID
   + 32 B blinding
   + 1 × (8 B amount + 32 B Pedersen C)
   ---- Total: 153 B

Miniscript alternative (~60 B):
   34 B pk(commitment_pubkey) leaf script
   + witness: 64 B signature
   + control block: 33 B
   + OP_RETURN with asset_id: 34 B
   ---- Total: ~131 B  (if OP_RETURN needed)
   Better: just burn via kernel at key path: 98 B
```

Actually burn can be done with just the key path spend — no Miniscript leaf needed. The `OP_RETURN` is only if metadata must be preserved. A pure burn via kernel sig is **98 B** (key path).

### T_PETCH (76 B → ~50 B)

```
Current tacit wire format (76 B):
   45 B envelope overhead
   + 1 B push overhead
   + 1 B opcode (0x27)
   + 29 B payload (ticker, name, supply fields)
   ---- Total: 76 B

Miniscript alternative (~50 B):
   33 B xonly_pubkey
   + 1 B OP_CHECKSIG
   + witness: 64 B sig
   ... but the 29 B metadata (nonce, supply cap, etc.) must go somewhere
   Script-embedded pushes: data pushes + OP_DROP
   30 B embedded script + 64 B sig + 33 B cb = ~127 B
```

If deployed via key path with metadata in the annex or as a separate output, ~50–60 B is achievable. However, if metadata must be committed in the script, the savings are smaller.

## 7. Key Insights

### Insight 1: Rangeproofs dominate and cannot be replaced

Rangeproofs (688–886 B) account for **65–84% of every confidential opcode**. Miniscript cannot reduce this — rangeproofs are cryptographic proofs, not spending conditions. The only way to shrink them is BP+ (593 B) or future research (Bulletproofs v2, 25% smaller).

### Insight 2: Envelope overhead matters for small opcodes only

| Opcode | Envelope share | Miniscript savings potential |
|--------|---------------|------------------------------|
| T_PETCH (76 B) | 61.8% | ~26 B (34%) |
| T_BURN (153 B) | 30.7% | ~93 B (61%) |
| T_DCLAIM (187 B) | 25.1% | ~27 B (14%) |
| T_DEPOSIT (184 B) | 25.5% | ~24 B (13%) |
| T_AXFER (880 B) | 5.6% | ~0 B (negligible) |
| CETCH (821 B) | 5.7% | ~0 B (negligible) |

For confidential opcodes, bytes savings from removing the envelope are **negligible**. For metadata opcodes, savings are **modest** (14–61%).

### Insight 3: Miniscript's value is new capabilities, not bytes

The real promise is not byte reduction but **new spending conditions**:

| Capability | Impossible in tacit today | Possible with Miniscript | Cost |
|-----------|---------------------------|------------------------|------|
| Timelocked key recovery | No recovery path | `and_v(v:pk(recovery), older(N))` | 178 B leaf |
| Escrow / dispute resolution | Requires bilateral online | `thresh(2, A, B, C)` | 271 B leaf |
| Hashlock atomic swaps | Complex preauth-bid pre-signing | `and_v(v:pk, sha256(H))` | 205 B leaf |
| Multi-sig DAO voting | Not implemented | `thresh(M, pk1..pkN)` | ~100 B + keys |
| Decaying 2-of-2 → 1-of-1 | Not possible | `or_i(thresh(2, A, B), and_v(v:A, older(N)))` | ~300 B leaf |

These are **qualitative** improvements — they turn tacit from a bilateral protocol into a **multilateral programmable asset protocol**.

### Insight 4: Hybrid model (key path + script path) is optimal

```
Taproot output = internal_key (tacit kernel) + Merkle root of:
  Leaf 1: timelocked_recovery
  Leaf 2: escrow_2_of_3
  Leaf 3: hashlock
```

- **Key path spend**: tacit kernel sig (97 B, cheapest, default path)
- **Script path spend**: only when auxiliary conditions are needed (recovery, dispute, hashlock)

This gives the best of both worlds: low cost for happy path, rich conditions for edge cases.

### Insight 5: The sweet spot is metadata + auxiliary conditions

Target opcodes for Miniscript migration (in order of impact):

1. **T_BURN** — largest relative savings (61%), simplest replacement
2. **T_PETCH** — 34% savings, metadata can be committed to script
3. **T_DCLAIM / T_DEPOSIT / T_PMINT** — 13–14% savings, modest but clean
4. **T_AXFER / CXFER / CETCH** — not worth removing envelope; keep key path
5. **New capabilities** — recovery, escrow, hashlock, multisig — **primary motivation**

## 8. Summary

| Metric | Value |
|--------|-------|
| Envelope removal savings (confidential) | ~0–34 B (0–6%) |
| Envelope removal savings (metadata) | ~24–93 B (13–61%) |
| Key path vs. script path difference | 34 B cheaper (key path) |
| New capabilities unlocked | 5 (recovery, escrow, hashlock, multisig, decaying) |
| Rangeproof bottleneck | 65–84% of confidential opcodes — unfixable |

> **Bottom line:** Miniscript does not meaningfully reduce bytes for confidential tacit opcodes. Its primary value is enabling **new spending conditions** that today require complex multi-transaction protocols or are simply impossible. The optimal integration is a **hybrid taproot tree** with the tacit kernel as key-path default and Miniscript leaves for auxiliary conditions.
