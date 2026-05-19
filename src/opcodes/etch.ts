// CETCH (0x21) — Asset creation / etch.
// Wire format: CETCH(1) || ticker_len(1) || ticker(tlen) || decimals(1) ||
//   commitment(33) || amount_ct(8) || rp_len(2) || rangeproof(rp_len) ||
//   mint_authority(32) || image_len(2) || image_uri(image_len)
// SPEC §5.1

import { concatBytes } from '@noble/hashes/utils';
import { Opcode } from '../constants/opcodes.js';
import { TICKER_MAX_LEN, DECIMALS_MAX, IMAGE_URI_MAX_LEN, MINT_AUTHORITY_LEN } from '../constants/limits.js';
import { ByteWriter } from '../envelope/payload.js';

const MINT_AUTH_NONE = new Uint8Array(32);

function isZeroAuth(b: Uint8Array): boolean {
  for (let i = 0; i < 32; i++) if (b[i] !== 0) return false;
  return true;
}

export interface CEtchInput {
  ticker: string;
  decimals: number;
  commitment: Uint8Array;      // 33 bytes compressed Pedersen point
  encryptedAmount: Uint8Array; // 8 bytes
  rangeproof: Uint8Array;
  mintAuthority?: Uint8Array | null; // 32 bytes x-only, null/zero = non-mintable
  imageUri?: string | null;
}

export interface CEtchOutput {
  kind: 'cetch';
  ticker: string;
  decimals: number;
  commitment: Uint8Array;
  rangeproof: Uint8Array;
  encryptedAmount: Uint8Array;
  mintAuthority: Uint8Array;
  mintable: boolean;
  imageUri: string | null;
}

export function encodeCEtch(input: CEtchInput): Uint8Array {
  const tk = new TextEncoder().encode(input.ticker);
  if (tk.length === 0 || tk.length > TICKER_MAX_LEN) throw new Error(`ticker 1–${TICKER_MAX_LEN} bytes`);
  if (input.decimals < 0 || input.decimals > DECIMALS_MAX) throw new Error(`decimals 0–${DECIMALS_MAX}`);
  if (input.commitment.length !== 33) throw new Error('commitment must be 33 bytes');
  if (!input.encryptedAmount || input.encryptedAmount.length !== 8) throw new Error('encrypted_amount must be 8 bytes');
  if (input.rangeproof.length > 0xffff) throw new Error('rangeproof too large');

  const auth = input.mintAuthority ?? MINT_AUTH_NONE;
  if (auth.length !== MINT_AUTHORITY_LEN) throw new Error('mint_authority must be 32 bytes');

  const imgBytes = input.imageUri ? new TextEncoder().encode(input.imageUri) : new Uint8Array(0);
  if (imgBytes.length > IMAGE_URI_MAX_LEN) throw new Error(`image_uri must be ≤${IMAGE_URI_MAX_LEN} bytes`);

  const w = new ByteWriter();
  w.u8(Opcode.T_CETCH);
  w.u8(tk.length);
  w.push(tk);
  w.u8(input.decimals);
  w.push(input.commitment);
  w.push(input.encryptedAmount);
  w.u16(input.rangeproof.length);
  w.push(input.rangeproof);
  w.push(auth);
  w.u16(imgBytes.length);
  w.push(imgBytes);
  return w.out();
}

export function decodeCEtch(payload: Uint8Array): CEtchOutput | null {
  if (!payload || payload.length < 1 + 1 + 1 + 1 + 33 + 8 + 2 + 32 + 2) return null;
  if (payload[0] !== Opcode.T_CETCH) return null;

  let p = 1;
  const tlen = payload[p]!; p += 1;
  if (tlen < 1 || tlen > TICKER_MAX_LEN) return null;
  if (p + tlen > payload.length) return null;

  let ticker: string;
  try { ticker = new TextDecoder('utf-8', { fatal: true }).decode(payload.slice(p, p + tlen)); } catch { return null; }
  p += tlen;

  const decimals = payload[p]!; p += 1;
  if (decimals > DECIMALS_MAX) return null;
  if (p + 33 + 8 + 2 > payload.length) return null;

  const commitment = payload.slice(p, p + 33); p += 33;
  const encryptedAmount = payload.slice(p, p + 8); p += 8;

  const rpLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + rpLen + 32 + 2 > payload.length) return null;
  const rangeproof = payload.slice(p, p + rpLen); p += rpLen;
  const mintAuthority = payload.slice(p, p + 32); p += 32;

  const imgLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (imgLen > IMAGE_URI_MAX_LEN) return null;
  if (p + imgLen !== payload.length) return null;

  let imageUri: string | null = null;
  if (imgLen > 0) {
    try { imageUri = new TextDecoder('utf-8', { fatal: true }).decode(payload.slice(p, p + imgLen)); } catch { return null; }
  }

  const mintable = !isZeroAuth(mintAuthority);
  return { kind: 'cetch', ticker, decimals, commitment, rangeproof, encryptedAmount, mintAuthority, mintable, imageUri };
}
