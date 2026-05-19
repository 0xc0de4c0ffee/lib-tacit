import { describe, test, expect } from 'bun:test';
import { encodeCXferBpp, decodeCXferBpp } from '../../src/opcodes/cxfer-bpp.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_CXFER_BPP (0x22)', () => {
  test('round-trip m=2', () => {
    const p = encodeCXferBpp({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33, 3), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    expect(decodeCXferBpp(p)?.outputs.length).toBe(2);
  });
  test('rejects N=3', () => {
    expect(() => encodeCXferBpp({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: Array(3).fill({ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }), rangeproof: zeroFill(0) })).toThrow();
  });
  test('decode wrong opcode', () => {
    expect(decodeCXferBpp(new Uint8Array([0x23, ...zeroFill(32), ...zeroFill(64), 1, ...zeroFill(33), ...zeroFill(8), 0, 0]))).toBeNull();
  });
});
