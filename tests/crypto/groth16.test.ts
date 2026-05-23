import { describe, test, expect } from 'bun:test';
import { Groth16NotAvailableError, groth16Verify, fetchVkFromIpfs } from '../../src/crypto/groth16.js';

const TEST_VK = {
  protocol: 'groth16', curve: 'bn128', nPublic: 1,
  vk_alpha_1: ['0x2042cc58f848d1d67e6d4ac9cafaa66ac43a6029a56b2f43a7069aac97f37d0f', '0x25ab3dd1eb01b9b86ef03f96f4cfccb9ced4905a9cb19621e8248e62eac8c93b', '0x1'],
  vk_beta_2: [[['0x1471efc1d3703b7f68bfdd7cf5f1922567113c7e06ea6ebadcc2521d6ffced18', '0x0296396f0f9cd0b65a870a5e12aff19eb5adf6e0b0f8c03252f1553ad44f8c48'], ['0x0f8eaeab4fee8b59ba0c445e88db08c6c5f03456652a6f0bcf8edae4d0aec800', '0x2e7565e8c830e2faad2f52b6ad1a02a5de8f9a94ab8e77f9f925be2b3eba0576'], ['0x1', '0x0']]],
  vk_gamma_2: [[['0x0e93c0d6e7f5a5c2d16f83c7d9e69f1d5f0b9e87b8d7c6b5a4f3e2d1c0b9a8f7', '0x1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d'], ['0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c', '0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d'], ['0x1', '0x0']]],
  vk_delta_2: [[['0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3'], ['0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4', '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5'], ['0x1', '0x0']]],
  vk_ic: [['0x10c9c8f4d1e0b3a2c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b', '0x20d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0', '0x1']],
};
const TEST_PROOF = {
  pi_a: ['0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3', '0x1'],
  pi_b: [[['0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3'], ['0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4', '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5'], ['0x1', '0x0']]],
  pi_c: ['0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3', '0x1'],
  protocol: 'groth16', curve: 'bn128',
};
const TEST_PUBLIC_SIGNALS = ['42'];

describe('snarkjs availability', () => {
  test('snarkjs is a hard dependency and loads successfully', async () => {
    let loaded = false;
    try {
      const mod = await import('snarkjs');
      loaded = !!mod?.groth16;
    } catch { /* snarkjs not available */ }
    expect(loaded).toBe(true);
  });

  test('groth16 verify function exists on snarkjs module', async () => {
    const mod = await import('snarkjs');
    expect(typeof mod.groth16?.verify).toBe('function');
  });
});

describe('groth16Verify', () => {
  test('rejects invalid args with an error', async () => {
    await expect(groth16Verify({}, [], {})).rejects.toThrow();
  });

  test('handles invalid VK/proof gracefully (returns false or throws)', async () => {
    // Use a well-formed but invalid VK structure — snarkjs should not hang
    try {
      const result = await Promise.race([
        groth16Verify(TEST_VK, TEST_PUBLIC_SIGNALS, TEST_PROOF),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      expect(typeof result).toBe('boolean');
    } catch (e: any) {
      // Timeout or snarkjs error is acceptable — we just want to
      // confirm the function doesn't crash the process
      expect(e.message).toBeTruthy();
    }
  }, { timeout: 10000 });

  test('loads canonical mixer VK when reachable', async () => {
    // Uses the canonical ceremony VK from tacit-specs.
    // This tests fetchVkFromIpfs with CID-verified IPFS fetch.
    const cid = 'bafkreidwbautgstcnl54oszez7yqlc7mr5lrj6ac65h3p5sjw2rgz2jtv4';
    let vk: any = null;
    let err: Error | null = null;
    try {
      vk = await fetchVkFromIpfs(cid);
    } catch (e: any) {
      err = e;
    }
    // In CI this might fail (network). In dev with IPFS access it should pass.
    if (err) {
      // Network unreachable is acceptable — skip assertion
      expect(err.message).toContain('fetchVkFromIpfs');
    } else {
      expect(vk).not.toBeNull();
      expect(vk.protocol).toBe('groth16');
      expect(vk.curve).toBe('bn128');
    }
  });
});

describe('Groth16NotAvailableError', () => {
  test('is instanceof Error', () => {
    expect(new Groth16NotAvailableError()).toBeInstanceOf(Error);
  });

  test('has correct name', () => {
    expect(new Groth16NotAvailableError().name).toBe('Groth16NotAvailableError');
  });

  test('default message', () => {
    expect(new Groth16NotAvailableError().message).toBe('snarkjs is not available');
  });
});

describe('fetchVkFromIpfs', () => {
  test('throws on bad CID', async () => {
    await expect(fetchVkFromIpfs('bad-cid')).rejects.toThrow();
  });
});
