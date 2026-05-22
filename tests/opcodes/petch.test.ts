import { describe, test, expect } from 'bun:test';
import { encodePEtch, decodePEtch } from '../../src/opcodes/petch.js';
import { Opcode } from '../../src/constants/opcodes.js';
describe('T_PETCH (0x27)', () => {
  test('round-trip', () => {
    const p = encodePEtch({ ticker: 'FAIR', decimals: 2, capAmount: 1_000_000n, mintLimit: 1000n, mintStartHeight: 800_000, mintEndHeight: 900_000 });
    expect(decodePEtch(p)?.capAmount).toBe(1_000_000n);
  });
  test('rejects cap not divisible by limit', () => {
    expect(() => encodePEtch({ ticker: 'X', decimals: 0, capAmount: 100n, mintLimit: 30n, mintStartHeight: 100, mintEndHeight: 200 })).toThrow();
  });
  test('rejects wrong opcode', () => {
    const p = encodePEtch({ ticker: 'T', decimals: 0, capAmount: 100n, mintLimit: 10n, mintStartHeight: 100, mintEndHeight: 200 });
    p[0] = Opcode.T_CETCH;
    expect(decodePEtch(p)).toBeNull();
  });
  test('rejects truncated payload', () => {
    expect(decodePEtch(new Uint8Array(10))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodePEtch(new Uint8Array())).toBeNull();
  });
  test('rejects invalid decimals', () => {
    expect(() => encodePEtch({ ticker: 'X', decimals: 9, capAmount: 100n, mintLimit: 10n, mintStartHeight: 0, mintEndHeight: 0 })).toThrow();
  });
  test('rejects zero capAmount', () => {
    expect(() => encodePEtch({ ticker: 'X', decimals: 0, capAmount: 0n, mintLimit: 10n, mintStartHeight: 0, mintEndHeight: 0 })).toThrow();
  });
  test('rejects too-long ticker', () => {
    expect(() => encodePEtch({ ticker: 'ABCDEFGHIJKLMNOPQ', decimals: 0, capAmount: 100n, mintLimit: 10n, mintStartHeight: 0, mintEndHeight: 0 })).toThrow();
  });
});
