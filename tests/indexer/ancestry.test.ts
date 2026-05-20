// Tests for AncestryWalker: UTXO ancestry walker and validator
import { describe, test, expect, mock } from 'bun:test';
import { AncestryWalker } from '../../src/indexer/ancestry.js';
import type { ChainClient, ChainTx, ChainUTXO } from '../../src/interfaces/chain-client.js';
import { encodeEnvelopeScript } from '../../src/envelope/script.js';
import { Opcode } from '../../src/constants/opcodes.js';

// Create a mock ChainClient that returns fake transactions
function makeMockClient(txs: Map<string, ChainTx>): ChainClient {
  return {
    fetchTx: mock((txid: string) => Promise.resolve(txs.get(txid) ?? null)),
    fetchUTXOs: mock((_addr: string) => Promise.resolve([] as ChainUTXO[])),
    fetchTipHeight: mock(() => Promise.resolve(0)),
    fetchTip: mock(() => Promise.resolve(null)),
    fetchRawTx: mock(() => Promise.resolve(null)),
    fetchFeeEstimate: mock(() => Promise.resolve(null)),
    broadcast: mock(() => Promise.resolve({ txid: '', success: false })),
    fetchAddressTxs: mock(() => Promise.resolve([])),
    fetchOutspend: mock(() => Promise.resolve(null)),
  };
}

function hexToWitness(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function makeEnvelopeWitness(opcode: number, extraPayload: Uint8Array): string[] {
  const xonly = new Uint8Array(32).fill(0x02);
  const payload = new Uint8Array([opcode, ...extraPayload]);
  const script = encodeEnvelopeScript(xonly, payload);
  return [new Uint8Array(64).fill(0x01), script].map(b =>
    Array.from(b).map(c => c.toString(16).padStart(2, '0')).join(''),
  );
}

describe('AncestryWalker', () => {
  test('fetchTx correctly memoizes results', async () => {
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);

    // First fetch should return null (not found)
    const result1 = await walker['fetchTx']('00'.repeat(32));
    expect(result1).toBeNull();

    // Second fetch should return memoized null (client not called again)
    const result2 = await walker['fetchTx']('00'.repeat(32));
    expect(result2).toBeNull();
    expect(client.fetchTx).toHaveBeenCalledTimes(1);
  });

  test('concurrent fetchTx dedup only calls client once', async () => {
    const txs = new Map<string, ChainTx>();
    // Create a tx that will be found
    const txid = '11'.repeat(32);
    const fakeTx: ChainTx = {
      txid, version: 2, locktime: 0, fee: 0, weight: 0,
      vin: [{ txid: '00'.repeat(32), vout: 0, prevout: { scriptpubkey: '0014' + '00'.repeat(20), value: 1000 }, witness: makeEnvelopeWitness(Opcode.T_CETCH, new Uint8Array([1, 65, 0, 1])), scriptsig: '', sequence: 0xffffffff, is_coinbase: false }],
      vout: [{ scriptpubkey: '0014' + '00'.repeat(20), value: 546 }],
      status: { confirmed: true, block_height: 100 },
    };
    txs.set(txid, fakeTx);

    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);

    // Launch 3 concurrent fetches
    const [r1, r2, r3] = await Promise.all([
      walker['fetchTx'](txid),
      walker['fetchTx'](txid),
      walker['fetchTx'](txid),
    ]);

    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r3).not.toBeNull();
    // Client should have been called only once
    expect(client.fetchTx).toHaveBeenCalledTimes(1);
  });

  test('returns valid=false for unknown UTXO without crashing', async () => {
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);

    const result = await walker.validateUTXO('ff'.repeat(32), 0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('tx not found');
  });

  test('returns valid=false for tx with no envelope witness', async () => {
    const txid = 'aa'.repeat(32);
    const txs = new Map<string, ChainTx>();
    txs.set(txid, {
      txid, version: 2, locktime: 0, fee: 0, weight: 0,
      vin: [{ txid: '00'.repeat(32), vout: 0, prevout: null, witness: [], scriptsig: '', sequence: 0xffffffff, is_coinbase: true }],
      vout: [{ scriptpubkey: '0014' + '00'.repeat(20), value: 546 }],
      status: { confirmed: true },
    });
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);

    const result = await walker.validateUTXO(txid, 0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('no envelope witness');
  });

  test('depth limit returns error without crashing', async () => {
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);

    const result = await walker.validateUTXO('00'.repeat(32), 0, 999);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('max depth');
  });
});

