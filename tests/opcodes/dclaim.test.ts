import { describe, test, expect } from 'bun:test';
import { encodeCDClaim, decodeCDClaim } from '../../src/opcodes/dclaim.js';
function zeroFill(n: number): Uint8Array { return new Uint8Array(n).fill(0); }
describe('T_DCLAIM (0x2C)', () => {
  test('round-trip no witness', () => {
    const blinding = zeroFill(32); blinding[0] = 1;
    const p = encodeCDClaim({ assetId: zeroFill(32), dropRevealTxid: zeroFill(32), commitment: new Uint8Array(33).fill(2), amount: 100n, blinding });
    expect(decodeCDClaim(p)?.amount).toBe(100n);
  });
});
