import { describe, test, expect } from 'bun:test';
import { encodeCDrop, encodeCDropReclaim, decodeCDrop } from '../../src/opcodes/drop.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_DROP (0x2B)', () => {
  test('round-trip', () => {
    const p = encodeCDrop({ assetId: zeroFill(32, 0xaa), capAmount: 10_000n, perClaim: 100n, merkleRoot: zeroFill(32, 0xbb), expiryHeight: 850_000, ticker: 'DROP', decimals: 2, assetInputCount: 2, kernelSig: zeroFill(64, 0xcc) });
    expect(decodeCDrop(p)?.capAmount).toBe(10_000n);
  });

  test('reclaim shape round-trip', () => {
    const capBlinding = zeroFill(32, 0xdd);
    capBlinding[0] = 0x01;
    const p = encodeCDropReclaim({
      assetId: zeroFill(32, 0xaa),
      capAmount: 5000n,
      reclaimDropId: zeroFill(32, 0xee),
      reclaimSig: zeroFill(64, 0xcc),
      capBlinding,
    });
    const d = decodeCDrop(p);
    expect(d?.kind).toBe('cdrop-reclaim');
    if (d?.kind === 'cdrop-reclaim') {
      expect(d.capAmount).toBe(5000n);
    }
  });
});
