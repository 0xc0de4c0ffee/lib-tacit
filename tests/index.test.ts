// Barrel re-export test — verifies every public symbol is reachable from src/index.ts
import { describe, test, expect } from 'bun:test';

describe('@tacit/lib barrel exports (src/index.ts)', () => {
  test('all expected symbols are exported', async () => {
    const lib = await import('../src/index.js');

    // Constants
    expect(lib.Opcode).toBeDefined();
    expect(lib.SECP_N).toBeDefined();
    expect(lib.N_BITS).toBeDefined();
    expect(lib.ENVELOPE_MAGIC).toBeDefined();

    // Crypto
    expect(lib.pedersenCommit).toBeFunction();
    expect(lib.pedersenVerify).toBeFunction();
    expect(lib.signSchnorr).toBeFunction();
    expect(lib.verifySchnorr).toBeFunction();
    expect(lib.deriveBlinding).toBeFunction();
    expect(lib.encryptAmount).toBeFunction();
    expect(lib.decryptAmount).toBeFunction();
    expect(lib.computeKernelMsg).toBeFunction();
    expect(lib.signKernel).toBeFunction();
    expect(lib.verifyKernel).toBeFunction();
    expect(lib.bpRangeAggProve).toBeFunction();
    expect(lib.bpRangeAggVerify).toBeFunction();

    // Envelope
    expect(lib.encodeEnvelopeScript).toBeFunction();
    expect(lib.decodeEnvelopeScript).toBeFunction();

    // Opcodes (implemented)
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
    expect(lib.encodeCDClaim).toBeFunction();
    expect(lib.decodeCDClaim).toBeFunction();

    // Opcodes (stubs — shipped but not impl)
    expect(lib.encodeCXferBpp).toBeFunction();
    expect(lib.encodeDeposit).toBeFunction();
    expect(lib.decodeDeposit).toBeFunction();
    expect(lib.encodeWithdraw).toBeFunction();
    expect(lib.decodeWithdraw).toBeFunction();
    expect(lib.encodeAXferVar).toBeFunction();
    expect(lib.decodeAXferVar).toBeFunction();
    expect(lib.encodeWrapperAttest).toBeFunction();
    expect(lib.decodeWrapperAttest).toBeFunction();

    // Transaction
    expect(lib.hash160).toBeFunction();
    expect(lib.hash256).toBeFunction();
    expect(lib.txid).toBeFunction();
    expect(lib.serializeTx).toBeFunction();
    expect(lib.p2wpkhAddress).toBeFunction();
    expect(lib.buildAnchor).toBeFunction();

    // Wallet
    expect(lib.generateKeypair).toBeFunction();
    expect(lib.importPrivkey).toBeFunction();
    expect(lib.exportPrivkey).toBeFunction();
  });
});
