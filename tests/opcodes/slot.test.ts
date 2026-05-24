import { describe, test, expect } from 'bun:test';
import * as secp from '@noble/secp256k1';
import {
  encodeSlotMint, decodeSlotMint,
  encodeSlotBurn, decodeSlotBurn,
  encodeSlotRotate, decodeSlotRotate,
  encodeSlotSplit, decodeSlotSplit,
  encodeSlotMerge, decodeSlotMerge,
} from '../../src/opcodes/slot.js';
import { Opcode } from '../../src/constants/opcodes.js';

function zeroFill(n: number, v = 0x02): Uint8Array { return new Uint8Array(n).fill(v); }
function validPoint(seed = 1): Uint8Array {
  const sk = new Uint8Array(32).fill(seed);
  return secp.ProjectivePoint.fromPrivateKey(sk).toRawBytes(true);
}

describe('T_SLOT_MINT (0x43)', () => {
  const validInput = {
    networkTag: 1,
    assetId: zeroFill(32, 0xaa),
    denomination: 100n,
    recipientCommit: validPoint(1),
    leafHash: zeroFill(32, 0xbb),
    paymentAssetId: zeroFill(32, 0xcc),
    paymentAmount: 200n,
    minterPubkey: validPoint(2),
    minterSig: zeroFill(64, 0xdd),
    kBtcXOnly: zeroFill(32, 0xee),
    encryptedNote: null,
  };

  test('round-trip without note', () => {
    const p = encodeSlotMint(validInput);
    expect(p.length).toBe(276);
    expect(p[0]).toBe(Opcode.T_SLOT_MINT);
    const d = decodeSlotMint(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('slot-mint');
    expect(d!.networkTag).toBe(1);
    expect(d!.denomination).toBe(100n);
    expect(d!.paymentAmount).toBe(200n);
    expect(d!.encryptedNote).toBeNull();
  });

  test('round-trip with note', () => {
    const p = encodeSlotMint({ ...validInput, encryptedNote: zeroFill(122, 0xff) });
    expect(p.length).toBe(399);
    const d = decodeSlotMint(p);
    expect(d).not.toBeNull();
    expect(d!.encryptedNote).toEqual(zeroFill(122, 0xff));
  });

  test('decode wrong opcode rejects', () => {
    const p = encodeSlotMint(validInput);
    p[0] = 0x44;
    expect(decodeSlotMint(p)).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSlotMint(new Uint8Array())).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSlotMint(new Uint8Array([0x43, ...zeroFill(10)]))).toBeNull();
  });

  test('rejects invalid networkTag', () => {
    expect(() => encodeSlotMint({ ...validInput, networkTag: 3 })).toThrow();
  });

  test('decode rejects bad point', () => {
    const p = encodeSlotMint(validInput);
    p[42] = 0xff;
    expect(decodeSlotMint(p)).toBeNull();
  });
});

describe('T_SLOT_BURN (0x44)', () => {
  const validInput = {
    networkTag: 1,
    assetId: zeroFill(32, 0xaa),
    denomination: 100n,
    merkleRoot: zeroFill(32, 0xbb),
    nullifierHash: zeroFill(32, 0xcc),
    recipientCommitment: validPoint(1),
    rLeaf: zeroFill(32, 0xdd),
    bindHash: zeroFill(32, 0xee),
    proof: zeroFill(100, 0xff),
  };

  test('round-trip', () => {
    const p = encodeSlotBurn(validInput);
    expect(p[0]).toBe(Opcode.T_SLOT_BURN);
    const d = decodeSlotBurn(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('slot-burn');
    expect(d!.denomination).toBe(100n);
    expect(d!.proof.length).toBe(100);
  });

  test('decode wrong opcode rejects', () => {
    const p = encodeSlotBurn(validInput);
    p[0] = 0x43;
    expect(decodeSlotBurn(p)).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSlotBurn(new Uint8Array())).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSlotBurn(new Uint8Array([0x44, ...zeroFill(10)]))).toBeNull();
  });

  test('decode rejects proofLen=0', () => {
    const p = encodeSlotBurn(validInput);
    const headerEnd = 1 + 1 + 32 + 8 + 32 + 32 + 33 + 32 + 32;
    p[headerEnd] = 0;
    p[headerEnd + 1] = 0;
    expect(decodeSlotBurn(p)).toBeNull();
  });

  test('encode rejects empty proof', () => {
    expect(() => encodeSlotBurn({ ...validInput, proof: zeroFill(0) })).toThrow();
  });
});

