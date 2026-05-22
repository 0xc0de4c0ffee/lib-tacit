# Protocol Review — Wire Format, Envelope, Domain Separation, Asset IDs

## Envelope Script

### Structure

```
<xonly(32)> OP_CHECKSIG OP_FALSE OP_IF "TACIT" <version(1)> <chunks...> OP_ENDIF
```

Reference: `src/envelope/script.ts:2-4`, `src/constants/domains.ts:115-117`.

### Fixed Overhead

| Component | Bytes |
|-----------|-------|
| x-only signing pubkey push (32 + 1 len) | 33 |
| `OP_CHECKSIG` (0xac) | 1 |
| `OP_FALSE OP_IF` (0x00 0x63) | 2 |
| Magic "TACIT" push (5 + 1 len) | 6 |
| Version byte push (1 + 1 len) | 2 |
| `OP_ENDIF` (0x68) | 1 |
| **Total fixed** | **45 B** |

### Chunking

`src/envelope/script.ts:43-45` — payload is split at 520 B (`MAX_SCRIPT_PUSH`) boundaries. Each additional chunk adds 1-3 bytes of push opcode overhead plus the chunk data. A typical CXFER with N=4 outputs (~770 B payload) requires 2 pushes: 520 + 250 → ~48 B variable overhead.

### PUSHDATA4 gap

`src/envelope/script.ts:112` — the decoder returns `null` on any opcode not in `{1..75, OP_PUSHDATA1(0x4c), OP_PUSHDATA2(0x4d), OP_FALSE}`. PUSHDATA4 (0x4e) is **not handled**. Current payloads never exceed 65535 B, so PUSHDATA2 suffices. A malformed push with PUSHDATA4 length prefix produces safe rejection (null), not a crash. ✅ Minor.

### No upper bound on number of pushes

The `while (p < script.length)` loop at `script.ts:89` iterates over pushes until `OP_ENDIF`. Bitcoin's 10 KB script size limit bounds this naturally. 🔵 Info.

### Magic string fingerprint

The literal ASCII `TACIT` (bytes `54 41 43 49 54`) at `script.ts:125-128` is checked by the decoder. Any blockchain observer who parses Taproot script-path spends can identify tacit envelopes trivially. This is the primary discovery mechanism for indexers. **Privacy liability** — the protocol announces itself on every transaction. Mitigation: indistinguishable from any other `OP_FALSE OP_IF`-based taproot envelope protocol; at least 3 other protocols (Runes, BitMask, ORDI) use the same pattern with different magic strings.

### Round-trip tests

`decodeEnvelopeScript(encodeEnvelopeScript(pubkey, payload))` returns the original payload. The envelope layer is payload-agnostic by design — no round-trip tests exist for malformed payloads at this layer. 🔵 Info.

---

## Opcode Wire Formats

### Design pattern

Every `decode*` function returns `null` on malformed input — never throws. ✅ Correct pattern, consistent across all 18 shipped opcode decoders.

| File | Decoder | Lines |
|------|---------|-------|
| `src/opcodes/etch.ts` | `decodeCEtch` | 70-106 |
| `src/opcodes/transfer.ts` | `decodeCXfer` | 55-80 |
| `src/opcodes/cxfer-bpp.ts` | `decodeCXferBpp` | — |
| `src/opcodes/mint.ts` | `decodeCMint` | — |
| `src/opcodes/burn.ts` | `decodeCBurn` | — |
| `src/opcodes/axfer.ts` | `decodeAXfer` | 54-81 |
| `src/opcodes/axfer-var.ts` | `decodeAXferVar` | 44-67 |
| `src/opcodes/petch.ts` | `decodePEtch` | — |
| `src/opcodes/pmint.ts` | `decodePMint` | — |
| `src/opcodes/drop.ts` | `decodeCDrop` | 127-184 |
| `src/opcodes/dclaim.ts` | `decodeCDClaim` | — |
| `src/opcodes/deposit.ts` | `decodeDeposit` | — |
| `src/opcodes/withdraw.ts` | `decodeWithdraw` | — |
| `src/opcodes/wrapper-attest.ts` | `decodeWrapperAttest` | — |
| `src/opcodes/slot.ts` | encoders only (stubs) | — |
| `src/opcodes/cbtc-tac.ts` | encoders only (stubs) | — |
| `src/opcodes/preauth-bid.ts` | `decodePreauthBid` | 89-132 |
| `src/opcodes/preauth-bid-var.ts` | `decodePreauthBidVar` | — |

### Point validation deferral

Decoders do NOT validate that compressed-point bytes lie on the secp256k1 curve. `tryBytesToPoint` (`src/crypto/pedersen.ts:46-50`) is deferred to validation layer 3. ✅ By design — per `docs/crypto/validation.md` layer separation.

