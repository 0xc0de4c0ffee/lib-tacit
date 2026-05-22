import { describe, test, expect } from 'bun:test';
import { encodeAXferVar, decodeAXferVar } from '../../src/opcodes/axfer-var.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_AXFER_VAR (0x37)', () => {
  test('round-trip', () => {
    const p = encodeAXferVar({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33, 3), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(200) });
    const d = decodeAXferVar(p);
    expect(d?.kind).toBe('axfer-var');
    expect(d?.assetInputCount).toBe(1);
    expect(d?.outputs.length).toBe(2);
  });
  test('rejects N != 2', () => {
    expect(() => encodeAXferVar({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(0) })).toThrow();
  });
  test('decode rejects wrong asset_input_count', () => {
    const bad = new Uint8Array([0x37, ...zeroFill(32), 2, ...zeroFill(64), 2, ...zeroFill(33), ...zeroFill(8), ...zeroFill(33), ...zeroFill(8), 0, 0]);
    expect(decodeAXferVar(bad)).toBeNull();
  });
  test('rejects wrong opcode', () => {
    const p = encodeAXferVar({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(33, 2), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33, 3), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(1) });
    p[0] = 0x00;
    expect(decodeAXferVar(p)).toBeNull();
  });
  test('rejects truncated payload', () => {
    expect(decodeAXferVar(new Uint8Array([0x37, ...zeroFill(10)]))).toBeNull();
  });
  test('rejects 0 outputs', () => {
    expect(() => encodeAXferVar({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [], rangeproof: zeroFill(0) })).toThrow();
  });
  test('rejects commitment length mismatch', () => {
    expect(() => encodeAXferVar({ assetId: zeroFill(32), kernelSig: zeroFill(64), outputs: [{ commitment: zeroFill(32), encryptedAmount: zeroFill(8) }, { commitment: zeroFill(33), encryptedAmount: zeroFill(8) }], rangeproof: zeroFill(0) })).toThrow();
  });
});
