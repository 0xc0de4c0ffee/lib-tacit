import { describe, test, expect } from 'bun:test';
import {
  PREAUTH_BID_DOMAIN,
  PREAUTH_BID_CANCEL_DOMAIN,
  PREAUTH_BID_ID_DOMAIN,
  PREAUTH_BID_CONTEXT_DOMAIN,
  PREAUTH_BID_NONCE_DOMAIN,
} from '../../src/constants/domains.js';
import { Opcode } from '../../src/constants/opcodes.js';
import { encodePreauthBid, decodePreauthBid } from '../../src/opcodes/preauth-bid.js';

describe('T_PREAUTH_BID (0x5B) — drafted stub', () => {
  test('PREAUTH_BID_DOMAIN constant', () => {
    expect(PREAUTH_BID_DOMAIN).toBe('tacit-preauth-bid-v1');
  });
  test('PREAUTH_BID_CANCEL_DOMAIN constant', () => {
    expect(PREAUTH_BID_CANCEL_DOMAIN).toBe('tacit-preauth-bid-cancel-v1');
  });
  test('PREAUTH_BID_ID_DOMAIN constant', () => {
    expect(PREAUTH_BID_ID_DOMAIN).toBe('tacit-preauth-bid-id-v1');
  });
  test('PREAUTH_BID_CONTEXT_DOMAIN constant', () => {
    expect(PREAUTH_BID_CONTEXT_DOMAIN).toBe('tacit-preauth-bid-context-v1');
  });
  test('PREAUTH_BID_NONCE_DOMAIN constant', () => {
    expect(PREAUTH_BID_NONCE_DOMAIN).toBe('tacit-preauth-bid-nonce-v1');
  });
  test('encode throws for nullish input', () => {
    expect(() => encodePreauthBid(null as any)).toThrow();
  });
  test('encode throws for empty object', () => {
    expect(() => encodePreauthBid({} as any)).toThrow();
  });
  test('decode returns null for wrong opcode', () => {
    expect(decodePreauthBid(new Uint8Array([0x5A]))).toBeNull();
  });
  test('decode returns null for empty payload', () => {
    expect(decodePreauthBid(new Uint8Array())).toBeNull();
  });
  test('decode returns null for short payload with correct opcode', () => {
    expect(decodePreauthBid(new Uint8Array([Opcode.T_PREAUTH_BID]))).toBeNull();
  });
});
