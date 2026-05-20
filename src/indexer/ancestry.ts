// Recursive UTXO ancestry walker and validator.
// Walks each UTXO back through CXFER/MINT/BURN ancestors to the original
// CETCH/T_PETCH, validates every envelope at each hop. Memoized O(N).
//
// References tacit-specs/dapp/tacit.js validateOutpoint, scanHoldings patterns.

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, concatBytes } from '@noble/hashes/utils';
import type { ChainClient, ChainTx, Outpoint } from '../interfaces/chain-client.js';
import { decodeEnvelopeScript } from '../envelope/script.js';
import { Opcode, ShippedOpcodes } from '../constants/opcodes.js';
import {
  decodeCEtch, decodeCXfer, decodeCMint, decodeCBurn,
  decodeAXfer, decodePEtch, decodePMint, decodeCDrop, decodeCDClaim,
} from '../opcodes/index.js';
import { verifyKernel, assetIdFor } from '../crypto/kernel.js';
import { reverseBytesHex } from '../transaction/utils.js';

export type EnvelopeKind =
  | 'cetch' | 'cxfer' | 'cmint' | 'cburn'
  | 'axfer' | 'petch' | 'pmint'
  | 'cdrop' | 'cdrop-reclaim' | 'cdclaim'
  | 'deposit' | 'withdraw' | 'cxfer-bpp'
  | 'axfer-var' | 'wrapper-attest' | 'unknown';

export interface ParsedEnvelope {
  kind: EnvelopeKind;
  opcode: number;
  payload: Uint8Array;
  signingPubXonly: Uint8Array;
  data: Record<string, any>;
}

export interface AssetInfo {
  assetId: Uint8Array;
  ticker: string;
  decimals: number;
  mintable: boolean;
  supplyCommitment?: Uint8Array;
  capAmount?: bigint;
  mintLimit?: bigint;
}

export interface ValidatedUTXO {
  txid: string;
  vout: number;
  value: number;
  assetId?: Uint8Array;
  amount?: bigint;
  commitment?: Uint8Array;
  envelope?: ParsedEnvelope;
  isValid: boolean;
  error?: string;
  depth: number;
}

export interface AncestryResult {
  root: ValidatedUTXO;
  path: ValidatedUTXO[];
  isValid: boolean;
  assetInfo?: AssetInfo;
}

// --- Envelope parser ---

function parseEnvelope(witness: Uint8Array): ParsedEnvelope | null {
  const decoded = decodeEnvelopeScript(witness);
  if (!decoded) return null;
  if (!ShippedOpcodes.has(decoded.opcode)) {
    return { kind: 'unknown', opcode: decoded.opcode, payload: decoded.payload, signingPubXonly: decoded.signingPubXonly, data: {} };
  }

  let data: Record<string, any> = {};
  let kind: EnvelopeKind;

  switch (decoded.opcode) {
    case Opcode.T_CETCH: {
      const d = decodeCEtch(decoded.payload);
      if (!d) return null;
      kind = 'cetch'; data = { ...d }; break;
    }
    case Opcode.T_CXFER: {
      const d = decodeCXfer(decoded.payload);
      if (!d) return null;
      kind = 'cxfer'; data = { ...d }; break;
    }
    case Opcode.T_MINT: {
      const d = decodeCMint(decoded.payload);
      if (!d) return null;
      kind = 'cmint'; data = { ...d }; break;
    }
    case Opcode.T_BURN: {
      const d = decodeCBurn(decoded.payload);
      if (!d) return null;
      kind = 'cburn'; data = { ...d }; break;
    }
    case Opcode.T_AXFER: {
      const d = decodeAXfer(decoded.payload);
      if (!d) return null;
      kind = 'axfer'; data = { ...d }; break;
    }
    case Opcode.T_PETCH: {
      const d = decodePEtch(decoded.payload);
      if (!d) return null;
      kind = 'petch'; data = { ...d }; break;
    }
    case Opcode.T_PMINT: {
      const d = decodePMint(decoded.payload);
      if (!d) return null;
      kind = 'pmint'; data = { ...d }; break;
    }
    case Opcode.T_DROP: {
      const d = decodeCDrop(decoded.payload);
      if (!d) return null;
      data = { ...d };
      kind = d.kind as EnvelopeKind; break;
    }
    case Opcode.T_DCLAIM: {
      const d = decodeCDClaim(decoded.payload);
      if (!d) return null;
      kind = 'cdclaim'; data = { ...d }; break;
    }
    default:
      kind = 'unknown'; data = { opcode: decoded.opcode };
  }

  return { kind, opcode: decoded.opcode, payload: decoded.payload, signingPubXonly: decoded.signingPubXonly, data };
}

