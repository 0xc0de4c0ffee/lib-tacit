// Chain scan for UTXO recovery.
// Scans a wallet address for outputs created by tacit-envelope transactions.
// Returns a lightweight RecoveryUTXO list; callers can then use AncestryWalker
// for full ancestry validation.

import type { ChainClient } from '../interfaces/chain-client.js';
import { decodeEnvelopeScript } from '../envelope/script.js';

export interface RecoveryUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
}

function witnessToBytes(witness: string[]): Uint8Array | null {
  if (witness.length < 2) return null;
  const hex = witness[1];
  if (!hex) return null;
  const bytes = hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16));
  if (!bytes) return null;
  return new Uint8Array(bytes);
}

export async function scanForUTXOs(
  client: ChainClient,
  address: string,
  options?: { fromHeight?: number; concurrency?: number },
): Promise<RecoveryUTXO[]> {
  const allUTXOs = await client.fetchUTXOs(address);

  const filtered = options?.fromHeight !== undefined
    ? allUTXOs.filter(
        u => u.status.block_height !== undefined && u.status.block_height! >= options.fromHeight!,
      )
    : allUTXOs;

  const results: RecoveryUTXO[] = [];
  const concurrency = options?.concurrency ?? 4;

  for (let i = 0; i < filtered.length; i += concurrency) {
    const batch = filtered.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (utxo) => {
        try {
          const tx = await client.fetchTx(utxo.txid);
          if (!tx) return null;
          const witnessBytes = witnessToBytes(tx.vin[0]?.witness ?? []);
          if (!witnessBytes) return null;
          const decoded = decodeEnvelopeScript(witnessBytes);
          if (!decoded) return null;
          return { txid: utxo.txid, vout: utxo.vout, value: utxo.value, scriptPubKey: utxo.scriptPubKey };
        } catch {
          return null;
        }
      }),
    );

    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  return results;
}
