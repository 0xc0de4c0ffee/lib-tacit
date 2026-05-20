// Tests for transaction builder: commit-reveal tx construction
import { describe, test, expect } from 'bun:test';
import { buildCommitTx, buildRevealTx, computeAssetIdFromTx } from '../../src/transaction/builder.js';

describe('buildCommitTx', () => {
  test('produces valid tx template', () => {
    const tx = buildCommitTx({
      commitmentValue: 1000,
      commitmentScript: new Uint8Array([0x51, 0x20, ...new Uint8Array(32)]), // valid P2TR
      changeScript: new Uint8Array([0x00, 0x14, ...new Uint8Array(20)]), // P2WPKH
      changeValue: 50000,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0 }],
    });
    expect(tx.version).toBe(2);
    expect(tx.inputs.length).toBe(1);
    expect(tx.outputs.length).toBe(2);
    expect(tx.outputs[0]?.value).toBe(1000);
    expect(tx.outputs[1]?.value).toBe(50000);
  });

  test('commitmentScript is passed through unchanged', () => {
    const script = new Uint8Array([0x51, 0x20, 0x01, 0x02, 0x03]);
    const tx = buildCommitTx({
      commitmentValue: 546,
      commitmentScript: script,
      changeScript: new Uint8Array(22),
      changeValue: 0,
      inputs: [{ txid: 'bb'.repeat(32), vout: 1 }],
    });
    expect(tx.outputs[0]?.script.length).toBe(script.length);
    expect(tx.outputs[0]?.script[0]).toBe(0x51);
  });

  test('locktime defaults to 0', () => {
    const tx = buildCommitTx({
      commitmentValue: 546,
      commitmentScript: new Uint8Array(34),
      changeScript: new Uint8Array(22),
      changeValue: 0,
      inputs: [],
    });
    expect(tx.locktime).toBe(0);
  });
});

describe('buildRevealTx', () => {
  test('produces valid reveal tx template', () => {
    const tx = buildRevealTx({
      commitTxid: 'aa'.repeat(32),
      commitVout: 0,
      commitValue: 1000,
      signingPubXonly: new Uint8Array(32).fill(0x02),
      envelopePayload: new Uint8Array([0x21, 0x01, 0x41]), // minimal CETCH
      outputs: [{ value: 546, script: new Uint8Array(22) }],
    });
    expect(tx.version).toBe(2);
    expect(tx.inputs.length).toBe(1);
    expect(tx.inputs[0]?.txid).toBe('aa'.repeat(32));
    expect(tx.inputs[0]?.witness?.length).toBe(2); // sig + envelope
  });
});

describe('computeAssetIdFromTx', () => {
  test('produces 32-byte result', () => {
    const aid = computeAssetIdFromTx('ff'.repeat(32));
    expect(aid.length).toBe(32);
  });

  test('deterministic', () => {
    const a1 = computeAssetIdFromTx('ab'.repeat(32));
    const a2 = computeAssetIdFromTx('ab'.repeat(32));
    expect(a1).toEqual(a2);
  });

  test('differs on different txid', () => {
    const a1 = computeAssetIdFromTx('ab'.repeat(32));
    const a2 = computeAssetIdFromTx('cd'.repeat(32));
    expect(a1).not.toEqual(a2);
  });
});
