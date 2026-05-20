// UTXO manager: fetch, cache, select, and sort UTXOs for signing flows.
// References tacit-specs/dapp/tacit.js getUtxos, sortSatsForCommit patterns.

import type { ChainClient, ChainUTXO, Outpoint } from '../interfaces/chain-client.js';

export interface SpendableUTXO {
  txid: string;
  vout: number;
  value: number;         // satoshis
  scriptPubKey: string;  // hex
  confirmed: boolean;
  blockHeight?: number;
}

export interface UTXOCacheEntry {
  utxos: SpendableUTXO[];
  fetchedAt: number;
}

export interface UTXOFetchResult {
  utxos: SpendableUTXO[];
  fromCache: boolean;
}

export interface UTXOSelection {
  utxos: SpendableUTXO[];
  totalValue: number;
  changeValue: number;
}

const CACHE_TTL_MS = 30_000;  // 30s light cache
const STALE_TTL_MS = 300_000; // 5min stale fallback
const DUST = 546;

export class UTXOManager {
  private client: ChainClient;
  private address: string;
  private lightCache: Map<string, UTXOCacheEntry> = new Map();
  private recentlySpent: Set<string> = new Set();
  private recentSpendTTL = 120_000; // 2 min

  constructor(client: ChainClient, address: string) {
    this.client = client;
    this.address = address;
  }

  setAddress(addr: string): void { this.address = addr; }

  markSpent(txid: string, vout: number): void {
    this.recentlySpent.add(`${txid}:${vout}`);
    setTimeout(() => this.recentlySpent.delete(`${txid}:${vout}`), this.recentSpendTTL);
  }

  isSpent(txid: string, vout: number): boolean {
    return this.recentlySpent.has(`${txid}:${vout}`);
  }

  private filterRecent(utxos: SpendableUTXO[]): SpendableUTXO[] {
    return utxos.filter(u => !this.recentlySpent.has(`${u.txid}:${u.vout}`));
  }

  async fetchUTXOs(options?: { force?: boolean }): Promise<UTXOFetchResult> {
    const addr = this.address;
    if (!options?.force) {
      const cached = this.lightCache.get(addr);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return { utxos: this.filterRecent(cached.utxos), fromCache: true };
      }
    }

    try {
      const rawUTXOs = await this.client.fetchUTXOs(addr);
      const utxos: SpendableUTXO[] = rawUTXOs.map(u => ({
        txid: u.txid,
        vout: u.vout,
        value: u.value,
        scriptPubKey: u.scriptPubKey,
        confirmed: u.status.confirmed,
        blockHeight: u.status.block_height,
      }));

      this.lightCache.set(addr, { utxos, fetchedAt: Date.now() });
      return { utxos: this.filterRecent(utxos), fromCache: false };
    } catch (e) {
      // Stale fallback
      const cached = this.lightCache.get(addr);
      if (cached && Date.now() - cached.fetchedAt < STALE_TTL_MS) {
        return { utxos: this.filterRecent(cached.utxos), fromCache: true };
      }
      throw e;
    }
  }

  invalidateCache(address?: string): void {
    this.lightCache.delete(address ?? this.address);
  }

  // Sort UTXOs for commit tx funding (prefer larger UTXOs to minimize inputs)
  sortForCommit(utxos: SpendableUTXO[]): SpendableUTXO[] {
    return [...utxos]
      .filter(u => u.value > DUST)
      .sort((a, b) => b.value - a.value);  // descending by value
  }

  // Select UTXOs to cover a target amount
  selectUTXOs(utxos: SpendableUTXO[], targetValue: number): UTXOSelection {
    const sorted = this.sortForCommit(utxos);
    const selected: SpendableUTXO[] = [];
    let total = 0;

    for (const utxo of sorted) {
      if (total >= targetValue + DUST) break;
      selected.push(utxo);
      total += utxo.value;
    }

    const changeValue = total - targetValue;
    return { utxos: selected, totalValue: total, changeValue };
  }

  // Get total balance (confirmed + unconfirmed)
  getBalance(utxos: SpendableUTXO[]): { confirmed: number; unconfirmed: number; total: number } {
    let confirmed = 0;
    let unconfirmed = 0;
    for (const u of utxos) {
      if (u.confirmed) confirmed += u.value;
      else unconfirmed += u.value;
    }
    return { confirmed, unconfirmed, total: confirmed + unconfirmed };
  }
}
