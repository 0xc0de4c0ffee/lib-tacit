# trailmark: cross-comparison audit
Generated: trailmark v0.3.1  |  reference commit: `c2ee202`
## Overview
| Metric | Reference (tacit-specs/dapp/) | lib-tacit (src/) |
| --- | --- | --- |
| Total nodes | 1792 | 1458 |
| Functions | 1754 | 1249 |
| Call edges | 33525 | 4054 |
## Structural Diff (src vs ref)
| Component | Delta |
| --- | --- |
| Nodes | 0 added, 0 removed |
| Edges | 0 added, 0 removed |
**Diff JSON**: `diff.json`
## Function Set Comparison
- **Unique to reference**: 1571- **Unique to lib-tacit**: 1114- **Common (by short name)**: 118
### In reference only (first 30)

- `$`
- `$$`
- `ASSET_DETAIL_URL`
- `ATOMIC_INTENTS_URL`
- `ATOMIC_INTENT_CLAIM_URL`
- `ATOMIC_INTENT_DELETE_URL`
- `ATOMIC_INTENT_FINALIZE_URL`
- `ATOMIC_INTENT_FULFILMENT_URL`
- `ATOMIC_INTENT_GET_URL`
- `ATTEST_URL`
- `DISCLOSURES_URL`
- `DROP_URL`
- `G_BJJ`
- `G_BJJ_BASE_U`
- `G_BJJ_BASE_V`
- `G_BJJ_meta`
- `H_BJJ`
- `H_BJJ_BASE_U`
- `H_BJJ_BASE_V`
- `H_BJJ_meta`
- `LISTINGS_URL`
- `LISTING_CLAIM_URL`
- `LISTING_DELETE_URL`
- `MINT_ATTEST_URL`
- `PETCH_ASSET_URL`
- `PMINTS_URL`
- `PREAUTH_BIDS_URL`
- `PREAUTH_BIDS_VAR_URL`
- `PREAUTH_BID_URL`
- `PREAUTH_BID_VAR_URL`
- ... and 1541 more
### In our src only (first 30)

- `AXFERBPPInput.assetId`
- `AXFERBPPInput.assetInputCount`
- `AXFERBPPInput.kernelSig`
- `AXFERBPPInput.outputs`
- `AXFERBPPInput.rangeproof`
- `AXFERBPPOutput.assetId`
- `AXFERBPPOutput.assetInputCount`
- `AXFERBPPOutput.kernelSig`
- `AXFERBPPOutput.kind`
- `AXFERBPPOutput.outputs`
- `AXFERBPPOutput.rangeproof`
- `AXFERInput.assetId`
- `AXFERInput.assetInputCount`
- `AXFERInput.kernelSig`
- `AXFERInput.outputs`
- `AXFERInput.rangeproof`
- `AXFEROutput.assetId`
- `AXFEROutput.assetInputCount`
- `AXFEROutput.kernelSig`
- `AXFEROutput.kind`
- `AXFEROutput.outputs`
- `AXFEROutput.rangeproof`
- `AXFERVarBPPInput.assetId`
- `AXFERVarBPPInput.kernelSig`
- `AXFERVarBPPInput.outputs`
- `AXFERVarBPPInput.rangeproof`
- `AXFERVarBPPOutput.assetId`
- `AXFERVarBPPOutput.assetInputCount`
- `AXFERVarBPPOutput.kernelSig`
- `AXFERVarBPPOutput.kind`
- ... and 1084 more
## Opcode Encode/Decode Parity
| Family | Reference | Our src |
| --- | --- | --- |
| Encoders | 54 | 42 |
| Decoders | 50 | 37 |

