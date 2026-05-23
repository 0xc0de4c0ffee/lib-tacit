import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import * as secp from '@noble/secp256k1';
import {
  decodeSilentPaymentAddress,
  senderComputeSilentPaymentOutput,
  bip352OutpointBytes,
  bip352TaggedHash,
  BIP352_HRP_BY_NETWORK,
} from '../../src/crypto/silent-payments.js';
import { G } from '../../src/crypto/pedersen.js';

describe('BIP352_HRP_BY_NETWORK', () => {
  test('mainnet HRP is sp', () => {
    expect(BIP352_HRP_BY_NETWORK.mainnet).toBe('sp');
  });
  test('signet HRP is tsp', () => {
    expect(BIP352_HRP_BY_NETWORK.signet).toBe('tsp');
  });
});

describe('decodeSilentPaymentAddress', () => {
  test('returns null on empty string', () => {
    expect(decodeSilentPaymentAddress('')).toBeNull();
  });
  test('returns null on short string', () => {
    expect(decodeSilentPaymentAddress('sp1')).toBeNull();
  });
  test('returns null on bad checksum', () => {
    expect(decodeSilentPaymentAddress('sp1qy2p3x0mf3y6lxvx4p7z5r8n9k0j2m4a6c8d0e2f4g6h8j0k2m4a6c8d0e2f4g6h8j0k2m4a6c8d0e2f4g6z')).toBeNull();
  });
  test('returns null on invalid HRP', () => {
    expect(decodeSilentPaymentAddress('xp1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgq2zfc')).toBeNull();
  });
  test('returns null on mixed case', () => {
    expect(decodeSilentPaymentAddress('Sp1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgq2zfc')).toBeNull();
  });
  test('returns null on non-zero version', () => {
    expect(decodeSilentPaymentAddress('sp1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgq2zfc')).toBeNull();
  });
});

describe('bip352OutpointBytes', () => {
  test('produces 36 bytes', () => {
    const out = bip352OutpointBytes('aabbccddeeff0011223344556677889900112233445566778899aabbccddeeff', 0);
    expect(out.length).toBe(36);
  });
  test('txid is in chain-order (little-endian)', () => {
    const txid = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    const out = bip352OutpointBytes(txid, 0);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xee);
    expect(out[30]).toBe(0x11);
    expect(out[31]).toBe(0x00);
  });
  test('vout is little-endian at bytes 32-35', () => {
    const out = bip352OutpointBytes('ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100', 0x01020304);
    expect(out[32]).toBe(0x04);
    expect(out[33]).toBe(0x03);
    expect(out[34]).toBe(0x02);
    expect(out[35]).toBe(0x01);
  });
});

describe('bip352TaggedHash', () => {
  test('produces 32 bytes', () => {
    const h = bip352TaggedHash('BIP0352/Inputs', new Uint8Array(32));
    expect(h.length).toBe(32);
  });
  test('is deterministic', () => {
    const data = new Uint8Array(32).fill(0x42);
    const a = bip352TaggedHash('BIP0352/Inputs', data);
    const b = bip352TaggedHash('BIP0352/Inputs', data);
    expect(a).toEqual(b);
  });
  test('different data produces different hash', () => {
    const a = bip352TaggedHash('BIP0352/Inputs', new Uint8Array(32).fill(0x01));
    const b = bip352TaggedHash('BIP0352/Inputs', new Uint8Array(32).fill(0x02));
    expect(a).not.toEqual(b);
  });
  test('different tag produces different hash', () => {
    const data = new Uint8Array(32).fill(0x42);
    const a = bip352TaggedHash('BIP0352/Inputs', data);
    const b = bip352TaggedHash('BIP0352/SharedSecret', data);
    expect(a).not.toEqual(b);
  });
});

describe('senderComputeSilentPaymentOutput', () => {
  test('throws on empty inputPrivs', () => {
    expect(() => senderComputeSilentPaymentOutput({
      inputPrivs: [],
      inputOutpoints: [],
      scanPub: new Uint8Array(33),
      spendPub: new Uint8Array(33),
    })).toThrow();
  });
  test('throws on mismatched outpoints length', () => {
    expect(() => senderComputeSilentPaymentOutput({
      inputPrivs: [new Uint8Array(32).fill(0x01)],
      inputOutpoints: [],
      scanPub: new Uint8Array(33),
      spendPub: new Uint8Array(33),
    })).toThrow();
  });
  test('returns xOnly output with valid inputs', () => {
    const priv = new Uint8Array(32).fill(0x01);
    priv[31] = 0x02;
    const pub = G.multiply(BigInt('0x' + [...priv].map(b => b.toString(16).padStart(2,'0')).join(''))).toRawBytes(true);
    const scanPub = pub;
    const spendPub = pub;
    const txid = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
    const result = senderComputeSilentPaymentOutput({
      inputPrivs: [priv],
      inputOutpoints: [bip352OutpointBytes(txid, 0)],
      scanPub,
      spendPub,
    });
    expect(result.xOnly.length).toBe(32);
  });
  test('k=1 produces different output than k=0', () => {
    const priv = new Uint8Array(32).fill(0x02);
    priv[31] = 0x03;
    const pub = G.multiply(BigInt('0x' + [...priv].map(b => b.toString(16).padStart(2,'0')).join(''))).toRawBytes(true);
    const txid = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    const base = { inputPrivs: [priv], inputOutpoints: [bip352OutpointBytes(txid, 0)], scanPub: pub, spendPub: pub };
    const r0 = senderComputeSilentPaymentOutput({ ...base, k: 0 });
    const r1 = senderComputeSilentPaymentOutput({ ...base, k: 1 });
    expect(r0.xOnly).not.toEqual(r1.xOnly);
  });
});
