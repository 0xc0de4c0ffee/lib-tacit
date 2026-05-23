import { describe, test, expect } from 'bun:test';
import { encodeCDClaim, decodeCDClaim } from '../../src/opcodes/dclaim.js';
function zeroFill(n: number, v = 0): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_DCLAIM (0x2C)', () => {
  test('round-trip no witness', () => {
    const blinding = zeroFill(32); blinding[0] = 1;
    const p = encodeCDClaim({ assetId: zeroFill(32), dropRevealTxid: zeroFill(32), commitment: new Uint8Array(33).fill(2), amount: 100n, blinding });
    expect(decodeCDClaim(p)?.amount).toBe(100n);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCDClaim(new Uint8Array([0x2B, ...zeroFill(32)]))).toBeNull();
  });
  test('rejects truncated payload', () => {
    expect(decodeCDClaim(new Uint8Array([0x2C, ...zeroFill(10)]))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCDClaim(new Uint8Array())).toBeNull();
  });
  test('rejects bad asset id length', () => {
    expect(() => encodeCDClaim({ assetId: zeroFill(10), dropRevealTxid: zeroFill(32), commitment: new Uint8Array(33).fill(2), amount: 100n, blinding: zeroFill(32) })).toThrow();
  });
  test('rejects zero amount', () => {
    expect(() => encodeCDClaim({ assetId: zeroFill(32), dropRevealTxid: zeroFill(32), commitment: new Uint8Array(33).fill(2), amount: 0n, blinding: zeroFill(32) })).toThrow();
  });
  test('rejects blinding shorter than 32 bytes', () => {
    expect(() => encodeCDClaim({ assetId: zeroFill(32), dropRevealTxid: zeroFill(32), commitment: new Uint8Array(33).fill(2), amount: 100n, blinding: zeroFill(10) })).toThrow();
  });
  test('rejects witness too large', () => {
    expect(() => encodeCDClaim({ assetId: zeroFill(32), dropRevealTxid: zeroFill(32), commitment: new Uint8Array(33).fill(2), amount: 100n, blinding: zeroFill(32), witness: new Uint8Array(70000) })).toThrow();
  });
});