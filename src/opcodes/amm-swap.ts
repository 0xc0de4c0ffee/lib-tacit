// T_SWAP_VAR (0x32) — Variable-amount AMM swap
// T_SWAP_ROUTE (0x33) — Multi-hop route swap
// SPEC §5.7.9 (SWAP_VAR), SPEC-SWAP-ROUTE-AMENDMENT (SWAP_ROUTE)

import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, hexToBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import { SWAP_ROUTE_N_HOPS_MAX, SWAP_ROUTE_HOP_BYTES } from '../constants/limits.js';
import { bytesToPoint } from '../crypto/pedersen.js';

// --- Interfaces ---

export interface SwapVarInput {
  poolId: Uint8Array;
  direction: number;
  R_A_pre: bigint | number;
  R_B_pre: bigint | number;
  deltaIn: bigint | number;
  deltaInMin: bigint | number;
  deltaInMax: bigint | number;
  deltaOut: bigint | number;
  minOut: bigint | number;
  tipAmount: bigint | number;
  tipAsset: number;
  expiryHeight: number;
  traderPubkey: Uint8Array;
  cInSecp: Uint8Array;
  cChangeOrSentinel: Uint8Array;
  cReceiptSecp: Uint8Array;
  rReceipt: Uint8Array;
  rangeProof: Uint8Array;
  kernelSig: Uint8Array;
  intentSig: Uint8Array;
}

export interface SwapVarDecoded {
  kind: 'swap_var';
  opcode: number;
  poolId: Uint8Array;
  direction: number;
  R_A_pre: bigint;
  R_B_pre: bigint;
  deltaIn: bigint;
  deltaInMin: bigint;
  deltaInMax: bigint;
  deltaOut: bigint;
  minOut: bigint;
  tipAmount: bigint;
  tipAsset: number;
  expiryHeight: number;
  traderPubkey: Uint8Array;
  cInSecp: Uint8Array;
  cChangeOrSentinel: Uint8Array;
  cReceiptSecp: Uint8Array;
  rReceipt: Uint8Array;
  rangeProof: Uint8Array;
  kernelSig: Uint8Array;
  intentSig: Uint8Array;
}

export interface SwapRouteHop {
  poolId: Uint8Array;
  direction: number;
  feeBps: number;
  R_A_pre: bigint | number;
  R_B_pre: bigint | number;
  deltaANetMag: bigint | number;
  deltaBNetMag: bigint | number;
}

export interface SwapRouteInput {
  traderInputAssetId: Uint8Array;
  traderOutputAssetId: Uint8Array;
  minOut: bigint | number;
  expiryHeight: number;
  traderPubkey: Uint8Array;
  hops: SwapRouteHop[];
  traderInputTxidBE: Uint8Array;
  traderInputVout: number;
  cInSecp: Uint8Array;
  cReceiptSecp: Uint8Array;
  rReceipt: Uint8Array;
  rangeProof: Uint8Array;
  kernelSig: Uint8Array;
  intentSig: Uint8Array;
}

export interface SwapRouteDecoded {
  kind: 'swap_route';
  opcode: number;
  nHops: number;
  traderInputAssetId: Uint8Array;
  traderOutputAssetId: Uint8Array;
  minOut: bigint;
  expiryHeight: number;
  traderPubkey: Uint8Array;
  hops: {
    poolId: Uint8Array;
    direction: number;
    feeBps: number;
    R_A_pre: bigint;
    R_B_pre: bigint;
    deltaANetMag: bigint;
    deltaBNetMag: bigint;
  }[];
  traderInputTxidBE: Uint8Array;
  traderInputVout: number;
  cInSecp: Uint8Array;
  cReceiptSecp: Uint8Array;
  rReceipt: Uint8Array;
  rangeProof: Uint8Array;
  kernelSig: Uint8Array;
  intentSig: Uint8Array;
}

// --- Domain separation ---

const _AMM_POOL_ID_DOMAIN = new TextEncoder().encode('tacit-amm-pool-v1');
const _AMM_ZERO_PROTOCOL_FEE_ADDRESS = new Uint8Array(33);

// --- LE encoding helpers ---

