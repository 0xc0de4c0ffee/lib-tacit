import { describe, test, expect } from 'bun:test';
import { encodeAXfer, decodeAXfer } from '../../src/opcodes/axfer.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_AXFER (0x26)', () => {
  test('round-trip', () => {
    const p = encodeAXfer({ assetId: zeroFill(32), assetInputCount: 2, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33, 3), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    expect(decodeAXfer(p)?.assetInputCount).toBe(2);
  });
  test('round-trip with single output', () => {
    const p = encodeAXfer({ assetId: zeroFill(32), assetInputCount: 1, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    expect(decodeAXfer(p)?.outputs.length).toBe(1);
  });
  test('rejects wrong opcode', () => {
    expect(decodeAXfer(new Uint8Array([0x25, ...zeroFill(32)]))).toBeNull();
  });
  test('rejects truncated payload', () => {
    expect(decodeAXfer(new Uint8Array([0x26, ...zeroFill(10)]))).toBeNull();
  });
  test('rejects commitment length mismatch', () => {
    expect(() => encodeAXfer({ assetId: zeroFill(32), assetInputCount: 1, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(10), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) })).toThrow();
  });
  test('rejects empty payload', () => {
    expect(decodeAXfer(new Uint8Array())).toBeNull();
  });
  test('rejects N=0 (not in BP_AGG_CAPS)', () => {
    expect(() => encodeAXfer({ assetId: zeroFill(32), assetInputCount: 1, kernelSig: zeroFill(64), outputs: [], rangeproof: zeroFill(0) })).toThrow();
  });
  test('rejects excessive asset input count', () => {
    expect(() => encodeAXfer({ assetId: zeroFill(32), assetInputCount: 0, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(0) })).toThrow();
  });
  test('rejects decode with extra trailing bytes', () => {
    const p = encodeAXfer({ assetId: zeroFill(32), assetInputCount: 1, kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(10) });
    const padded = new Uint8Array([...p, 0x00, 0x00]);
    expect(decodeAXfer(padded)).toBeNull();
  });
});
