// Abstract interfaces for chain data access and transaction broadcasting.
// Consumers implement these against Esplora, bitcoind RPC, or other backends.

export interface Outpoint {
  txid: string;  // 64-hex, display form (BE)
  vout: number;
}

export interface ChainUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string; // hex-encoded — changed from Uint8Array in v0.1.0
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

export interface ChainTxVin {
  txid: string;
  vout: number;
  prevout: { scriptpubkey: string; value: number } | null;
  witness: string[];  // hex-encoded
  scriptsig: string;
  sequence: number;
  is_coinbase: boolean;
}

export interface ChainTxVout {
  scriptpubkey: string;
  value: number;
}

export interface ChainTx {
  txid: string;
  version: number;
  locktime: number;
  vin: ChainTxVin[];
  vout: ChainTxVout[];
  status: { confirmed: boolean; block_height?: number };
  fee: number;
  weight: number;
}

export interface ChainTip {
  height: number;
  hash: string;
}

export interface FeeEstimate {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface BroadcastResult {
  txid: string;
  success: boolean;
  error?: string;
}

// ChainClient: abstract block of chain data fetch operations.
export interface ChainClient {
  fetchTx(txid: string): Promise<ChainTx | null>;
  fetchUTXOs(address: string): Promise<ChainUTXO[]>;
  fetchTipHeight(): Promise<number>;
  fetchTip(): Promise<ChainTip | null>;
  fetchRawTx(txid: string): Promise<string | null>;
  fetchFeeEstimate(): Promise<FeeEstimate | null>;
  broadcast(rawTxHex: string): Promise<BroadcastResult>;
  fetchAddressTxs(address: string, lastSeenTxid?: string): Promise<ChainTx[]>;
  fetchOutspend(txid: string, vout: number): Promise<{ spent: boolean; txid?: string; vin?: number } | null>;
}

// Broadcaster is a subset of ChainClient — kept for backwards compatibility
export type Broadcaster = Pick<ChainClient, 'broadcast'>;
