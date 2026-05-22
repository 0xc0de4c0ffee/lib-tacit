// Blinded-pubkey commits per SPEC-BLINDED-PUBKEY-AMENDMENT (reference: tacit-specs/tests/stealth-primitives.mjs).

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { concatBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import {
  CXFER_STEALTH_DOMAIN,
  CXFER_BPP_STEALTH_DOMAIN,
  AXFER_STEALTH_DOMAIN,
  AXFER_VAR_STEALTH_DOMAIN,
} from '../constants/domains.js';
import { SECP_N } from '../constants/limits.js';
import { buildAnchor } from '../transaction/utils.js';
import { p2wpkhScript } from '../transaction/address.js';
import './pedersen.js';

const G = secp.ProjectivePoint.BASE;
const ZERO = secp.ProjectivePoint.ZERO;
const domainBytes = (tag: string) => new TextEncoder().encode(tag);

export type StealthNetwork = 'mainnet' | 'signet' | 'regtest';

export const STEALTH_HRP: Record<StealthNetwork, string> = {
  mainnet: 'tcs',
  signet: 'tcsts',
  regtest: 'tcsrt',
};

export const DOMAIN_CXFER_STEALTH = domainBytes(CXFER_STEALTH_DOMAIN);
export const DOMAIN_CXFER_BPP_STEALTH = domainBytes(CXFER_BPP_STEALTH_DOMAIN);
export const DOMAIN_AXFER_STEALTH = domainBytes(AXFER_STEALTH_DOMAIN);
export const DOMAIN_AXFER_VAR_STEALTH = domainBytes(AXFER_VAR_STEALTH_DOMAIN);

export const STEALTH_DOMAIN_BY_OPCODE = new Map<number, Uint8Array>([
  [Opcode.T_CXFER_BPP, DOMAIN_CXFER_BPP_STEALTH],
  [Opcode.T_CXFER, DOMAIN_CXFER_STEALTH],
  [Opcode.T_AXFER, DOMAIN_AXFER_STEALTH],
  [Opcode.T_AXFER_VAR, DOMAIN_AXFER_VAR_STEALTH],
  [Opcode.T_AXFER_BPP, DOMAIN_AXFER_STEALTH],
  [Opcode.T_AXFER_VAR_BPP, DOMAIN_AXFER_VAR_STEALTH],
]);

export const MIXER_EMITTING_OPCODES = new Set<number>([
  Opcode.T_WITHDRAW,
  Opcode.T_SLOT_BURN,
]);

export type StealthInputKind =
  | 'p2wpkh'
  | 'p2tr-keypath'
  | 'p2wsh'
  | 'p2tr-scriptpath'
  | 'mixer-derived'
  | 'unknown';

export interface ClassifiedStealthInput {
  kind: StealthInputKind;
  pub: Uint8Array | null;
}

export interface StealthEmissionSafety {
  safe: boolean;
  reason: string;
}

export interface StealthCredit {
  voutIndex: number;
  scriptKind: 'p2wpkh' | 'p2tr';
  tweakedSk: Uint8Array;
  commit: Uint8Array;
  blinding: bigint;
  senderAggregatePub: Uint8Array;
}

export type DecodedStealthAddress =
  | { network: StealthNetwork; mode: 'single'; recipientPub: Uint8Array }
  | { network: StealthNetwork; mode: 'dual'; scanPub: Uint8Array; spendPub: Uint8Array };

// --- Bech32m address codec (§D.1) ---

const BECH32M_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32M_CONST = 0x2bc830a3;

function bech32mChecksumPolymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]!;
  }
  return chk;
}

function bech32mExpandHrp(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >>> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}

function bech32mCreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32mExpandHrp(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32mChecksumPolymod(values) ^ BECH32M_CONST;
  const out: number[] = [];
  for (let i = 0; i < 6; i++) out.push((polymod >>> (5 * (5 - i))) & 31);
  return out;
}

function bech32mVerifyChecksum(hrp: string, data: number[]): boolean {
  return bech32mChecksumPolymod(bech32mExpandHrp(hrp).concat(data)) === BECH32M_CONST;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const v of data) {
    if (v < 0 || (v >>> fromBits) !== 0) throw new Error('convertBits: invalid input');
    acc = (acc << fromBits) | v;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >>> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('convertBits: invalid padding');
  }
  return ret;
}

