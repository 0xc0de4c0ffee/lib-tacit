# Current Model: Tacit on Bitcoin Script

> How the tacit confidential token protocol currently encodes envelopes using Bitcoin's Taproot script-path.
> Source of truth: `src/envelope/script.ts`, `src/crypto/kernel.ts`, `docs/crypto/validation.md`.

## Taproot Script-Path Envelope

Every tacit protocol transaction (CETCH, CXFER, T_BURN, T_MINT, T_PETCH, T_PREAUTH_BID, etc.) encodes its payload inside a Bitcoin Taproot script-path spend. The envelope script layout is defined in `src/envelope/script.ts`:

```
<signing_pub_xonly> OP_CHECKSIG OP_FALSE OP_IF "TACIT" <version> <payload_chunks...> OP_ENDIF
```

### Breakdown

| Bytes | Element | Description |
|---|---|---|
| 1 | `32` | Length prefix for x-only pubkey push |
| 32 | `signing_pub_xonly` | 32-byte x-only NUMS pubkey (see below) |
| 1 | `OP_CHECKSIG (0xac)` | Verifies the Schnorr signature |
| 1 | `OP_FALSE (0x00)` | Required for OP_IF to create an unspendable branch |
| 1 | `OP_IF (0x63)` | Conditional block start |
| 1 | `len` (5) | Push of magic bytes |
| 5 | `"TACIT"` | Magic marker — identifies tacit envelopes to indexers |
| 1 | `len` (1) | Push of version byte |
| 1 | `0x01` | Envelope version |
| *N* | `encodePush(chunk)` × *M* | Payload chunked at MAX_SCRIPT_PUSH=520 B boundaries |
| 1 | `OP_ENDIF (0x68)` | Closes conditional block |

### The NUMS Key

The `signing_pub_xonly` in the envelope is a **NUMS (Nothing-Up-My-Sleeve) public key** with no known discrete logarithm. Because nobody knows the corresponding private key, the **key-path spend is impossible**. Every tacit spend is forced through the script path, where:

1. The spender provides a BIP-340 Schnorr signature under the envelope's signing pubkey
2. The witness reveals the envelope payload
3. An indexer (or light client) parses the envelope and validates the kernel signature

The indexer validates that `verifyKernel(sig, assetId, inputs, outputs)` passes (see `src/crypto/kernel.ts`). The kernel sig proves Σout = Σin without revealing amounts, using Mimblewimble-style Pedersen commitment excess.

## Kernel Signature

The `verifyKernel` function in `src/crypto/kernel.ts`:

```
E' = ΣC_out + burned·H − ΣC_in
verifySchnorr(kernelSig, computeKernelMsg(...), E'.xonly())
```

The kernel signature is a BIP-340 Schnorr signature over a domain-separated message (`tacit-kernel-v1`) that binds the spend to a specific asset, specific input outpoints, and output commitments. This signature sits **inside** the envelope payload (not as the Bitcoin-level signing key). The Bitcoin-level `OP_CHECKSIG` in the envelope script uses a **separate** ephemeral key that is revealed in the witness.

This means every tacit envelope carries:
- **Bitcoin-level sig**: 64-68 B for the taproot script-path spend (the "envelope key" in the witness)
- **Kernel sig**: 64 B inside the envelope payload (the "protocol sig" proving supply conservation)
- **Kernel key**: derived from Σr_out − Σr_in (the excess blinding), not a persistent key

## Envelope Sizes

Fixed envelope overhead: 45 B

```
OP_CHECKSIG(1) + OP_FALSE OP_IF(2) + "TACIT" push(6) + version push(2) + OP_ENDIF(1) + xonly push(33)
= 1 + 2 + 6 + 2 + 1 + 33 = 45 B
```

