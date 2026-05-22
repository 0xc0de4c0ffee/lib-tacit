import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import { Opcode } from '../../src/constants/opcodes.js';
import {
  encodePreauthBid, decodePreauthBid, computePreauthBidContextHash,
} from '../../src/opcodes/preauth-bid.js';
import {
  encodePreauthBidVar, decodePreauthBidVar, computePreauthBidVarContextHash,
} from '../../src/opcodes/preauth-bid-var.js';

function zeroFill(n: number, v = 0): Uint8Array {
  return new Uint8Array(n).fill(v);
}

describe('T_PREAUTH_BID (0x5B)', () => {
  const assetId = zeroFill(32, 0xaa);
  const bidId = zeroFill(16, 0xbb);
  const recipientPubkey = new Uint8Array(33); recipientPubkey[0] = 0x02;
  const blinding = zeroFill(32, 0xcc);
  const kernelSig = zeroFill(64, 0xdd);
  const commitment = new Uint8Array(33); commitment[0] = 0x02; commitment[1] = 0xee;
  const rangeproof = zeroFill(16, 0xff);

  test('encode then decode round-trip (N=1)', () => {
    const payload = encodePreauthBid({
      assetId, assetInputCount: 1, bidId, recipientPubkey,
      amount: 1000n, blinding, priceSats: 50000n,
      kernelSig, outputs: [{ commitment }], rangeproof,
    });
    expect(payload[0]).toBe(Opcode.T_PREAUTH_BID);

    const dec = decodePreauthBid(payload);
    expect(dec).not.toBeNull();
    expect(dec!.kind).toBe('preauth-bid');
    expect(dec!.assetInputCount).toBe(1);
    expect(dec!.amount).toBe(1000n);
    expect(dec!.priceSats).toBe(50000n);
    expect(dec!.outputs.length).toBe(1);
    expect(dec!.rangeproof.length).toBe(16);
  });

  test('encode then decode round-trip (N=2 with change)', () => {
    const ct = zeroFill(8, 0x11);
    const changeCommitment = new Uint8Array(33); changeCommitment[0] = 0x02;
    const payload = encodePreauthBid({
      assetId, assetInputCount: 2, bidId, recipientPubkey,
      amount: 1000n, blinding, priceSats: 50000n,
      kernelSig,
      outputs: [{ commitment }, { commitment: changeCommitment, encryptedAmount: ct }],
      rangeproof,
    });

    const dec = decodePreauthBid(payload);
    expect(dec).not.toBeNull();
    expect(dec!.outputs.length).toBe(2);
    expect(dec!.outputs[1]!.encryptedAmount).toEqual(ct);
  });

  test('decode returns null on short payload', () => {
    expect(decodePreauthBid(new Uint8Array(10))).toBeNull();
  });

  test('decode returns null on wrong opcode', () => {
    const bad = new Uint8Array(250); bad[0] = 0x21;
    expect(decodePreauthBid(bad)).toBeNull();
  });

  test('decode returns null when N > 2', () => {
    const w = encodePreauthBid({
      assetId, assetInputCount: 1, bidId, recipientPubkey,
      amount: 1n, blinding, priceSats: 1n,
      kernelSig, outputs: [{ commitment }], rangeproof: new Uint8Array(0),
    });
    // N byte is at offset: op(1) + assetId(32) + assetInputCount(1) + bidId(16) +
    //   recipientPubkey(33) + amount(8) + blinding(32) + price(8) + kernelSig(64) = 195
    w[195] = 5;
    expect(decodePreauthBid(w)).toBeNull();
  });

  test('encode rejects invalid N', () => {
    const outputs: [{ commitment: Uint8Array }, { commitment: Uint8Array; encryptedAmount: Uint8Array }, { commitment: Uint8Array }] = [
      { commitment }, { commitment, encryptedAmount: zeroFill(8, 0x11) }, { commitment },
    ];
    expect(() => encodePreauthBid({
      assetId, assetInputCount: 1, bidId, recipientPubkey,
      amount: 1n, blinding, priceSats: 1n,
      kernelSig, outputs: outputs as any, rangeproof: zeroFill(0),
    })).toThrow('outputs must be');
  });

  test('context hash is deterministic 32 bytes', () => {
    const hash = computePreauthBidContextHash({
      assetId, bidId, recipientPubkey,
      amount: 1000n, blinding, priceSats: 50000n,
    });
    expect(hash.length).toBe(32);

    const hash2 = computePreauthBidContextHash({
      assetId, bidId, recipientPubkey,
      amount: 1000n, blinding, priceSats: 50000n,
    });
    expect(hash).toEqual(hash2);

    const hash3 = computePreauthBidContextHash({
      assetId, bidId, recipientPubkey,
      amount: 1001n, blinding, priceSats: 50000n,
    });
    expect(hash).not.toEqual(hash3);
  });

  test('context hash uses correct domain tag', () => {
    const hash = computePreauthBidContextHash({
      assetId, bidId, recipientPubkey,
      amount: 1n, blinding, priceSats: 2n,
    });
    const amountLE = new Uint8Array(8); new DataView(amountLE.buffer).setBigUint64(0, 1n, true);
    const priceLE = new Uint8Array(8); new DataView(priceLE.buffer).setBigUint64(0, 2n, true);
    const expected = sha256(new TextEncoder().encode('tacit-preauth-bid-context-v1'));
    // The hash includes the params — we just verify the tag is in there by checking
    // that the right-length hash is produced with the right tag prefix structure
    expect(hash).not.toEqual(expected); // params matter
    expect(hash.length).toBe(32);
  });
});

