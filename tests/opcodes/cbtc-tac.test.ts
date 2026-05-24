import { describe, test, expect } from 'bun:test';
import { hexToBytes } from '@noble/hashes/utils';
import { H_HEX } from '../../src/constants/generators.js';
import {
  encodeCBtcTacDeposit, decodeCBtcTacDeposit,
  encodeCBtcTacWithdraw, decodeCBtcTacWithdraw,
  encodeCBtcTacForceClose, decodeCBtcTacForceClose,
  encodeCTacLienClaim, decodeCTacLienClaim,
  encodeCTacLienSplit, decodeCTacLienSplit,
  encodeCBtcTacDepositAtomic, decodeCBtcTacDepositAtomic,
  encodeCBtcTacWithdrawAtomic, decodeCBtcTacWithdrawAtomic,
  encodeCBtcTacTopUp, decodeCBtcTacTopUp,
  encodeCBtcTacBondRelease, decodeCBtcTacBondRelease,
} from '../../src/opcodes/cbtc-tac.js';

const P = hexToBytes(H_HEX);

function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }

describe('T_CBTC_TAC_DEPOSIT (0x49)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacDeposit({
      networkTag: 0, targetLeafHash: zeroFill(32), slotDenomSats: 1000n,
      bondAmountTAC: 500n, bondSourceOutpoint: zeroFill(36), bondCommit: P,
      depositorRecoveryCommit: P, mintAmount: 1000n, mintRecipientCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(10),
    });
    const d = decodeCBtcTacDeposit(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-deposit');
    expect(d!.mintAmount).toBe(1000n);
    expect(d!.slotDenomSats).toBe(1000n);
    expect(d!.networkTag).toBe(0);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCBtcTacDeposit(new Uint8Array([0x4A, ...zeroFill(226)]))).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacDeposit({
      networkTag: 1, targetLeafHash: zeroFill(32), slotDenomSats: 2000n,
      bondAmountTAC: 500n, bondSourceOutpoint: zeroFill(36), bondCommit: P,
      depositorRecoveryCommit: P, mintAmount: 2000n, mintRecipientCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(10),
    });
    expect(decodeCBtcTacDeposit(p.slice(0, -5))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacDeposit(new Uint8Array())).toBeNull();
  });
});

describe('T_CBTC_TAC_WITHDRAW (0x4A)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacWithdraw({
      networkTag: 1, targetLeafHash: zeroFill(32),
      burnNullifiers: [zeroFill(32)], burnCommits: [P],
      burnAmount: 1000n, insuranceClaimTAC: 100n,
      burnBalanceProof: zeroFill(10), bondReturnCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(20),
    });
    const d = decodeCBtcTacWithdraw(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-withdraw');
    expect(d!.burnCount).toBe(1);
    expect(d!.burnAmount).toBe(1000n);
    expect(d!.insuranceClaimTAC).toBe(100n);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCBtcTacWithdraw(new Uint8Array([0x49, 0x00, ...zeroFill(33)]))).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacWithdraw({
      networkTag: 0, targetLeafHash: zeroFill(32),
      burnNullifiers: [zeroFill(32)], burnCommits: [P],
      burnAmount: 500n, insuranceClaimTAC: 0n,
      burnBalanceProof: zeroFill(10), bondReturnCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(15),
    });
    expect(decodeCBtcTacWithdraw(p.slice(0, -3))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacWithdraw(new Uint8Array())).toBeNull();
  });
});

describe('T_CBTC_TAC_FORCE_CLOSE (0x4B)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacForceClose({
      networkTag: 2, targetLeafHash: zeroFill(32),
      liquidatorPayoutPk: P, ammSwapMinBtcOut: 500n,
      bindHash: zeroFill(32),
    });
    const d = decodeCBtcTacForceClose(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-force-close');
    expect(d!.ammSwapMinBtcOut).toBe(500n);
    expect(d!.networkTag).toBe(2);
  });
  test('rejects wrong opcode', () => {
    const p = encodeCBtcTacForceClose({
      networkTag: 0, targetLeafHash: zeroFill(32),
      liquidatorPayoutPk: P, ammSwapMinBtcOut: 0n,
      bindHash: zeroFill(32),
    });
    const bad = new Uint8Array(p); bad[0] = 0x4A;
    expect(decodeCBtcTacForceClose(bad)).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacForceClose({
      networkTag: 0, targetLeafHash: zeroFill(32),
      liquidatorPayoutPk: P, ammSwapMinBtcOut: 0n,
      bindHash: zeroFill(32),
    });
    expect(decodeCBtcTacForceClose(p.slice(0, -1))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacForceClose(new Uint8Array())).toBeNull();
  });
});

