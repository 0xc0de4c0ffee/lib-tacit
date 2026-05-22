// Barrel re-export test — verifies every public symbol is reachable from src/index.ts
import { describe, test, expect } from 'bun:test';

describe('lib-tacit barrel exports (src/index.ts)', () => {
  test('all expected symbols are exported', async () => {
    const lib = await import('../src/index.js');

    // Constants
    expect(lib.Opcode).toBeDefined();
    expect(lib.SECP_N).toBeDefined();
    expect(lib.N_BITS).toBeDefined();
    expect(lib.ENVELOPE_MAGIC).toBeDefined();
    expect(lib.ENVELOPE_VERSION).toBeDefined();

    // Crypto
    expect(lib.pedersenCommit).toBeFunction();
    expect(lib.pedersenVerify).toBeFunction();
    expect(lib.signSchnorr).toBeFunction();
    expect(lib.verifySchnorr).toBeFunction();
    expect(lib.deriveBlinding).toBeFunction();
    expect(lib.encryptAmount).toBeFunction();
    expect(lib.decryptAmount).toBeFunction();
    expect(lib.computeKernelMsg).toBeFunction();
    expect(lib.listingMsg).toBeFunction();
    expect(lib.axintentMsg).toBeFunction();
    expect(lib.dropKernelMsg).toBeFunction();
    expect(lib.dropReclaimMsg).toBeFunction();
    expect(lib.openingMsg).toBeFunction();
    expect(lib.disclosureMsg).toBeFunction();
    expect(lib.signKernel).toBeFunction();
    expect(lib.verifyKernel).toBeFunction();
    expect(lib.bpRangeAggProve).toBeFunction();
    expect(lib.bpRangeAggVerify).toBeFunction();
    expect(lib.randomScalar).toBeFunction();
    expect(lib.modN).toBeFunction();
    expect(lib.msm).toBeFunction();
    expect(lib.poseidonHash).toBeFunction();
    expect(lib.poseidonHash1).toBeFunction();
    expect(lib.poseidonHash2).toBeFunction();
    expect(lib.groth16Verify).toBeFunction();
    expect(lib.bppRangeProve).toBeFunction();
    expect(lib.bppRangeVerify).toBeFunction();

    // Envelope
    expect(lib.encodeEnvelopeScript).toBeFunction();
    expect(lib.decodeEnvelopeScript).toBeFunction();

    // Opcodes (implemented full codec)
    expect(lib.encodeCEtch).toBeFunction();
    expect(lib.decodeCEtch).toBeFunction();
    expect(lib.encodeCXfer).toBeFunction();
    expect(lib.decodeCXfer).toBeFunction();
    expect(lib.encodeCMint).toBeFunction();
    expect(lib.decodeCMint).toBeFunction();
    expect(lib.encodeCBurn).toBeFunction();
    expect(lib.decodeCBurn).toBeFunction();
    expect(lib.encodeAXfer).toBeFunction();
    expect(lib.decodeAXfer).toBeFunction();
    expect(lib.encodePEtch).toBeFunction();
    expect(lib.decodePEtch).toBeFunction();
    expect(lib.encodePMint).toBeFunction();
    expect(lib.decodePMint).toBeFunction();
    expect(lib.encodeCDrop).toBeFunction();
    expect(lib.decodeCDrop).toBeFunction();
    expect(lib.encodeCDropReclaim).toBeFunction();
    expect(lib.dropIdFromRevealTxid).toBeFunction();
    expect(lib.encodeCDClaim).toBeFunction();
    expect(lib.decodeCDClaim).toBeFunction();
    expect(lib.encodeCXferBpp).toBeFunction();
    expect(lib.decodeCXferBpp).toBeFunction();
    expect(lib.encodeDeposit).toBeFunction();
    expect(lib.decodeDeposit).toBeFunction();
    expect(lib.encodeWithdraw).toBeFunction();
    expect(lib.decodeWithdraw).toBeFunction();
    expect(lib.encodeAXferVar).toBeFunction();
    expect(lib.decodeAXferVar).toBeFunction();
    expect(lib.encodeWrapperAttest).toBeFunction();
    expect(lib.decodeWrapperAttest).toBeFunction();

    // Shipped preauth-bid family (0x5B-0x5C)
    expect(lib.encodePreauthBid).toBeFunction();
    expect(lib.decodePreauthBid).toBeFunction();
    expect(lib.computePreauthBidContextHash).toBeFunction();
    expect(lib.encodePreauthBidVar).toBeFunction();
    expect(lib.decodePreauthBidVar).toBeFunction();
    expect(lib.computePreauthBidVarContextHash).toBeFunction();
    expect(lib.PREAUTH_BID_DOMAIN).toBe('tacit-preauth-bid-v1');

    // Opcode stubs (shipped but no wire codec)
    expect(lib.encodeSlotMint).toBeFunction();
    expect(lib.encodeSlotBurn).toBeFunction();
    expect(lib.encodeCBtcTacDeposit).toBeFunction();

    // Transaction
    expect(lib.hash160).toBeFunction();
    expect(lib.hash256).toBeFunction();
    expect(lib.txid).toBeFunction();
    expect(lib.serializeTx).toBeFunction();
    expect(lib.preauthSellerSpendSighash).toBeFunction();
    expect(lib.p2wpkhAddress).toBeFunction();
    expect(lib.p2wpkhScript).toBeFunction();
    expect(lib.buildAnchor).toBeFunction();
    expect(lib.buildCommitTx).toBeFunction();
    expect(lib.buildRevealTx).toBeFunction();
    expect(lib.computeAssetIdFromTx).toBeFunction();

    // Validation
    expect(lib.validateAncestry).toBeFunction();
    expect(lib.checkSupplyConservation).toBeFunction();
    expect(lib.checkPublicSupply).toBeFunction();

    // Recovery
    expect(lib.scanForUTXOs).toBeFunction();
    expect(lib.tryDecryptOutput).toBeFunction();
    expect(lib.tryDecryptOutputs).toBeFunction();

    // Stealth
    expect(lib.encodeStealthAddress).toBeFunction();
    expect(lib.decodeStealthAddress).toBeFunction();

    // Wallet
    expect(lib.generateKeypair).toBeFunction();
    expect(lib.importPrivkey).toBeFunction();
    expect(lib.exportPrivkey).toBeFunction();
    expect(lib.derivePubkey).toBeFunction();
    expect(lib.deriveXonlyPubkey).toBeFunction();
    expect(lib.UTXOManager).toBeDefined();
    // PRF passkey wallet
    expect(lib.prfBytesToScalar).toBeFunction();
    expect(lib.isPasskeyAvailable).toBeFunction();
    expect(lib.loadPrfMap).toBeFunction();
    expect(lib.savePrfMap).toBeFunction();
    // Key encryption
    expect(lib.encryptPrivkey).toBeFunction();
    expect(lib.decryptPrivkey).toBeFunction();
    expect(lib.readBlobPub).toBeFunction();
    expect(lib.storageShape).toBeFunction();
    expect(lib.PBKDF2_ITER).toBeDefined();

    // Indexer
    expect(lib.EsploraClient).toBeDefined();
    expect(lib.AncestryWalker).toBeDefined();
  });
});