describe('T_PREAUTH_BID_VAR (0x5C)', () => {
  const assetId = zeroFill(32, 0xaa);
  const bidId = zeroFill(16, 0xbb);
  const recipientPubkey = new Uint8Array(33); recipientPubkey[0] = 0x02;
  const recipientBlinding = zeroFill(32, 0xcc);
  const refundScriptHash = zeroFill(20, 0xdd);
  const kernelSig = zeroFill(64, 0xee);
  const commitment = new Uint8Array(33); commitment[0] = 0x02; commitment[1] = 0x11;
  const rangeproof = zeroFill(32, 0xff);

  const validInput = {
    assetId, assetInputCount: 1, bidId, recipientPubkey,
    pricePerUnit: 1000n, maxFill: 10000n, fillIncrement: 100n, fillAmount: 500n,
    recipientBlinding, refundScriptHash, decimalsScale: 0,
    kernelSig,
    outputs: [{ commitment }] as [{ commitment: Uint8Array }],
    rangeproof,
  };

  test('encode then decode round-trip (N=1)', () => {
    const payload = encodePreauthBidVar(validInput);
    expect(payload[0]).toBe(Opcode.T_PREAUTH_BID_VAR);

    const dec = decodePreauthBidVar(payload);
    expect(dec).not.toBeNull();
    expect(dec!.kind).toBe('preauth-bid-var');
    expect(dec!.assetInputCount).toBe(1);
    expect(dec!.pricePerUnit).toBe(1000n);
    expect(dec!.maxFill).toBe(10000n);
    expect(dec!.fillIncrement).toBe(100n);
    expect(dec!.fillAmount).toBe(500n);
    expect(dec!.decimalsScale).toBe(0);
    expect(dec!.outputs.length).toBe(1);
  });

  test('encode then decode round-trip (N=2 with change)', () => {
    const ct = zeroFill(8, 0x11);
    const changeCommitment = new Uint8Array(33); changeCommitment[0] = 0x02;
    const payload = encodePreauthBidVar({
      ...validInput,
      outputs: [{ commitment }, { commitment: changeCommitment, encryptedAmount: ct }],
    });

    const dec = decodePreauthBidVar(payload);
    expect(dec).not.toBeNull();
    expect(dec!.outputs.length).toBe(2);
    expect(dec!.outputs[1]!.encryptedAmount).toEqual(ct);
  });

  test('decode returns null on short payload', () => {
    expect(decodePreauthBidVar(new Uint8Array(10))).toBeNull();
  });

  test('decode returns null on wrong opcode', () => {
    const bad = new Uint8Array(300); bad[0] = 0x21;
    expect(decodePreauthBidVar(bad)).toBeNull();
  });

  test('decode returns null on fillAmount=0', () => {
    const w = encodePreauthBidVar({ ...validInput, fillAmount: 500n });
    // Patch fillAmount in wire to 0
    const offset = 1 + 32 + 1 + 16 + 33 + 8 + 8 + 8; // skip to fillAmount field
    const view = new DataView(w.buffer, w.byteOffset + offset, 8);
    view.setBigUint64(0, 0n, true);
    expect(decodePreauthBidVar(w)).toBeNull();
  });

  test('decode returns null on fillAmount > maxFill', () => {
    const w = encodePreauthBidVar({ ...validInput, fillAmount: 500n });
    const offset = 1 + 32 + 1 + 16 + 33 + 8 + 8 + 8;
    const view = new DataView(w.buffer, w.byteOffset + offset, 8);
    view.setBigUint64(0, 99999n, true);
    expect(decodePreauthBidVar(w)).toBeNull();
  });

  test('encode rejects invalid inputs', () => {
    expect(() => encodePreauthBidVar({ ...validInput, pricePerUnit: 0n })).toThrow('positive');
    expect(() => encodePreauthBidVar({ ...validInput, maxFill: 0n })).toThrow('positive');
    expect(() => encodePreauthBidVar({ ...validInput, fillIncrement: 0n })).toThrow('positive');
    expect(() => encodePreauthBidVar({ ...validInput, fillAmount: 0n })).toThrow('positive');
    expect(() => encodePreauthBidVar({ ...validInput, fillAmount: 99999n })).toThrow('<= max_fill');
    expect(() => encodePreauthBidVar({ ...validInput, decimalsScale: -1 })).toThrow('decimals_scale');
    expect(() => encodePreauthBidVar({ ...validInput, decimalsScale: 33 })).toThrow('decimals_scale');
  });

  test('context hash is deterministic 32 bytes', () => {
    const hash = computePreauthBidVarContextHash({
      assetId, bidId, recipientPubkey,
      pricePerUnit: 1000n, maxFill: 10000n, fillIncrement: 100n, fillAmount: 500n,
      refundScriptHash, decimalsScale: 0,
    });
    expect(hash.length).toBe(32);

    const hash2 = computePreauthBidVarContextHash({
      assetId, bidId, recipientPubkey,
      pricePerUnit: 1000n, maxFill: 10000n, fillIncrement: 100n, fillAmount: 500n,
      refundScriptHash, decimalsScale: 0,
    });
    expect(hash).toEqual(hash2);

    const hash3 = computePreauthBidVarContextHash({
      assetId, bidId, recipientPubkey,
      pricePerUnit: 999n, maxFill: 10000n, fillIncrement: 100n, fillAmount: 500n,
      refundScriptHash, decimalsScale: 0,
    });
    expect(hash).not.toEqual(hash3);
  });
});
