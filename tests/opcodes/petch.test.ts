import { describe, test, expect } from 'bun:test';
import { encodePEtch, decodePEtch } from '../../src/opcodes/petch.js';
describe('T_PETCH (0x27)', () => {
  test('round-trip', () => {
    const p = encodePEtch({ ticker: 'FAIR', decimals: 2, capAmount: 1_000_000n, mintLimit: 1000n, mintStartHeight: 800_000, mintEndHeight: 900_000 });
    expect(decodePEtch(p)?.capAmount).toBe(1_000_000n);
  });
  test('rejects cap not divisible by limit', () => {
    expect(() => encodePEtch({ ticker: 'X', decimals: 0, capAmount: 100n, mintLimit: 30n, mintStartHeight: 100, mintEndHeight: 200 })).toThrow();
  });
});
