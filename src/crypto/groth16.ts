export class Groth16NotAvailableError extends Error {
  constructor(msg?: string) {
    super(msg ?? 'snarkjs is not available');
    this.name = 'Groth16NotAvailableError';
  }
}

let snarkjs: any;
let snarkjsLoadAttempted = false;

async function getSnarkjs(): Promise<any> {
  if (!snarkjsLoadAttempted) {
    snarkjsLoadAttempted = true;
    try {
      snarkjs = await import('snarkjs');
    } catch {
      snarkjs = null;
    }
  }
  if (!snarkjs) {
    throw new Groth16NotAvailableError();
  }
  return snarkjs;
}

export async function groth16Verify(
  vk: { alpha1?: any; beta2?: any; gamma2?: any; delta2?: any; ic?: any[] },
  publicSignals: any[],
  proof: { pi_a?: any[]; pi_b?: any[][]; pi_c?: any[]; protocol?: string; curve?: string },
): Promise<boolean> {
  const s = await getSnarkjs();
  return s.groth16.verify(vk, publicSignals, proof);
}

export async function fetchVkFromIpfs(cid: string, gateway?: string): Promise<any> {
  try {
    const { ipfsFetchVerified } = await import('../indexer/ipfs.js');
    const result = await ipfsFetchVerified(cid, { gateways: gateway ? [gateway] : undefined });
    return JSON.parse(new TextDecoder().decode(result.bytes));
  } catch {
    throw new Error(`fetchVkFromIpfs: failed to fetch ${cid} from IPFS`);
  }
}
