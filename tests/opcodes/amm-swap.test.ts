import { describe, test, expect } from 'bun:test';
import * as secp from '@noble/secp256k1';
import { hexToBytes } from '@noble/hashes/utils';
import {
  encodeSwapVar, decodeSwapVar,
  encodeSwapRoute, decodeSwapRoute,
  lexCanonicalAssetPair,
  swapVarCurveDeltaOut,
  ammDerivePoolId,
} from '../../src/opcodes/amm-swap.js';

function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }

const PK1 = secp.getPublicKey(new Uint8Array(32).fill(1), true);
const PK2 = secp.getPublicKey(new Uint8Array(32).fill(2), true);
const PK3 = secp.getPublicKey(new Uint8Array(32).fill(3), true);
const PK4 = secp.getPublicKey(new Uint8Array(32).fill(4), true);
const PK5 = secp.getPublicKey(new Uint8Array(32).fill(5), true);

const validSwapVar = () => ({
  poolId: zeroFill(32),
  direction: 0,
  R_A_pre: 1000000n, R_B_pre: 1000000n,
  deltaIn: 1000n, deltaInMin: 1000n, deltaInMax: 1000n,
  deltaOut: 900n, minOut: 900n, tipAmount: 0n, tipAsset: 0,
  expiryHeight: 100000,
  traderPubkey: PK1, cInSecp: PK2, cChangeOrSentinel: zeroFill(33), cReceiptSecp: PK4,
  rReceipt: zeroFill(32, 6),
  rangeProof: zeroFill(100, 7),
  kernelSig: zeroFill(64, 8), intentSig: zeroFill(64, 9),
});

const validSwapRoute = () => ({
  traderInputAssetId: zeroFill(32, 1),
  traderOutputAssetId: zeroFill(32, 2),
  minOut: 800n,
  expiryHeight: 100000,
  traderPubkey: PK1,
  hops: [
    { poolId: zeroFill(32, 10), direction: 0, feeBps: 30, R_A_pre: 1000000n, R_B_pre: 1000000n, deltaANetMag: 1000n, deltaBNetMag: 900n },
    { poolId: zeroFill(32, 11), direction: 1, feeBps: 50, R_A_pre: 2000000n, R_B_pre: 500000n, deltaANetMag: 800n, deltaBNetMag: 1000n },
  ],
  traderInputTxidBE: zeroFill(32, 20),
  traderInputVout: 0,
  cInSecp: PK2,
  cReceiptSecp: PK3,
  rReceipt: zeroFill(32, 6),
  rangeProof: zeroFill(100, 7),
  kernelSig: zeroFill(64, 8),
  intentSig: zeroFill(64, 9),
});

