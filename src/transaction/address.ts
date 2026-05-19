// P2WPKH address derivation from a compressed pubkey.
import { bech32 } from '@scure/base';
import { hash160 } from './sighash.js';

// Derive a P2WPKH script from a compressed pubkey (33 bytes, 02/03 prefix).
export function p2wpkhScript(pubkey: Uint8Array): Uint8Array {
  const prefix = new Uint8Array([0x00, 0x14]); // OP_0 PUSH 20
  const h = hash160(pubkey);
  const out = new Uint8Array(prefix.length + h.length);
  out.set(prefix, 0);
  out.set(h, prefix.length);
  return out;
}

// Derive a bech32 P2WPKH address from a compressed pubkey.
// hrp: 'bc' for mainnet, 'tb' for signet/testnet.
export function p2wpkhAddress(pubkey: Uint8Array, hrp: string): string {
  const h = hash160(pubkey);
  const words = bech32.toWords(h);
  return bech32.encode(hrp, [0, ...words], false);
}