describe('T_SLOT_ROTATE (0x45)', () => {
  const validInput = {
    networkTag: 1,
    assetId: zeroFill(32, 0xaa),
    denomination: 100n,
    oldMerkleRoot: zeroFill(32, 0xbb),
    oldNullifierHash: zeroFill(32, 0xcc),
    oldRecipientCommitment: validPoint(1),
    oldRLeaf: zeroFill(32, 0xdd),
    oldBindHash: zeroFill(32, 0xee),
    oldProof: zeroFill(50, 0xff),
    newRecipientCommit: validPoint(2),
    newLeafHash: zeroFill(32, 0x11),
    newKBtcXOnly: zeroFill(32, 0x22),
    paymentAssetId: zeroFill(32, 0x33),
    paymentAmount: 200n,
    oldOwnerPubkey: validPoint(3),
    oldOwnerSig: zeroFill(64, 0x44),
    encryptedNote: null,
  };

  test('round-trip without note', () => {
    const p = encodeSlotRotate(validInput);
    expect(p[0]).toBe(Opcode.T_SLOT_ROTATE);
    const d = decodeSlotRotate(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('slot-rotate');
    expect(d!.oldProof.length).toBe(50);
    expect(d!.paymentAmount).toBe(200n);
    expect(d!.encryptedNote).toBeNull();
  });

  test('round-trip with note', () => {
    const p = encodeSlotRotate({ ...validInput, encryptedNote: zeroFill(122, 0x77) });
    const d = decodeSlotRotate(p);
    expect(d).not.toBeNull();
    expect(d!.encryptedNote).toEqual(zeroFill(122, 0x77));
  });

  test('decode wrong opcode rejects', () => {
    const p = encodeSlotRotate(validInput);
    p[0] = 0x44;
    expect(decodeSlotRotate(p)).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSlotRotate(new Uint8Array([0x45, ...zeroFill(10)]))).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSlotRotate(new Uint8Array())).toBeNull();
  });

  test('decode rejects bad old point', () => {
    const p = encodeSlotRotate(validInput);
    p[106] = 0xff;
    expect(decodeSlotRotate(p)).toBeNull();
  });
});

describe('T_SLOT_SPLIT (0x46)', () => {
  const validInput = {
    networkTag: 1,
    assetIdOld: zeroFill(32, 0xaa),
    denomOld: 100n,
    oldMerkleRoot: zeroFill(32, 0xbb),
    oldNullifierHash: zeroFill(32, 0xcc),
    oldRecipientCommitment: validPoint(1),
    oldRLeaf: zeroFill(32, 0xdd),
    oldBindHash: zeroFill(32, 0xee),
    oldProof: zeroFill(50, 0xff),
    outputs: [
      { assetIdNew: zeroFill(32, 0x11), denomNew: 40n, newRecipientCommit: validPoint(2), newLeafHash: zeroFill(32, 0x22) },
      { assetIdNew: zeroFill(32, 0x33), denomNew: 60n, newRecipientCommit: validPoint(3), newLeafHash: zeroFill(32, 0x44) },
    ],
    oldOwnerPubkey: validPoint(4),
    oldOwnerSig: zeroFill(64, 0x55),
    encryptedNotes: null,
  };

  test('round-trip without notes', () => {
    const p = encodeSlotSplit(validInput);
    expect(p[0]).toBe(Opcode.T_SLOT_SPLIT);
    const d = decodeSlotSplit(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('slot-split');
    expect(d!.nOutputs).toBe(2);
    expect(d!.outputs[0]!.denomNew).toBe(40n);
    expect(d!.outputs[1]!.denomNew).toBe(60n);
    expect(d!.encryptedNotes).toBeNull();
  });

  test('round-trip with notes bitmap', () => {
    const p = encodeSlotSplit({
      ...validInput,
      encryptedNotes: [zeroFill(122, 0x11), null],
    });
    const d = decodeSlotSplit(p);
    expect(d).not.toBeNull();
    expect(d!.encryptedNotes).not.toBeNull();
    expect(d!.encryptedNotes![0]).toEqual(zeroFill(122, 0x11));
    expect(d!.encryptedNotes![1]).toBeNull();
  });

  test('decode wrong opcode rejects', () => {
    const p = encodeSlotSplit(validInput);
    p[0] = 0x47;
    expect(decodeSlotSplit(p)).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSlotSplit(new Uint8Array())).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSlotSplit(new Uint8Array([0x46, ...zeroFill(10)]))).toBeNull();
  });

  test('encode rejects N=1', () => {
    expect(() => encodeSlotSplit({ ...validInput, outputs: [validInput.outputs[0]!] })).toThrow();
  });

  test('decode rejects sumDenomNew > denomOld', () => {
    const p = encodeSlotSplit({
      ...validInput,
      outputs: [
        { assetIdNew: zeroFill(32, 0x11), denomNew: 80n, newRecipientCommit: validPoint(2), newLeafHash: zeroFill(32, 0x22) },
        { assetIdNew: zeroFill(32, 0x33), denomNew: 80n, newRecipientCommit: validPoint(3), newLeafHash: zeroFill(32, 0x44) },
      ],
    });
    expect(decodeSlotSplit(p)).toBeNull();
  });
});

