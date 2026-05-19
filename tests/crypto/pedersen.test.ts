import { describe, test, expect } from 'bun:test';
import { G, H, ZERO, pedersenCommit, pointToBytes, modN, randomScalar } from '../../src/crypto/pedersen.js';
import { bytesToHex } from '@noble/hashes/utils';
import { H_HEX } from '../../src/constants/generators.js';
import { G_VEC_HEX, H_VEC_HEX, Q_HEX } from '../../src/constants/generators.js';
import { bpGens } from '../../src/crypto/bulletproofs.js';

describe('NUMS generators (SPEC §3.1)', () => {
  test('H hex matches pinned vector', () => {
    expect(bytesToHex(pointToBytes(H))).toBe(H_HEX);
  });

  test('H ≠ G', () => {
    expect(H.equals(G)).toBe(false);
  });

  test('C(0, 1) ≡ G', () => {
    expect(pedersenCommit(0n, 1n).equals(G)).toBe(true);
  });

  test('C(1, 0) ≡ H', () => {
    expect(pedersenCommit(1n, 0n).equals(H)).toBe(true);
  });

  test('BP generators match pinned', () => {
    const { Gvec, Hvec, Q } = bpGens();
    expect(bytesToHex(pointToBytes(Q))).toBe(Q_HEX);
    for (let i = 0; i < 4; i++) {
      expect(bytesToHex(pointToBytes(Gvec[i]!))).toBe(G_VEC_HEX[i]);
      expect(bytesToHex(pointToBytes(Hvec[i]!))).toBe(H_VEC_HEX[i]);
    }
  });
});

describe('Pedersen commitments', () => {
  test('C(1000, 7) bytes pinned', () => {
    expect(bytesToHex(pointToBytes(pedersenCommit(1000n, 7n)))).toBe(
      '03925611857a1dcb094300ea201b3c963d1d144fd2b1c502022f14e4c234a02fcb',
    );
  });

  test('homomorphic: C(a) + C(b) == C(a+b)', () => {
    const r1 = randomScalar(), r2 = randomScalar();
    expect(pedersenCommit(100n + 250n, modN(r1 + r2)).equals(
      pedersenCommit(100n, r1).add(pedersenCommit(250n, r2)),
    )).toBe(true);
  });

  test('C(a) minus C(a) = ZERO', () => {
    const r = randomScalar();
    const Z = pedersenCommit(999n, r).add(pedersenCommit(999n, r).negate());
    expect(Z.equals(ZERO)).toBe(true);
  });
});