describe('T_SWAP_VAR (0x32)', () => {
  test('round-trip swap var', () => {
    const input = validSwapVar();
    const encoded = encodeSwapVar(input);
    const decoded = decodeSwapVar(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.direction).toBe(0);
    expect(decoded!.poolId).toEqual(zeroFill(32));
    expect(decoded!.R_A_pre).toBe(1000000n);
    expect(decoded!.R_B_pre).toBe(1000000n);
    expect(decoded!.deltaIn).toBe(1000n);
    expect(decoded!.deltaInMin).toBe(1000n);
    expect(decoded!.deltaInMax).toBe(1000n);
    expect(decoded!.deltaOut).toBe(900n);
    expect(decoded!.minOut).toBe(900n);
    expect(decoded!.tipAmount).toBe(0n);
    expect(decoded!.tipAsset).toBe(0);
    expect(decoded!.expiryHeight).toBe(100000);
    expect(decoded!.traderPubkey).toEqual(PK1);
    expect(decoded!.cInSecp).toEqual(PK2);
    expect(decoded!.cChangeOrSentinel).toEqual(zeroFill(33));
    expect(decoded!.cReceiptSecp).toEqual(PK4);
    expect(decoded!.kernelSig).toEqual(zeroFill(64, 8));
    expect(decoded!.intentSig).toEqual(zeroFill(64, 9));
  });

  test('swap var direction 1 with tip', () => {
    const input = validSwapVar();
    input.direction = 1;
    input.tipAmount = 10n;
    input.tipAsset = 1;
    input.cChangeOrSentinel = PK3;
    const decoded = decodeSwapVar(encodeSwapVar(input));
    expect(decoded).not.toBeNull();
    expect(decoded!.direction).toBe(1);
    expect(decoded!.tipAmount).toBe(10n);
    expect(decoded!.tipAsset).toBe(1);
    expect(decoded!.cChangeOrSentinel).toEqual(PK3);
  });

  test('rejects wrong opcode', () => {
    expect(decodeSwapVar(new Uint8Array([0x33, ...zeroFill(300)]))).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSwapVar(new Uint8Array([0x32, ...zeroFill(10)]))).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSwapVar(new Uint8Array())).toBeNull();
  });

  test('rejects trailing bytes', () => {
    const encoded = encodeSwapVar(validSwapVar());
    const padded = new Uint8Array([...encoded, 0x00]);
    expect(decodeSwapVar(padded)).toBeNull();
  });

  test('rejects bad direction', () => {
    expect(() => encodeSwapVar({ ...validSwapVar(), direction: 2 })).toThrow();
  });

  test('rejects bad tipAsset', () => {
    expect(() => encodeSwapVar({ ...validSwapVar(), tipAsset: 3 })).toThrow();
  });
});

describe('T_SWAP_ROUTE (0x33)', () => {
  test('round-trip 2-hop route', () => {
    const input = validSwapRoute();
    const encoded = encodeSwapRoute(input);
    const decoded = decodeSwapRoute(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.nHops).toBe(2);
    expect(decoded!.traderInputAssetId).toEqual(zeroFill(32, 1));
    expect(decoded!.traderOutputAssetId).toEqual(zeroFill(32, 2));
    expect(decoded!.minOut).toBe(800n);
    expect(decoded!.expiryHeight).toBe(100000);
    expect(decoded!.traderPubkey).toEqual(PK1);
    expect(decoded!.traderInputTxidBE).toEqual(zeroFill(32, 20));
    expect(decoded!.traderInputVout).toBe(0);
    expect(decoded!.cInSecp).toEqual(PK2);
    expect(decoded!.cReceiptSecp).toEqual(PK3);
    expect(decoded!.kernelSig).toEqual(zeroFill(64, 8));
    expect(decoded!.intentSig).toEqual(zeroFill(64, 9));
    expect(decoded!.hops.length).toBe(2);
    expect(decoded!.hops[0].poolId).toEqual(zeroFill(32, 10));
    expect(decoded!.hops[0].direction).toBe(0);
    expect(decoded!.hops[0].feeBps).toBe(30);
    expect(decoded!.hops[0].R_A_pre).toBe(1000000n);
    expect(decoded!.hops[0].deltaANetMag).toBe(1000n);
    expect(decoded!.hops[0].deltaBNetMag).toBe(900n);
    expect(decoded!.hops[1].direction).toBe(1);
    expect(decoded!.hops[1].feeBps).toBe(50);
  });

  test('rejects wrong opcode', () => {
    expect(decodeSwapRoute(new Uint8Array([0x32, ...zeroFill(500)]))).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSwapRoute(new Uint8Array([0x33, ...zeroFill(10)]))).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSwapRoute(new Uint8Array())).toBeNull();
  });

  test('rejects trailing bytes', () => {
    const encoded = encodeSwapRoute(validSwapRoute());
    const padded = new Uint8Array([...encoded, 0x00]);
    expect(decodeSwapRoute(padded)).toBeNull();
  });

  test('rejects single hop', () => {
    const input = validSwapRoute();
    input.hops = [input.hops[0]!];
    expect(() => encodeSwapRoute(input)).toThrow();
  });

  test('rejects same input/output asset ids', () => {
    const input = validSwapRoute();
    input.traderOutputAssetId = zeroFill(32, 1);
    const encoded = encodeSwapRoute(input);
    expect(decodeSwapRoute(encoded)).toBeNull();
  });
});

