// IPFS test fixtures — pre-computed data for offline CID verification tests.
// These are SMALL test objects, not the full ceremony data (which is ~150MB).
// For ceremony test vectors, see tests/crypto/groth16.test.ts (snarkjs-optional).

import { sha256 } from '@noble/hashes/sha256';
import { base58, base32 } from '@scure/base';

// Small known-good JSON blob for CID verification testing.
// Content: {"test": "hello ipfs", "version": 1}
export const FIXTURE_JSON = new TextEncoder().encode(
  JSON.stringify({ test: 'hello ipfs', version: 1 }),
);

const _digest = sha256(FIXTURE_JSON);

// CIDv0 for FIXTURE_JSON: Qm + base58(0x12 0x20 + sha256-digest)
const _mh = new Uint8Array(34);
_mh[0] = 0x12; _mh[1] = 0x20;
_mh.set(_digest, 2);
export const FIXTURE_CID_V0: string = base58.encode(_mh);

// CIDv1 base32 lower (bafy...) for the same content.
// CIDv1 binary = cidv1(1) + raw-codec(0x55) + multihash(0x12 0x20 + digest)
export const FIXTURE_CID_V1: string = (() => {
  const raw = new Uint8Array([1, 0x55, 0x12, 0x20, ..._digest]);
  const encoded = base32.encode(raw).toLowerCase().replace(/=+$/g, '');
  return 'b' + encoded;
})();

// Corrupted bytes for negative testing.
export const FIXTURE_CORRUPT_JSON = new TextEncoder().encode(
  JSON.stringify({ test: 'tampered', version: 999 }),
);
