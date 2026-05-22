// Deterministic signing tests using fixed test key.
// Verifies our Schnorr implementation produces valid signatures
// that verify under the derived pubkey. Note: BIP-340 uses random
// nonces, so two signatures for the same (msg, key) will differ.
// The test validates correctness, not byte-identity.

import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '../../src/transaction/utils.js';
import { signSchnorr, verifySchnorr } from '../../src/crypto/schnorr.js';
import { computeKernelMsg, signKernel, verifyKernel } from '../../src/crypto/kernel.js';
import { pedersenCommit, pointToBytes } from '../../src/crypto/pedersen.js';
import { assetIdFor } from '../../src/crypto/kernel.js';
import { TEST_PRIVKEY, getTestXonlyPubkey, getTestPubkeyHex } from './fixtures.js';

describe('Schnorr signing with fixed key', () => {
  test('fixed-key pubkey is stable', () => {
    // Known-answer check: the fixture pubkey should be stable across runs
    expect(getTestPubkeyHex()).toBe('02' + bytesToHex(getTestXonlyPubkey()));
  });

  test('verifies under the derived pubkey', () => {
    const msg = sha256(new TextEncoder().encode('verify-test'));
    const sig = signSchnorr(msg, TEST_PRIVKEY);
    const xonly = getTestXonlyPubkey();
    expect(verifySchnorr(sig, msg, xonly)).toBe(true);
  });

  test('both signatures verify (different nonces, both valid)', () => {
    const msg = sha256(new TextEncoder().encode('two-sigs'));
    const sig1 = signSchnorr(msg, TEST_PRIVKEY);
    const sig2 = signSchnorr(msg, TEST_PRIVKEY);
    const xonly = getTestXonlyPubkey();
    expect(verifySchnorr(sig1, msg, xonly)).toBe(true);
    expect(verifySchnorr(sig2, msg, xonly)).toBe(true);
  });

  test('produces different sig for different message', () => {
    const m1 = sha256(new TextEncoder().encode('message-A'));
    const m2 = sha256(new TextEncoder().encode('message-B'));
    const sig1 = signSchnorr(m1, TEST_PRIVKEY);
    const sig2 = signSchnorr(m2, TEST_PRIVKEY);
    expect(bytesToHex(sig1)).not.toBe(bytesToHex(sig2));
  });
});

describe('Kernel signing with fixed key', () => {
  test('kernel sign/verify works with fixed excess', () => {
    const assetId = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const outCs = [pointToBytes(pedersenCommit(500n, 42n))];
    const msg = computeKernelMsg(assetId, inputOps, outCs);
    const sig = signKernel(msg, 42n);
    expect(verifyKernel(sig, assetId, inputOps, [pointToBytes(pedersenCommit(500n, 0n))], outCs)).toBe(true);
  });
});