describe('lexCanonicalAssetPair', () => {
  test('sorts lexicographically', () => {
    const low = zeroFill(32, 1);
    const high = zeroFill(32, 2);
    const [a, b] = lexCanonicalAssetPair(high, low);
    expect(a).toEqual(low);
    expect(b).toEqual(high);
  });

  test('accepts hex strings', () => {
    const [a, b] = lexCanonicalAssetPair(
      'ffeeddccbbaa00998877665544332211ffeeddccbbaa00998877665544332211',
      '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    );
    expect(a).toEqual(hexToBytes('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'));
    expect(b).toEqual(hexToBytes('ffeeddccbbaa00998877665544332211ffeeddccbbaa00998877665544332211'));
  });

  test('throws on identical assets', () => {
    const id = zeroFill(32);
    expect(() => lexCanonicalAssetPair(id, id)).toThrow();
  });
});

describe('swapVarCurveDeltaOut', () => {
  test('direction 0: swap A for B', () => {
    const result = swapVarCurveDeltaOut(0, 1000000n, 1000000n, 1000n, 0);
    expect(result.deltaOut).toBe(999n);
    expect(result.raPost).toBe(1001000n);
    expect(result.rbPost).toBe(999001n);
  });

  test('direction 1: swap B for A', () => {
    const result = swapVarCurveDeltaOut(1, 1000000n, 1000000n, 1000n, 0);
    expect(result.deltaOut).toBe(999n);
    expect(result.raPost).toBe(999001n);
    expect(result.rbPost).toBe(1001000n);
  });

  test('with fee', () => {
    const result = swapVarCurveDeltaOut(0, 1000000n, 1000000n, 1000n, 30);
    const expectedFeeNumerator = 10000n - 30n;
    const expectedDeltaOut = (1000000n * expectedFeeNumerator * 1000n) / (1000000n * 10000n + expectedFeeNumerator * 1000n);
    expect(result.deltaOut).toBe(expectedDeltaOut);
  });

  test('rejects zero reserves', () => {
    expect(() => swapVarCurveDeltaOut(0, 0n, 1000n, 100n, 0)).toThrow();
  });

  test('rejects zero deltaIn', () => {
    expect(() => swapVarCurveDeltaOut(0, 1000n, 1000n, 0n, 0)).toThrow();
  });

  test('rejects out-of-range fee', () => {
    expect(() => swapVarCurveDeltaOut(0, 1000n, 1000n, 100n, 2000)).toThrow();
  });
});

describe('ammDerivePoolId', () => {
  test('produces deterministic 32-byte id', () => {
    const id = ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 30, 0);
    expect(id.length).toBe(32);
  });

  test('canonical ordering does not affect result', () => {
    const id1 = ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 30, 0);
    const id2 = ammDerivePoolId(zeroFill(32, 2), zeroFill(32, 1), 30, 0);
    expect(id1).toEqual(id2);
  });

  test('different fees produce different ids', () => {
    const id0 = ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 30, 0);
    const id1 = ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 50, 0);
    expect(id0).not.toEqual(id1);
  });

  test('with protocol fee address', () => {
    const id = ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 30, 0, PK5, 10);
    expect(id.length).toBe(32);
  });

  test('rejects out-of-range fee', () => {
    expect(() => ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 2000, 0)).toThrow();
  });

  test('rejects joint-zero violation', () => {
    expect(() => ammDerivePoolId(zeroFill(32, 1), zeroFill(32, 2), 30, 0, PK5, 0)).toThrow();
  });
});