describe('AncestryWalker assetInputCount for axfer', () => {
  test('validateUTXO on axfer with asset_input_count limits validation', async () => {
    // Create a T_AXFER tx with 1 asset input + 1 BTC input
    const txid = 'dd'.repeat(32);
    const assetInputTxid = 'ee'.repeat(32);
    const btcInputTxid = 'ff'.repeat(32);

    // Asset input tx (valid CETCH)
    const assetTx: ChainTx = {
      txid: assetInputTxid, version: 2, locktime: 0, fee: 0, weight: 0,
      vin: [{ txid: '00'.repeat(32), vout: 0, prevout: null, witness: makeEnvelopeWitness(Opcode.T_CETCH, new Uint8Array([1, 65, 0, 1])), scriptsig: '', sequence: 0xffffffff, is_coinbase: false }],
      vout: [{ scriptpubkey: '0014' + '00'.repeat(20), value: 546 }],
      status: { confirmed: true },
    };

    // BTC input (no envelope — should be skipped for axfer)
    const btcTx: ChainTx = {
      txid: btcInputTxid, version: 2, locktime: 0, fee: 0, weight: 0,
      vin: [{ txid: '00'.repeat(32), vout: 0, prevout: null, witness: [], scriptsig: '', sequence: 0xffffffff, is_coinbase: true }],
      vout: [{ scriptpubkey: '0014' + '00'.repeat(20), value: 100000 }],
      status: { confirmed: true },
    };

    // Build a minimal axfer envelope with asset_input_count=1
    // Wire: T_AXFER(0x26) || asset_id(32) || asset_input_count(1) || kernel_sig(64) || N(1) || C(33) || ct(8) || rp_len(2) || rp(0)
    const assetId = new Uint8Array(32).fill(0xaa);
    const kernelSig = new Uint8Array(64).fill(0xbb);
    const commitment = new Uint8Array(33).fill(0x02);
    const ct = new Uint8Array(8);
    const axferPayload = new Uint8Array([Opcode.T_AXFER, ...assetId, 1, ...kernelSig, 1, ...commitment, ...ct, 0, 0]);

    const axferTx: ChainTx = {
      txid, version: 2, locktime: 0, fee: 0, weight: 0,
      vin: [
        { txid: '00'.repeat(32), vout: 0, prevout: null, witness: makeEnvelopeWitness(Opcode.T_AXFER, axferPayload.slice(1)), scriptsig: '', sequence: 0xffffffff, is_coinbase: false },
        { txid: assetInputTxid, vout: 0, prevout: { scriptpubkey: '0014' + '00'.repeat(20), value: 546 }, witness: [], scriptsig: '', sequence: 0xffffffff, is_coinbase: false },
        { txid: btcInputTxid, vout: 0, prevout: { scriptpubkey: '0014' + '00'.repeat(20), value: 100000 }, witness: [], scriptsig: '', sequence: 0xffffffff, is_coinbase: false },
      ],
      vout: [{ scriptpubkey: '0014' + '00'.repeat(20), value: 546 }],
      status: { confirmed: true },
    };

    const txs = new Map<string, ChainTx>();
    txs.set(txid, axferTx);
    txs.set(assetInputTxid, assetTx);
    txs.set(btcInputTxid, btcTx);

    const client = makeMockClient(txs);

    // Manually unlock the stored 'pendingTx' after mock returns
    // The ancestry walker's asset-input handling selects vin[1..1+asset_input_count]
    // = vin[1..2] = only the asset input (1 input). BTC input at vin[2] is skipped.
    const walker = new AncestryWalker(client);
    const result = await walker.validateUTXO(txid, 0);

    // Should get isValid=false because the kernel sig doesn't verify (fake sig)
    // But we should NOT hit "no envelope witness" for the BTC input
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/kernel sig/);
    // The BTC input was skipped — there should be no error about it
    // (If we had treated BTC input as asset input, we'd get "no envelope witness")
  });
});
