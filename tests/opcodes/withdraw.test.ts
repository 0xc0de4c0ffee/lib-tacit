import { describe, test, expect } from 'bun:test';
import { encodeWithdraw, decodeWithdraw } from '../../src/opcodes/withdraw.js';
function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
describe('T_WITHDRAW (0x2A)', () => {
  test('round-trip', () => {
    const p = encodeWithdraw({
      assetId: zeroFill(32), denomination: 1000n,
      merkleRoot: zeroFill(32, 0xaa), nullifierHash: zeroFill(32, 0xbb),
      recipientCommitment: zeroFill(33, 0xcc), rLeaf: zeroFill(32, 0xdd),
      bindHash: zeroFill(32, 0xee), proof: zeroFill(200),
    });
    const d = decodeWithdraw(p);
    expect(d?.denomination).toBe(1000n);
  });
  test('rejects truncated payload', () => {
    expect(decodeWithdraw(new Uint8Array(10))).toBeNull();
  });
});
