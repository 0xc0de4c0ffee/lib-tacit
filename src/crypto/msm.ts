// Pippenger multi-scalar multiplication (signed-digit windowed buckets).
// The reference implementation's MSM is the load-bearing performance primitive
// for Bulletproofs validation. Mirrors ref/tests/bulletproofs.mjs:72-123.
//
// Algorithm: signed-digit windowed, c=4 for 33-128 points, c=5 for >128.
// Window size auto-selected: c=3 for ≤32, c=4 for 33-128, c=5 for >128.

import * as secp from '@noble/secp256k1';
import { ZERO, modN } from './pedersen.js';

export function msm(
  scalars: bigint[],
  points: secp.ProjectivePoint[],
): secp.ProjectivePoint {
  const N = scalars.length;
  if (N === 0) return ZERO;

  // Filter zero scalars
  const ss: bigint[] = [];
  const ps: secp.ProjectivePoint[] = [];
  for (let i = 0; i < N; i++) {
    const r = modN(scalars[i]!);
    if (r === 0n) continue;
    ss.push(r);
    ps.push(points[i]!);
  }

  const live = ss.length;
  if (live === 0) return ZERO;

  const c = live <= 32 ? 3 : live <= 128 ? 4 : 5;
  const W = 1 << c;
  const HALF = W >> 1;
  const totalBits = 257;
  const numWindows = Math.ceil(totalBits / c);

  // Compute signed digits per scalar
  const digitsAll: Int32Array[] = [];
  for (let i = 0; i < live; i++) {
    const s = ss[i]!;
    const digs = new Int32Array(numWindows);
    let carry = 0;
    for (let w = 0; w < numWindows; w++) {
      let d = Number((s >> BigInt(w * c)) & BigInt(W - 1)) + carry;
      if (d >= HALF) { d -= W; carry = 1; } else { carry = 0; }
      digs[w] = d;
    }
    digitsAll.push(digs);
  }

  let acc = ZERO;
  const buckets: secp.ProjectivePoint[] = new Array(HALF + 1);

  for (let w = numWindows - 1; w >= 0; w--) {
    if (w !== numWindows - 1) {
      for (let s = 0; s < c; s++) acc = acc.double();
    }

    for (let k = 1; k <= HALF; k++) buckets[k] = ZERO;

    for (let i = 0; i < live; i++) {
      const d = digitsAll[i]![w]!;
      if (d === 0) continue;
      if (d > 0) buckets[d] = buckets[d]!.add(ps[i]!);
      else buckets[-d] = buckets[-d]!.add(ps[i]!.negate());
    }

    let running = buckets[HALF]!;
    let windowSum = running;
    for (let k = HALF - 1; k >= 1; k--) {
      running = running.add(buckets[k]!);
      windowSum = windowSum.add(running);
    }
    acc = acc.add(windowSum);
  }

  return acc;
}
