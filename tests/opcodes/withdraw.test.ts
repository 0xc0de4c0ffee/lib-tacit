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

  test('decode rejects denomination 0', () => {
    const p = encodeWithdraw({
      assetId: zeroFill(32), denomination: 1000n,
      merkleRoot: zeroFill(32), nullifierHash: zeroFill(32),
      recipientCommitment: zeroFill(33), rLeaf: zeroFill(32),
      bindHash: zeroFill(32), proof: zeroFill(4),
    });
    const bad = new Uint8Array(p);
    for (let i = 33; i < 41; i++) bad[i] = 0;
    expect(decodeWithdraw(bad)).toBeNull();
  });

  test('rejects zero-length proof', () => {
    const p = encodeWithdraw({
      assetId: zeroFill(32), denomination: 1000n,
      merkleRoot: zeroFill(32), nullifierHash: zeroFill(32),
      recipientCommitment: zeroFill(33), rLeaf: zeroFill(32),
      bindHash: zeroFill(32), proof: zeroFill(4),
    });
    const bad = new Uint8Array(p);
    // Zero out the proof_len field at offset 202 (1+32+8+32+32+33+32+32)
    bad[202] = 0;
    bad[203] = 0;
    expect(decodeWithdraw(bad)).toBeNull();
  });

  test('rejects wrong opcode', () => {
    const p = encodeWithdraw({
      assetId: zeroFill(32), denomination: 100n,
      merkleRoot: zeroFill(32), nullifierHash: zeroFill(32),
      recipientCommitment: zeroFill(33), rLeaf: zeroFill(32),
      bindHash: zeroFill(32), proof: zeroFill(10),
    });
    p[0] = 0x00;
    expect(decodeWithdraw(p)).toBeNull();
  });

  test('rejects wrong-length merkleRoot', () => {
    expect(() => encodeWithdraw({
      assetId: zeroFill(32), denomination: 100n,
      merkleRoot: zeroFill(31), nullifierHash: zeroFill(32),
      recipientCommitment: zeroFill(33), rLeaf: zeroFill(32),
      bindHash: zeroFill(32), proof: zeroFill(10),
    })).toThrow();
  });

  test('rejects empty payload', () => {
    expect(decodeWithdraw(new Uint8Array())).toBeNull();
  });
});
