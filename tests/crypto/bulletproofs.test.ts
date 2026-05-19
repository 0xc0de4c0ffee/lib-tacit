import { describe, test, expect } from 'bun:test';
import { bpRangeAggProve, bpRangeAggVerify, bpRangeAggBatchVerify } from '../../src/crypto/bulletproofs.js';
import { randomScalar } from '../../src/crypto/pedersen.js';

describe('Bulletproofs aggregated range proof', () => {
  test('m=1 prove + verify', () => {
    const { proof, commitments } = bpRangeAggProve([100n], [randomScalar()]);
    expect(bpRangeAggVerify(commitments, proof)).toBe(true);
  });

  test('m=2 prove + verify', () => {
    const { proof, commitments } = bpRangeAggProve([100n, 250n], [randomScalar(), randomScalar()]);
    expect(bpRangeAggVerify(commitments, proof)).toBe(true);
  });

  test('m=4 prove + verify', () => {
    const v = [10n, 20n, 30n, 40n];
    const b = v.map(() => randomScalar());
    const { proof, commitments } = bpRangeAggProve(v, b);
    expect(bpRangeAggVerify(commitments, proof)).toBe(true);
  });

  // m=8 BP can be slow (~6s) — skip for CI, run manually
  test('m=8 prove + verify', { timeout: 30_000 }, () => {
    const v = Array.from({ length: 8 }, () => BigInt(Math.floor(Math.random() * 100000)));
    const b = v.map(() => randomScalar());
    const { proof, commitments } = bpRangeAggProve(v, b);
    expect(bpRangeAggVerify(commitments, proof)).toBe(true);
  });

  test('batch verify combines 2 proofs', { timeout: 30_000 }, () => {
    const { proof: p1, commitments: c1 } = bpRangeAggProve([100n], [randomScalar()]);
    const { proof: p2, commitments: c2 } = bpRangeAggProve([200n, 300n], [randomScalar(), randomScalar()]);
    expect(bpRangeAggBatchVerify([
      { commitments: c1, proof: p1 },
      { commitments: c2, proof: p2 },
    ])).toBe(true);
  });

  test('rejects out-of-range value', () => {
    expect(() => bpRangeAggProve([1n << 64n], [randomScalar()])).toThrow();
  });

  test('rejects negative value', () => {
    expect(() => bpRangeAggProve([-1n], [randomScalar()])).toThrow();
  });

  test('rejects mismatched lengths', () => {
    expect(() => bpRangeAggProve([100n, 200n], [randomScalar()])).toThrow();
  });

  test('rejects invalid m (m=3)', () => {
    expect(() => bpRangeAggProve([100n, 200n, 300n], [randomScalar(), randomScalar(), randomScalar()])).toThrow();
  });
});
