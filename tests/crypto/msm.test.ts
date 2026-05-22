import { describe, test, expect } from 'bun:test';
import * as secp from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { msm } from '../../src/crypto/msm.js';
import { G, H, ZERO, modN, safeMult, randomScalar, pointToBytes } from '../../src/crypto/pedersen.js';
import { SECP_N } from '../../src/constants/limits.js';
import { getTestPubkey } from './fixtures.js';

function pubkeyPoint(): secp.ProjectivePoint {
  return secp.ProjectivePoint.fromHex(bytesToHex(getTestPubkey()));
}

function randomPoint(): secp.ProjectivePoint {
  return G.multiply(randomScalar());
}

describe('msm — Pippenger multi-scalar multiplication', () => {
  test('single scalar 1 — msm([1n], [G]) === G', () => {
    expect(msm([1n], [G]).equals(G)).toBe(true);
  });

  test('zero scalar — msm([0n], [G]) === ZERO', () => {
    expect(msm([0n], [G]).equals(ZERO)).toBe(true);
  });

  test('two scalars — matches manual addition aG + bH', () => {
    const a = 7n;
    const b = 13n;
    const manual = safeMult(G, a).add(safeMult(H, b));
    expect(msm([a, b], [G, H]).equals(manual)).toBe(true);
  });

  test('three scalars — matches sequential stepwise addition', () => {
    const a = 3n, b = 5n, c = 11n;
    const P = randomPoint();
    const Q = randomPoint();
    const R = randomPoint();
    const stepwise = safeMult(P, a).add(safeMult(Q, b)).add(safeMult(R, c));
    expect(msm([a, b, c], [P, Q, R]).equals(stepwise)).toBe(true);
  });

  test('negative scalar — msm([-1n], [G]) === -G', () => {
    const result = msm([-1n], [G]);
    expect(result.equals(G.negate())).toBe(true);
  });

  test('empty arrays — msm([], []) === ZERO', () => {
    expect(msm([], []).equals(ZERO)).toBe(true);
  });

  test('mismatched lengths throws', () => {
    expect(() => msm([1n, 2n], [G])).toThrow();
  });

  test('large scalar SECP_N - 1 — msm([SECP_N-1], [G]) === -G', () => {
    expect(msm([SECP_N - 1n], [G]).equals(G.negate())).toBe(true);
  });

  test('msm with H generator — matches safeMult', () => {
    const s = 100n;
    expect(msm([s], [H]).equals(safeMult(H, s))).toBe(true);
  });

  test('random scalars and points — matches sequential addition', () => {
    const scalars = [randomScalar(), randomScalar(), randomScalar(), randomScalar()];
    const points = [randomPoint(), randomPoint(), randomPoint(), randomPoint()];
    let manual = ZERO;
    for (let i = 0; i < scalars.length; i++) {
      manual = manual.add(safeMult(points[i]!, scalars[i]!));
    }
    expect(msm(scalars, points).equals(manual)).toBe(true);
  });

  test('determinism — same inputs produce same output', () => {
    const P = pubkeyPoint();
    const scalars = [42n, 99n, 7n];
    const points: secp.ProjectivePoint[] = [G, H, P];
    const r1 = msm(scalars, points);
    const r2 = msm(scalars, points);
    expect(r1.equals(r2)).toBe(true);
    expect(bytesToHex(pointToBytes(r1))).toBe(bytesToHex(pointToBytes(r2)));
  });

  test('signed-digit window exercised — >4 scalars with varying magnitudes', () => {
    // Use enough scalars (8) to exercise signed-digit encoding across windows
    const scalars = [
      0x123456789abcdefn,
      0xfedcba9876543210n,
      0xdeadbeefcafebaben,
      0x1111111111111111n,
      SECP_N - 1000n,
      0xaaaaaaaaaaaaaaaan,
      0x55555555555555555n,
      999999999999999n,
    ];
    const points = [
      G, H,
      randomPoint(), randomPoint(),
      pubkeyPoint(), randomPoint(),
      randomPoint(), randomPoint(),
    ];
    let manual = ZERO;
    for (let i = 0; i < scalars.length; i++) {
      manual = manual.add(safeMult(points[i]!, scalars[i]!));
    }
    expect(msm(scalars, points).equals(manual)).toBe(true);
  });

  test('all scalars zero returns ZERO', () => {
    const P = randomPoint();
    const Q = randomPoint();
    expect(msm([0n, 0n, 0n], [G, P, Q]).equals(ZERO)).toBe(true);
  });

  test('mixed zero and non-zero scalars', () => {
    const scalars = [0n, 5n, 0n, 3n];
    const P = randomPoint();
    const Q = randomPoint();
    const R = randomPoint();
    const S = randomPoint();
    const points = [P, Q, R, S];
    const manual = safeMult(Q, 5n).add(safeMult(S, 3n));
    expect(msm(scalars, points).equals(manual)).toBe(true);
  });

  test('large random batch (12 scalars) stresses window selection', () => {
    const n = 12;
    const scalars: bigint[] = [];
    const points: secp.ProjectivePoint[] = [];
    for (let i = 0; i < n; i++) {
      scalars.push(randomScalar());
      points.push(G.multiply(randomScalar()));
    }
    let manual = ZERO;
    for (let i = 0; i < n; i++) {
      manual = manual.add(safeMult(points[i]!, scalars[i]!));
    }
    expect(msm(scalars, points).equals(manual)).toBe(true);
  });
});