function bech32mEncode(hrp: string, dataBytes: Uint8Array): string {
  const data5bit = convertBits(Array.from(dataBytes), 8, 5, true);
  const checksum = bech32mCreateChecksum(hrp, data5bit);
  let out = hrp + '1';
  for (const v of data5bit.concat(checksum)) out += BECH32M_ALPHABET[v]!;
  return out;
}

function bech32mDecode(addr: string): { hrp: string; payloadBytes: Uint8Array } {
  const lower = addr.toLowerCase();
  const upper = addr.toUpperCase();
  if (lower !== addr && upper !== addr) throw new Error('mixed case');
  addr = lower;
  const sep = addr.lastIndexOf('1');
  if (sep < 1 || sep + 7 > addr.length) throw new Error('separator position invalid');
  const hrp = addr.slice(0, sep);
  const data5bit: number[] = [];
  for (let i = sep + 1; i < addr.length; i++) {
    const idx = BECH32M_ALPHABET.indexOf(addr[i]!);
    if (idx === -1) throw new Error(`invalid char ${addr[i]}`);
    data5bit.push(idx);
  }
  if (!bech32mVerifyChecksum(hrp, data5bit)) throw new Error('checksum');
  const payload5bit = data5bit.slice(0, data5bit.length - 6);
  return { hrp, payloadBytes: new Uint8Array(convertBits(payload5bit, 5, 8, false)) };
}

export function encodeStealthAddress(opts: {
  network: StealthNetwork;
  recipientPub?: Uint8Array;
  scanPub?: Uint8Array;
  spendPub?: Uint8Array;
}): string {
  const { network, recipientPub, scanPub, spendPub } = opts;
  const hrp = STEALTH_HRP[network];
  if (!hrp) throw new Error(`unknown network: ${network}`);
  const version = 0x00;
  let mode: number;
  let payload: Uint8Array;
  if (recipientPub && !scanPub && !spendPub) {
    if (recipientPub.length !== 33) throw new Error('recipientPub must be 33-byte compressed');
    mode = 0x00;
    payload = recipientPub;
  } else if (scanPub && spendPub) {
    if (scanPub.length !== 33 || spendPub.length !== 33) {
      throw new Error('scanPub + spendPub must be 33-byte compressed each');
    }
    mode = 0x01;
    payload = concatBytes(scanPub, spendPub);
  } else {
    throw new Error('provide either {recipientPub} or {scanPub, spendPub}');
  }
  return bech32mEncode(hrp, concatBytes(new Uint8Array([version, mode]), payload));
}

export function decodeStealthAddress(addr: string): DecodedStealthAddress {
  const { hrp, payloadBytes } = bech32mDecode(addr);
  let network: StealthNetwork | undefined;
  for (const [net, h] of Object.entries(STEALTH_HRP) as [StealthNetwork, string][]) {
    if (hrp === h) {
      network = net;
      break;
    }
  }
  if (!network) throw new Error(`HRP ${hrp} is not a tacit stealth HRP`);
  if (payloadBytes.length < 2) throw new Error('payload too short');
  const version = payloadBytes[0]!;
  const mode = payloadBytes[1]!;
  if (version !== 0x00) throw new Error(`unsupported version ${version}`);
  if (mode === 0x00) {
    if (payloadBytes.length !== 35) throw new Error('single-mode payload must be 33 bytes');
    const recipientPub = payloadBytes.slice(2, 35);
    try {
      secp.ProjectivePoint.fromHex(bytesToHex(recipientPub));
    } catch {
      throw new Error('recipientPub is not a valid secp256k1 point');
    }
    return { network, mode: 'single', recipientPub };
  }
  if (mode === 0x01) {
    if (payloadBytes.length !== 68) throw new Error('dual-mode payload must be 66 bytes');
    const scanPub = payloadBytes.slice(2, 35);
    const spendPub = payloadBytes.slice(35, 68);
    try {
      secp.ProjectivePoint.fromHex(bytesToHex(scanPub));
      secp.ProjectivePoint.fromHex(bytesToHex(spendPub));
    } catch {
      throw new Error('scan/spend pubkey is not a valid secp256k1 point');
    }
    return { network, mode: 'dual', scanPub, spendPub };
  }
  throw new Error(`unsupported mode ${mode}`);
}

function networkTagByte(network: StealthNetwork | number): number {
  if (typeof network === 'number') return network & 0xff;
  if (network === 'mainnet') return 0x00;
  if (network === 'signet') return 0x01;
  if (network === 'regtest') return 0x02;
  throw new Error(`unknown network: ${network}`);
}

