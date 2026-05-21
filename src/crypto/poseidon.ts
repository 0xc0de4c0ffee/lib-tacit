import { poseidon1, poseidon2 } from 'poseidon-lite';

const POSEIDON_FN: Record<number, (inputs: (bigint | number | string)[], nOuts?: number) => bigint> = {
  1: poseidon1,
  2: poseidon2,
};

export function poseidonHash(inputs: bigint[]): bigint {
  const fn = POSEIDON_FN[inputs.length];
  if (!fn) {
    throw new Error(`poseidonHash: unsupported input length ${inputs.length} (only 1 or 2 supported)`);
  }
  return fn(inputs);
}

export function poseidonHash1(a: bigint): bigint {
  return poseidon1([a]);
}

export function poseidonHash2(a: bigint, b: bigint): bigint {
  return poseidon2([a, b]);
}
