import { describe, test, expect } from 'bun:test';
import { encodeCEtch, decodeCEtch } from '../../src/opcodes/etch.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('CETCH (0x21)', () => {
  test('round-trip with image', () => {
    const p = encodeCEtch({ ticker: 'TKN', decimals: 6, commitment: zeroFill(33), rangeproof: zeroFill(100), encryptedAmount: zeroFill(8), imageUri: 'ipfs://test' });
    expect(decodeCEtch(p)?.ticker).toBe('TKN');
  });
  test('round-trip no image (non-mintable)', () => {
    const p = encodeCEtch({ ticker: 'A', decimals: 0, commitment: zeroFill(33), rangeproof: zeroFill(10), encryptedAmount: zeroFill(8) });
    expect(decodeCEtch(p)?.mintable).toBe(false);
  });
  test('round-trip with mint authority', () => {
    const auth = new Uint8Array(32); auth[31] = 1;
    const p = encodeCEtch({ ticker: 'GOV', decimals: 2, commitment: zeroFill(33), rangeproof: zeroFill(10), encryptedAmount: zeroFill(8), mintAuthority: auth });
    expect(decodeCEtch(p)?.mintable).toBe(true);
  });
  test('rejects trailing bytes', () => {
    const p = encodeCEtch({ ticker: 'X', decimals: 0, commitment: zeroFill(33), rangeproof: zeroFill(1), encryptedAmount: zeroFill(8) });
    expect(decodeCEtch(new Uint8Array([...p, 0]))).toBeNull();
  });
  test('CETCH with non-integer decimals (rejection)', () => {
    expect(() => encodeCEtch({ ticker: 'BAD', decimals: 1.5, commitment: zeroFill(33), rangeproof: zeroFill(1), encryptedAmount: zeroFill(8) })).toThrow();
  });
  test('CETCH with max ticker length', () => {
    const p = encodeCEtch({ ticker: 'ABCDEFGHIJKLMNOP', decimals: 0, commitment: zeroFill(33), rangeproof: zeroFill(1), encryptedAmount: zeroFill(8) });
    expect(decodeCEtch(p)?.ticker).toBe('ABCDEFGHIJKLMNOP');
  });
  test('CETCH decode malformed (truncated bytes)', () => {
    const p = encodeCEtch({ ticker: 'X', decimals: 0, commitment: zeroFill(33), rangeproof: zeroFill(1), encryptedAmount: zeroFill(8) });
    expect(decodeCEtch(p.slice(0, -3))).toBeNull();
  });
});
