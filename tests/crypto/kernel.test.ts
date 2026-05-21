import { describe, test, expect } from 'bun:test';
import { bytesToHex } from '@noble/hashes/utils';
import * as secp from '@noble/secp256k1';
import {
  assetIdFor, computeKernelMsg, signKernel, verifyKernel, computeExcessPoint,
  dropKernelMsg, dropReclaimMsg,
} from '../../src/crypto/kernel.js';
import { pedersenCommit, pointToBytes, modN, randomScalar } from '../../src/crypto/pedersen.js';
import { deriveBlinding, deriveChangeBlinding } from '../../src/crypto/ecdh.js';
import { buildAnchor } from '../../src/transaction/utils.js';

function keypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  return { priv, pub: secp.getPublicKey(priv, true) };
}

describe('Asset ID', () => {
  test('deterministic', () => {
    const txid = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    expect(bytesToHex(assetIdFor(txid, 0))).toBe(bytesToHex(assetIdFor(txid, 0)));
  });

  test('differs on vout', () => {
    const txid = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    expect(bytesToHex(assetIdFor(txid, 0))).not.toBe(bytesToHex(assetIdFor(txid, 1)));
  });

  test('pinned vector (matches tacit-specs/tests/vectors.test.mjs)', () => {
    const TXID_FIXED = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    const aid = assetIdFor(TXID_FIXED, 0);
    expect(bytesToHex(aid)).toBe('dc68903e351194b48429d86b4a9cc499ae0dd1a726616a56bf33b70485037a5b');
  });
});

describe('Kernel message', () => {
  test('pinned bytes', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 3 }];
    const outputCs = [pointToBytes(pedersenCommit(500n, 42n))];
    expect(bytesToHex(computeKernelMsg(aid, inputOps, outputCs))).toBe(
      'bf51493e1c30a34c19a97b671743d3764684a885767b6e097b8222649889b695',
    );
  });

  test('differs when asset changes', () => {
    const aid1 = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const aid2 = assetIdFor('ffeeddccbbaa00998877665544332211ffeeddccbbaa00998877665544332211', 0);
    const i = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const o = [pointToBytes(pedersenCommit(100n, 7n))];
    expect(bytesToHex(computeKernelMsg(aid1, i, o))).not.toBe(bytesToHex(computeKernelMsg(aid2, i, o)));
  });

  test('differs when output order changes', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const i = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const c1 = pointToBytes(pedersenCommit(500n, 42n));
    const c2 = pointToBytes(pedersenCommit(700n, 99n));
    expect(bytesToHex(computeKernelMsg(aid, i, [c1, c2]))).not.toBe(
      bytesToHex(computeKernelMsg(aid, i, [c2, c1])),
    );
  });
});

