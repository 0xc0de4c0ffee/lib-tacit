// Taproot envelope script construction.
// Tacit envelopes ride in the taproot script-path witness as:
//   <signing_pub_xonly> OP_CHECKSIG OP_FALSE OP_IF <magic> <version> <chunks...> OP_ENDIF
// SPEC §4 (envelope encoding), ref/tests/envelope.test.mjs.

import { concatBytes } from '@noble/hashes/utils';
import {
  ENVELOPE_MAGIC,
  ENVELOPE_VERSION,
  MAX_SCRIPT_PUSH,
  OP_FALSE,
  OP_PUSHDATA1,
  OP_PUSHDATA2,
  OP_IF,
  OP_ENDIF,
  OP_CHECKSIG,
} from '../constants/domains.js';

const MAGIC_BYTES = new TextEncoder().encode(ENVELOPE_MAGIC);

function encodePush(data: Uint8Array): Uint8Array {
  if (data.length === 0) return new Uint8Array([OP_FALSE]);
  if (data.length <= 75) return concatBytes(new Uint8Array([data.length]), data);
  if (data.length <= 255) return concatBytes(new Uint8Array([OP_PUSHDATA1, data.length]), data);
  if (data.length <= 65535) {
    const lenLE = new Uint8Array(2);
    new DataView(lenLE.buffer).setUint16(0, data.length, true);
    return concatBytes(new Uint8Array([OP_PUSHDATA2]), lenLE, data);
  }
  throw new Error('push data too large');
}

// Encode a taproot envelope script around a payload.
// signingPubXonly: 32-byte x-only pubkey (the key that signs the taproot script-path spend).
// payload: the opcode-prefixed envelope payload bytes.
export function encodeEnvelopeScript(
  signingPubXonly: Uint8Array,
  payload: Uint8Array,
): Uint8Array {
  if (signingPubXonly.length !== 32) throw new Error('signing pubkey must be 32 bytes (x-only)');

  const chunks: Uint8Array[] = [MAGIC_BYTES, new Uint8Array([ENVELOPE_VERSION])];
  for (let i = 0; i < payload.length; i += MAX_SCRIPT_PUSH) {
    chunks.push(payload.slice(i, Math.min(i + MAX_SCRIPT_PUSH, payload.length)));
  }

  const pieces: Uint8Array[] = [
    encodePush(signingPubXonly),
    new Uint8Array([OP_CHECKSIG]),
    new Uint8Array([OP_FALSE, OP_IF]),
  ];
  for (const c of chunks) pieces.push(encodePush(c));
  pieces.push(new Uint8Array([OP_ENDIF]));

  return concatBytes(...pieces);
}

export interface DecodedEnvelope {
  signingPubXonly: Uint8Array;
  opcode: number;
  payload: Uint8Array;
}

// Decode a taproot envelope script. Returns null if the script is
// malformed, wrong magic, wrong version, or structurally invalid.
export function decodeEnvelopeScript(script: Uint8Array): DecodedEnvelope | null {
  if (!script || script.length < 36) return null;

  let p = 0;

  // First push: 32-byte x-only signing pubkey
  if (script[p] !== 32) return null;
  p += 1;
  if (p + 32 > script.length) return null;
  const signingPubXonly = script.slice(p, p + 32);
  p += 32;

  // OP_CHECKSIG
  if (p + 1 > script.length || script[p] !== OP_CHECKSIG) return null;
  p += 1;

  // OP_FALSE OP_IF
  if (p + 2 > script.length || script[p] !== OP_FALSE || script[p + 1] !== OP_IF) return null;
  p += 2;

  // Parse data pushes until OP_ENDIF
  const pushes: Uint8Array[] = [];
  let sawEndif = false;
  while (p < script.length) {
    if (script[p] === OP_ENDIF) { p += 1; sawEndif = true; break; }
    const op = script[p]!;
    p += 1;
    let data: Uint8Array;
    if (op >= 1 && op <= 75) {
      if (p + op > script.length) return null;
      data = script.slice(p, p + op);
      p += op;
    } else if (op === OP_PUSHDATA1) {
      if (p + 1 > script.length) return null;
      const ln = script[p]!;
      p += 1;
      if (p + ln > script.length) return null;
      data = script.slice(p, p + ln);
      p += ln;
    } else if (op === OP_PUSHDATA2) {
      if (p + 2 > script.length) return null;
      const ln = script[p]! | (script[p + 1]! << 8);
      p += 2;
      if (p + ln > script.length) return null;
      data = script.slice(p, p + ln);
      p += ln;
    } else if (op === OP_FALSE) {
      data = new Uint8Array(0);
    } else {
      return null;
    }
    pushes.push(data);
  }

  if (!sawEndif) return null;
  if (p !== script.length) return null;
  if (pushes.length < 3) return null;

  // First push: magic
  if (pushes[0]!.length !== MAGIC_BYTES.length) return null;
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (pushes[0]![i] !== MAGIC_BYTES[i]) return null;
  }

  // Second push: version
  if (pushes[1]!.length !== 1 || pushes[1]![0] !== ENVELOPE_VERSION) return null;

  // Remainder: payload
  const payload = concatBytes(...pushes.slice(2));
  if (payload.length < 1) return null;

  return { signingPubXonly, opcode: payload[0]!, payload };
}
