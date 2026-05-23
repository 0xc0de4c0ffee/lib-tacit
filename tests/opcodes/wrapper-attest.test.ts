import { describe, test, expect } from 'bun:test';
import { encodeWrapperAttest, decodeWrapperAttest } from '../../src/opcodes/wrapper-attest.js';
function zeroFill(n: number): Uint8Array { return new Uint8Array(n).fill(0x02); }
describe('T_WRAPPER_ATTEST (0x38)', () => {
  test('round-trip', () => {
    const p = encodeWrapperAttest({ assetId: zeroFill(32), issuerSig: zeroFill(64), payload: new Uint8Array([1, 2, 3]) });
    const d = decodeWrapperAttest(p);
    expect(d?.kind).toBe('wrapper-attest');
  });
  test('rejects wrong opcode', () => {
    expect(decodeWrapperAttest(new Uint8Array([0x00]))).toBeNull();
  });
  test('rejects truncated payload', () => {
    const p = encodeWrapperAttest({ assetId: zeroFill(32), issuerSig: zeroFill(64), payload: new Uint8Array([1, 2, 3]) });
    expect(decodeWrapperAttest(p.slice(0, -5))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeWrapperAttest(new Uint8Array())).toBeNull();
  });
  test('rejects payload with mismatched length prefix', () => {
    const p = encodeWrapperAttest({ assetId: zeroFill(32), issuerSig: zeroFill(64), payload: new Uint8Array([1, 2, 3]) });
    // corrupt the 2-byte payload length at offset 1+32+64 = 97
    p[97] = 0xff;
    p[98] = 0xff;
    expect(decodeWrapperAttest(p)).toBeNull();
  });
  test('rejects payload too large', () => {
    expect(() => encodeWrapperAttest({ assetId: zeroFill(32), issuerSig: zeroFill(64), payload: new Uint8Array(70000) })).toThrow();
  });
  test('rejects short asset id', () => {
    expect(() => encodeWrapperAttest({ assetId: zeroFill(10), issuerSig: zeroFill(64), payload: new Uint8Array([1]) })).toThrow();
  });
  test('rejects short issuer sig', () => {
    expect(() => encodeWrapperAttest({ assetId: zeroFill(32), issuerSig: zeroFill(10), payload: new Uint8Array([1]) })).toThrow();
  });
});
