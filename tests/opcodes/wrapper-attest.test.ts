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
});