describe('T_CTAC_LIEN_CLAIM (0x4C)', () => {
  test('round-trip', () => {
    const p = encodeCTacLienClaim({
      networkTag: 0,
      shareNullifiers: [zeroFill(32), zeroFill(32)],
      shareCommits: [P, P],
      shareBurnAmount: 2000n,
      shareBalanceProof: zeroFill(12),
      claimTAC: 500n, recipientCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(20),
    });
    const d = decodeCTacLienClaim(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('ctac-lien-claim');
    expect(d!.shareCount).toBe(2);
    expect(d!.shareBurnAmount).toBe(2000n);
    expect(d!.claimTAC).toBe(500n);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCTacLienClaim(new Uint8Array([0x4B, 0x00, 0x01, ...zeroFill(33)]))).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCTacLienClaim({
      networkTag: 1, shareNullifiers: [zeroFill(32)], shareCommits: [P],
      shareBurnAmount: 1000n, shareBalanceProof: zeroFill(8),
      claimTAC: 300n, recipientCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(10),
    });
    expect(decodeCTacLienClaim(p.slice(0, -2))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCTacLienClaim(new Uint8Array())).toBeNull();
  });
});

describe('T_CTAC_LIEN_SPLIT (0x4F)', () => {
  test('round-trip', () => {
    const p = encodeCTacLienSplit({
      networkTag: 0, positionLeafHash: zeroFill(32),
      sourceOutpoint: zeroFill(36),
      outputAmounts: [500n, 300n],
      outputBlindings: [zeroFill(32), zeroFill(32)],
      outputCommits: [P, P],
      lienInheritIndex: 0, depositorSig: zeroFill(64),
      bindHash: zeroFill(32),
    });
    const d = decodeCTacLienSplit(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('ctac-lien-split');
    expect(d!.outputCount).toBe(2);
    expect(d!.outputAmounts).toEqual([500n, 300n]);
    expect(d!.lienInheritIndex).toBe(0);
  });
  test('rejects wrong opcode', () => {
    const p = encodeCTacLienSplit({
      networkTag: 0, positionLeafHash: zeroFill(32),
      sourceOutpoint: zeroFill(36),
      outputAmounts: [500n, 300n],
      outputBlindings: [zeroFill(32), zeroFill(32)],
      outputCommits: [P, P],
      lienInheritIndex: 0, depositorSig: zeroFill(64),
      bindHash: zeroFill(32),
    });
    const bad = new Uint8Array(p); bad[0] = 0x4E;
    expect(decodeCTacLienSplit(bad)).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCTacLienSplit({
      networkTag: 1, positionLeafHash: zeroFill(32),
      sourceOutpoint: zeroFill(36),
      outputAmounts: [100n, 200n],
      outputBlindings: [zeroFill(32), zeroFill(32)],
      outputCommits: [P, P],
      lienInheritIndex: 0, depositorSig: zeroFill(64),
      bindHash: zeroFill(32),
    });
    expect(decodeCTacLienSplit(p.slice(0, -10))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCTacLienSplit(new Uint8Array())).toBeNull();
  });
});

describe('T_CBTC_TAC_DEPOSIT_ATOMIC (0x57)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacDepositAtomic({
      networkTag: 0, targetLeafHash: zeroFill(32),
      slotDenomSats: 1000n, poolId: zeroFill(32),
      deltaCbtcZk: 100n, deltaTac: 50n, shareAmount: 950n,
      cbtcZkInputOutpoint: zeroFill(36), cbtcZkInputCommit: P,
      tacInputOutpoint: zeroFill(36), tacInputCommit: P,
      lpShareCommit: P, depositorRecoveryCommit: P,
      mintAmount: 1000n, mintRecipientCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(30),
    });
    const d = decodeCBtcTacDepositAtomic(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-deposit-atomic');
    expect(d!.mintAmount).toBe(1000n);
    expect(d!.deltaCbtcZk).toBe(100n);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCBtcTacDepositAtomic(new Uint8Array([0x58, ...zeroFill(200)]))).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacDepositAtomic({
      networkTag: 1, targetLeafHash: zeroFill(32),
      slotDenomSats: 2000n, poolId: zeroFill(32),
      deltaCbtcZk: 200n, deltaTac: 100n, shareAmount: 1900n,
      cbtcZkInputOutpoint: zeroFill(36), cbtcZkInputCommit: P,
      tacInputOutpoint: zeroFill(36), tacInputCommit: P,
      lpShareCommit: P, depositorRecoveryCommit: P,
      mintAmount: 2000n, mintRecipientCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(20),
    });
    expect(decodeCBtcTacDepositAtomic(p.slice(0, -4))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacDepositAtomic(new Uint8Array())).toBeNull();
  });
});

