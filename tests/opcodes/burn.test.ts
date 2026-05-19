import { describe, test, expect } from 'bun:test';
import { encodeCBurn, decodeCBurn } from '../../src/opcodes/burn.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_BURN (0x25)', () => {
  test('round-trip with change', () => {
    const p = encodeCBurn({ assetId: zeroFill(32), burnedAmount: 12345n, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(100) });
    expect(decodeCBurn(p)?.burnedAmount).toBe(12345n);
  });
  test('full burn (N=0)', () => {
    const p = encodeCBurn({ assetId: zeroFill(32), burnedAmount: 9999999n, kernelSig: zeroFill(64), outputs: [], rangeproof: zeroFill(0) });
    expect(decodeCBurn(p)?.outputs.length).toBe(0);
  });
  test('rejects N=3', () => {
    expect(() => encodeCBurn({ assetId: zeroFill(32), burnedAmount: 1n, kernelSig: zeroFill(64), outputs: Array(3).fill({ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }), rangeproof: zeroFill(0) })).toThrow();
  });
});