describe('T_SLOT_MERGE (0x47)', () => {
  const makeInput = (seed: number) => ({
    assetIdOld: zeroFill(32, seed),
    denomOld: 50n,
    oldMerkleRoot: zeroFill(32, seed + 1),
    oldNullifierHash: zeroFill(32, seed + 2),
    oldRecipientCommitment: validPoint(seed),
    oldRLeaf: zeroFill(32, seed + 3),
    oldBindHash: zeroFill(32, seed + 4),
    oldProof: zeroFill(30 + seed, seed + 5),
  });

  const validInput = {
    networkTag: 1,
    inputs: [makeInput(1), makeInput(10)],
    assetIdNew: zeroFill(32, 0xaa),
    denomNew: 100n,
    newRecipientCommit: validPoint(20),
    newLeafHash: zeroFill(32, 0xbb),
    newOwnerPubkey: validPoint(21),
    newOwnerSig: zeroFill(64, 0xcc),
    encryptedNote: null,
  };

  test('round-trip without note', () => {
    const p = encodeSlotMerge(validInput);
    expect(p[0]).toBe(Opcode.T_SLOT_MERGE);
    const d = decodeSlotMerge(p);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('slot-merge');
    expect(d!.nInputs).toBe(2);
    expect(d!.inputs[0]!.denomOld).toBe(50n);
    expect(d!.denomNew).toBe(100n);
    expect(d!.encryptedNote).toBeNull();
  });

  test('round-trip with note', () => {
    const p = encodeSlotMerge({ ...validInput, encryptedNote: zeroFill(122, 0xdd) });
    const d = decodeSlotMerge(p);
    expect(d).not.toBeNull();
    expect(d!.encryptedNote).toEqual(zeroFill(122, 0xdd));
  });

  test('decode wrong opcode rejects', () => {
    const p = encodeSlotMerge(validInput);
    p[0] = 0x46;
    expect(decodeSlotMerge(p)).toBeNull();
  });

  test('rejects truncated payload', () => {
    expect(decodeSlotMerge(new Uint8Array([0x47, ...zeroFill(10)]))).toBeNull();
  });

  test('rejects empty payload', () => {
    expect(decodeSlotMerge(new Uint8Array())).toBeNull();
  });

  test('encode rejects N=1', () => {
    expect(() => encodeSlotMerge({ ...validInput, inputs: [validInput.inputs[0]!] })).toThrow();
  });

  test('decode rejects sumDenomOld < denomNew', () => {
    const p = encodeSlotMerge({
      ...validInput,
      inputs: [
        { ...makeInput(1), denomOld: 30n },
        { ...makeInput(10), denomOld: 30n },
      ],
      denomNew: 100n,
    });
    expect(decodeSlotMerge(p)).toBeNull();
  });
});