export function u64LE(n: bigint | number): Uint8Array {
  const b = new Uint8Array(8);
  let x = BigInt(n);
  if (x < 0n || x >= 1n << 64n) throw new Error('u64 overflow');
  for (let i = 0; i < 8; i++) { b[i] = Number(x & 0xffn); x >>= 8n; }
  return b;
}

export function u32LE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

export function u16LE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n & 0xffff, true);
  return b;
}

// --- LE decoding helpers ---

export function readU64(payload: Uint8Array, offset: number): bigint {
  const view = new DataView(payload.buffer, payload.byteOffset + offset, 8);
  return (BigInt(view.getUint32(4, true)) << 32n) | BigInt(view.getUint32(0, true));
}

export function readU32(payload: Uint8Array, offset: number): number {
  const view = new DataView(payload.buffer, payload.byteOffset + offset, 4);
  return view.getUint32(0, true);
}

export function readU16(payload: Uint8Array, offset: number): number {
  const view = new DataView(payload.buffer, payload.byteOffset + offset, 2);
  return view.getUint16(0, true);
}

// --- Hop encoding ---

function encodeSwapRouteHop(hop: SwapRouteHop): Uint8Array {
  if (hop.poolId.length !== 32) throw new Error('hop.poolId must be 32 bytes');
  if (hop.direction !== 0 && hop.direction !== 1) throw new Error('hop.direction must be 0|1');
  if (!Number.isInteger(hop.feeBps) || hop.feeBps < 0 || hop.feeBps > 1000) throw new Error('hop.feeBps must be 0..1000');
  return concatBytes(
    hop.poolId,
    new Uint8Array([hop.direction & 0xff]),
    u16LE(hop.feeBps),
    u64LE(hop.R_A_pre),
    u64LE(hop.R_B_pre),
    u64LE(hop.deltaANetMag),
    u64LE(hop.deltaBNetMag),
  );
}

// --- T_SWAP_VAR encode/decode ---

export function encodeSwapVar(input: SwapVarInput): Uint8Array {
  if (input.poolId.length !== 32) throw new Error('pool_id must be 32 bytes');
  if (input.direction !== 0 && input.direction !== 1) throw new Error('direction must be 0|1');
  if (input.tipAsset !== 0 && input.tipAsset !== 1) throw new Error('tip_asset must be 0|1');
  if (input.traderPubkey.length !== 33) throw new Error('trader_pubkey must be 33 bytes');
  if (input.cInSecp.length !== 33) throw new Error('c_in_secp must be 33 bytes');
  if (input.cChangeOrSentinel.length !== 33) throw new Error('c_change_or_sentinel must be 33 bytes');
  if (input.cReceiptSecp.length !== 33) throw new Error('c_receipt_secp must be 33 bytes');
  if (input.rReceipt.length !== 32) throw new Error('r_receipt must be 32 bytes');
  if (input.rangeProof.length === 0 || input.rangeProof.length > 0xffff) throw new Error('range_proof len must be 1..65535');
  if (input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (input.intentSig.length !== 64) throw new Error('intent_sig must be 64 bytes');

  return concatBytes(
    new Uint8Array([Opcode.T_SWAP_VAR]),
    input.poolId,
    new Uint8Array([input.direction & 0xff]),
    u64LE(input.R_A_pre), u64LE(input.R_B_pre),
    u64LE(input.deltaIn), u64LE(input.deltaInMin), u64LE(input.deltaInMax),
    u64LE(input.deltaOut), u64LE(input.minOut), u64LE(input.tipAmount),
    new Uint8Array([input.tipAsset & 0xff]),
    u32LE(input.expiryHeight),
    input.traderPubkey, input.cInSecp, input.cChangeOrSentinel, input.cReceiptSecp, input.rReceipt,
    u16LE(input.rangeProof.length), input.rangeProof,
    input.kernelSig, input.intentSig,
  );
}

export function decodeSwapVar(payload: Uint8Array): SwapVarDecoded | null {
  if (!payload) return null;
  if (payload.length < 297) return null;
  let p = 0;
  const opcode = payload[p]; p += 1;
  if (opcode !== Opcode.T_SWAP_VAR) return null;
  const poolId = payload.slice(p, p + 32); p += 32;
  const direction = payload[p]; p += 1;
  if (direction !== 0 && direction !== 1) return null;
  const dv = new DataView(payload.buffer, payload.byteOffset);
  function readU64(): bigint {
    const lo = BigInt(dv.getUint32(p, true));
    const hi = BigInt(dv.getUint32(p + 4, true));
    p += 8;
    return (hi << 32n) | lo;
  }
  const R_A_pre = readU64();
  const R_B_pre = readU64();
  const deltaIn = readU64();
  const deltaInMin = readU64();
  const deltaInMax = readU64();
  const deltaOut = readU64();
  const minOut = readU64();
  const tipAmount = readU64();
  const tipAsset = payload[p]; p += 1;
  if (tipAsset !== 0 && tipAsset !== 1) return null;
  const expiryHeight = dv.getUint32(p, true); p += 4;
  const traderPubkey = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(traderPubkey); } catch { return null; }
  const cInSecp = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(cInSecp); } catch { return null; }
  const cChangeOrSentinel = payload.slice(p, p + 33); p += 33;
  let isSentinel = true;
  for (let i = 0; i < 33; i++) if (cChangeOrSentinel[i] !== 0) { isSentinel = false; break; }
  if (!isSentinel) {
    try { bytesToPoint(cChangeOrSentinel); } catch { return null; }
  }
  const cReceiptSecp = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(cReceiptSecp); } catch { return null; }
  const rReceipt = payload.slice(p, p + 32); p += 32;
  if (p + 2 > payload.length) return null;
  const rpLen = dv.getUint16(p, true); p += 2;
  if (rpLen === 0) return null;
  if (p + rpLen + 64 + 64 > payload.length) return null;
  const rangeProof = payload.slice(p, p + rpLen); p += rpLen;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const intentSig = payload.slice(p, p + 64); p += 64;
  if (p !== payload.length) return null;
  return {
    kind: 'swap_var',
    opcode,
    poolId, direction,
    R_A_pre, R_B_pre, deltaIn, deltaInMin, deltaInMax, deltaOut, minOut, tipAmount, tipAsset,
    expiryHeight,
    traderPubkey, cInSecp, cChangeOrSentinel, cReceiptSecp,
    rReceipt, rangeProof, kernelSig, intentSig,
  };
}