function extractEnvelopeWitness(tx: ChainTx): Uint8Array | null {
  if (!tx.vin[0]?.witness?.length) return null;
  const wit1 = tx.vin[0].witness[1];
  if (!wit1) return null;
  if (typeof wit1 === 'string') {
    return new Uint8Array(wit1.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) ?? []);
  }
  return null;
}

// --- Ancestry Walker ---
//
// Recursively validates UTXOs by walking ancestry back to the CETCH/T_PETCH root.
// Verifies kernel signatures and envelope validity at each hop.
//
// LIMITATIONS:
//   - Cache is append-only (no reorg-aware invalidation). Call invalidate()
//     after detecting a chain reorganization to clear stale results.
//   - BTC fee inputs in T_AXFER are excluded via asset_input_count from the
//     decoded envelope; all other vin[1+] are treated as asset inputs.
//   - Witness elements must be hex-encoded strings (Esplora convention).

export class AncestryWalker {
  private client: ChainClient;
  private memo = new Map<string, ValidatedUTXO>();
  private txMemo = new Map<string, ChainTx | null>();
  private assetMemo = new Map<string, AssetInfo>();
  private pendingTx = new Map<string, Promise<ChainTx | null>>();
  private maxDepth = 100;

  constructor(client: ChainClient) {
    this.client = client;
  }

  invalidate(txid?: string, vout?: number): void {
    if (txid !== undefined && vout !== undefined) {
      this.memo.delete(`${txid}:${vout}`);
    } else {
      this.memo.clear(); this.txMemo.clear(); this.assetMemo.clear();
    }
  }

  private async fetchTx(txid: string): Promise<ChainTx | null> {
    const cached = this.txMemo.get(txid);
    if (cached !== undefined) return cached;

    // Dedup concurrent requests via promise caching
    const inFlight = this.pendingTx.get(txid);
    if (inFlight) return inFlight;

    const promise = this.fetchTxInner(txid);
    this.pendingTx.set(txid, promise);
    return promise;
  }

  private async fetchTxInner(txid: string): Promise<ChainTx | null> {
    try {
      const tx = await this.client.fetchTx(txid);
      // Store both null and valid results to prevent repeated fetches
      this.txMemo.set(txid, tx);
      return tx;
    } catch (e) {
      // On error, store null to prevent repeated fetches
      this.txMemo.set(txid, null);
      return null;
    } finally {
      this.pendingTx.delete(txid);
    }
  }

  cacheAssetInfo(assetId: Uint8Array, info: AssetInfo): void {
    this.assetMemo.set(bytesToHex(assetId), info);
  }

  // --- Validate a single UTXO ---

  async validateUTXO(txid: string, vout: number, depth = 0): Promise<ValidatedUTXO> {
    const key = `${txid}:${vout}`;
    const cached = this.memo.get(key);
    if (cached) return cached;

    if (depth > this.maxDepth) {
      const result: ValidatedUTXO = { txid, vout, value: 0, isValid: false, error: `max depth ${this.maxDepth}`, depth };
      this.memo.set(key, result);
      return result;
    }

    const result = await this.validateInner(txid, vout, depth);
    this.memo.set(key, result);
    return result;
  }

