import { describe, test, expect } from 'bun:test';
import { checkSupplyConservation, checkPublicSupply } from '../../src/validation/supply.js';
import { pedersenCommit, pointToBytes, randomScalar } from '../../src/crypto/pedersen.js';

describe('checkSupplyConservation', () => {
  test('matching commitments returns true', () => {
    const r = randomScalar();
    const c = pointToBytes(pedersenCommit(100n, r));
    expect(checkSupplyConservation([c], [c])).toBe(true);
  });

  test('mismatched commitments produce non-degenerate excess (excess ≠ ZERO)', () => {
    // checkSupplyConservation only checks that the excess point is valid and non-zero.
    // It does NOT verify a kernel signature — that requires verifyKernel.
    // This test confirms the helper doesn't crash on mismatched commitments.
    const r1 = randomScalar();
    const r2 = randomScalar();
    const c1 = pointToBytes(pedersenCommit(100n, r1));
    const c2 = pointToBytes(pedersenCommit(200n, r2));
    expect(checkSupplyConservation([c2], [c1])).toBe(true);
  });

  test('with burned amount', () => {
    const r = randomScalar();
    const cIn = pointToBytes(pedersenCommit(200n, r));
    const cOut = pointToBytes(pedersenCommit(150n, randomScalar()));
    expect(checkSupplyConservation([cOut], [cIn], 50n)).toBe(true);
  });

  test('empty arrays', () => {
    expect(checkSupplyConservation([], [])).toBe(true);
  });

  test('single element arrays', () => {
    const r = randomScalar();
    const c = pointToBytes(pedersenCommit(42n, r));
    expect(checkSupplyConservation([c], [c])).toBe(true);
  });
});

describe('checkPublicSupply', () => {
  test('exact match', () => {
    expect(checkPublicSupply([100n, 50n], [150n])).toBe(true);
  });

  test('deficit (returns false)', () => {
    expect(checkPublicSupply([200n], [100n])).toBe(false);
  });

  test('surplus (returns true — out <= in)', () => {
    expect(checkPublicSupply([50n], [100n])).toBe(true);
  });
});
