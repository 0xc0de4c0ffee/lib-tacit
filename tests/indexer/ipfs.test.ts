import { describe, test, expect } from 'bun:test';
import { ipfsCidMatches, cidToV1 } from '../../src/indexer/ipfs.js';
import {
  FIXTURE_JSON, FIXTURE_CORRUPT_JSON,
  FIXTURE_CID_V0, FIXTURE_CID_V1,
} from '../fixtures/ipfs/index.js';

describe('cidToV1', () => {
  test('converts CIDv0 to CIDv1', () => {
    const v1 = cidToV1(FIXTURE_CID_V0);
    expect(v1.startsWith('b')).toBe(true);
    expect(v1.length).toBeGreaterThan(32);
    expect(v1).not.toBe(FIXTURE_CID_V0);
  });

  test('CIDv1 is idempotent (no-op on already CIDv1)', () => {
    const result = cidToV1(FIXTURE_CID_V1);
    expect(result).toBe(FIXTURE_CID_V1);
  });

  test('converted CIDv1 still verifies against content', () => {
    const v1 = cidToV1(FIXTURE_CID_V0);
    expect(ipfsCidMatches(v1, FIXTURE_JSON)).toBe(true);
  });

  test('rejects invalid CID', () => {
    expect(() => cidToV1('not-a-cid')).toThrow();
  });
});

describe('ipfsCidMatches', () => {
  test('CIDv0 matches correct content', () => {
    expect(ipfsCidMatches(FIXTURE_CID_V0, FIXTURE_JSON)).toBe(true);
  });

  test('CIDv0 rejects corrupted content', () => {
    expect(ipfsCidMatches(FIXTURE_CID_V0, FIXTURE_CORRUPT_JSON)).toBe(false);
  });

  test('CIDv0 rejects empty bytes', () => {
    expect(ipfsCidMatches(FIXTURE_CID_V0, new Uint8Array(0))).toBe(false);
  });

  test('CIDv1 matches correct content', () => {
    expect(ipfsCidMatches(FIXTURE_CID_V1, FIXTURE_JSON)).toBe(true);
  });

  test('CIDv1 rejects corrupted content', () => {
    expect(ipfsCidMatches(FIXTURE_CID_V1, FIXTURE_CORRUPT_JSON)).toBe(false);
  });

  test('rejects empty CID string', () => {
    expect(ipfsCidMatches('', FIXTURE_JSON)).toBe(false);
  });

  test('rejects unrecognized CID format', () => {
    expect(ipfsCidMatches('not-a-cid', FIXTURE_JSON)).toBe(false);
  });

  test('rejects truncated CIDv0-like string', () => {
    expect(ipfsCidMatches('Qmabcdef', FIXTURE_JSON)).toBe(false);
  });
});
