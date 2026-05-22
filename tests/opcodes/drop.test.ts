import { describe, test, expect } from 'bun:test';
import { encodeCDrop, encodeCDropReclaim, decodeCDrop } from '../../src/opcodes/drop.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_DROP (0x2B)', () => {
  test('round-trip', () => {
    const p = encodeCDrop({ assetId: zeroFill(32, 0xaa), capAmount: 10_000n, perClaim: 100n, merkleRoot: zeroFill(32, 0xbb), expiryHeight: 850_000, ticker: 'DROP', decimals: 2, assetInputCount: 2, kernelSig: zeroFill(64, 0xcc) });
    expect(decodeCDrop(p)?.capAmount).toBe(10_000n);
  });

  test('reclaim shape round-trip', () => {
    const p = encodeCDropReclaim({
      assetId: zeroFill(32, 0xaa),
      capAmount: 5000n,
      reclaimDropId: zeroFill(32, 0xee),
      reclaimSig: zeroFill(64, 0xcc),
      capBlinding: zeroFill(32, 0xdd),
    });
    const d = decodeCDrop(p);
    expect(d?.kind).toBe('cdrop-reclaim');
    if (d?.kind === 'cdrop-reclaim') {
      expect(d.capAmount).toBe(5000n);
    }
  });

  test('decoder identifies reclaim vs standard', () => {
    const std = encodeCDrop({ assetId: zeroFill(32), capAmount: 1000n, perClaim: 100n, merkleRoot: zeroFill(32), expiryHeight: 500000, ticker: 'DROP', decimals: 2, assetInputCount: 1, kernelSig: zeroFill(64) });
    expect(decodeCDrop(std)?.kind).toBe('cdrop');
    const reclaim = encodeCDropReclaim({ assetId: zeroFill(32), capAmount: 1000n, reclaimDropId: zeroFill(32, 0xee), reclaimSig: zeroFill(64), capBlinding: zeroFill(32, 0x11) });
    expect(decodeCDrop(reclaim)?.kind).toBe('cdrop-reclaim');
  });

  test('rejects wrong opcode', () => {
    const p = encodeCDrop({ assetId: zeroFill(32), capAmount: 100n, perClaim: 10n, merkleRoot: zeroFill(32), expiryHeight: 100, assetInputCount: 1, kernelSig: zeroFill(64) });
    p[0] = 0x00;
    expect(decodeCDrop(p)).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeCDrop(new Uint8Array(100))).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeCDrop(new Uint8Array())).toBeNull();
  });

  test('rejects wrong-length assetId', () => {
    expect(() => encodeCDropReclaim({ assetId: zeroFill(33), capAmount: 100n, reclaimDropId: zeroFill(32), reclaimSig: zeroFill(64), capBlinding: zeroFill(32, 0x01) })).toThrow();
  });

  test('rejects too-large expiryHeight', () => {
    expect(() => encodeCDrop({ assetId: zeroFill(32), capAmount: 100n, perClaim: 10n, merkleRoot: zeroFill(32), expiryHeight: 0x1_0000_0000, ticker: 'X', decimals: 0, assetInputCount: 1, kernelSig: zeroFill(64) })).toThrow();
  });

  test('rejects wrong-length kernelSig', () => {
    expect(() => encodeCDrop({ assetId: zeroFill(32), capAmount: 100n, perClaim: 10n, merkleRoot: zeroFill(32), expiryHeight: 100, assetInputCount: 1, kernelSig: zeroFill(63) })).toThrow();
  });

  test('rejects invalid perClaim (not divisible)', () => {
    expect(() => encodeCDrop({ assetId: zeroFill(32), capAmount: 100n, perClaim: 30n, merkleRoot: zeroFill(32), expiryHeight: 100, assetInputCount: 1, kernelSig: zeroFill(64) })).toThrow();
  });
});
