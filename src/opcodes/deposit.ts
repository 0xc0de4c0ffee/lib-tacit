// T_DEPOSIT (0x29) — Lock a fixed-denomination UTXO into a shielded pool.
// Two shapes share opcode 0x29:
//   denomination = 0: POOL_INIT (create a new pool)
//   denomination > 0: DEPOSIT (append a Poseidon leaf commitment)
// SPEC §5.10.
import { Opcode } from '../constants/opcodes.js';
import { ByteWriter, u64LE } from '../envelope/payload.js';

// --- POOL_INIT shape (denomination = 0) ---
export interface PoolInitInput {
  assetId: Uint8Array;
  poolDenom: bigint;
  vkCid: Uint8Array;       // IPFS CID bytes of verifying key
  ceremonyCid: Uint8Array; // IPFS CID bytes of ceremony bundle
  initSig: Uint8Array;     // 64-byte BIP-340 init signature
}

export interface PoolInitOutput {
  kind: 'pool-init';
  assetId: Uint8Array;
  poolDenom: bigint;
  vkCid: Uint8Array;
  ceremonyCid: Uint8Array;
  initSig: Uint8Array;
}

// --- DEPOSIT shape (denomination > 0) ---
export interface DepositInput {
  assetId: Uint8Array;
  denomination: bigint;
  leafCommitment: Uint8Array; // 32 bytes Poseidon3(secret, ν, denomination)
  kernelSig: Uint8Array;      // 64 bytes BIP-340 kernel signature
}

export interface DepositOutput {
  kind: 'deposit';
  assetId: Uint8Array;
  denomination: bigint;
  leafCommitment: Uint8Array;
  kernelSig: Uint8Array;
}

// --- Utility: detect if a raw payload is POOL_INIT ---
export function isPoolInit(payload: Uint8Array): boolean {
  if (!payload || payload.length < 1 + 32 + 8) return false;
  if (payload[0] !== Opcode.T_DEPOSIT) return false;
  // Read denomination at offset 1+32 = 33, 8 bytes LE
  const view = new DataView(payload.buffer, payload.byteOffset + 33, 8);
  return view.getBigUint64(0, true) === 0n;
}

export function encodeDeposit(input: DepositInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.denomination <= 0n || input.denomination >= (1n << 64n)) throw new Error('denomination out of u64 range');
  if (!input.leafCommitment || input.leafCommitment.length !== 32) throw new Error('leaf_commitment must be 32 bytes');
  if (!input.kernelSig || input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  const w = new ByteWriter();
  w.u8(Opcode.T_DEPOSIT);
  w.push(input.assetId);
  w.push(u64LE(input.denomination));
  w.push(input.leafCommitment);
  w.push(input.kernelSig);
  return w.out();
}

export function encodePoolInit(input: PoolInitInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (input.poolDenom <= 0n || input.poolDenom >= (1n << 64n)) throw new Error('pool_denom out of u64 range');
  if (!input.vkCid || input.vkCid.length < 1 || input.vkCid.length > 64) throw new Error('vk_cid must be 1–64 bytes');
  if (!input.ceremonyCid || input.ceremonyCid.length < 1 || input.ceremonyCid.length > 64) throw new Error('ceremony_cid must be 1–64 bytes');
  if (!input.initSig || input.initSig.length !== 64) throw new Error('init_sig must be 64 bytes');
  const w = new ByteWriter();
  w.u8(Opcode.T_DEPOSIT);
  w.push(input.assetId);
  w.push(u64LE(0n)); // denomination = 0 sentinel
  w.push(u64LE(input.poolDenom));
  w.u8(input.vkCid.length);
  w.push(input.vkCid);
  w.u8(input.ceremonyCid.length);
  w.push(input.ceremonyCid);
  w.push(input.initSig);
  return w.out();
}

export function decodeDeposit(payload: Uint8Array): DepositOutput | PoolInitOutput | null {
  if (!payload || payload.length < 1 + 32 + 8) return null;
  if (payload[0] !== Opcode.T_DEPOSIT) return null;
  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const denomView = new DataView(payload.buffer, payload.byteOffset + p, 8);
  const denomination = denomView.getBigUint64(0, true); p += 8;

  if (denomination === 0n) {
    // POOL_INIT shape
    if (payload.length < 1 + 32 + 8 + 8 + 1 + 1 + 64) return null;
    const poolDenomView = new DataView(payload.buffer, payload.byteOffset + p, 8);
    const poolDenom = poolDenomView.getBigUint64(0, true); p += 8;
    const vkCidLen = payload[p]!; p += 1;
    if (p + vkCidLen > payload.length) return null;
    const vkCid = payload.slice(p, p + vkCidLen); p += vkCidLen;
    if (vkCidLen < 1 || vkCidLen > 64) return null;
    if (p + 1 > payload.length) return null;
    const ceremonyCidLen = payload[p]!; p += 1;
    if (ceremonyCidLen < 1 || ceremonyCidLen > 64) return null;
    if (p + ceremonyCidLen > payload.length) return null;
    const ceremonyCid = payload.slice(p, p + ceremonyCidLen); p += ceremonyCidLen;
    const initSig = payload.slice(p, p + 64); p += 64;
    if (p !== payload.length) return null;
    if (poolDenom <= 0n || poolDenom >= (1n << 64n)) return null;
    return { kind: 'pool-init', assetId, poolDenom, vkCid, ceremonyCid, initSig };
  }

  // DEPOSIT shape (denomination > 0)
  if (payload.length < 1 + 32 + 8 + 32 + 64) return null;
  const leafCommitment = payload.slice(p, p + 32); p += 32;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  if (p !== payload.length) return null;
  return { kind: 'deposit', assetId, denomination, leafCommitment, kernelSig };
}
