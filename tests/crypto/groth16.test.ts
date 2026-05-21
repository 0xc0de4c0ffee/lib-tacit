import { describe, test, expect } from 'bun:test';
import { Groth16NotAvailableError, groth16Verify, fetchVkFromIpfs } from '../../src/crypto/groth16.js';

describe('Groth16NotAvailableError', () => {
  test('Error class is instanceof Error', () => {
    const err = new Groth16NotAvailableError();
    expect(err).toBeInstanceOf(Error);
  });

  test('Error has correct name property', () => {
    const err = new Groth16NotAvailableError();
    expect(err.name).toBe('Groth16NotAvailableError');
  });

  test('default message', () => {
    const err = new Groth16NotAvailableError();
    expect(err.message).toBe('snarkjs is not available');
  });

  test('custom message', () => {
    const err = new Groth16NotAvailableError('custom msg');
    expect(err.message).toBe('custom msg');
  });
});

describe('groth16Verify', () => {
  test('rejects with error when snarkjs is available (bad vk/proof args)', async () => {
    await expect(groth16Verify({}, [], {})).rejects.toThrow();
  });
});

describe('fetchVkFromIpfs', () => {
  test('throws on bad CID', async () => {
    await expect(fetchVkFromIpfs('bad-cid')).rejects.toThrow();
  });
});