describe('T_CBTC_TAC_WITHDRAW_ATOMIC (0x58)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacWithdrawAtomic({
      networkTag: 0, targetLeafHash: zeroFill(32),
      slotDenomSats: 1000n,
      burnNullifiers: [zeroFill(32)], burnCommits: [P],
      burnAmount: 1000n, lpShareAmount: 500n,
      recvCbtcZkCommit: P, recvTacCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(15),
    });
    const d = decodeCBtcTacWithdrawAtomic(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-withdraw-atomic');
    expect(d!.burnAmount).toBe(1000n);
    expect(d!.lpShareAmount).toBe(500n);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCBtcTacWithdrawAtomic(new Uint8Array([0x57, ...zeroFill(200)]))).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacWithdrawAtomic({
      networkTag: 1, targetLeafHash: zeroFill(32),
      slotDenomSats: 500n,
      burnNullifiers: [zeroFill(32)], burnCommits: [P],
      burnAmount: 500n, lpShareAmount: 200n,
      recvCbtcZkCommit: P, recvTacCommit: P,
      bindHash: zeroFill(32), proof: zeroFill(10),
    });
    expect(decodeCBtcTacWithdrawAtomic(p.slice(0, -2))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacWithdrawAtomic(new Uint8Array())).toBeNull();
  });
});

describe('T_CBTC_TAC_TOP_UP (0x59)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacTopUp({
      networkTag: 0, targetLeafHash: zeroFill(32),
      oldBondOutpoint: zeroFill(36), oldBondCommit: P,
      oldBondAmount: 1000n,
      addOutpoints: [zeroFill(36), zeroFill(36)],
      addCommits: [P, P],
      addAmounts: [500n, 300n],
      newBondCommit: P, newBondAmount: 1800n,
      newBondBlinding: zeroFill(32),
      depositorSig: zeroFill(64), bindHash: zeroFill(32),
    });
    const d = decodeCBtcTacTopUp(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-top-up');
    expect(d!.addCount).toBe(2);
    expect(d!.newBondAmount).toBe(1800n);
    expect(d!.oldBondAmount).toBe(1000n);
  });
  test('rejects wrong opcode', () => {
    expect(decodeCBtcTacTopUp(new Uint8Array([0x5A, ...zeroFill(100)]))).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacTopUp({
      networkTag: 1, targetLeafHash: zeroFill(32),
      oldBondOutpoint: zeroFill(36), oldBondCommit: P,
      oldBondAmount: 500n,
      addOutpoints: [zeroFill(36)],
      addCommits: [P],
      addAmounts: [300n],
      newBondCommit: P, newBondAmount: 800n,
      newBondBlinding: zeroFill(32),
      depositorSig: zeroFill(64), bindHash: zeroFill(32),
    });
    expect(decodeCBtcTacTopUp(p.slice(0, -5))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacTopUp(new Uint8Array())).toBeNull();
  });
});

describe('T_CBTC_TAC_BOND_RELEASE (0x5A)', () => {
  test('round-trip', () => {
    const p = encodeCBtcTacBondRelease({
      networkTag: 0, targetLeafHash: zeroFill(32),
      oldBondOutpoint: zeroFill(36), oldBondCommit: P,
      oldBondAmount: 1000n,
      newBondCommit: P, newBondAmount: 600n,
      newBondBlinding: zeroFill(32),
      releaseCommit: P, releaseAmount: 400n,
      releaseBlinding: zeroFill(32), recipientPk: P,
      depositorSig: zeroFill(64), bindHash: zeroFill(32),
    });
    const d = decodeCBtcTacBondRelease(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('cbtc-tac-bond-release');
    expect(d!.newBondAmount + d!.releaseAmount).toBe(1000n);
    expect(d!.oldBondAmount).toBe(1000n);
  });
  test('rejects wrong opcode', () => {
    const p = encodeCBtcTacBondRelease({
      networkTag: 0, targetLeafHash: zeroFill(32),
      oldBondOutpoint: zeroFill(36), oldBondCommit: P,
      oldBondAmount: 1000n, newBondCommit: P, newBondAmount: 600n,
      newBondBlinding: zeroFill(32),
      releaseCommit: P, releaseAmount: 400n,
      releaseBlinding: zeroFill(32), recipientPk: P,
      depositorSig: zeroFill(64), bindHash: zeroFill(32),
    });
    const bad = new Uint8Array(p); bad[0] = 0x59;
    expect(decodeCBtcTacBondRelease(bad)).toBeNull();
  });
  test('rejects truncated', () => {
    const p = encodeCBtcTacBondRelease({
      networkTag: 1, targetLeafHash: zeroFill(32),
      oldBondOutpoint: zeroFill(36), oldBondCommit: P,
      oldBondAmount: 500n, newBondCommit: P, newBondAmount: 300n,
      newBondBlinding: zeroFill(32),
      releaseCommit: P, releaseAmount: 200n,
      releaseBlinding: zeroFill(32), recipientPk: P,
      depositorSig: zeroFill(64), bindHash: zeroFill(32),
    });
    expect(decodeCBtcTacBondRelease(p.slice(0, -1))).toBeNull();
  });
  test('rejects empty payload', () => {
    expect(decodeCBtcTacBondRelease(new Uint8Array())).toBeNull();
  });
});