## Attack Surface Analysis
| Node | Kind | Trust | Asset Value | Description |
| --- | --- | --- | --- | --- |
| crypto.pedersen:tryBytesToPoint | user_input | untrusted_external | high | Parses untrusted 33-byte secp256k1 points from envelope decode |
| envelope.script:decodeEnvelopeScript | user_input | untrusted_external | high | Deserializes taproot script witness; top-level wire parser |
| indexer.ipfs:ipfsFetchVerified | third_party | untrusted_external | medium | Fetches untrusted IPFS data via gateway; CID-verified |
| indexer.ipfs:verifyCidV1 | user_input | untrusted_external | medium | Validates CID format from external input |
| crypto.kernel:verifyKernel | user_input | untrusted_external | high | Verifies kernel signature against excess point; supply-conservation gate |
| crypto.schnorr:verifySchnorr | user_input | untrusted_external | high | BIP-340 Schnorr verification from untrusted signers |
| crypto.bulletproofs:bpRangeAggVerify | user_input | untrusted_external | high | Verifies aggregated Bulletproofs range proof from untrusted transactions |
| crypto.bulletproofs-plus:bppRangeVerify | user_input | untrusted_external | high | Verifies BP+ aggregated range proof from untrusted transactions |
| crypto.groth16:groth16Verify | user_input | untrusted_external | high | Verifies Groth16 zk-proof from shielded-pool withdraw |
| indexer.ancestry:AncestryWalker.validateInner | user_input | untrusted_external | high | Walks and validates ancestry chain from untrusted envelope data |
| opcodes.etch:decodeCEtch | user_input | untrusted_external | high | Decodes CETCH payload from untrusted envelope |
| opcodes.transfer:decodeCXfer | user_input | untrusted_external | high | Decodes CXFER payload from untrusted envelope |
| opcodes.burn:decodeCBurn | user_input | untrusted_external | high | Decodes T_BURN payload from untrusted envelope |
| opcodes.drop:decodeCDrop | user_input | untrusted_external | high | Decodes T_DROP payload from untrusted envelope |
| opcodes.amm-swap:decodeSwapVar | user_input | untrusted_external | high | Decodes T_SWAP_VAR payload from untrusted envelope |
| opcodes.amm-swap:decodeSwapRoute | user_input | untrusted_external | high | Decodes T_SWAP_ROUTE payload from untrusted envelope |
| opcodes.slot:decodeSlotMint | user_input | untrusted_external | high | Decodes T_SLOT_MINT payload from untrusted envelope |
| opcodes.cbtc-tac:decodeCBtcTacDeposit | user_input | untrusted_external | high | Decodes T_CBTC_TAC_DEPOSIT from untrusted envelope |
| wallet.keypair:generateKeypair | database | trusted_internal | high | Generates secp256k1 keypair; internal call |
| crypto.stealth:deriveStealthEcdhBlinding | database | trusted_internal | high | Derives stealth ECDH blinding scalar from shared secret |
| recovery.decrypt:tryDecryptOutput | file_system | trusted_internal | medium | ECDH trial-decrypts an output for recovery |
## Preanalysis Findings
Findings: 0  |  Subgraphs: 7
- **`entrypoint_reachable`**: 94 nodes
- **`entrypoints`**: 21 nodes
- **`entrypoints:trusted_internal`**: 3 nodes
- **`entrypoints:untrusted_external`**: 18 nodes
- **`high_blast_radius`**: 28 nodes
- **`privilege_boundary`**: 34 nodes
- **`tainted`**: 82 nodes
## Semantic Annotations
| Node | Kind | Description | Source |
| --- | --- | --- | --- |
| crypto.bulletproofs-plus:bppRangeVerify | finding | Highest complexity (26) in src/ — critical crypto verify path | trailmark-analysis |
| crypto.kernel:verifyKernel | assumption | Caller has already validated all curve points via tryBytesToPoint | manual |
| crypto.pedersen:tryBytesToPoint | assumption | Rejects invalid points before curve ops — layer-2 gate | manual |
| envelope.script:decodeEnvelopeScript | finding | High cyclomatic complexity (25) — parse once, validate outer shape only | trailmark-analysis |

