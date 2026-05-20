// BIP-143 sighash, transaction serialization, and txid calculation.
// Mirrors the reference dapp/tacit.js transaction helpers.

import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { concatBytes } from '@noble/hashes/utils';
import { reverseBytes, reverseBytesHex } from './utils.js';
import { ByteWriter } from '../envelope/payload.js';

export { reverseBytes, reverseBytesHex } from './utils.js';

export const hash256 = (b: Uint8Array): Uint8Array => sha256(sha256(b));
export const hash160 = (b: Uint8Array): Uint8Array => ripemd160(sha256(b));

// Minimal tx types for sighash computation
export interface TxInput {
  txid: string;   // 64-hex BE display form
  vout: number;
  scriptSig?: Uint8Array;
  sequence?: number;
  witness?: Uint8Array[];
}

export interface TxOutput {
  value: number;
  script: Uint8Array;
}

export interface TxTemplate {
  version: number;
  inputs: TxInput[];
  outputs: TxOutput[];
  locktime?: number;
}

// BIP-143 SIGHASH_ALL
export function sighashV0(
  tx: TxTemplate,
  idx: number,
  scriptCode: Uint8Array,
  value: number,
): Uint8Array {
  return sighashV0WithType(tx, idx, scriptCode, value, 0x01);
}

// BIP-143 with chosen hashType.
// hashType 0x83 = SIGHASH_SINGLE | ANYONECANPAY (used by atomic OTC maker sigs).
export function sighashV0WithType(
  tx: TxTemplate,
  idx: number,
  scriptCode: Uint8Array,
  value: number,
  hashType: number,
): Uint8Array {
  const w = new ByteWriter();
  const ZERO32 = new Uint8Array(32);
  const acp = (hashType & 0x80) === 0x80;
  const baseHt = hashType & 0x1f;

  w.u32(tx.version);

  // hashPrevouts
  if (acp) {
    w.push(ZERO32);
  } else {
      const wp = new ByteWriter();
      for (const i of tx.inputs) { wp.push(reverseBytesHex(i.txid)); wp.u32(i.vout); }
      w.push(hash256(wp.out()));
    }

  // hashSequence
  if (!acp && baseHt === 0x01) {
    const ws = new ByteWriter();
    for (const i of tx.inputs) ws.u32(i.sequence ?? 0xffffffff);
    w.push(hash256(ws.out()));
  } else {
    w.push(ZERO32);
  }

  // This input
  const inp = tx.inputs[idx]!;
  w.push(reverseBytesHex(inp.txid));
  w.u32(inp.vout);
  w.varint(scriptCode.length).push(scriptCode);
  w.u64(BigInt(value));
  w.u32(inp.sequence ?? 0xffffffff);

  // hashOutputs
  if (baseHt === 0x01) {
    const wo = new ByteWriter();
    for (const o of tx.outputs) { wo.u64(BigInt(o.value)); wo.varint(o.script.length).push(o.script); }
    w.push(hash256(wo.out()));
  } else if (baseHt === 0x03) {
    if (idx < tx.outputs.length) {
      const o = tx.outputs[idx]!;
      const wo = new ByteWriter();
      wo.u64(BigInt(o.value)); wo.varint(o.script.length).push(o.script);
      w.push(hash256(wo.out()));
    } else {
      w.push(ZERO32);
    }
  } else {
    w.push(ZERO32);
  }

  w.u32(tx.locktime ?? 0);
  w.u32(hashType & 0xffffffff);

  return hash256(w.out());
}

// Preauth seller spend sighash (SPEC preauth flow; composition.mjs).
// Binds vin[1] to vout[1]: hashOutputs is vout[1] only while the signed input
// field carries the tacit asset outpoint (non-standard layout vs generic BIP-143).
export function preauthSellerSpendSighash(params: {
  assetOutpointTxidHex: string;
  assetOutpointVout: number;
  assetUtxoValue: number;
  sellerPubBytes: Uint8Array;
  sellerPayoutScriptBytes: Uint8Array;
  minPriceSats: number;
}): Uint8Array {
  const ZERO32 = new Uint8Array(32);
  const w = new ByteWriter();
  w.u32(2); // nVersion
  w.push(ZERO32); // hashPrevouts (ANYONECANPAY)
  w.push(ZERO32); // hashSequence
  w.push(reverseBytesHex(params.assetOutpointTxidHex));
  w.u32(params.assetOutpointVout);
  const scriptCode = concatBytes(
    new Uint8Array([0x76, 0xa9, 0x14]),
    hash160(params.sellerPubBytes),
    new Uint8Array([0x88, 0xac]),
  );
  w.varint(scriptCode.length).push(scriptCode);
  w.u64(BigInt(params.assetUtxoValue));
  w.u32(0xfffffffd); // nSequence
  const vout1 = new ByteWriter();
  vout1.u64(BigInt(params.minPriceSats));
  vout1.varint(params.sellerPayoutScriptBytes.length).push(params.sellerPayoutScriptBytes);
  w.push(hash256(vout1.out())); // hashOutputs (vout[1] only)
  w.u32(0); // nLocktime
  w.u32(0x83); // SIGHASH_SINGLE | ANYONECANPAY
  return hash256(w.out());
}

// Serialize a tx for txid calculation (no witness).
export function serializeTx(tx: TxTemplate, withWitness: boolean = true): Uint8Array {
  const hasWit = withWitness && tx.inputs.some(i => i.witness && i.witness.length > 0);
  const w = new ByteWriter();

  w.u32(tx.version);
  if (hasWit) w.push(new Uint8Array([0x00, 0x01]));

  w.varint(tx.inputs.length);
  for (const i of tx.inputs) {
    w.push(reverseBytesHex(i.txid));
    w.u32(i.vout);
    const ss = i.scriptSig ?? new Uint8Array(0);
    w.varint(ss.length).push(ss);
    w.u32(i.sequence ?? 0xffffffff);
  }

  w.varint(tx.outputs.length);
  for (const o of tx.outputs) {
    w.u64(BigInt(o.value));
    w.varint(o.script.length).push(o.script);
  }

  if (hasWit) {
    for (const i of tx.inputs) {
      const wit = i.witness ?? [];
      w.varint(wit.length);
      for (const item of wit) w.varint(item.length).push(item);
    }
  }

  w.u32(tx.locktime ?? 0);
  return w.out();
}

// Double-SHA256 of serialized tx (no witness), reversed = txid hex.
export function txid(tx: TxTemplate): string {
  return secpHex(reverseBytes(hash256(serializeTx(tx, false))));
}

// Very minimal import — just byte manipulation
function secpHex(b: Uint8Array): string {
  return Array.from(b).map(c => c.toString(16).padStart(2, '0')).join('');
}
