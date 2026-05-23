import { describe, test, expect } from 'bun:test';
import { xor32 } from '../../src/crypto/primitives.js';

describe('xor32', () => {
  test('xor32 produces 32 bytes', () => {
    const a = new Uint8Array(32).fill(0xff);
    const b = new Uint8Array(32).fill(0x00);
    expect(xor32(a, b).length).toBe(32);
  });
  test('xor32: 0xff ^ 0x00 = 0xff', () => {
    const a = new Uint8Array(32).fill(0xff);
    const b = new Uint8Array(32).fill(0x00);
    const r = xor32(a, b);
    expect(r.every(v => v === 0xff)).toBe(true);
  });
  test('xor32: a ^ a = 0', () => {
    const a = new Uint8Array(32).fill(0xab);
    const r = xor32(a, a);
    expect(r.every(v => v === 0x00)).toBe(true);
  });
  test('xor32: identity (a ^ 0 = a)', () => {
    const a = new Uint8Array(32);
    for (let i = 0; i < 32; i++) a[i] = i;
    const z = new Uint8Array(32).fill(0);
    const r = xor32(a, z);
    expect(r).toEqual(a);
  });
  test('xor32 is symmetric (a ^ b = b ^ a)', () => {
    const a = new Uint8Array(32); for (let i = 0; i < 32; i++) a[i] = i;
    const b = new Uint8Array(32); for (let i = 0; i < 32; i++) b[i] = 32 - i;
    expect(xor32(a, b)).toEqual(xor32(b, a));
  });
  test('xor32 throws on wrong length (31 bytes)', () => {
    expect(() => xor32(new Uint8Array(31), new Uint8Array(32))).toThrow();
  });
  test('xor32 throws on wrong length (33 bytes)', () => {
    expect(() => xor32(new Uint8Array(32), new Uint8Array(33))).toThrow();
  });
  test('xor32 throws on empty arrays', () => {
    expect(() => xor32(new Uint8Array(0), new Uint8Array(32))).toThrow();
  });
});