Payload chunking adds 1–5 B per MAX_SCRIPT_PUSH=520 B boundary based on push opcode selection:
- ≤75 B → 1 B push
- ≤255 B → 2 B push (`OP_PUSHDATA1` + len)
- ≤65535 B → 3 B push (`OP_PUSHDATA2` + 2B len)

| Opcode | Payload | On-Chain | Overhead | Notes |
|---|---|---|---|---|
| T_PETCH (0x27) | 30 B | 76 B | 153% | 4-char ticker, no image URI, no rangeproof |
| T_PETCH w/ image | 130 B | 177 B | 36% | 100-byte image URI |
| T_BURN N=0 (0x25) | 106 B | 153 B | 44% | Full burn (no change outputs), no rangeproof |
| T_BURN N=1 (0x25) | 552 B | 600 B | 9% | Burn with 1 change output + rangeproof |
| CXFER N=2 (0x23) | 829 B | 879 B | 6% | 2 outputs (recipient + change) + rangeproof |
| CXFER N=4 (0x23) | 1013 B | 1063 B | 5% | 4 outputs + rangeproof |
| T_CXFER_BPP N=2 (0x22) | 717 B | 767 B | 7% | BP+ variant, ~14% smaller than classic CXFER |
| T_AXFER (0x26) | 893 B | 943 B | 6% | Atomic settlement with BTC auxiliary input |
| T_DROP (0x2B) | 299 B | 347 B | 16% | Pool init with 2 asset inputs |
| T_PREAUTH_BID (0x5B) | 919 B | 969 B | 5% | Preauth bid with exact-fill outputs + rangeproof |
| T_PREAUTH_BID_VAR (0x5C) | 1031 B | 1089 B | 6% | Variable-fill with K pre-sigs |

## Limitations of the Current Model

### 1. No Recovery Path

The kernel key for a tacit UTXO's commitment is derived from ephemeral blinding factors. If you lose the wallet's private key (the HMAC key that derives blindings), the UTXO is **permanently unspendable**. There is no fallback key, no timelocked recovery, no social recovery mechanism.

The `tacit-specs/SPEC.md` §2 trust model makes this explicit: "This is the wallet for tacit assets. It can be (a) auto-generated on first load, (b) imported from a privkey hex the user holds, or (c) locally bound." All three paths produce a single point of failure.

### 2. No Multi-Sig

The kernel signature is a single BIP-340 Schnorr signature. There is no multi-signature variant. A tacit UTXO is always controlled by a single signing key. There is no way to create a tacit output that requires M-of-N approval to spend.

### 3. No Timelocks

The envelope script has no `OP_CHECKLOCKTIMEVERIFY` or `OP_CHECKSEQUENCEVERIFY`. Tacit transactions are time-independent — they are valid at any block height. This means:

- No pending transfers that become valid later
- No "dead man switch" recovery
- No vesting schedules enforceable on-chain
- No time-delayed dispute resolution

### 4. No Hash Locks

Tacit has no `OP_SHA256` or `OP_HASH160` in its scripts. The atomic swap protocol (T_AXFER, T_AXFER_VAR) achieves atomicity by bundling tacit outputs and Bitcoin auxiliary inputs in the **same Bitcoin transaction** — both parties must be online and cooperative to construct and sign the transaction. There is no pre-signed, hash-locked atomic swap primitive.

### 5. No Dispute Resolution

T_AXFER (atomic OTC settlement) requires both parties to simultaneously construct a transaction. If one party goes offline mid-flow, the other cannot unilaterally resolve. The proposed PREAUTH_BID family (0x5B–0x5C) improves this by allowing buyer-offline pre-signed bids, but:

- The seller is still required to be online to finalize
- There is no escrow/arbitration path
- There is no timeout that releases funds back to the buyer

### 6. Fixed 45 B Overhead on Every Spend

Because the NUMS key forces script-path spending, every tacit transaction pays 45 B of envelope framing overhead. This is non-trivial at scale — across millions of tacit UTXOs, this is megabytes of chain data that could be eliminated.
