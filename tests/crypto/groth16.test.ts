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
  test('throws or rejects when snarkjs is unavailable or args are invalid', async () => {
    // When snarkjs is not installed: throws Groth16NotAvailableError
    // When snarkjs is installed: groth16 rejects invalid vk/proof args
    await expect(groth16Verify({}, [], {})).rejects.toThrow();
  });
});

describe('fetchVkFromIpfs', () => {
  test('throws on bad CID', async () => {
    await expect(fetchVkFromIpfs('bad-cid')).rejects.toThrow();
  });
});
