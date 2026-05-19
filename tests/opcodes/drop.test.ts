import { describe, test, expect } from 'bun:test';
import { encodeCDrop, decodeCDrop } from '../../src/opcodes/drop.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_DROP (0x2B)', () => {
  test('round-trip', () => {
    const p = encodeCDrop({ assetId: zeroFill(32, 0xaa), capAmount: 10_000n, perClaim: 100n, merkleRoot: zeroFill(32, 0xbb), expiryHeight: 850_000, ticker: 'DROP', decimals: 2, assetInputCount: 2, kernelSig: zeroFill(64, 0xcc) });
    expect(decodeCDrop(p)?.capAmount).toBe(10_000n);
  });
});
