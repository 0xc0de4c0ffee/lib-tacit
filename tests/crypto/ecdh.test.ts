import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import * as secp from '@noble/secp256k1';
import {
  deriveBlinding, deriveChangeBlinding, deriveEtchBlinding,
  deriveAmountKeystreamECDH, deriveAmountKeystreamSelf,
  deriveEtchAmountKeystream,
  encryptAmount, decryptAmount,
} from '../../src/crypto/ecdh.js';
import { pedersenCommit } from '../../src/crypto/pedersen.js';
import { buildAnchor } from '../../src/transaction/utils.js';

function keypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  return { priv, pub: secp.getPublicKey(priv, true) };
}

describe('ECDH derivations', () => {
  test('deriveBlinding is symmetric', () => {
    const a = keypair(), b = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    expect(deriveBlinding(a.priv, b.pub, anchor, 0)).toBe(deriveBlinding(b.priv, a.pub, anchor, 0));
  });

  test('different vouts → different blindings', () => {
    const a = keypair(), b = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    expect(deriveBlinding(a.priv, b.pub, anchor, 0)).not.toBe(deriveBlinding(a.priv, b.pub, anchor, 1));
  });

  test('change ≠ recipient (domain separation)', () => {
    const a = keypair(), b = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    expect(deriveBlinding(a.priv, b.pub, anchor, 0)).not.toBe(deriveChangeBlinding(a.priv, anchor, 0));
  });

  test('etch ≠ change (domain separation)', () => {
    const w = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    expect(deriveEtchBlinding(w.priv, anchor)).not.toBe(deriveChangeBlinding(w.priv, anchor, 0));
  });

  test('amount-keystream-self ≠ amount-keystream-ecdh', () => {
    const a = keypair(), b = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const ksSelf = deriveAmountKeystreamSelf(a.priv, anchor, 0);
    const ksEcdh = deriveAmountKeystreamECDH(a.priv, b.pub, anchor, 0);
    expect(new Uint8Array(32).every((_, i) => ksSelf[i] === ksEcdh[i])).toBe(false);
  });
});

describe('Amount encryption', () => {
  test('encrypt → decrypt round-trip', () => {
    const w = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const ks = deriveAmountKeystreamSelf(w.priv, anchor, 0);
    const amt = 1234567890n;
    expect(decryptAmount(encryptAmount(amt, ks), ks)).toBe(amt);
  });

  test('wrong keystream → garbage', () => {
    const w1 = keypair(), w2 = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const ks1 = deriveAmountKeystreamSelf(w1.priv, anchor, 0);
    const ks2 = deriveAmountKeystreamSelf(w2.priv, anchor, 0);
    expect(decryptAmount(encryptAmount(42n, ks1), ks2)).not.toBe(42n);
  });

  test('Pedersen commitment binds tampered ct', () => {
    const w = keypair();
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const ks = deriveAmountKeystreamSelf(w.priv, anchor, 0);
    const r = deriveChangeBlinding(w.priv, anchor, 0);
    const amt = 1000n;
    const ct = encryptAmount(amt, ks);
    const C = pedersenCommit(amt, r);
    ct[0] ^= 1; // tamper
    const candidate = decryptAmount(ct, ks);
    expect(pedersenCommit(candidate, r).equals(C)).toBe(false);
  });
});
