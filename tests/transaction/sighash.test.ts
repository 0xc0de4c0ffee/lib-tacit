import { describe, test, expect } from 'bun:test';
import { bytesToHex } from '@noble/hashes/utils';
import * as secp from '@noble/secp256k1';
import { preauthSellerSpendSighash, sighashV0, sighashV0WithType } from '../../src/transaction/sighash.js';
import type { TxTemplate } from '../../src/transaction/sighash.js';

describe('BIP-143 sighash', () => {
  test('SIGHASH_ALL changes when tx version changes', () => {
    const script = new Uint8Array([0x51]);
    const base: TxTemplate = {
      version: 2,
      inputs: [{ txid: 'aa'.repeat(32), vout: 0, sequence: 0xffffffff }],
      outputs: [{ value: 1000, script }],
    };
    const h1 = sighashV0(base, 0, script, 1000);
    const h2 = sighashV0({ ...base, version: 3 }, 0, script, 1000);
    expect(bytesToHex(h1)).not.toBe(bytesToHex(h2));
  });

  test('preauthSellerSpendSighash matches reference composition.mjs', () => {
    const sellerSk = new Uint8Array(32).fill(1);
    const sellerPub = secp.getPublicKey(sellerSk, true);
    const h = preauthSellerSpendSighash({
      assetOutpointTxidHex: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      assetOutpointVout: 0,
      assetUtxoValue: 100_000,
      sellerPubBytes: sellerPub,
      sellerPayoutScriptBytes: new Uint8Array([0x51]),
      minPriceSats: 50_000,
    });
    expect(bytesToHex(h)).toBe('74d1b15e9fd7eff65e257511287a5f03228855aa21db26938e9980630d0da058');
  });

  test('sighashV0WithType SIGHASH_ALL baseline', () => {
    const scriptCode = new Uint8Array([0x51]);
    const tx: TxTemplate = {
      version: 2,
      inputs: [
        { txid: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', vout: 0 },
      ],
      outputs: [{ value: 50_000, script: new Uint8Array([0x52]) }],
      locktime: 0,
    };
    const h = sighashV0WithType(tx, 0, scriptCode, 100_000, 0x01);
    expect(h.length).toBe(32);
    expect(bytesToHex(h)).not.toBe('0'.repeat(64));
  });
});