describe('Kernel signature', () => {
  test('balanced CXFER verifies', () => {
    const sender = keypair(), recip = keypair();
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const anchor = buildAnchor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inBlindings = [randomScalar(), randomScalar()];
    const inputCs = [pointToBytes(pedersenCommit(200n, inBlindings[0]!)), pointToBytes(pedersenCommit(300n, inBlindings[1]!))];
    const rRecip = deriveBlinding(sender.priv, recip.pub, anchor, 0);
    const rChange = deriveChangeBlinding(sender.priv, anchor, 1);
    const outCs = [pointToBytes(pedersenCommit(350n, rRecip)), pointToBytes(pedersenCommit(150n, rChange))];
    const excess = modN(rRecip + rChange - (inBlindings[0]! + inBlindings[1]!));
    const inputOps = [
      { txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 },
      { txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 1 },
    ];
    const msg = computeKernelMsg(aid, inputOps, outCs);
    const sig = signKernel(msg, excess);
    expect(verifyKernel(sig, aid, inputOps, inputCs, outCs)).toBe(true);
  });

  test('rejects invalid commitment bytes without throwing', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const bad = new Uint8Array(33).fill(0xff);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    expect(verifyKernel(new Uint8Array(64), aid, inputOps, [bad], [bad])).toBe(false);
    expect(computeExcessPoint([bad], [bad])).toBeNull();
  });

  test('rejects mismatched input outpoints vs commitments', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const c = pointToBytes(pedersenCommit(100n, 1n));
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    expect(verifyKernel(new Uint8Array(64).fill(1), aid, inputOps, [c], [c, c])).toBe(false);
  });

  test('BURN path with burnedAmount verifies when balanced', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inBlind = randomScalar();
    const inC = pointToBytes(pedersenCommit(1000n, inBlind));
    const rOut = randomScalar();
    const burned = 400n;
    const outAmt = 600n;
    const outC = pointToBytes(pedersenCommit(outAmt, rOut));
    const excess = modN(rOut - inBlind);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const msg = computeKernelMsg(aid, inputOps, [outC], burned);
    const sig = signKernel(msg, excess);
    expect(verifyKernel(sig, aid, inputOps, [inC], [outC], burned)).toBe(true);
  });

  test('degenerate E\' (full burn, zero blinding) rejects', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const amt = 500n;
    const inC = pointToBytes(pedersenCommit(amt, 0n));
    const burned = amt;
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const ePrime = computeExcessPoint([], [inC], burned);
    expect(ePrime?.equals(pedersenCommit(0n, 0n))).toBe(true);
    expect(verifyKernel(new Uint8Array(64).fill(1), aid, inputOps, [inC], [], burned)).toBe(false);
  });

  test('unbalanced CXFER rejects', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inBlinding = randomScalar();
    const inputCs = [pointToBytes(pedersenCommit(100n, inBlinding))];
    const r1 = randomScalar(), r2 = randomScalar();
    const outCs = [pointToBytes(pedersenCommit(700n, r1)), pointToBytes(pedersenCommit(300n, r2))];
    const excess = modN(r1 + r2 - inBlinding);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const msg = computeKernelMsg(aid, inputOps, outCs);
    const sig = signKernel(msg, excess);
    expect(verifyKernel(sig, aid, inputOps, inputCs, outCs)).toBe(false);
  });

  test('Kernel sig replay across different inputs rejects', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const rIn = randomScalar();
    const rOut = randomScalar();
    const cIn = pointToBytes(pedersenCommit(100n, rIn));
    const cOut = pointToBytes(pedersenCommit(100n, rOut));
    const inputOps1 = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const inputOps2 = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 1 }];
    const excess = modN(rOut - rIn);
    const msg1 = computeKernelMsg(aid, inputOps1, [cOut]);
    const sig = signKernel(msg1, excess);
    // signature for msg1 should not verify under msg2's context (different input vout)
    expect(verifyKernel(sig, aid, inputOps2, [cIn], [cOut])).toBe(false);
  });

  test('Kernel sig replay across different output commitments rejects', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const inputOps = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const rIn = randomScalar();
    const rOut = randomScalar();
    const cIn = pointToBytes(pedersenCommit(100n, rIn));
    const cOut1 = pointToBytes(pedersenCommit(100n, rOut));
    const cOut2 = pointToBytes(pedersenCommit(200n, rOut));
    const excess = modN(rOut - rIn);
    const msg1 = computeKernelMsg(aid, inputOps, [cOut1]);
    const sig = signKernel(msg1, excess);
    // signature for msg1 should not verify with different output commitment
    expect(verifyKernel(sig, aid, inputOps, [cIn], [cOut2])).toBe(false);
  });

  test('Different input vout produces different kernel msg', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const c = pointToBytes(pedersenCommit(100n, 42n));
    const ops1 = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const ops2 = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 1 }];
    expect(bytesToHex(computeKernelMsg(aid, ops1, [c]))).not.toBe(bytesToHex(computeKernelMsg(aid, ops2, [c])));
  });

  test('CXFER msg ≠ BURN msg with same params (burned=0 vs 1)', () => {
    const aid = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const c = pointToBytes(pedersenCommit(100n, 7n));
    const ops = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const msgNoBurn = computeKernelMsg(aid, ops, [c]);
    const msgWithBurn = computeKernelMsg(aid, ops, [c], 1n);
    expect(bytesToHex(msgNoBurn)).not.toBe(bytesToHex(msgWithBurn));
  });
});

describe('DROP kernel messages', () => {
  test('dropKernelMsg with valid params', () => {
    const assetId = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const merkleRoot = new Uint8Array(32).fill(0xab);
    const inputs = [{ txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', vout: 0 }];
    const msg = dropKernelMsg({
      assetId, capAmount: 10000n, perClaim: 100n,
      merkleRoot, expiryHeight: 850000,
      assetInputCount: 1, assetInputs: inputs,
    });
    expect(msg.length).toBe(32);
  });

  test('dropReclaimMsg with valid params', () => {
    const reclaimDropId = new Uint8Array(32).fill(0xaa);
    const assetId = assetIdFor('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 0);
    const msg = dropReclaimMsg({ reclaimDropId, assetId, capAmount: 5000n });
    expect(msg.length).toBe(32);
  });
});
