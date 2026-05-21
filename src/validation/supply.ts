// Supply conservation checks.
// For confidential assets this validates that all Pedersen commitment points
// are well-formed via computeExcessPoint. For public amounts this checks
// sum(outputs) <= sum(inputs) — no inflation.

import { computeExcessPoint } from '../crypto/kernel.js';

export function checkSupplyConservation(
  outputCommitments: Uint8Array[],
  inputCommitments: Uint8Array[],
  burnedAmount?: bigint,
): boolean {
  const EPrime = computeExcessPoint(
    outputCommitments,
    inputCommitments,
    burnedAmount ?? 0n,
  );
  return EPrime !== null;
}

export function checkPublicSupply(
  outputValues: bigint[],
  inputValues: bigint[],
): boolean {
  const outSum = outputValues.reduce((s, v) => s + v, 0n);
  const inSum = inputValues.reduce((s, v) => s + v, 0n);
  return outSum <= inSum;
}
