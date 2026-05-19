import { describe, test, expect } from 'bun:test';
import { encodePMint, decodePMint } from '../../src/opcodes/pmint.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_PMINT (0x28)', () => {
  test('round-trip', () => {
    const p = encodePMint({ assetId: zeroFill(32, 0xaa), etchTxid: zeroFill(32, 0xbb), commitment: zeroFill(33, 2), amount: 1000n, blinding: zeroFill(32, 0xcc) });
    expect(decodePMint(p)?.amount).toBe(1000n);
  });
});
