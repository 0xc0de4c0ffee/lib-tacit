// Utility helpers shared across the transaction layer.
import { hexToBytes as h2b, bytesToHex as b2h } from '@noble/hashes/utils';

export function hexToBytes(hex: string): Uint8Array {
  return h2b(hex);
}

export function bytesToHex(b: Uint8Array): string {
  return b2h(b);
}

export function reverseBytes(b: Uint8Array): Uint8Array {
  const r = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) r[i] = b[b.length - 1 - i]!;
  return r;
}

// Reverse a hex string (for txid BE <-> display conversion).
export function reverseBytesHex(hex: string): Uint8Array {
  return reverseBytes(hexToBytes(hex));
}

export function reverseHex(hex: string): string {
  return bytesToHex(reverseBytes(hexToBytes(hex)));
}

// Anchor construction: txid_BE(32) || vout_LE(4)
export function buildAnchor(txidHex: string, vout: number): Uint8Array {
  return concatParts(
    reverseBytes(hexToBytes(txidHex)),
    voutLE(vout),
  );
}

export function voutLE(idx: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, idx >>> 0, true);
  return b;
}

function concatParts(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
