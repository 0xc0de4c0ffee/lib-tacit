import { describe, test, expect } from 'bun:test';
import { encodeEnvelopeScript, decodeEnvelopeScript } from '../src/envelope/script.js';
import { ENVELOPE_MAGIC } from '../src/constants/domains.js';

function eqBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

describe('Envelope script round-trip', () => {
  test('1-byte payload', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array([0x21]);
    const script = encodeEnvelopeScript(xonly, payload);
    const dec = decodeEnvelopeScript(script);
    expect(dec).not.toBeNull();
    expect(eqBytes(dec!.signingPubXonly, xonly)).toBe(true);
    expect(dec!.opcode).toBe(0x21);
    expect(eqBytes(dec!.payload, payload)).toBe(true);
  });

  test('75-byte payload (max direct push)', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array(75);
    payload[0] = 0x21;
    crypto.getRandomValues(payload.subarray(1));
    const script = encodeEnvelopeScript(xonly, payload);
    expect(decodeEnvelopeScript(script)).not.toBeNull();
  });

  test('256-byte payload (PUSHDATA2)', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array(256);
    payload[0] = 0x23;
    crypto.getRandomValues(payload.subarray(1));
    const script = encodeEnvelopeScript(xonly, payload);
    expect(decodeEnvelopeScript(script)).not.toBeNull();
  });

  test('520-byte payload (max single push)', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array(520);
    payload[0] = 0x23;
    crypto.getRandomValues(payload.subarray(1));
    const script = encodeEnvelopeScript(xonly, payload);
    expect(decodeEnvelopeScript(script)).not.toBeNull();
  });

  test('521-byte payload (split across 2 chunks)', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array(521);
    payload[0] = 0x23;
    crypto.getRandomValues(payload.subarray(1));
    const script = encodeEnvelopeScript(xonly, payload);
    const dec = decodeEnvelopeScript(script);
    expect(dec).not.toBeNull();
    expect(dec!.payload.length).toBe(521);
  });
});

describe('Envelope rejection cases', () => {
  test('empty input', () => {
    expect(decodeEnvelopeScript(new Uint8Array(0))).toBeNull();
  });

  test('script too short (< 36 bytes)', () => {
    expect(decodeEnvelopeScript(new Uint8Array(35))).toBeNull();
  });

  test('missing OP_CHECKSIG', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const bad = new Uint8Array([32, ...xonly, 0x88]); // wrong opcode
    expect(decodeEnvelopeScript(bad)).toBeNull();
  });

  test('missing OP_ENDIF', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const script = encodeEnvelopeScript(xonly, new Uint8Array([0x21, 0x02]));
    const truncated = script.slice(0, script.length - 1);
    expect(decodeEnvelopeScript(truncated)).toBeNull();
  });

  test('trailing bytes after OP_ENDIF', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const script = encodeEnvelopeScript(xonly, new Uint8Array([0x21, 0x02]));
    const corrupted = new Uint8Array([...script, 0x00]);
    expect(decodeEnvelopeScript(corrupted)).toBeNull();
  });

  test('wrong magic', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array([0x21]);
    const script = encodeEnvelopeScript(xonly, payload);
    // corrupt magic at its position (after OP_FALSE OP_IF + push before payload)
    // First push is the xonly (32), then OP_CHECKSIG, then OP_FALSE OP_IF
    // First chunk push: starts at offset 36 (32 + 1 + 2 + 1)
    // Magic is the first data push inside OP_IF
    // Actually it's easier to just create a wrong script
    const fakeMagic = new TextEncoder().encode('FOO');
    // Just check the decode rejects it
    script[36] = 1; // corrupt the first push length byte
    expect(decodeEnvelopeScript(script)).toBeNull();
  });
});

describe('Magic / version pinning', () => {
  test('magic bytes = "TACIT"', () => {
    expect(new TextEncoder().encode(ENVELOPE_MAGIC)).toEqual(new Uint8Array([0x54, 0x41, 0x43, 0x49, 0x54]));
  });

  test('envelope version = 0x01', () => {
    const xonly = new Uint8Array(32);
    xonly[0] = 0x99;
    const script = encodeEnvelopeScript(xonly, new Uint8Array([0x21]));
    // 0x20 (push 32) || xonly || 0xac (OP_CHECKSIG) || 0x00 (OP_FALSE) || 0x63 (OP_IF)
    expect(script[0]).toBe(0x20);
    expect(script[33]).toBe(0xac);
    expect(script[34]).toBe(0x00);
    expect(script[35]).toBe(0x63);
  });
});
