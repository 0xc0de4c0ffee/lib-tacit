import { describe, test, expect } from 'bun:test';
import { encodePMint, decodePMint } from '../../src/opcodes/pmint.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_PMINT (0x28)', () => {
  test('round-trip', () => {
    const p = encodePMint({ assetId: zeroFill(32, 0xaa), etchTxid: zeroFill(32, 0xbb), commitment: zeroFill(33, 2), amount: 1000n, blinding: zeroFill(32, 0xcc) });
    const dec = decodePMint(p);
    expect(dec?.amount).toBe(1000n);
    expect(dec?.etchTxid).toEqual(zeroFill(32, 0xbb));
  });
  test('rejects wrong opcode', () => {
    expect(decodePMint(new Uint8Array([0x27, ...zeroFill(32)]))).toBeNull();
  });
  test('rejects truncated payload', () => {
    expect(decodePMint(new Uint8Array([0x28, ...zeroFill(10)]))).toBeNull();
  });
  test('rejects zero amount', () => {
    expect(() => encodePMint({ assetId: zeroFill(32), etchTxid: zeroFill(32), commitment: zeroFill(33, 2), amount: 0n, blinding: zeroFill(32) })).toThrow();
  });
  test('rejects empty payload', () => {
    expect(decodePMint(new Uint8Array())).toBeNull();
  });
  test('rejects overlong payload (extra trailing bytes)', () => {
    const p = encodePMint({ assetId: zeroFill(32, 0xaa), etchTxid: zeroFill(32, 0xbb), commitment: zeroFill(33, 2), amount: 1000n, blinding: zeroFill(32, 0xcc) });
    const overlong = new Uint8Array([...p, 0x00]);
    expect(decodePMint(overlong)).toBeNull();
  });
  test('rejects overlong payload (more trailing bytes)', () => {
    const p = encodePMint({ assetId: zeroFill(32, 0xaa), etchTxid: zeroFill(32, 0xbb), commitment: zeroFill(33, 2), amount: 1000n, blinding: zeroFill(32, 0xcc) });
    const overlong = new Uint8Array([...p, 0x00, 0x01, 0x02]);
    expect(decodePMint(overlong)).toBeNull();
  });
});
