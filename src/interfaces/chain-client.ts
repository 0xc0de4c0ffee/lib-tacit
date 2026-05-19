// Abstract interfaces for chain data access and transaction broadcasting.
// Consumers (wallet, indexer, dapp) implement these against their chosen
// backend (Esplora REST API, mempool.space, blockstream.info, etc.).
// The library itself contains zero network I/O.

export interface Outpoint {
  txid: string;  // 64-hex BE display form
  vout: number;
}

export interface ChainUTXO {
  txid: string;
  vout: number;
  value: number;       // satoshis
  scriptPubKey: Uint8Array;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface ChainTx {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: {
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: Uint8Array;
      value: number;
    } | null;
    scriptsig: Uint8Array;
    witness: Uint8Array[];
    sequence: number;
    is_coinbase: boolean;
  }[];
  vout: {
    scriptpubkey: Uint8Array;
    value: number;
  }[];
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

// ChainClient abstracts chain-data read operations.
// Implementations fetch from a Bitcoin RPC or Esplora REST API.
export interface ChainClient {
  // Fetch a transaction by txid.
  fetchTx(txid: string): Promise<ChainTx | null>;

  // Fetch UTXOs for an address.
  fetchUTXOs(address: string): Promise<ChainUTXO[]>;

  // Fetch current tip height.
  fetchTipHeight(): Promise<number>;

  // Fetch the raw transaction hex (for broadcast or local parsing).
  fetchRawTx(txid: string): Promise<string | null>;
}

// Broadcaster abstracts transaction submission.
export interface Broadcaster {
  // Broadcast a raw transaction hex and return the txid.
  broadcast(rawTxHex: string): Promise<string>;
}
