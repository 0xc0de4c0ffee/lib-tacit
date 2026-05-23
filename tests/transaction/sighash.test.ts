import { describe, test, expect } from 'bun:test';
import { bytesToHex } from '@noble/hashes/utils';
import * as secp from '@noble/secp256k1';
import {
  preauthSellerSpendSighash,
  sighashV0,
  sighashV0WithType,
  taggedHash,
  tapLeafHash,
  tweakedOutputKey,
  controlBlock,
  TAP_NUMS,
} from '../../src/transaction/sighash.js';
import type { TxTemplate } from '../../src/transaction/sighash.js';

describe('BIP-143 sighash', () => {
  test('SIGHASH_ALL changes when tx version changes', () => {
    const script = new Uint8Array([0x51]);
    const base: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0, sequence: 0xffffffff }],
      outputs: [{ value: 1000, script }],
    };
    const h1 = sighashV0(base, 0, script, 1000);
    const h2 = sighashV0({ ...base, version: 3 }, 0, script, 1000);
    expect(bytesToHex(h1)).not.toBe(bytesToHex(h2));
  });

  test('preauthSellerSpendSighash matches reference composition.mjs', () => {
    const sellerSk = new Uint8Array(32).fill(1);
    const sellerPub = secp.getPublicKey(sellerSk, true);
    const h = preauthSellerSpendSighash({
      assetOutpointTxidHex: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      assetOutpointVout: 0,
      assetUtxoValue: 100_000,
      sellerPubBytes: sellerPub,
      sellerPayoutScriptBytes: new Uint8Array([0x51]),
      minPriceSats: 50_000,
    });
    expect(bytesToHex(h)).toBe('74d1b15e9fd7eff65e257511287a5f03228855aa21db26938e9980630d0da058');
  });

  test('sighashV0WithType SIGHASH_ALL baseline', () => {
    const scriptCode = new Uint8Array([0x51]);
    const tx: TxTemplate = {
      version: 2,
      inputs: [
        { txid: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', vout: 0 },
      ],
      outputs: [{ value: 50_000, script: new Uint8Array([0x52]) }],
      locktime: 0,
    };
    const h = sighashV0WithType(tx, 0, scriptCode, 100_000, 0x01);
    expect(h.length).toBe(32);
    expect(bytesToHex(h)).not.toBe('0'.repeat(64));
  });

  test('SIGHASH_SINGLE (0x03) produces 32 bytes', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0, sequence: 0xffffffff }],
      outputs: [{ value: 5000, script: new Uint8Array([0x51]) }],
    };
    const h = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 100_000, 0x03);
    expect(h.length).toBe(32);
  });

  test('SIGHASH_SINGLE with no matching output does not crash', () => {
    const scriptCode = new Uint8Array([0x51]);
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0 }],
      outputs: [],
      locktime: 0,
    };
    const h = sighashV0WithType(tx, 0, scriptCode, 100_000, 0x03);
    expect(h.length).toBe(32);
  });

  test('SIGHASH_SINGLE | ANYONECANPAY (0x83) produces 32 bytes', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0 }],
      outputs: [{ value: 5000, script: new Uint8Array([0x51]) }],
    };
    const h = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 100_000, 0x83);
    expect(h.length).toBe(32);
  });

  test('SIGHASH_SINGLE | ANYONECANPAY is deterministic', () => {
    const tx: TxTemplate = {
      version: 1,
      inputs: [{ txid: 'bb'.repeat(32), vout: 1 }],
      outputs: [{ value: 9999, script: new Uint8Array([0x52]) }],
    };
    const h1 = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 50_000, 0x83);
    const h2 = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 50_000, 0x83);
    expect(bytesToHex(h1)).toBe(bytesToHex(h2));
  });

  test('SIGHASH_NONE (0x02) produces 32 bytes', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0, sequence: 0xffffffff }],
      outputs: [{ value: 5000, script: new Uint8Array([0x51]) }],
    };
    const h = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 100_000, 0x02);
    expect(h.length).toBe(32);
  });

  test('SIGHASH_NONE produces different hash from SIGHASH_ALL', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0, sequence: 0xffffffff }],
      outputs: [{ value: 5000, script: new Uint8Array([0x51]) }],
    };
    const allHash = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 100_000, 0x01);
    const noneHash = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 100_000, 0x02);
    expect(bytesToHex(allHash)).not.toBe(bytesToHex(noneHash));
  });

  test('SIGHASH_NONE | ANYONECANPAY (0x82) produces 32 bytes', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0 }],
      outputs: [{ value: 5000, script: new Uint8Array([0x51]) }],
    };
    const h = sighashV0WithType(tx, 0, new Uint8Array([0x51]), 100_000, 0x82);
    expect(h.length).toBe(32);
  });

  test('empty tx (no outputs) does not crash', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0 }],
      outputs: [],
      locktime: 0,
    };
    const h = sighashV0(tx, 0, new Uint8Array([0x51]), 100_000);
    expect(h.length).toBe(32);
  });

  test('input with no script (empty scriptCode) does not crash', () => {
    const tx: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0 }],
      outputs: [{ value: 5000, script: new Uint8Array([0x51]) }],
    };
    const h = sighashV0(tx, 0, new Uint8Array(0), 100_000);
    expect(h.length).toBe(32);
  });
});

