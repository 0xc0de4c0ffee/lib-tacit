// Barrel export — every public symbol surfaces through here.
// Consumers can also deep-import specific subpaths for tree-shaking.

// Constants
export * from './constants/index.js';

// Crypto primitives
export * from './crypto/index.js';

// Envelope layer
export * from './envelope/index.js';

// Transaction tools
export * from './transaction/index.js';

// Wallet
export * from './wallet/index.js';

// Interfaces
export type { ChainClient, Broadcaster, ChainUTXO, ChainTx, Outpoint } from './interfaces/index.js';

// Opcodes
export * from './opcodes/index.js';
