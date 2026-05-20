// Esplora REST client implementing ChainClient.
// Compatible with mempool.space, blockstream.info, and any Esplora-compatible API.
// Features: base rotation, concurrency cap, cooldown on rate-limit.

import { hexToBytes } from '@noble/hashes/utils';
import type {
  ChainClient, ChainTx, ChainUTXO, ChainTip,
  FeeEstimate, BroadcastResult,
} from '../interfaces/chain-client.js';

export interface EsploraConfig {
  name: string;
  hrp: string;
  bases: string[];       // Esplora API base URLs, tried in order
  concurrency?: number;   // max concurrent requests (default 12)
}

interface HealthEntry {
  cooldownUntil: number;
  label: string;
}

export class EsploraClient implements ChainClient {
  private config: Required<EsploraConfig>;
  private health = new Map<string, HealthEntry>();
  private inflight = 0;
  private queue: Array<() => void> = [];
  private perBaseInflight = new Map<string, number>();
  private readonly PER_BASE_MAX = 6;

  constructor(config: EsploraConfig) {
    this.config = {
      concurrency: 12,
      ...config,
    };
  }

  // --- Internal concurrency management ---

  private async acquire(): Promise<void> {
    if (this.inflight < this.config.concurrency) {
      this.inflight++;
      return;
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) next();
    else this.inflight--;
  }

  private acquireBaseSlot(base: string): void {
    this.perBaseInflight.set(base, (this.perBaseInflight.get(base) || 0) + 1);
  }

  private releaseBaseSlot(base: string): void {
    const n = (this.perBaseInflight.get(base) || 0) - 1;
    if (n <= 0) this.perBaseInflight.delete(base);
    else this.perBaseInflight.set(base, n);
  }

  private baseSlotsFree(base: string): number {
    return Math.max(0, this.PER_BASE_MAX - (this.perBaseInflight.get(base) || 0));
  }

  private isCooling(base: string): boolean {
    const h = this.health.get(base);
    return !!(h && h.cooldownUntil > Date.now());
  }

  private markUnhealthy(base: string, ms: number, label: string): void {
    this.health.set(base, { cooldownUntil: Date.now() + ms, label });
  }

  private healthyBases(): string[] {
    return this.config.bases.filter(b => !this.isCooling(b));
  }

  // --- Core fetch method with rotation ---