describe('taggedHash (BIP-341)', () => {
  test('produces 32 bytes', () => {
    const h = taggedHash('TapLeaf', new Uint8Array(32));
    expect(h.length).toBe(32);
  });
  test('is deterministic', () => {
    const a = taggedHash('TapLeaf', new Uint8Array(32).fill(0x42));
    const b = taggedHash('TapLeaf', new Uint8Array(32).fill(0x42));
    expect(a).toEqual(b);
  });
  test('different data produces different hash', () => {
    const a = taggedHash('TapLeaf', new Uint8Array(32).fill(0x01));
    const b = taggedHash('TapLeaf', new Uint8Array(32).fill(0x02));
    expect(a).not.toEqual(b);
  });
  test('different tag produces different hash', () => {
    const data = new Uint8Array(32).fill(0x42);
    const a = taggedHash('TapLeaf', data);
    const b = taggedHash('TapBranch', data);
    expect(a).not.toEqual(b);
  });
});

describe('tapLeafHash', () => {
  test('produces 32 bytes for empty script', () => {
    const h = tapLeafHash(new Uint8Array(0));
    expect(h.length).toBe(32);
  });
  test('produces 32 bytes for non-empty script', () => {
    const h = tapLeafHash(new Uint8Array([0x51]));
    expect(h.length).toBe(32);
  });
  test('default leaf version is 0xc0', () => {
    const h1 = tapLeafHash(new Uint8Array([0x51]));
    const h2 = tapLeafHash(new Uint8Array([0x51]), 0xc0);
    expect(h1).toEqual(h2);
  });
  test('different leaf version produces different hash', () => {
    const h1 = tapLeafHash(new Uint8Array([0x51]), 0xc0);
    const h2 = tapLeafHash(new Uint8Array([0x51]), 0xc1);
    expect(h1).not.toEqual(h2);
  });
});

describe('tweakedOutputKey', () => {
  test('returns 32 bytes (x-only)', () => {
    const key = tweakedOutputKey(TAP_NUMS, null);
    expect(key.length).toBe(32);
  });
  test('with merkle root produces 32 bytes', () => {
    const root = new Uint8Array(32).fill(0xab);
    const key = tweakedOutputKey(TAP_NUMS, root);
    expect(key.length).toBe(32);
  });
  test('with and without merkle root produce different keys', () => {
    const root = new Uint8Array(32).fill(0xab);
    const without = tweakedOutputKey(TAP_NUMS, null);
    const withRoot = tweakedOutputKey(TAP_NUMS, root);
    expect(without).not.toEqual(withRoot);
  });
  test('accepts compressed 33-byte internal key', () => {
    const compressed = new Uint8Array(33);
    compressed[0] = 0x02;
    compressed.set(TAP_NUMS, 1);
    const key = tweakedOutputKey(compressed, null);
    expect(key.length).toBe(32);
  });
});

describe('controlBlock', () => {
  test('returns 33 bytes with no merkle proof', () => {
    const cb = controlBlock(TAP_NUMS, []);
    expect(cb.length).toBe(33);
    expect(cb[0] & 0x1f).toBe(0xc0 & 0x1f);
  });
  test('with one merkle proof element returns 65 bytes', () => {
    const proof = [new Uint8Array(32).fill(0x01)];
    const cb = controlBlock(TAP_NUMS, proof);
    expect(cb.length).toBe(65);
  });
  test('with two merkle proof elements returns 97 bytes', () => {
    const proof = [new Uint8Array(32).fill(0x01), new Uint8Array(32).fill(0x02)];
    const cb = controlBlock(TAP_NUMS, proof);
    expect(cb.length).toBe(97);
  });
  test('parity bit is 0 for even Y (02 prefix)', () => {
    const key02 = new Uint8Array(33);
    key02[0] = 0x02;
    key02.set(TAP_NUMS, 1);
    const cb = controlBlock(key02, []);
    expect(cb[0] >>> 5).toBe(0);
  });
  test('parity bit is 1 for odd Y (03 prefix)', () => {
    const key03 = new Uint8Array(33);
    key03[0] = 0x03;
    key03.set(TAP_NUMS, 1);
    const cb = controlBlock(key03, []);
    expect(cb[0] >>> 5).toBe(1);
  });
  test('x-only input (32 bytes) does not set parity', () => {
    const cb = controlBlock(TAP_NUMS, []);
    expect(cb[0] >>> 5).toBe(0);
  });
  test('throws on invalid merkle proof element length', () => {
    expect(() => controlBlock(TAP_NUMS, [new Uint8Array(31)])).toThrow();
  });
});
