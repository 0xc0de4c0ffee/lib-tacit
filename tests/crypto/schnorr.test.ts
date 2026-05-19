import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import * as secp from '@noble/secp256k1';
import { signSchnorr, verifySchnorr } from '../../src/crypto/schnorr.js';

describe('BIP-340 Schnorr', () => {
  test('valid sig verifies', () => {
    const priv = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(priv, true);
    const msg = sha256(new TextEncoder().encode('hello tacit'));
    const sig = signSchnorr(msg, priv);
    expect(verifySchnorr(sig, msg, pub.slice(1))).toBe(true);
  });

  test('rejects sig under different pubkey', () => {
    const k1 = secp.utils.randomPrivateKey();
    const k2 = secp.utils.randomPrivateKey();
    const msg = sha256(new TextEncoder().encode('msg'));
    const sig = signSchnorr(msg, k1);
    const pub2 = secp.getPublicKey(k2, true);
    expect(verifySchnorr(sig, msg, pub2.slice(1))).toBe(false);
  });

  test('rejects sig under different message', () => {
    const k = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(k, true);
    const m1 = sha256(new TextEncoder().encode('msg1'));
    const m2 = sha256(new TextEncoder().encode('msg2'));
    const sig = signSchnorr(m1, k);
    expect(verifySchnorr(sig, m2, pub.slice(1))).toBe(false);
  });

  test('cross-check: noble sign round-trips our verify', () => {
    const priv = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(priv, true);
    const msg = sha256(new TextEncoder().encode('cross-check'));
    // noble@2.1.0 has secp.schnorr.sign for cross-check
    if (typeof secp.schnorr?.sign !== 'function') return; // skip if unavailable
    const nobleSig = secp.schnorr.sign(msg, priv);
    expect(verifySchnorr(nobleSig, msg, pub.slice(1))).toBe(true);
  });
});