// --- T_SWAP_ROUTE encode/decode ---

export function encodeSwapRoute(input: SwapRouteInput): Uint8Array {
  if (!Array.isArray(input.hops) || input.hops.length < 2 || input.hops.length > SWAP_ROUTE_N_HOPS_MAX) {
    throw new Error(`hops length must be 2..${SWAP_ROUTE_N_HOPS_MAX}`);
  }
  if (input.traderInputAssetId.length !== 32) throw new Error('trader_input_asset_id must be 32 bytes');
  if (input.traderOutputAssetId.length !== 32) throw new Error('trader_output_asset_id must be 32 bytes');
  if (input.traderPubkey.length !== 33) throw new Error('trader_pubkey must be 33 bytes');
  if (input.traderInputTxidBE.length !== 32) throw new Error('trader_input_txid_be must be 32 bytes');
  if (input.cInSecp.length !== 33) throw new Error('c_in_secp must be 33 bytes');
  if (input.cReceiptSecp.length !== 33) throw new Error('c_receipt_secp must be 33 bytes');
  if (input.rReceipt.length !== 32) throw new Error('r_receipt must be 32 bytes');
  if (input.rangeProof.length === 0 || input.rangeProof.length > 0xffff) throw new Error('range_proof len must be 1..65535');
  if (input.kernelSig.length !== 64) throw new Error('kernel_sig must be 64 bytes');
  if (input.intentSig.length !== 64) throw new Error('intent_sig must be 64 bytes');

  return concatBytes(
    new Uint8Array([Opcode.T_SWAP_ROUTE, input.hops.length & 0xff]),
    input.traderInputAssetId, input.traderOutputAssetId,
    u64LE(input.minOut), u32LE(input.expiryHeight),
    input.traderPubkey,
    ...input.hops.map(encodeSwapRouteHop),
    input.traderInputTxidBE,
    u32LE(input.traderInputVout),
    input.cInSecp, input.cReceiptSecp, input.rReceipt,
    u16LE(input.rangeProof.length), input.rangeProof,
    input.kernelSig, input.intentSig,
  );
}