### Rangeproof length guarding

`bpRangeAggBatchVerify` at `src/crypto/bulletproofs.ts:340-498` checks:
- `m ∈ {1, 2, 4, 8}` (`BP_AGG_CAPS`, `src/constants/limits.ts:8`)
- `log_nm` is integer (`nm = nBits * m` must be a power of 2)
- `proof.length === 33*4 + 32*3 + log_nm * 33*2 + 32*2`

Any deviation returns `false` (not a throw). ✅

### T_AXFER input count guard

`decodeAXfer` at `src/opcodes/axfer.ts:62` — `assetInputCount < 1` returns `null`. The same guard exists in the validator (`verifyKernel` length check). ✅ Two-layer defense.

---

## Domain Separation

Source: `src/constants/domains.ts` (125 lines, 75+ tags).

### HMAC/ECDH domains (8 tags)

| Tag | Usage |
|-----|-------|
| `tacit-blind-v1` | Recipient blinding (ECDH-derived) |
| `tacit-change-v1` | Change blinding (self-derived) |
| `tacit-etch-v1` | Etch supply blinding |
| `tacit-mint-blind-v1` | Mint blinding |
| `tacit-amount-v1` | Recipient amount keystream (ECDH) |
| `tacit-amount-self-v1` | Change amount keystream (self) |
| `tacit-etch-amount-v1` | Etch amount keystream |
| `tacit-mint-amount-v1` | Mint amount keystream |

All 8 are distinct. Cross-context HMAC replay is impossible. ✅

### Schnorr-signature domains (26+ tags)

`tacit-kernel-v1` — used by both CXFER (`src/crypto/kernel.ts:37`) and T_AXFER. The kernel msg structure is identical for both; soundness relies on different outpoints/commitments being hashed. **Not exploitable** — see Security Review §Cross-Opcode Replay. 🔵 Info.

All other signing domains (`tacit-axintent-*`, `tacit-bid-*`, `tacit-preauth-*`, `tacit-amm-*`, `tacit-drop-*`, `tacit-pool-init-v1`, `tacit-deposit-v1`, `tacit-listing-*`, `tacit-opening-v1`, `tacit-disclosure-v1`, etc.) are unique. Cross-context Schnorr replay is impossible. ✅

### SHA256 domains

| Tag | Usage |
|-----|-------|
| `tacit-withdraw-bind-v1` | Withdraw bind hash |
| `tacit-axintent-id-v1` | Variable-amount intent ID |
| `tacit-amm-pool-v1` | AMM pool ID |
| `tacit-amm-lp-v1` | LP-share asset ID |

### BP Fiat-Shamir transcript domain

`tacit-bp-v1` at `src/crypto/bulletproofs.ts:238` — unique BP v1 transcript domain. The BP+ variant uses `tacit-bpp-v1`. ✅

### Generator derivation domains

| Domain | Output |
|--------|--------|
| `tacit-generator-H-v1` | NUMS H (Pedersen) |
| `tacit-bp-G-v1` | BP G_vec generators |
| `tacit-bp-H-v1` | BP H_vec generators |
| `tacit-bp-Q-v1` | BP Q generator |
| `tacit-amm-bjj-H-v1` | AMM BabyJubJub H |
| `tacit-amm-bjj-G-v1` | AMM BabyJubJub G |
| `tacit-amm-xcurve-v1` | AMM sigma cross-curve |

All domains use the same `sha256(domain) || counter → tryPoint` pattern (`src/crypto/pedersen.ts:65-78`, `src/crypto/bulletproofs.ts:88-100`). No collisions possible (domain strings differ). ✅

### Opcode-specific domain coverage

Every shipped opcode's signing/derivation paths use unique tags. No cross-opcode tag reuse except `tacit-kernel-v1` shared by CXFER and T_AXFER. See above.

---

## Asset IDs

### Derivation

`src/crypto/kernel.ts:263-268`:
```
asset_id = SHA256(reveal_txid_BE || reveal_vout_LE)
```
36-byte preimage: 32 bytes txid (big-endian) + 4 bytes vout (little-endian).

### CETCH vs T_PETCH collision

Structurally impossible — a Bitcoin txid identifies exactly one reveal transaction. A CETCH and T_PETCH cannot share the same (txid, vout) because each tx has exactly one envelope type at its first input's witness. ✅

### Cross-origin preimage sizes

