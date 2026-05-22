import { describe, test, expect } from 'bun:test';
import { encodeDeposit, decodeDeposit, encodePoolInit, isPoolInit } from '../../src/opcodes/deposit.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_DEPOSIT (0x29)', () => {
  test('deposit round-trip', () => {
    const p = encodeDeposit({ assetId: zeroFill(32), denomination: 1000n, leafCommitment: zeroFill(32, 0xaa), kernelSig: zeroFill(64, 0xbb) });
    const d = decodeDeposit(p);
    expect(d?.kind).toBe('deposit');
    if (d?.kind === 'deposit') {
      expect(d.denomination).toBe(1000n);
    }
  });
  test('pool_init round-trip', () => {
    const p = encodePoolInit({ assetId: zeroFill(32), poolDenom: 500n, vkCid: zeroFill(10), ceremonyCid: zeroFill(10), initSig: zeroFill(64) });
    expect(isPoolInit(p)).toBe(true);
    const d = decodeDeposit(p);
    expect(d?.kind).toBe('pool-init');
  });
  test('detects pool init vs deposit', () => {
    const depositP = encodeDeposit({ assetId: zeroFill(32), denomination: 100n, leafCommitment: zeroFill(32), kernelSig: zeroFill(64) });
    expect(isPoolInit(depositP)).toBe(false);
  });

  test('decode rejects pool_init with pool_denom 0', () => {
    const p = encodePoolInit({
      assetId: zeroFill(32),
      poolDenom: 100n,
      vkCid: zeroFill(10),
      ceremonyCid: zeroFill(10),
      initSig: zeroFill(64),
    });
    const bad = new Uint8Array(p);
    for (let i = 41; i < 49; i++) bad[i] = 0;
    expect(decodeDeposit(bad)).toBeNull();
  });

  test('rejects wrong opcode', () => {
    const p = encodeDeposit({ assetId: zeroFill(32), denomination: 100n, leafCommitment: zeroFill(32), kernelSig: zeroFill(64) });
    p[0] = 0x00;
    expect(decodeDeposit(p)).toBeNull();
  });

  test('rejects truncated deposit payload', () => {
    expect(decodeDeposit(new Uint8Array([0x29, ...zeroFill(32), ...zeroFill(7)]))).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeDeposit(new Uint8Array())).toBeNull();
  });

  test('rejects zero-length vkCid in pool-init', () => {
    expect(() => encodePoolInit({ assetId: zeroFill(32), poolDenom: 100n, vkCid: new Uint8Array(0), ceremonyCid: zeroFill(10), initSig: zeroFill(64) })).toThrow();
  });

  test('rejects wrong-length kernelSig', () => {
    expect(() => encodeDeposit({ assetId: zeroFill(32), denomination: 100n, leafCommitment: zeroFill(32), kernelSig: zeroFill(63) })).toThrow();
  });
});