export function decodeSwapRoute(payload: Uint8Array): SwapRouteDecoded | null {
  if (!payload) return null;
  if (payload.length < 434) return null;
  let p = 0;
  const opcode = payload[p]; p += 1;
  if (opcode !== Opcode.T_SWAP_ROUTE) return null;
  const nHops = payload[p]; p += 1;
  if (nHops < 2 || nHops > SWAP_ROUTE_N_HOPS_MAX) return null;

  const traderInputAssetId = payload.slice(p, p + 32); p += 32;
  const traderOutputAssetId = payload.slice(p, p + 32); p += 32;
  let sameAsset = true;
  for (let i = 0; i < 32; i++) {
    if (traderInputAssetId[i] !== traderOutputAssetId[i]) { sameAsset = false; break; }
  }
  if (sameAsset) return null;

  const dv = new DataView(payload.buffer, payload.byteOffset);
  function readU64(): bigint {
    const lo = BigInt(dv.getUint32(p, true));
    const hi = BigInt(dv.getUint32(p + 4, true));
    p += 8;
    return (hi << 32n) | lo;
  }
  const minOut = readU64();
  const expiryHeight = dv.getUint32(p, true); p += 4;
  const traderPubkey = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(traderPubkey); } catch { return null; }

  if (p + nHops * SWAP_ROUTE_HOP_BYTES > payload.length) return null;
  const hops: SwapRouteDecoded['hops'] = [];
  for (let k = 0; k < nHops; k++) {
    const poolId = payload.slice(p, p + 32); p += 32;
    const direction = payload[p]; p += 1;
    if (direction !== 0 && direction !== 1) return null;
    const feeBps = dv.getUint16(p, true); p += 2;
    if (feeBps > 1000) return null;
    const R_A_pre = readU64();
    const R_B_pre = readU64();
    const deltaANetMag = readU64();
    const deltaBNetMag = readU64();
    hops.push({ poolId, direction, feeBps, R_A_pre, R_B_pre, deltaANetMag, deltaBNetMag });
  }

  if (p + 36 > payload.length) return null;
  const traderInputTxidBE = payload.slice(p, p + 32); p += 32;
  const traderInputVout = dv.getUint32(p, true); p += 4;

  if (p + 33 + 33 + 32 + 2 > payload.length) return null;
  const cInSecp = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(cInSecp); } catch { return null; }
  const cReceiptSecp = payload.slice(p, p + 33); p += 33;
  try { bytesToPoint(cReceiptSecp); } catch { return null; }
  const rReceipt = payload.slice(p, p + 32); p += 32;

  const rpLen = dv.getUint16(p, true); p += 2;
  if (rpLen === 0) return null;
  if (p + rpLen + 64 + 64 > payload.length) return null;
  const rangeProof = payload.slice(p, p + rpLen); p += rpLen;
  const kernelSig = payload.slice(p, p + 64); p += 64;
  const intentSig = payload.slice(p, p + 64); p += 64;
  if (p !== payload.length) return null;

  return {
    kind: 'swap_route',
    opcode, nHops,
    traderInputAssetId, traderOutputAssetId,
    minOut, expiryHeight, traderPubkey,
    hops,
    traderInputTxidBE, traderInputVout,
    cInSecp, cReceiptSecp, rReceipt,
    rangeProof, kernelSig, intentSig,
  };
}

// --- Pool helpers ---

export function lexCanonicalAssetPair(
  idA: Uint8Array | string,
  idB: Uint8Array | string,
): [Uint8Array, Uint8Array] {
  const a = idA instanceof Uint8Array ? idA : hexToBytes(idA);
  const b = idB instanceof Uint8Array ? idB : hexToBytes(idB);
  if (a.length !== 32 || b.length !== 32) throw new Error('asset_id must be 32 bytes');
  for (let i = 0; i < 32; i++) {
    if (a[i] < b[i]) return [a, b];
    if (a[i] > b[i]) return [b, a];
  }
  throw new Error('canonical pair: identical asset_ids');
}

// --- Curve math ---

