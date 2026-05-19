// T_PETCH (0x27) — Permissionless-mint deployment record (fair-launch).
// Wire format: T_PETCH(1) || ticker_len(1) || ticker(tlen) || decimals(1) ||
//   cap_amount_LE(8) || mint_limit_LE(8) || mint_start_height_LE(4) ||
//   mint_end_height_LE(4) || image_len(2) || image_uri(image_len)
// SPEC §5.8

import { Opcode } from '../constants/opcodes.js';
import { TICKER_MAX_LEN, DECIMALS_MAX, IMAGE_URI_MAX_LEN } from '../constants/limits.js';
import { ByteWriter, u64LE } from '../envelope/payload.js';

export interface PETCHInput {
  ticker: string;
  decimals: number;
  capAmount: bigint;
  mintLimit: bigint;
  mintStartHeight: number;
  mintEndHeight: number;
  imageUri?: string | null;
}

export interface PETCHOutput {
  kind: 'petch';
  ticker: string;
  decimals: number;
  capAmount: bigint;
  mintLimit: bigint;
  mintStartHeight: number;
  mintEndHeight: number;
  imageUri: string | null;
}

export function encodePEtch(input: PETCHInput): Uint8Array {
  const tk = new TextEncoder().encode(input.ticker);
  if (tk.length === 0 || tk.length > TICKER_MAX_LEN) throw new Error(`ticker 1–${TICKER_MAX_LEN} bytes`);
  if (input.decimals < 0 || input.decimals > DECIMALS_MAX) throw new Error(`decimals 0–${DECIMALS_MAX}`);
  if (input.capAmount <= 0n || input.capAmount >= (1n << 64n)) throw new Error('cap_amount out of u64');
  if (input.mintLimit <= 0n || input.mintLimit >= (1n << 64n)) throw new Error('mint_limit out of u64');
  if (input.capAmount % input.mintLimit !== 0n) throw new Error('cap_amount must be divisible by mint_limit');

  const imgBytes = input.imageUri ? new TextEncoder().encode(input.imageUri) : new Uint8Array(0);
  if (imgBytes.length > IMAGE_URI_MAX_LEN) throw new Error(`image_uri must be ≤${IMAGE_URI_MAX_LEN} bytes`);

  const w = new ByteWriter();
  w.u8(Opcode.T_PETCH);
  w.u8(tk.length);
  w.push(tk);
  w.u8(input.decimals);
  w.push(u64LE(input.capAmount));
  w.push(u64LE(input.mintLimit));
  w.u32(input.mintStartHeight);
  w.u32(input.mintEndHeight);
  w.u16(imgBytes.length);
  w.push(imgBytes);
  return w.out();
}

export function decodePEtch(payload: Uint8Array): PETCHOutput | null {
  if (!payload) return null;
  if (payload.length < 1 + 1 + 1 + 1 + 8 + 8 + 4 + 4 + 2) return null;
  if (payload[0] !== Opcode.T_PETCH) return null;

  let p = 1;
  const tlen = payload[p]!; p += 1;
  if (tlen < 1 || tlen > TICKER_MAX_LEN) return null;
  if (p + tlen > payload.length) return null;

  let ticker: string;
  try { ticker = new TextDecoder('utf-8', { fatal: true }).decode(payload.slice(p, p + tlen)); } catch { return null; }
  p += tlen;

  const decimals = payload[p]!; p += 1;
  if (decimals > DECIMALS_MAX) return null;
  if (p + 8 + 8 + 4 + 4 + 2 > payload.length) return null;

  const capLE = payload.slice(p, p + 8); p += 8;
  const cv = new DataView(capLE.buffer, capLE.byteOffset, 8);
  const capAmount = (BigInt(cv.getUint32(4, true)) << 32n) | BigInt(cv.getUint32(0, true));

  const limitLE = payload.slice(p, p + 8); p += 8;
  const lv = new DataView(limitLE.buffer, limitLE.byteOffset, 8);
  const mintLimit = (BigInt(lv.getUint32(4, true)) << 32n) | BigInt(lv.getUint32(0, true));

  const startLE = payload.slice(p, p + 4); p += 4;
  const sv = new DataView(startLE.buffer, startLE.byteOffset, 4);
  const mintStartHeight = sv.getUint32(0, true);

  const endLE = payload.slice(p, p + 4); p += 4;
  const ev = new DataView(endLE.buffer, endLE.byteOffset, 4);
  const mintEndHeight = ev.getUint32(0, true);

  const imgLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (imgLen > IMAGE_URI_MAX_LEN) return null;
  if (p + imgLen !== payload.length) return null;

  let imageUri: string | null = null;
  if (imgLen > 0) {
    try { imageUri = new TextDecoder('utf-8', { fatal: true }).decode(payload.slice(p, p + imgLen)); } catch { return null; }
  }

  return { kind: 'petch', ticker, decimals, capAmount, mintLimit, mintStartHeight, mintEndHeight, imageUri };
}
