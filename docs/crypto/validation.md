# Envelope Validation Layers

`lib-tacit` separates **wire parsing** from **cryptographic verification**. Decoders return structured fields or `null`; they do not prove a transaction is valid on chain.

## Layer 1 — Envelope script (`decodeEnvelopeScript`)

- Taproot script-path layout: signing pubkey, `OP_CHECKSIG`, `OP_FALSE OP_IF`, magic `TACIT`, version `0x01`, chunked payload, `OP_ENDIF`
- Rejects malformed pushes, wrong magic/version, trailing bytes

## Layer 2 — Opcode payload (`decodeCXfer`, …)

- Opcode byte, exact payload length, UTF-8 tickers (fatal decode), u64 range checks where encoders enforce them
- **Does not** parse secp256k1 points beyond length; invalid curve bytes may still decode

Use `tryBytesToPoint(commitment33)` before curve math on untrusted bytes.

## Layer 3 — Cryptographic verification (caller / indexer)

| Check | API |
|--------|-----|
| Kernel conservation | `verifyKernel(sig, assetId, inputOutpoints, inputCommitments, outputCommitments, burnedAmount?)` — returns `false` on bad points (never throws) |
| Range proof (classic BP, opcode 0x23) | `bpRangeAggVerify(commitments, rangeproof)` |
| Range proof (BP+, opcode 0x22) | **Not in this library yet** — see `tacit-specs/dapp/bulletproofs-plus.js` |
| Amount ↔ commitment | `decryptAmount(ct, keystream)` then `pedersenVerify(C, amount, blinding)` |
| Mint authority | `verifySchnorr(issuerSig, computeMintMsg(...), mintAuthorityXonly)` |
| Shielded withdraw | Groth16 + nullifier rules (future `snarkjs` integration) |

## `verifyKernel` requirements

- `inputOutpoints.length === inputCommitments.length`
- All commitments are valid compressed secp256k1 points
- `E' = ΣC_out + burned·H − ΣC_in` must not be the point at infinity (degenerate kernel)
- Schnorr signature verifies under `E'.xonly()` with `computeKernelMsg(...)`

## Reference tests

Pinned bytes: `tests/crypto/vectors.test.ts` (from `tacit-specs/tests/vectors.test.mjs`).

End-to-end protocol flows: `tacit-specs/tests/composition.test.mjs` (not run from this package's test root).