export function swapVarCurveDeltaOut(
  direction: number,
  R_A_pre: bigint | number,
  R_B_pre: bigint | number,
  deltaIn: bigint | number,
  feeBps: number,
): { deltaOut: bigint; raPost: bigint; rbPost: bigint } {
  const ra = BigInt(R_A_pre);
  const rb = BigInt(R_B_pre);
  const din = BigInt(deltaIn);
  const fbps = BigInt(feeBps);
  if (ra <= 0n || rb <= 0n) throw new Error('reserves must be > 0');
  if (din <= 0n) throw new Error('delta_in must be > 0');
  if (fbps < 0n || fbps > 1000n) throw new Error('fee_bps out of range');
  if (ra >= 1n << 64n || rb >= 1n << 64n || din >= 1n << 64n) throw new Error('values must fit u64');
  const gNum = 10000n - fbps;
  const gDen = 10000n;
  let num: bigint, den: bigint, deltaOut: bigint, raPost: bigint, rbPost: bigint;
  if (direction === 0) {
    num = rb * gNum * din;
    den = ra * gDen + gNum * din;
    deltaOut = num / den;
    raPost = ra + din;
    rbPost = rb - deltaOut;
  } else if (direction === 1) {
    num = ra * gNum * din;
    den = rb * gDen + gNum * din;
    deltaOut = num / den;
    raPost = ra - deltaOut;
    rbPost = rb + din;
  } else {
    throw new Error('direction must be 0 or 1');
  }
  if (deltaOut >= 1n << 64n) throw new Error('delta_out overflows u64');
  if (raPost <= 0n || rbPost <= 0n) throw new Error('post-reserve non-positive');
  if (raPost >= 1n << 64n) throw new Error('post-reserve_A overflows u64');
  if (rbPost >= 1n << 64n) throw new Error('post-reserve_B overflows u64');
  return { deltaOut, raPost, rbPost };
}

// --- Pool ID derivation ---

function _ammIsZeroProtocolFeeAddress(b: Uint8Array): boolean {
  for (let i = 0; i < b.length; i++) if (b[i] !== 0) return false;
  return true;
}

export function ammDerivePoolId(
  idA: Uint8Array | string,
  idB: Uint8Array | string,
  feeBps: number,
  capabilityFlags: number,
  protocolFeeAddress?: Uint8Array | string | null,
  protocolFeeBps?: number | null,
): Uint8Array {
  const [low, high] = lexCanonicalAssetPair(idA, idB);
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) {
    throw new Error(`fee_bps out of range [0, 1000]: ${feeBps}`);
  }
  if (!Number.isInteger(capabilityFlags) || capabilityFlags < 0 || capabilityFlags > 255) {
    throw new Error(`capability_flags out of range u8: ${capabilityFlags}`);
  }
  const feeBpsLE = new Uint8Array(2);
  new DataView(feeBpsLE.buffer).setUint16(0, feeBps, true);
  const flagsByte = new Uint8Array([capabilityFlags]);

  const pfBps = protocolFeeBps == null ? 0 : protocolFeeBps;
  if (!Number.isInteger(pfBps) || pfBps < 0 || pfBps > 1000) {
    throw new Error(`protocol_fee_bps out of range [0, 1000]: ${pfBps}`);
  }
  let pfAddr: Uint8Array;
  if (protocolFeeAddress == null) {
    pfAddr = _AMM_ZERO_PROTOCOL_FEE_ADDRESS;
  } else {
    pfAddr = protocolFeeAddress instanceof Uint8Array ? protocolFeeAddress : hexToBytes(protocolFeeAddress);
    if (pfAddr.length !== 33) throw new Error(`protocol_fee_address must be 33 bytes: got ${pfAddr.length}`);
  }
  const pfAddrZero = _ammIsZeroProtocolFeeAddress(pfAddr);
  if ((pfBps === 0) !== pfAddrZero) {
    throw new Error('protocol_fee_address and protocol_fee_bps must be joint-zero or joint-non-zero');
  }
  if (pfBps === 0) {
    return sha256(concatBytes(_AMM_POOL_ID_DOMAIN, low, high, feeBpsLE, flagsByte));
  }
  const pfBpsLE = new Uint8Array(2);
  new DataView(pfBpsLE.buffer).setUint16(0, pfBps, true);
  return sha256(concatBytes(_AMM_POOL_ID_DOMAIN, low, high, feeBpsLE, flagsByte, pfAddr, pfBpsLE));
}
