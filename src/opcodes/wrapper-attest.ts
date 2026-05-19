// T_WRAPPER_ATTEST (0x38) — Optional on-chain wrapper-issuer attestation.
// Pins an external-wallet → tacit-key binding so wallet-portable identity
// becomes auditable by third parties. SPEC §5.19.
import { Opcode } from '../constants/opcodes.js';
import { ByteWriter } from '../envelope/payload.js';

export interface WrapperAttestInput {
  assetId: Uint8Array;     // 32 bytes
  issuerSig: Uint8Array;   // 64 bytes BIP-340
  payload: Uint8Array;     // attestation payload
}

export interface WrapperAttestOutput {
  kind: 'wrapper-attest';
  assetId: Uint8Array;
  issuerSig: Uint8Array;
  payload: Uint8Array;
}

export function encodeWrapperAttest(input: WrapperAttestInput): Uint8Array {
  if (input.assetId.length !== 32) throw new Error('asset_id must be 32 bytes');
  if (!input.issuerSig || input.issuerSig.length !== 64) throw new Error('issuer_sig must be 64 bytes');
  if (input.payload.length > 0xffff) throw new Error('payload too large');
  const w = new ByteWriter();
  w.u8(Opcode.T_WRAPPER_ATTEST);
  w.push(input.assetId);
  w.push(input.issuerSig);
  w.u16(input.payload.length);
  w.push(input.payload);
  return w.out();
}

export function decodeWrapperAttest(payload: Uint8Array): WrapperAttestOutput | null {
  if (!payload || payload.length < 1 + 32 + 64 + 2) return null;
  if (payload[0] !== Opcode.T_WRAPPER_ATTEST) return null;
  let p = 1;
  const assetId = payload.slice(p, p + 32); p += 32;
  const issuerSig = payload.slice(p, p + 64); p += 64;
  const payloadLen = payload[p]! | (payload[p + 1]! << 8); p += 2;
  if (p + payloadLen !== payload.length) return null;
  return { kind: 'wrapper-attest', assetId, issuerSig, payload: payload.slice(p, p + payloadLen) };
}
