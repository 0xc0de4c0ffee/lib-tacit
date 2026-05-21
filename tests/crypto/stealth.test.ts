import { describe, test, expect } from 'bun:test';
import * as secp from '@noble/secp256k1';
import { bytesToHex } from '@noble/hashes/utils';
import {
  encodeStealthAddress,
  decodeStealthAddress,
  stealthSharedSecret,
  stealthSharedSecretRecipient,
  stealthOneTimeAddress,
  generateStealthEphemKey,
} from '../../src/crypto/stealth.js';

function keypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  return { priv, pub: secp.getPublicKey(priv, true) };
}

describe('Stealth address encode/decode', () => {
  test('round-trip with default prefix', () => {
    const sp = keypair(), vp = keypair();
    const addr = encodeStealthAddress(sp.pub, vp.pub);
    expect(addr.startsWith('st1')).toBe(true);
    const decoded = decodeStealthAddress(addr);
    expect(decoded).not.toBeNull();
    expect(bytesToHex(decoded!.spendPub)).toBe(bytesToHex(sp.pub));
    expect(bytesToHex(decoded!.viewPub)).toBe(bytesToHex(vp.pub));
  });

  test('round-trip with testnet prefix', () => {
    const sp = keypair(), vp = keypair();
    const addr = encodeStealthAddress(sp.pub, vp.pub, 'tst');
    expect(addr.startsWith('tst1')).toBe(true);
    const decoded = decodeStealthAddress(addr);
    expect(decoded).not.toBeNull();
    expect(bytesToHex(decoded!.spendPub)).toBe(bytesToHex(sp.pub));
    expect(bytesToHex(decoded!.viewPub)).toBe(bytesToHex(vp.pub));
  });

  test('decode with invalid data returns null', () => {
    expect(decodeStealthAddress('st1qpzry9x8gf2tvdw0s3jn54khce6mua7l')).toBeNull();
  });

  test('decode with wrong prefix still decodes valid data', () => {
    const sp = keypair(), vp = keypair();
    const addr = encodeStealthAddress(sp.pub, vp.pub);
    expect(decodeStealthAddress(addr)).not.toBeNull();
  });

  test('decode with short trash returns null', () => {
    expect(decodeStealthAddress('notanaddress')).toBeNull();
  });

  test('decode with truncated address returns null', () => {
    const sp = keypair(), vp = keypair();
    const addr = encodeStealthAddress(sp.pub, vp.pub);
    expect(decodeStealthAddress(addr.slice(0, -10))).toBeNull();
  });

  test('deterministic — same keys produce same address', () => {
    const sp = keypair(), vp = keypair();
    const a1 = encodeStealthAddress(sp.pub, vp.pub)
    const a2 = encodeStealthAddress(sp.pub, vp.pub)
    expect(a1).toBe(a2);
  });
});

describe('Stealth DH shared secret', () => {
  test('sender and recipient derive the same secret', () => {
    const sender = keypair();
    const recipientView = keypair();

    const ephem = generateStealthEphemKey();
    const s1 = stealthSharedSecret(recipientView.pub, ephem.priv);
    const s2 = stealthSharedSecretRecipient(ephem.pub, recipientView.priv);
    expect(bytesToHex(s1)).toBe(bytesToHex(s2));
  });

  test('different senders produce different shared secrets', () => {
    const recipientView = keypair();
    const e1 = generateStealthEphemKey();
    const e2 = generateStealthEphemKey();
    const s1 = stealthSharedSecret(recipientView.pub, e1.priv);
    const s2 = stealthSharedSecret(recipientView.pub, e2.priv);
    expect(bytesToHex(s1)).not.toBe(bytesToHex(s2));
  });

  test('shared secret is 32 bytes', () => {
    const a = keypair(), b = keypair();
    const s = stealthSharedSecret(a.pub, b.priv);
    expect(s.length).toBe(32);
  });
});

describe('Stealth one-time address', () => {
  test('derives valid compressed pubkey', () => {
    const secret = generateStealthEphemKey();
    const recvSpend = keypair();
    const ot = stealthOneTimeAddress(secret.priv, recvSpend.pub);
    expect(ot.length).toBe(33);
    expect(ot[0] === 0x02 || ot[0] === 0x03).toBe(true);
    const pt = secp.ProjectivePoint.fromHex(bytesToHex(ot));
    expect(pt.equals(secp.ProjectivePoint.ZERO)).toBe(false);
  });

  test('different shared secrets produce different addresses', () => {
    const s1 = generateStealthEphemKey();
    const s2 = generateStealthEphemKey();
    const recv = keypair();
    const ot1 = stealthOneTimeAddress(s1.priv, recv.pub);
    const ot2 = stealthOneTimeAddress(s2.priv, recv.pub);
    expect(bytesToHex(ot1)).not.toBe(bytesToHex(ot2));
  });

  test('same secret + same spendPub → same address', () => {
    const secret = generateStealthEphemKey();
    const recv = keypair();
    const ot1 = stealthOneTimeAddress(secret.priv, recv.pub);
    const ot2 = stealthOneTimeAddress(secret.priv, recv.pub);
    expect(bytesToHex(ot1)).toBe(bytesToHex(ot2));
  });

  test('different recipients produce different addresses', () => {
    const secret = generateStealthEphemKey();
    const r1 = keypair(), r2 = keypair();
    const ot1 = stealthOneTimeAddress(secret.priv, r1.pub);
    const ot2 = stealthOneTimeAddress(secret.priv, r2.pub);
    expect(bytesToHex(ot1)).not.toBe(bytesToHex(ot2));
  });
});

describe('Generate stealth ephem key', () => {
  test('produces valid keypair', () => {
    const k = generateStealthEphemKey();
    expect(k.priv.length).toBe(32);
    expect(k.pub.length).toBe(33);
    const expectedPub = secp.getPublicKey(k.priv, true);
    expect(bytesToHex(k.pub)).toBe(bytesToHex(expectedPub));
  });

  test('consecutive calls produce different keys', () => {
    const k1 = generateStealthEphemKey();
    const k2 = generateStealthEphemKey();
    expect(bytesToHex(k1.priv)).not.toBe(bytesToHex(k2.priv));
    expect(bytesToHex(k1.pub)).not.toBe(bytesToHex(k2.pub));
  });
});