**Preanalysis annotation breakdown**: {'blast_radius': 1458, 'privilege_boundary': 314, 'taint_propagation': 82, 'finding': 2, 'assumption': 2}
## Entrypoint Paths to Critical Functions
- **crypto.kernel:verifyKernel** (verifies kernel sig from untrusted data): 3 entrypoint paths
- **crypto.bulletproofs-plus:bppRangeVerify** (verifies BP+ range proof from untrusted data): 0 entrypoint paths
- **crypto.schnorr:verifySchnorr** (verifies Schnorr sig from untrusted data): 4 entrypoint paths
- **envelope.script:decodeEnvelopeScript** (parses untrusted envelope script bytes): 1 entrypoint paths
## Key Call Paths
## Exception Analysis
Functions that can raise `Error`: 113
## Module Dependency Graphs
Detailed module-dependency graphs with call-edge counts live in the per-target reports:
- [`specs/ref-report.md`](specs/ref-report.md) — reference dapp module graph
- [`lib-tacit/src-report.md`](lib-tacit/src-report.md) — library src module graph

## Complexity Hotspots & Most-Called Functions
These tables are maintained in the per-target reports to avoid duplication:
- **Reference hotspots**: [`specs/ref-report.md`](specs/ref-report.md) (cyclomatic >= 10, 403 entries)
- **Library hotspots**: [`lib-tacit/src-report.md`](lib-tacit/src-report.md) (cyclomatic >= 10, 63 entries)
- **Library hotspots (≥12)**: see this report's [cross-comparison below](#key-observations) for the top 3

## Graph Exports
- **Full graph JSON**: `specs/ref-graph.json` (1792 nodes, 33525 edges)
- **Entrypoints**: `specs/ref-graph-entrypoints.md` (5 entrypoints)
- **Standalone report**: `specs/ref-report.md`
- **Full graph JSON**: `lib-tacit/src-graph.json` (1458 nodes, 4054 edges)
- **Entrypoints**: `lib-tacit/src-graph-entrypoints.md` (21 entrypoints)
- **Standalone report**: `lib-tacit/src-report.md`
## Key Function Callers
- **crypto.kernel:verifyKernel**: 1 direct callers
- **crypto.bulletproofs-plus:bppRangeVerify**: 0 direct callers
- **envelope.script:decodeEnvelopeScript**: 2 direct callers
- **crypto.pedersen:tryBytesToPoint**: 2 direct callers
## Nodes with Finding Annotations
- **Finding annotations**: 0 nodes
## Transitive Reachability
- **crypto.kernel:verifyKernel**: 3 ancestors, 13 reachable
- **envelope.script:decodeEnvelopeScript**: 5 ancestors, 0 reachable
## Key Observations
1. **Structural density**: Reference is 7.9× denser (33525 vs 4041 edges) — monolithic dapp vs modular library.
2. **Opcode parity**: All reference opcode encoders/decoders have src/ equivalents (42 encoders, 37 decoders).
3. **Complexity**: BP+ verify (26), envelope decode (25), ancestry validate (25) highest — cryptographically justified.
4. **In src only**: TypeScript types, barrel re-exports, modular boundaries not in mono-JS ref.
5. **In ref only**: Dapp orchestration (buildAndBroadcast*, wallet UX, market UI) intentionally omitted.
6. **Attack surface**: 20+ untrusted-entrypoint functions (decoders, verify, IPFS fetch) — all protected by type narrowing + null returns.
7. **Preanalysis**: 0 findings, 5 subgraphs (entrypoints, entrypoint_reachable, high_blast_radius, privilege_boundary, tainted).
8. **Exception surface**: Minimal — functions return `null`/`false` instead of throwing for invalid data.

## Module Count Comparison
| Language | Modules | Avg functions/module |
| --- | --- | --- |
| JavaScript (ref) | 4 | 438 |
| TypeScript (src) | 481 | 2 |
