// Pinned cross-implementation vectors from tacit-specs/tests/vectors.test.mjs
import { describe, test, expect } from 'bun:test';
import { hexToBytes, bytesToHex, concatBytes } from '@noble/hashes/utils';
import * as secp from '@noble/secp256k1';
import {
  deriveBlinding, deriveChangeBlinding, deriveEtchBlinding,
  deriveAmountKeystreamECDH, deriveAmountKeystreamSelf, deriveEtchAmountKeystream,
  encryptAmount, decryptAmount,
} from '../../src/crypto/ecdh.js';
import { assetIdFor, computeKernelMsg } from '../../src/crypto/kernel.js';
import { pedersenCommit, pointToBytes } from '../../src/crypto/pedersen.js';
import { reverseBytes, buildAnchor } from '../../src/transaction/utils.js';

const SK_A = hexToBytes('0101010101010101010101010101010101010101010101010101010101010101');
const SK_B = hexToBytes('0202020202020202020202020202020202020202020202020202020202020202');
const PK_B = secp.getPublicKey(SK_B, true);
const TXID_FIXED = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const TXID_KERNEL_INPUT = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

const voutLE = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
};
const ANCHOR = concatBytes(
  reverseBytes(hexToBytes('11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff')),
  voutLE(7),
);

describe('Pinned vectors (tacit-specs/tests/vectors.test.mjs)', () => {
  test('assetIdFor(TXID_FIXED, 0)', () => {
    expect(bytesToHex(assetIdFor(TXID_FIXED, 0))).toBe(
      'dc68903e351194b48429d86b4a9cc499ae0dd1a726616a56bf33b70485037a5b',
    );
  });

  test('assetIdFor(TXID_FIXED, 1)', () => {
    expect(bytesToHex(assetIdFor(TXID_FIXED, 1))).toBe(
      '7f51d9924eef5ca44b0b445903bdf089ddf7a9bd4881f97a0ac90e4fc196a401',
    );
  });

  test('buildAnchor pinned bytes', () => {
    expect(bytesToHex(buildAnchor(
      '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
      7,
    ))).toBe('ffeeddccbbaa00998877665544332211ffeeddccbbaa0099887766554433221107000000');
  });

  test('deriveBlinding(SK_A, PK_B, anchor, 0)', () => {
    const b = deriveBlinding(SK_A, PK_B, ANCHOR, 0);
    expect(b.toString(16).padStart(64, '0')).toBe(
      '38919d697d9d3dbfce07914e56e51d9e15f2c10510facbf1eebd747759b2de0b',
    );
  });

  test('deriveBlinding symmetric', () => {
    const PK_A = secp.getPublicKey(SK_A, true);
    expect(deriveBlinding(SK_A, PK_B, ANCHOR, 0)).toBe(deriveBlinding(SK_B, PK_A, ANCHOR, 0));
  });

  test('deriveChangeBlinding(SK_A, anchor, 1)', () => {
    expect(deriveChangeBlinding(SK_A, ANCHOR, 1).toString(16).padStart(64, '0')).toBe(
      '0698643988efaf27fa35d08ee78dc162457e74a88cad96f382121009c0fd6953',
    );
  });

  test('deriveEtchBlinding(SK_A, anchor)', () => {
    expect(deriveEtchBlinding(SK_A, ANCHOR).toString(16).padStart(64, '0')).toBe(
      '0aa637caf0e51ef750c94423e4a717a76518c5c66230ebae7d9f3d6d760fdbe9',
    );
  });

  test('amount keystreams pinned', () => {
    expect(bytesToHex(deriveAmountKeystreamECDH(SK_A, PK_B, ANCHOR, 0))).toBe('b1697b0b93335da7');
    expect(bytesToHex(deriveAmountKeystreamSelf(SK_A, ANCHOR, 1))).toBe('429ac902e11b2350');
    expect(bytesToHex(deriveEtchAmountKeystream(SK_A, ANCHOR))).toBe('ceb9e5269c17d71b');
  });

  test('encryptAmount(1000, ksECDH) pinned', () => {
    const ks = deriveAmountKeystreamECDH(SK_A, PK_B, ANCHOR, 0);
    expect(bytesToHex(encryptAmount(1000n, ks))).toBe('596a7b0b93335da7');
  });

  test('decrypt round-trips encrypt', () => {
    const ks = deriveAmountKeystreamECDH(SK_A, PK_B, ANCHOR, 0);
    expect(decryptAmount(encryptAmount(0xdeadbeefn, ks), ks)).toBe(0xdeadbeefn);
  });

  test('computeKernelMsg pinned', () => {
    const aid = assetIdFor(TXID_FIXED, 0);
    const inputOps = [{ txid: TXID_KERNEL_INPUT, vout: 3 }];
    const outputCs = [pointToBytes(pedersenCommit(500n, 42n))];
    expect(bytesToHex(computeKernelMsg(aid, inputOps, outputCs))).toBe(
      'bf51493e1c30a34c19a97b671743d3764684a885767b6e097b8222649889b695',
    );
  });
});
