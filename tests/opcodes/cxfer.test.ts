import { describe, test, expect } from 'bun:test';
import { encodeCXfer, decodeCXfer } from '../../src/opcodes/transfer.js';
import { Opcode } from '../../src/constants/opcodes.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('CXFER (0x23)', () => {
  test('round-trip m=2', () => {
    const p = encodeCXfer({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33, 3), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    expect(decodeCXfer(p)?.outputs.length).toBe(2);
  });
  test('rejects N=3 in encode', () => {
    expect(() => encodeCXfer({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: Array(3).fill({ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }), rangeproof: zeroFill(0) })).toThrow();
  });
  test('decode rejects N=3', () => {
    const bad = new Uint8Array([Opcode.T_CXFER, ...zeroFill(32), ...zeroFill(64), 3, ...zeroFill(33 * 3), ...zeroFill(8 * 3), 0, 0]);
    expect(decodeCXfer(bad)).toBeNull();
  });
  test('rejects trailing bytes', () => {
    const p = encodeCXfer({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    expect(decodeCXfer(new Uint8Array([...p, 0]))).toBeNull();
  });
  test('CXFER empty outputs rejection', () => {
    expect(() => encodeCXfer({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [], rangeproof: zeroFill(0) })).toThrow();
  });
  test('CXFER with single output', () => {
    const p = encodeCXfer({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(100) });
    expect(decodeCXfer(p)?.outputs.length).toBe(1);
  });
  test('CXFER decode malformed (truncated bytes)', () => {
    const p = encodeCXfer({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(10) });
    expect(decodeCXfer(p.slice(0, -5))).toBeNull();
  });
});