export function deriveSelfBlinding(opts: {
  walletPriv: Uint8Array;
  networkTag: StealthNetwork | number;
  domain: Uint8Array;
  anchor: Uint8Array;
}): bigint {
  const { walletPriv, networkTag, domain, anchor } = opts;
  if (walletPriv.length !== 32) throw new Error('walletPriv must be 32 bytes');
  if (anchor.length === 0) throw new Error('anchor must be non-empty');
  const tagByte = new Uint8Array([networkTagByte(networkTag)]);
  const mac = hmac(sha256, walletPriv, concatBytes(domain, tagByte, anchor));
  const b = BigInt('0x' + bytesToHex(mac)) % SECP_N;
  if (b === 0n) throw new Error('blinding derived zero (statistically impossible)');
  return b;
}

export function deriveStealthEcdhSharedSecret(opts: {
  ourPriv: Uint8Array;
  theirPub: Uint8Array;
}): Uint8Array {
  const { ourPriv, theirPub } = opts;
  if (ourPriv.length !== 32) throw new Error('ourPriv must be 32 bytes');
  if (theirPub.length !== 33) throw new Error('theirPub must be 33 bytes compressed');
  const ourPrivBig = BigInt('0x' + bytesToHex(ourPriv));
  const theirPt = secp.ProjectivePoint.fromHex(bytesToHex(theirPub));
  const sharedPt = theirPt.multiply(ourPrivBig);
  return sha256(sharedPt.toRawBytes(true).slice(1));
}

export function deriveStealthBlindingFromShared(opts: {
  shared: Uint8Array;
  networkTag: StealthNetwork | number;
  domain: Uint8Array;
  txAnchor: Uint8Array;
}): bigint {
  const { shared, networkTag, domain, txAnchor } = opts;
  const tagByte = new Uint8Array([networkTagByte(networkTag)]);
  const mac = hmac(sha256, shared, concatBytes(domain, tagByte, txAnchor));
  const b = BigInt('0x' + bytesToHex(mac)) % SECP_N;
  if (b === 0n) throw new Error('ECDH blinding derived zero (statistically impossible)');
  return b;
}

export function deriveStealthEcdhBlinding(opts: {
  ourPriv: Uint8Array;
  theirPub: Uint8Array;
  networkTag: StealthNetwork | number;
  domain: Uint8Array;
  txAnchor: Uint8Array;
}): bigint {
  const shared = deriveStealthEcdhSharedSecret({
    ourPriv: opts.ourPriv,
    theirPub: opts.theirPub,
  });
  return deriveStealthBlindingFromShared({
    shared,
    networkTag: opts.networkTag,
    domain: opts.domain,
    txAnchor: opts.txAnchor,
  });
}

export function computeStealthCommit(opts: {
  underlyingPub: Uint8Array;
  blinding: bigint;
}): Uint8Array {
  const { underlyingPub, blinding } = opts;
  if (underlyingPub.length !== 33) throw new Error('underlyingPub must be 33 bytes compressed');
  const pt = secp.ProjectivePoint.fromHex(bytesToHex(underlyingPub));
  const commitPt = pt.add(G.multiply(blinding));
  if (commitPt.equals(ZERO)) throw new Error('commit equals point at infinity');
  return commitPt.toRawBytes(true);
}

export function computeStealthTweakedSk(opts: {
  underlyingPriv: Uint8Array;
  blinding: bigint;
}): Uint8Array {
  const { underlyingPriv, blinding } = opts;
  if (underlyingPriv.length !== 32) throw new Error('underlyingPriv must be 32 bytes');
  const d = BigInt('0x' + bytesToHex(underlyingPriv));
  if (d <= 0n || d >= SECP_N) throw new Error('underlyingPriv scalar out of range');
  const tweaked = (d + blinding) % SECP_N;
  if (tweaked === 0n) throw new Error('tweaked secret derived zero (statistically impossible)');
  let hex = tweaked.toString(16);
  while (hex.length < 64) hex = '0' + hex;
  return hexToBytes(hex);
}

export function p2trScript(xOnly32: Uint8Array): Uint8Array {
  if (xOnly32.length !== 32) throw new Error('xOnly32 must be 32 bytes');
  return concatBytes(new Uint8Array([0x51, 0x20]), xOnly32);
}

export function xOnly(compressedPub33: Uint8Array): Uint8Array {
  return compressedPub33.slice(1);
}

