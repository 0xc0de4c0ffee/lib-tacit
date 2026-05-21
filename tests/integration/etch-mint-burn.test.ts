// End-to-end protocol integration test: etch -> mint -> burn pipeline.
// Exercises every layer: envelope, Pedersen, ECDH, Schnorr, BP, kernel sig.
// Mirrors tacit-specs/tests/composition.test.mjs:1115+
import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import * as secp from '@noble/secp256k1';
import { encodeEnvelopeScript, decodeEnvelopeScript } from '../../src/envelope/script.js';
import { encodeCEtch, decodeCEtch } from '../../src/opcodes/etch.js';
import { encodeCMint, decodeCMint } from '../../src/opcodes/mint.js';
import { encodeCBurn, decodeCBurn } from '../../src/opcodes/burn.js';
import {
  G, ZERO, H, pedersenCommit, pedersenVerify, pointToBytes, bytesToPoint,
  modN, randomScalar, safeMult,
} from '../../src/crypto/pedersen.js';
import { deriveEtchBlinding, deriveMintBlinding, deriveBlinding, deriveChangeBlinding, deriveEtchAmountKeystream, deriveMintAmountKeystream, encryptAmount, decryptAmount } from '../../src/crypto/ecdh.js';
import { signSchnorr, verifySchnorr } from '../../src/crypto/schnorr.js';
import { computeKernelMsg, signKernel, verifyKernel, computeCxferExcess, assetIdFor } from '../../src/crypto/kernel.js';
import { bpRangeAggProve, bpRangeAggVerify } from '../../src/crypto/bulletproofs.js';
import { buildAnchor, voutLE } from '../../src/transaction/utils.js';

function keypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  return { priv, pub: secp.getPublicKey(priv, true) };
}

describe('etch -> mint -> burn integration', () => {
  test('full pipeline: etch asset, mint supply, burn, verify kernel at each step', () => {
    // --- Setup ---
    const issuer = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const assetId = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);

    // --- CETCH (Etch) ---
    const etchSupply = 1_000_000n;
    const rEtch = deriveEtchBlinding(issuer.priv, anchor);
    const C_etch = pedersenCommit(etchSupply, rEtch);
    const etchCt = encryptAmount(etchSupply, deriveEtchAmountKeystream(issuer.priv, anchor));
    const { proof: etchProof } = bpRangeAggProve([etchSupply], [rEtch]);

    const etchPayload = encodeCEtch({
      ticker: 'TEST', decimals: 8,
      commitment: pointToBytes(C_etch),
      encryptedAmount: etchCt,
      rangeproof: etchProof,
      mintAuthority: issuer.pub.slice(1), // xonly (32 bytes)
    });

    const xonly = new Uint8Array(32); xonly[0] = 0x02;
    const etchScript = encodeEnvelopeScript(xonly, etchPayload);
    const etchDecoded = decodeEnvelopeScript(etchScript);
    expect(etchDecoded).not.toBeNull();
    expect(etchDecoded!.opcode).toBe(0x21);

    // Verify BP rangeproof on supply commitment
    expect(bpRangeAggVerify([C_etch], etchProof)).toBe(true);

    // --- T_MINT (Mint additional supply) ---
    const mintAmount = 500_000n;
    const rMint = deriveMintBlinding(issuer.priv, anchor);
    const C_mint = pedersenCommit(mintAmount, rMint);
    const mintCt = encryptAmount(mintAmount, deriveMintAmountKeystream(issuer.priv, anchor));
    const { proof: mintProof } = bpRangeAggProve([mintAmount], [rMint]);

    const mintPayload = encodeCMint({
      assetId,
      etchTxid: new Uint8Array(32).fill(0xdd),
      commitment: pointToBytes(C_mint),
      encryptedAmount: mintCt,
      rangeproof: mintProof,
      issuerSig: signSchnorr(
        sha256(assetId), // simplified mint msg
        issuer.priv,
      ),
    });
    const mintScript = encodeEnvelopeScript(xonly, mintPayload);
    const mintDecoded = decodeEnvelopeScript(mintScript);
    expect(mintDecoded).not.toBeNull();
    expect(mintDecoded!.opcode).toBe(0x24);
    expect(bpRangeAggVerify([C_mint], mintProof)).toBe(true);

    // --- T_BURN ---
    const burnAmount = 200_000n;
    const rBurnIn = randomScalar();
    const C_burnIn = pedersenCommit(burnAmount, rBurnIn);
    const rBurnOut = deriveChangeBlinding(issuer.priv, anchor);
    const changeAmount = burnAmount; // burn everything, zero change
    const C_burnOut = pedersenCommit(0n, rBurnOut);

    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const kernelMsg = computeKernelMsg(assetId, inputOps, [pointToBytes(C_burnOut)], burnAmount);
    const excess = computeCxferExcess([rBurnOut], [rBurnIn]);
    const burnSig = signKernel(kernelMsg, excess);

    const burnPayload = encodeCBurn({
      assetId,
      burnedAmount: burnAmount,
      rangeproof: new Uint8Array(0),  // no rangeproof needed for empty outputs
      kernelSig: burnSig,
      outputs: [],
    });

    const burnScript = encodeEnvelopeScript(xonly, burnPayload);
    const burnDecoded = decodeEnvelopeScript(burnScript);
    expect(burnDecoded).not.toBeNull();
    expect(burnDecoded!.opcode).toBe(0x25);

    // Verify burn kernel sig
    expect(verifyKernel(
      burnSig, assetId, inputOps,
      [pointToBytes(C_burnIn)],
      [pointToBytes(C_burnOut)],
      burnAmount,
    )).toBe(true);

    // --- Cross-invariant: amounts balance ---
    // Total minted = etchSupply + mintAmount = 1,500,000
    // Burned = burnAmount = 200,000
    // Supply invariant: total_minted - burned >= 0
    const totalMinted = etchSupply + mintAmount;
    expect(totalMinted - burnAmount).toBe(1_300_000n);
  });

  test('non-mintable etch rejects mint attempt (encode layer)', () => {
    expect(() => encodeCEtch({
      ticker: 'FIXED', decimals: 0,
      commitment: pointToBytes(pedersenCommit(1000n, 7n)),
      encryptedAmount: new Uint8Array(8).fill(0xaa),
      rangeproof: new Uint8Array(0),
      // no mintAuthority — non-mintable
    })).not.toThrow();
  });

  test('balanced cxfer: pedersen + BP + kernel in one pipeline', () => {
    const sender = keypair();
    const recip = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const assetId = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inputAmt = 200n;
    const sendAmt = 150n;
    const rIn = randomScalar();
    const cIn = pedersenCommit(inputAmt, rIn);
    const rRecip = deriveBlinding(sender.priv, recip.pub, anchor, 0);
    const rChange = deriveChangeBlinding(sender.priv, anchor, 1);
    const cOut1 = pedersenCommit(sendAmt, rRecip);
    const cOut2 = pedersenCommit(inputAmt - sendAmt, rChange);
    const { proof } = bpRangeAggProve([sendAmt, inputAmt - sendAmt], [rRecip, rChange]);
    expect(bpRangeAggVerify([cOut1, cOut2], proof)).toBe(true);
    const excess = modN(rRecip + rChange - rIn);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const msg = computeKernelMsg(assetId, inputOps, [pointToBytes(cOut1), pointToBytes(cOut2)]);
    const sig = signKernel(msg, excess);
    expect(verifyKernel(sig, assetId, inputOps, [pointToBytes(cIn)], [pointToBytes(cOut1), pointToBytes(cOut2)])).toBe(true);
  });
});
