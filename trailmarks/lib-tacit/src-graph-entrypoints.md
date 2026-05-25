# Entrypoints: Library (lib-tacit src/)

| Node | Kind | Trust | Asset | Description |
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
