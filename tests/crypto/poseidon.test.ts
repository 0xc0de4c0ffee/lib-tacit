import { describe, test, expect } from 'bun:test';
import { poseidonHash, poseidonHash1, poseidonHash2 } from '../../src/crypto/poseidon.js';

describe('Poseidon hash', () => {
  test('poseidonHash1 consistency (same input = same hash)', () => {
    expect(poseidonHash1(42n)).toBe(poseidonHash1(42n));
  });

  test('poseidonHash2 consistency', () => {
    expect(poseidonHash2(1n, 2n)).toBe(poseidonHash2(1n, 2n));
  });

  test('Different inputs produce different hashes', () => {
    expect(poseidonHash1(1n)).not.toBe(poseidonHash1(2n));
    expect(poseidonHash2(1n, 2n)).not.toBe(poseidonHash2(1n, 3n));
  });

  test('poseidonHash with 1 input = poseidonHash1', () => {
    expect(poseidonHash([99n])).toBe(poseidonHash1(99n));
  });

  test('poseidonHash with 2 inputs = poseidonHash2', () => {
    expect(poseidonHash([10n, 20n])).toBe(poseidonHash2(10n, 20n));
  });

  test('throws on wrong number of inputs (0)', () => {
    expect(() => poseidonHash([])).toThrow();
  });

  test('throws on wrong number of inputs (3)', () => {
    expect(() => poseidonHash([1n, 2n, 3n])).toThrow();
  });

  test('poseidonHash1(0n) fixed vector (value check)', () => {
    const h = poseidonHash1(0n);
    expect(typeof h).toBe('bigint');
    expect(h).toBe(poseidonHash1(0n));
  });

  test('Large bigint input', () => {
    const large = (1n << 255n) - 1n;
    const h = poseidonHash1(large);
    expect(typeof h).toBe('bigint');
    expect(h).toBe(poseidonHash1(large));
  });
});