export function matchesStealthCommit(opts: {
  outputScript: Uint8Array;
  commit33: Uint8Array;
}): { match: boolean; scriptKind?: 'p2wpkh' | 'p2tr' } {
  const { outputScript, commit33 } = opts;
  const wpkh = p2wpkhScript(commit33);
  if (
    outputScript.length === wpkh.length &&
    outputScript.every((b, i) => b === wpkh[i])
  ) {
    return { match: true, scriptKind: 'p2wpkh' };
  }
  const tr = p2trScript(xOnly(commit33));
  if (
    outputScript.length === tr.length &&
    outputScript.every((b, i) => b === tr[i])
  ) {
    return { match: true, scriptKind: 'p2tr' };
  }
  return { match: false };
}

export function isStealthEligibleKind(kind: StealthInputKind): boolean {
  return kind === 'p2wpkh' || kind === 'p2tr-keypath';
}

export function aggregateStealthEligibleInputPubkeys(
  inputs: ClassifiedStealthInput[],
): { aggregatePub: Uint8Array | null; eligibleCount: number } {
  let acc = ZERO;
  let eligibleCount = 0;
  for (const inp of inputs) {
    if (!isStealthEligibleKind(inp.kind)) continue;
    if (!inp.pub || inp.pub.length !== 33) continue;
    const pt = secp.ProjectivePoint.fromHex(bytesToHex(inp.pub));
    acc = acc.add(pt);
    eligibleCount += 1;
  }
  if (eligibleCount === 0 || acc.equals(ZERO)) {
    return { aggregatePub: null, eligibleCount };
  }
  return { aggregatePub: acc.toRawBytes(true), eligibleCount };
}

export function classifyStealthInput(opts: {
  witness?: Uint8Array[] | null;
  prevoutScript?: Uint8Array | null;
  prevoutOpReturn?: number | null;
}): ClassifiedStealthInput {
  const { witness, prevoutScript, prevoutOpReturn } = opts;
  if (prevoutOpReturn != null && MIXER_EMITTING_OPCODES.has(prevoutOpReturn)) {
    return { kind: 'mixer-derived', pub: null };
  }
  if (
    witness &&
    witness.length === 2 &&
    witness[1]!.length === 33 &&
    prevoutScript &&
    prevoutScript[0] === 0x00 &&
    prevoutScript[1] === 0x14
  ) {
    return { kind: 'p2wpkh', pub: witness[1]! };
  }
  if (
    witness &&
    witness.length === 1 &&
    (witness[0]!.length === 64 || witness[0]!.length === 65) &&
    prevoutScript &&
    prevoutScript[0] === 0x51 &&
    prevoutScript[1] === 0x20
  ) {
    const xOnlyKey = prevoutScript.slice(2, 34);
    try {
      const pub = concatBytes(new Uint8Array([0x02]), xOnlyKey);
      secp.ProjectivePoint.fromHex(bytesToHex(pub));
      return { kind: 'p2tr-keypath', pub };
    } catch {
      return { kind: 'unknown', pub: null };
    }
  }
  if (prevoutScript && prevoutScript[0] === 0x00 && prevoutScript[1] === 0x20) {
    return { kind: 'p2wsh', pub: null };
  }
  if (
    witness &&
    witness.length >= 2 &&
    prevoutScript &&
    prevoutScript[0] === 0x51 &&
    prevoutScript[1] === 0x20
  ) {
    return { kind: 'p2tr-scriptpath', pub: null };
  }
  return { kind: 'unknown', pub: null };
}

export function isMixerDerivedInput(opts: {
  prevoutTx?: { outputs: { script?: Uint8Array }[] } | null;
  prevoutVout?: number;
}): boolean {
  const { prevoutTx } = opts;
  if (!prevoutTx || !Array.isArray(prevoutTx.outputs) || prevoutTx.outputs.length === 0) {
    return false;
  }
  const vout0 = prevoutTx.outputs[0];
  if (!vout0?.script || vout0.script.length === 0) return false;
  const script = vout0.script;
  if (script[0] !== 0x6a) return false;
  let opcodeIndex: number;
  if (script.length >= 3 && script[1]! < 0x4c) opcodeIndex = 2;
  else if (script.length >= 4 && script[1] === 0x4c) opcodeIndex = 3;
  else return false;
  if (opcodeIndex >= script.length) return false;
  return MIXER_EMITTING_OPCODES.has(script[opcodeIndex]!);
}