| Asset type | Preimage size | Preimage contents |
|------------|---------------|-------------------|
| CETCH/T_PETCH | 36 B | `txid_BE(32) \|\| vout_LE(4)` |
| LP-share | 47 B | `"tacit-amm-lp-v1"(14) \|\| pool_id(32) \|\| fee_bps_LE(1)` |
| Pool ID | 84-119 B | `"tacit-amm-pool-v1"(18) \|\| asset_A(32) \|\| asset_B(32) \|\| fee_bps_LE(2) \|\| capability_flags(4) \|\| [protocol_fee_address(32) \|\| protocol_fee_bps_LE(1)]` |

Sizes are disjoint (36 ≠ 47 ≠ 84/119), so asset ID collision reduces to SHA256 preimage-finding. ✅

### Cross-network replay

`asset_id` derivation includes the txid, which is chain-specific (different networks have different genesis blocks → different txids). Cross-network replay is excluded by 1/2^256 chain divergence. Same convention as SPEC §5.7.6 listing messages. ✅

---

## Opcode Assignment Table (32 Shipped)

Source: `src/constants/opcodes.ts:80-93` (`ShippedOpcodes` set), `tacit-specs/SPEC.md:72-131`.

| Opcode | Name | SPEC § | Description |
|--------|------|--------|-------------|
| `0x21` | `T_CETCH` | §5.1 | Asset creation (etch) |
| `0x22` | `T_CXFER_BPP` | §5.21 | CXFER with BP+ |
| `0x23` | `T_CXFER` | §5.2 | Confidential transfer |
| `0x24` | `T_MINT` | §5.3 | Issuer mint of additional supply |
| `0x25` | `T_BURN` | §5.4 | Public burn |
| `0x26` | `T_AXFER` | §5.7 | Atomic OTC settlement |
| `0x27` | `T_PETCH` | §5.8 | Permissionless-mint deployment |
| `0x28` | `T_PMINT` | §5.9 | Permissionless mint event |
| `0x29` | `T_DEPOSIT` | §5.10 | Shielded pool deposit / POOL_INIT |
| `0x2A` | `T_WITHDRAW` | §5.11 | Shielded pool withdrawal |
| `0x2B` | `T_DROP` | §5.12 | Public-claim pool lock |
| `0x2C` | `T_DCLAIM` | §5.13 | Permissionless claim |
| `0x37` | `T_AXFER_VAR` | §5.7.6.1, §5.7.9 | Variable-amount atomic settlement |
| `0x38` | `T_WRAPPER_ATTEST` | §5.19 | Wrapper attestation |
| `0x43` | `T_SLOT_MINT` | §5.21 (cBTC.zk) | Slot wrapper mint |
| `0x44` | `T_SLOT_BURN` | §5.22 (cBTC.zk) | Slot wrapper redeem |
| `0x45` | `T_SLOT_ROTATE` | §5.23 (cBTC.zk) | Slot key rotation |
| `0x46` | `T_SLOT_SPLIT` | §5.24 (cBTC.zk) | Slot denomination split |
| `0x47` | `T_SLOT_MERGE` | §5.25 (cBTC.zk) | Slot denomination merge |
| `0x49` | `T_CBTC_TAC_DEPOSIT` | §5.47 (cBTC.tac) | LP-share lien mint |
| `0x4A` | `T_CBTC_TAC_WITHDRAW` | §5.47 (cBTC.tac) | Cooperative unwind |
| `0x4B` | `T_CBTC_TAC_FORCE_CLOSE` | §5.47 (cBTC.tac) | Permissionless lien transfer |
| `0x4C` | `T_CTAC_LIEN_CLAIM` | §5.47 (cBTC.tac) | Burn cBTC.tac → LP-share pro-rata |
| `0x4F` | `T_CTAC_LIEN_SPLIT` | §5.47 (cBTC.tac) | Split liened LP-share |
| `0x57` | `T_CBTC_TAC_DEPOSIT_ATOMIC` | §5.48 (cBTC.tac) | Atomic LP_ADD + cBTC.tac |
| `0x58` | `T_CBTC_TAC_WITHDRAW_ATOMIC` | §5.49 (cBTC.tac) | Atomic cBTC.tac WITHDRAW + LP_REMOVE |
| `0x59` | `T_CBTC_TAC_TOP_UP` | §5.50 (cBTC.tac) | Strengthen bond on open position |
| `0x5A` | `T_CBTC_TAC_BOND_RELEASE` | §5.51 (cBTC.tac) | Partial bond release |
| `0x5B` | `T_PREAUTH_BID` | §5.7.11 | Buyer-offline preauth bid |
| `0x5C` | `T_PREAUTH_BID_VAR` | §5.7.12 | Variable-amount preauth bid |

Barrel export: `src/opcodes/index.ts` re-exports all shipped opcode encode/decode functions.