  private async validateInner(txid: string, vout: number, depth: number): Promise<ValidatedUTXO> {
    const tx = await this.fetchTx(txid);
    if (!tx) return { txid, vout, value: 0, isValid: false, error: 'tx not found', depth };

    const witness = extractEnvelopeWitness(tx);
    if (!witness) return { txid, vout, value: 0, isValid: false, error: 'no envelope witness', depth };

    const envelope = parseEnvelope(witness);
    if (!envelope) return { txid, vout, value: 0, isValid: false, error: 'invalid envelope', depth };

    const base = {
      txid, vout, value: tx.vout[vout]?.value ?? 0,
      envelope, isValid: true, depth,
    };

    switch (envelope.kind) {
      case 'cetch': {
        const d = envelope.data;
        const aid = assetIdFor(tx.txid, 0);
        this.cacheAssetInfo(aid, {
          assetId: aid, ticker: d.ticker, decimals: d.decimals,
          mintable: d.mintable, supplyCommitment: d.commitment,
        });
        return { ...base, assetId: aid, commitment: d.commitment };
      }

      case 'petch': {
        const d = envelope.data;
        const aid = assetIdFor(tx.txid, 0);
        this.cacheAssetInfo(aid, {
          assetId: aid, ticker: d.ticker, decimals: d.decimals,
          mintable: false, capAmount: d.capAmount, mintLimit: d.mintLimit,
        });
        return { ...base, assetId: aid };
      }

      case 'cxfer': case 'cxfer-bpp': {
        const d = envelope.data as any;
        const parentInputs: Outpoint[] = tx.vin.slice(1).map(v => ({ txid: v.txid, vout: v.vout }));
        const inputUTXOs = await Promise.all(parentInputs.map(inp => this.validateUTXO(inp.txid, inp.vout, depth + 1)));
        const inputCommits = inputUTXOs.filter(u => u.commitment).map(u => u.commitment!);
        const outputCommits = d.outputs?.map((o: any) => o.commitment) ?? [];
        try {
          if (!verifyKernel(d.kernelSig, d.assetId, parentInputs, inputCommits, outputCommits))
            return { ...base, isValid: false, error: 'kernel sig failed' };
        } catch { return { ...base, isValid: false, error: 'kernel sig threw' }; }
        return { ...base, assetId: d.assetId as Uint8Array };
      }

      case 'axfer': case 'axfer-var': {
        const d = envelope.data as any;
        const assetCount = d.assetInputCount ?? tx.vin.length - 1;
        // Only validate asset inputs (skip BTC fee inputs appended after)
        const parentInputs: Outpoint[] = tx.vin.slice(1, 1 + assetCount).map(v => ({ txid: v.txid, vout: v.vout }));
        const inputUTXOs = await Promise.all(parentInputs.map(inp => this.validateUTXO(inp.txid, inp.vout, depth + 1)));
        const inputCommits = inputUTXOs.filter(u => u.commitment).map(u => u.commitment!);
        const outputCommits = d.outputs?.map((o: any) => o.commitment) ?? [];
        try {
          if (!verifyKernel(d.kernelSig, d.assetId, parentInputs, inputCommits, outputCommits))
            return { ...base, isValid: false, error: 'kernel sig failed' };
        } catch { return { ...base, isValid: false, error: 'kernel sig threw' }; }
        return { ...base, assetId: d.assetId as Uint8Array };
      }

      case 'cburn': {
        const d = envelope.data as any;
        const parentInputs: Outpoint[] = tx.vin.slice(1).map(v => ({ txid: v.txid, vout: v.vout }));
        const inputUTXOs = await Promise.all(parentInputs.map(inp => this.validateUTXO(inp.txid, inp.vout, depth + 1)));
        const inputCommits = inputUTXOs.filter(u => u.commitment).map(u => u.commitment!);
        const outputCommits = d.outputs?.map((o: any) => o.commitment) ?? [];
        try {
          if (!verifyKernel(d.kernelSig, d.assetId, parentInputs, inputCommits, outputCommits, d.burnedAmount ?? 0n))
            return { ...base, isValid: false, error: 'BURN kernel sig failed' };
        } catch { return { ...base, isValid: false, error: 'BURN kernel sig threw' }; }
        return { ...base, assetId: d.assetId as Uint8Array };
      }

      case 'cmint': {
        return { ...base, assetId: (envelope.data as any).assetId as Uint8Array, commitment: (envelope.data as any).commitment as Uint8Array };
      }

      case 'pmint': {
        return { ...base, assetId: (envelope.data as any).assetId as Uint8Array, commitment: (envelope.data as any).commitment as Uint8Array };
      }

      case 'cdrop': case 'cdrop-reclaim': case 'cdclaim':
      case 'deposit': case 'withdraw': case 'wrapper-attest':
        return { ...base, isValid: true };

      default:
        return { ...base, isValid: false, error: `unknown envelope: ${envelope.kind}` };
    }
  }

  // --- Full ancestry walk ---

  async walkAncestry(txid: string, vout: number): Promise<AncestryResult> {
    const path: ValidatedUTXO[] = [];
    let current = await this.validateUTXO(txid, vout, 0);
    path.push(current);

    for (let i = 0; i < this.maxDepth; i++) {
      const parentTx = await this.fetchTx(current.txid);
      if (!parentTx || parentTx.vin.length < 2) break;
      // Skip vin[0] which is always the anchor/BTC fee input (never an asset parent)
      const assetInput = parentTx.vin[1]!;
      const parent = await this.validateUTXO(assetInput.txid, assetInput.vout, i + 1);
      path.push(parent);
      current = parent;
      if (parent.envelope?.kind === 'cetch' || parent.envelope?.kind === 'petch') break;
    }

    const assetInfo = current.assetId ? this.assetMemo.get(bytesToHex(current.assetId)) : undefined;
    return { root: current, path, isValid: path.every(u => u.isValid), assetInfo };
  }
}

export { bytesToHex };
