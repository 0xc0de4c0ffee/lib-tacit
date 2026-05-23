// Shared cryptographic primitives used across the library.

// XOR two 32-byte arrays element-wise.
export function xor32(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== 32 || b.length !== 32) throw new Error('xor32 requires 32-byte arrays');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = a[i]! ^ b[i]!;
  return out;
}
