import { describe, test, expect } from 'bun:test';
import { encodeAXfer, decodeAXfer } from '../../src/opcodes/axfer.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_AXFER (0x26)', () => {
  test('round-trip', () => {
    const p = encodeAXfer({ assetId: zeroFill(32), assetInputCount: 2, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33, 3), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    expect(decodeAXfer(p)?.assetInputCount).toBe(2);
  });
});
