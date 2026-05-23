import { describe, test, expect, mock } from 'bun:test';
import { validateAncestry } from '../../src/validation/validator.js';
import { AncestryWalker } from '../../src/indexer/ancestry.js';
import type { ChainClient, ChainTx, ChainUTXO } from '../../src/interfaces/chain-client.js';
import { encodeEnvelopeScript } from '../../src/envelope/script.js';
import { Opcode } from '../../src/constants/opcodes.js';

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

function makeEnvelopeWitness(opcode: number, extraPayload: Uint8Array): string[] {
  const xonly = new Uint8Array(32).fill(0x02);
  const payload = new Uint8Array([opcode, ...extraPayload]);
  const script = encodeEnvelopeScript(xonly, payload);
  return [new Uint8Array(64).fill(0x01), script].map(b =>
    Array.from(b).map(c => c.toString(16).padStart(2, '0')).join(''),
  );
}

describe('validateAncestry', () => {
  test('with single UTXO (depth 0) returns null when not found (tx unknown)', async () => {
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);
    const result = await validateAncestry(walker, 'ff'.repeat(32), 0);
    expect(result).toBe('tx not found');
  });

  test('validateAncestry maxDepth option', async () => {
    const txid = 'aa'.repeat(32);
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);
    const result = await validateAncestry(walker, txid, 0, { maxDepth: 999 });
    expect(result).not.toBeNull();
  });

  test('with broken chain (invalid envelope)', async () => {
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
    const result = await validateAncestry(walker, txid, 0);
    expect(result).toBe('no envelope witness');
  });

  test('with null txid returns error', async () => {
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);
    const result = await validateAncestry(walker, 'ff'.repeat(32), 999);
    expect(result).toBe('tx not found');
  });

  test('with mismatched output index returns error', async () => {
    const txs = new Map<string, ChainTx>();
    const client = makeMockClient(txs);
    const walker = new AncestryWalker(client);
    const result = await validateAncestry(walker, 'ee'.repeat(32), 0);
    expect(result).toBe('tx not found');
  });
});
