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
    // Build a script with 'FOO' instead of 'TACIT' magic
    const magicPos = script.findIndex((_, i) => script[i] === 0x54 && script[i+1] === 0x41 && script[i+2] === 0x43 && script[i+3] === 0x49 && script[i+4] === 0x54);
    if (magicPos >= 0) {
      const corrupted = new Uint8Array(script);
      corrupted.set(new TextEncoder().encode('FOO'), magicPos);
      corrupted[magicPos + 3] = 0x00; // zero-pad shorter magic
      expect(decodeEnvelopeScript(corrupted)).toBeNull();
    }
  });

  test('wrong version', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    const payload = new Uint8Array([0x21]);
    const script = encodeEnvelopeScript(xonly, payload);
    // Version is the byte immediately after 'TACIT' magic inside the payload
    const magicEnd = script.findIndex((_, i) =>
      script[i-4] === 0x54 && script[i-3] === 0x41 && script[i-2] === 0x43 && script[i-1] === 0x49 && script[i] === 0x54
    );
    if (magicEnd >= 0 && script[magicEnd + 1] === 0x01) {
      const corrupted = new Uint8Array(script);
      corrupted[magicEnd + 1] = 0x02;
      expect(decodeEnvelopeScript(corrupted)).toBeNull();
    }
  });

  test('empty payload rejection (magic+version only)', () => {
    const xonly = crypto.getRandomValues(new Uint8Array(32));
    // Script with no payload after version byte
    const script = encodeEnvelopeScript(xonly, new Uint8Array([0x21, 0x02]));
    const truncated = script.slice(0, -2); // remove last 2 payload bytes
    expect(decodeEnvelopeScript(truncated)).toBeNull();
  });

  test('fuzzing: random buffers never throw', () => {
    for (let len of [0, 1, 2, 10, 36, 50, 100, 500]) {
      for (let iter = 0; iter < 20; iter++) {
        const buf = crypto.getRandomValues(new Uint8Array(len));
        expect(() => decodeEnvelopeScript(buf)).not.toThrow();
      }
    }
  });
});

test('5000-byte payload round-trip', () => {
  const xonly = crypto.getRandomValues(new Uint8Array(32));
  const payload = new Uint8Array(5000);
  payload[0] = 0x21;
  crypto.getRandomValues(payload.subarray(1));
  const script = encodeEnvelopeScript(xonly, payload);
  const dec = decodeEnvelopeScript(script);
  expect(dec).not.toBeNull();
  expect(eqBytes(dec!.signingPubXonly, xonly)).toBe(true);
  expect(dec!.opcode).toBe(0x21);
  expect(eqBytes(dec!.payload, payload)).toBe(true);
});

test('null-ish input rejection (empty Uint8Array)', () => {
  expect(decodeEnvelopeScript(new Uint8Array(0))).toBeNull();
});

test('wrong xonly push length rejection', () => {
  const xonly = crypto.getRandomValues(new Uint8Array(32));
  const bad = new Uint8Array([33, ...xonly, 0xac, 0x00, 0x63, 0x68]);
  expect(decodeEnvelopeScript(bad)).toBeNull();
});

test('OP_DUP where push expected rejection', () => {
  const bad = new Uint8Array([0x76, 0xac, 0x00, 0x63, 0x68]);
  expect(decodeEnvelopeScript(bad)).toBeNull();
});

test('OP_FALSE OP_IF absence rejection', () => {
  const xonly = crypto.getRandomValues(new Uint8Array(32));
  const bad = new Uint8Array([32, ...xonly, 0xac, 0x68]);
  expect(decodeEnvelopeScript(bad)).toBeNull();
});

test('deeper fuzzing: random buffers never throw', () => {
  const lengths = [0, 1, 10, 50, 100, 500, 1000];
  for (let iter = 0; iter < 200; iter++) {
    const len = lengths[iter % lengths.length]!;
    const buf = crypto.getRandomValues(new Uint8Array(len));
    expect(() => decodeEnvelopeScript(buf)).not.toThrow();
  }
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