export function checkStealthEmissionSafety(opts: {
  inputs: ClassifiedStealthInput[];
  eachInputIsOurs: (inp: ClassifiedStealthInput) => boolean;
}): StealthEmissionSafety {
  const { inputs, eachInputIsOurs } = opts;
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { safe: false, reason: 'no inputs' };
  }
  const eligible = inputs.filter((inp) => isStealthEligibleKind(inp.kind));
  if (eligible.length === 0) {
    return { safe: false, reason: 'no eligible inputs under §A.2.5' };
  }
  for (let i = 0; i < eligible.length; i++) {
    const inp = eligible[i]!;
    if (!eachInputIsOurs(inp)) {
      return {
        safe: false,
        reason: `eligible input #${i} (${inp.kind}) not wallet-owned — multi-owner stealth out of scope for v1`,
      };
    }
  }
  return { safe: true, reason: 'all eligible inputs wallet-owned' };
}

export function stealthTxAnchorHead(
  firstAssetInTxidHex: string,
  firstAssetInVout: number,
): Uint8Array {
  return buildAnchor(firstAssetInTxidHex, firstAssetInVout);
}

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

export function senderComputeStealthCommit(opts: {
  senderEligibleInputPrivs: Uint8Array[];
  recipientPub: Uint8Array;
  networkTag: StealthNetwork | number;
  domain: Uint8Array;
  txAnchorHead: Uint8Array;
  voutIndex: number;
}): { commit: Uint8Array; blinding: bigint } {
  const {
    senderEligibleInputPrivs,
    recipientPub,
    networkTag,
    domain,
    txAnchorHead,
    voutIndex,
  } = opts;
  if (!Array.isArray(senderEligibleInputPrivs) || senderEligibleInputPrivs.length === 0) {
    throw new Error('senderEligibleInputPrivs must be non-empty');
  }
  let sum = 0n;
  for (const priv of senderEligibleInputPrivs) {
    if (priv.length !== 32) throw new Error('priv must be 32 bytes');
    const d = BigInt('0x' + bytesToHex(priv));
    if (d <= 0n || d >= SECP_N) throw new Error('priv scalar out of range');
    sum = (sum + d) % SECP_N;
  }
  if (sum === 0n) throw new Error('eligible priv sum is zero');
  let hex = sum.toString(16);
  while (hex.length < 64) hex = '0' + hex;
  const sumBytes = hexToBytes(hex);
  const txAnchor = concatBytes(txAnchorHead, u32le(voutIndex));
  const b = deriveStealthEcdhBlinding({
    ourPriv: sumBytes,
    theirPub: recipientPub,
    networkTag,
    domain,
    txAnchor,
  });
  const commit = computeStealthCommit({ underlyingPub: recipientPub, blinding: b });
  return { commit, blinding: b };
}

export function recipientScanTxForStealth(opts: {
  classifiedInputs: ClassifiedStealthInput[];
  outputs: { script: Uint8Array }[];
  walletPriv: Uint8Array;
  walletPub: Uint8Array;
  networkTag: StealthNetwork | number;
  domain: Uint8Array;
  txAnchorHead: Uint8Array;
}): StealthCredit[] {
  const {
    classifiedInputs,
    outputs,
    walletPriv,
    walletPub,
    networkTag,
    domain,
    txAnchorHead,
  } = opts;
  const { aggregatePub } = aggregateStealthEligibleInputPubkeys(classifiedInputs);
  if (!aggregatePub) return [];
  const shared = deriveStealthEcdhSharedSecret({
    ourPriv: walletPriv,
    theirPub: aggregatePub,
  });
  const credits: StealthCredit[] = [];
  for (let v = 0; v < outputs.length; v++) {
    const txAnchor = concatBytes(txAnchorHead, u32le(v));
    const b = deriveStealthBlindingFromShared({
      shared,
      networkTag,
      domain,
      txAnchor,
    });
    const commit = computeStealthCommit({ underlyingPub: walletPub, blinding: b });
    const wpkh = p2wpkhScript(commit);
    const tr = p2trScript(xOnly(commit));
    const out = outputs[v]!.script;
    let scriptKind: 'p2wpkh' | 'p2tr' | null = null;
    if (out.length === wpkh.length && out.every((x, i) => x === wpkh[i]!)) {
      scriptKind = 'p2wpkh';
    } else if (out.length === tr.length && out.every((x, i) => x === tr[i]!)) {
      scriptKind = 'p2tr';
    }
    if (scriptKind) {
      const tweakedSk = computeStealthTweakedSk({ underlyingPriv: walletPriv, blinding: b });
      credits.push({
        voutIndex: v,
        scriptKind,
        tweakedSk,
        commit,
        blinding: b,
        senderAggregatePub: aggregatePub,
      });
    }
  }
  return credits;
}
