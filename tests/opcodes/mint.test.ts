import { describe, test, expect } from 'bun:test';
import { encodeCMint, decodeCMint } from '../../src/opcodes/mint.js';
import { Opcode } from '../../src/constants/opcodes.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_MINT (0x24)', () => {
  test('round-trip', () => {
    const p = encodeCMint({ assetId: zeroFill(32, 0xaa), etchTxid: zeroFill(32, 0xbb), commitment: zeroFill(33), encryptedAmount: zeroFill(8), rangeproof: zeroFill(100), issuerSig: zeroFill(64) });
    expect(decodeCMint(p)?.kind).toBe('cmint');
  });
  test('rejects wrong opcode', () => {
    const p = encodeCMint({ assetId: zeroFill(32), etchTxid: zeroFill(32), commitment: zeroFill(33), encryptedAmount: zeroFill(8), rangeproof: zeroFill(1), issuerSig: zeroFill(64) });
    p[0] = Opcode.T_CETCH;
    expect(decodeCMint(p)).toBeNull();
  });
  test('rejects truncated payload', () => {
    expect(decodeCMint(new Uint8Array(100))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCMint(new Uint8Array())).toBeNull();
  });
  test('rejects wrong-length assetId', () => {
    expect(() => encodeCMint({ assetId: zeroFill(31), etchTxid: zeroFill(32), commitment: zeroFill(33), encryptedAmount: zeroFill(8), rangeproof: zeroFill(0), issuerSig: zeroFill(64) })).toThrow();
  });
  test('rejects wrong-length etching commitment', () => {
    expect(() => encodeCMint({ assetId: zeroFill(32), etchTxid: zeroFill(32), commitment: zeroFill(32), encryptedAmount: zeroFill(8), rangeproof: zeroFill(0), issuerSig: zeroFill(64) })).toThrow();
  });
  test('rejects wrong-length encryptedAmount', () => {
    expect(() => encodeCMint({ assetId: zeroFill(32), etchTxid: zeroFill(32), commitment: zeroFill(33), encryptedAmount: zeroFill(7), rangeproof: zeroFill(0), issuerSig: zeroFill(64) })).toThrow();
  });
  test('rejects wrong-length issuerSig', () => {
    expect(() => encodeCMint({ assetId: zeroFill(32), etchTxid: zeroFill(32), commitment: zeroFill(33), encryptedAmount: zeroFill(8), rangeproof: zeroFill(0), issuerSig: zeroFill(63) })).toThrow();
  });
});