  private async fetch(path: string, opts: RequestInit = {}): Promise<Response> {
    await this.acquire();
    try {
      const healthy = this.healthyBases();
      const healthyWithSlots = healthy.filter(b => this.baseSlotsFree(b) > 0);
      const healthySaturated = healthy.filter(b => this.baseSlotsFree(b) === 0);
      const order = healthyWithSlots.length
        ? [...healthyWithSlots, ...healthySaturated]
        : healthy;

      if (order.length === 0) {
        throw new Error('no chain API base available (all cooling)');
      }

      let lastErr: Error | null = null;
      for (const base of order) {
        this.acquireBaseSlot(base);
        try {
          const url = `${base}${path}`;
          const res = await fetch(url, opts);
          if (res.status === 429) {
            this.markUnhealthy(base, 30_000, 'rate-limited');
            lastErr = new Error('rate limited');
            continue;
          }
          if (res.status >= 500) {
            this.markUnhealthy(base, 15_000, String(res.status));
            lastErr = new Error(`API ${res.status}`);
            continue;
          }
          if (res.ok) this.health.delete(base);
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`API ${res.status}: ${text.slice(0, 240)}`);
          }
          return res;
        } catch (e) {
          if (!(e instanceof Error)) throw e;
          // Only rotate on network/CORS errors, not 4xx
          if (e.message.startsWith('API ')) throw e;
          this.markUnhealthy(base, 60_000, 'network');
          lastErr = e;
        } finally {
          this.releaseBaseSlot(base);
        }
      }
      throw lastErr || new Error('all API bases exhausted');
    } finally {
      this.release();
    }
  }

  private async fetchJSON<T>(path: string): Promise<T> {
    const res = await this.fetch(path);
    return res.json() as Promise<T>;
  }

  private async fetchText(path: string): Promise<string> {
    const res = await this.fetch(path);
    return res.text();
  }

  // --- ChainClient implementation ---

  async fetchTx(txid: string): Promise<ChainTx | null> {
    try {
      const tx = await this.fetchJSON<ChainTx>(`/tx/${txid}`);
      return tx;
    } catch (e) {
      if (e instanceof Error && e.message.includes('API 404')) return null;
      throw e;
    }
  }

  async fetchRawTx(txid: string): Promise<string | null> {
    try {
      return await this.fetchText(`/tx/${txid}/hex`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('API 404')) return null;
      throw e;
    }
  }

  async fetchUTXOs(address: string): Promise<ChainUTXO[]> {
    try {
      const utxos = await this.fetchJSON<ChainUTXO[]>(`/address/${address}/utxo`);
      return utxos;
    } catch (e) {
      if (e instanceof Error && e.message.includes('API 4')) {
        // Try history-based fallback
        return this.fetchUTXOsViaTxHistory(address);
      }
      throw e;
    }
  }

  private async fetchUTXOsViaTxHistory(address: string): Promise<ChainUTXO[]> {
    const txs = await this.fetchAddressTxs(address);
    const utxoMap = new Map<string, ChainUTXO>();

    for (const tx of txs) {
      for (let v = 0; v < tx.vout.length; v++) {
        const out = tx.vout[v]!;
        if (out.scriptpubkey && this.matchesAddress(out.scriptpubkey, address)) {
          utxoMap.set(`${tx.txid}:${v}`, {
            txid: tx.txid,
            vout: v,
            value: out.value,
            scriptPubKey: out.scriptpubkey,
            status: tx.status,
          });
        }
      }
      // Remove spent outputs
      for (const inp of tx.vin) {
        if (!inp.is_coinbase) {
          utxoMap.delete(`${inp.txid}:${inp.vout}`);
        }
      }
    }
    return Array.from(utxoMap.values());
  }

  private matchesAddress(scriptPubKeyHex: string, _address: string): boolean {
    // Basic P2WPKH check: OP_0 PUSH20 hash160
    return scriptPubKeyHex.startsWith('0014');
  }

  async fetchTipHeight(): Promise<number> {
    return parseInt(await this.fetchText('/blocks/tip/height'), 10) || 0;
  }

  async fetchTip(): Promise<ChainTip | null> {
    try {
      const [height, hash] = await Promise.all([
        this.fetchText('/blocks/tip/height'),
        this.fetchText('/blocks/tip/hash'),
      ]);
      return { height: parseInt(height, 10) || 0, hash };
    } catch { return null; }
  }

  async fetchFeeEstimate(): Promise<FeeEstimate | null> {
    try {
      const e = await this.fetchJSON<any>('/fee-estimates');
      return {
        fastestFee: Math.ceil(e['1'] ?? 50),
        halfHourFee: Math.ceil(e['2'] ?? 30),
        hourFee: Math.ceil(e['6'] ?? 20),
        economyFee: Math.ceil(e['144'] ?? 10),
        minimumFee: Math.ceil(e['1008'] ?? 2),
      };
    } catch { return null; }
  }

  async broadcast(rawTxHex: string): Promise<BroadcastResult> {
    try {
      const res = await this.fetch('/tx', {
        method: 'POST',
        body: rawTxHex,
        headers: { 'Content-Type': 'text/plain' },
      });
      const txid = (await res.text()).trim();
      return { txid, success: true };
    } catch (e) {
      return {
        txid: '',
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async fetchAddressTxs(address: string, lastSeenTxid?: string): Promise<ChainTx[]> {
    const path = lastSeenTxid
      ? `/address/${address}/txs/chain/${lastSeenTxid}`
      : `/address/${address}/txs/chain`;
    try {
      return await this.fetchJSON<ChainTx[]>(path);
    } catch { return []; }
  }

  async fetchOutspend(txid: string, vout: number): Promise<{ spent: boolean; txid?: string; vin?: number } | null> {
    try {
      return await this.fetchJSON<{ spent: boolean; txid?: string; vin?: number }>(
        `/tx/${txid}/outspend/${vout}`,
      );
    } catch { return null; }
  }
}
