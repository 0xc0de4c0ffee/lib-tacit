import { describe, test, expect } from 'bun:test';
import * as secp from '@noble/secp256k1';
import { tryDecryptOutput, tryDecryptOutputs } from '../../src/recovery/decrypt.js';
import { deriveChangeBlinding, deriveAmountKeystreamSelf, encryptAmount } from '../../src/crypto/ecdh.js';
import { pedersenCommit, pointToBytes } from '../../src/crypto/pedersen.js';
import { buildAnchor } from '../../src/transaction/utils.js';

function keypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  return { priv, pub: secp.getPublicKey(priv, true) };
}

describe('tryDecryptOutput', () => {
  test('with correct key', () => {
    const w = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const vout = 0;
    const ks = deriveAmountKeystreamSelf(w.priv, anchor, vout);
    const r = deriveChangeBlinding(w.priv, anchor, vout);
    const amount = 1000n;
    const ct = encryptAmount(amount, ks);
    const C = pointToBytes(pedersenCommit(amount, r));
    expect(tryDecryptOutput(ct, C, w.priv, anchor, vout)).toBe(amount);
  });

  test('with wrong key returns null', () => {
    const w1 = keypair();
    const w2 = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const vout = 0;
    const ks = deriveAmountKeystreamSelf(w1.priv, anchor, vout);
    const r = deriveChangeBlinding(w1.priv, anchor, vout);
    const amount = 500n;
    const ct = encryptAmount(amount, ks);
    const C = pointToBytes(pedersenCommit(amount, r));
    expect(tryDecryptOutput(ct, C, w2.priv, anchor, vout)).toBeNull();
  });

  test('with bad commitment returns null', () => {
    const w = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const ct = new Uint8Array(8);
    const badCommit = new Uint8Array(33).fill(0xff);
    expect(tryDecryptOutput(ct, badCommit, w.priv, anchor, 0)).toBeNull();
  });
});

describe('tryDecryptOutputs', () => {
  function makeValidOutput(w: { priv: Uint8Array }, anchor: Uint8Array, vout: number, amount: bigint) {
    const ks = deriveAmountKeystreamSelf(w.priv, anchor, vout);
    const r = deriveChangeBlinding(w.priv, anchor, vout);
    const ct = encryptAmount(amount, ks);
    const C = pointToBytes(pedersenCommit(amount, r));
    return { encryptedAmount: ct, commitment: C, anchor, vout };
  }

  test('batch with all valid', () => {
    const w = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const outputs = [
      makeValidOutput(w, anchor, 0, 100n),
      makeValidOutput(w, anchor, 1, 200n),
    ];
    const results = tryDecryptOutputs(outputs, w.priv);
    expect(results).toEqual([100n, 200n]);
  });

  test('batch with mixed (some null)', () => {
    const w1 = keypair();
    const w2 = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const outputs = [
      makeValidOutput(w1, anchor, 0, 300n),
      // w2 output — won't decrypt with w1's key
      makeValidOutput(w2, anchor, 0, 400n),
    ];
    const results = tryDecryptOutputs(outputs, w1.priv);
    expect(results[0]).toBe(300n);
    expect(results[1]).toBeNull();
  });

  test('empty batch', () => {
    const w = keypair();
    expect(tryDecryptOutputs([], w.priv)).toEqual([]);
  });
});
