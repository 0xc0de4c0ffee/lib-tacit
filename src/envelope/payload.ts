// Byte writer utility — mirrors the reference's `class W`.
// Used by opcode encoders throughout the protocol.

import { concatBytes } from '@noble/hashes/utils';

export class ByteWriter {
  private parts: Uint8Array[] = [];

  push(b: Uint8Array): this { this.parts.push(b); return this; }
  u8(n: number): this { this.parts.push(new Uint8Array([n & 0xff])); return this; }
  u16(n: number): this {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, n, true);
    return this.push(b);
  }
  u32(n: number): this {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n >>> 0, true);
    return this.push(b);
  }
  u64(n: bigint | number): this {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
    return this.push(b);
  }
  varint(n: number): this {
    if (n < 0xfd) return this.u8(n);
    if (n < 0x10000) { this.u8(0xfd); return this.push(u16LE(n)); }
    if (n < 0x100000000) { this.u8(0xfe); return this.push(u32LE(n)); }
    this.u8(0xff); return this.u64(BigInt(n));
  }
  out(): Uint8Array { return concatBytes(...this.parts); }
}

function u16LE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}
function u32LE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

// Helper: encode a u64 value as 8-byte LE
export function u64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
}

// Helper: read u64 LE from bytes at offset
export function readU64LE(bytes: Uint8Array, offset: number): bigint {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
  return (BigInt(view.getUint32(4, true)) << 32n) | BigInt(view.getUint32(0, true));
}
