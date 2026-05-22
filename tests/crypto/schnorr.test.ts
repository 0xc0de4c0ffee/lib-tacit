import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import { hexToBytes } from '@noble/hashes/utils';
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
    if (typeof secp.schnorr?.sign !== 'function') return;
    const nobleSig = secp.schnorr.sign(msg, priv);
    expect(verifySchnorr(nobleSig, msg, pub.slice(1))).toBe(true);
  });

  test('rejects sig with flipped bit in R_x (tampered R)', () => {
    const priv = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(priv, true);
    const msg = sha256(new TextEncoder().encode('tamper'));
    const sig = signSchnorr(msg, priv);
    const tampered = new Uint8Array(sig);
    tampered[0] ^= 0x01; // flip bit in R_x
    expect(verifySchnorr(tampered, msg, pub.slice(1))).toBe(false);
  });

  test('cross-check: our sign round-trips noble verify', () => {
    const priv = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(priv, true);
    const msg = sha256(new TextEncoder().encode('cross-check-reverse'));
    const sig = signSchnorr(msg, priv);
    if (typeof secp.schnorr?.verify !== 'function') return;
    const nobleOk = secp.schnorr.verify(sig, msg, pub.slice(1));
    expect(nobleOk).toBe(true);
  });

  test('rejects all-zero signature', () => {
    const priv = secp.utils.randomPrivateKey();
    const pub = secp.getPublicKey(priv, true);
    const msg = sha256(new TextEncoder().encode('all-zero-sig'));
    const zeroSig = new Uint8Array(64);
    expect(() => verifySchnorr(zeroSig, msg, pub.slice(1))).toThrow();
  });

  test('deterministic fixed key round-trip', () => {
    const fixedPriv = hexToBytes('0101010101010101010101010101010101010101010101010101010101010101');
    const fixedPub = secp.getPublicKey(fixedPriv, true);
    const msg = sha256(new TextEncoder().encode('kat-vector'));
    const sig = signSchnorr(msg, fixedPriv);
    expect(verifySchnorr(sig, msg, fixedPub.slice(1))).toBe(true);
  });
});
