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
});
