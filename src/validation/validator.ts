// Recursive ancestry validation.
// Wraps AncestryWalker.walkAncestry and returns a descriptive error string
// when the chain fails validation, or null on success.

import type { AncestryWalker } from '../indexer/ancestry.js';

export async function validateAncestry(
  walker: AncestryWalker,
  txid: string,
  vout: number,
  _options?: { maxDepth?: number; strictKernel?: boolean },
): Promise<string | null> {
  const result = await walker.walkAncestry(txid, vout);

  if (result.isValid) return null;

  for (const utxo of result.path) {
    if (!utxo.isValid) {
      return utxo.error ?? `validation failed at depth ${utxo.depth} for ${utxo.txid}:${utxo.vout}`;
    }
  }

  return 'unknown validation failure';
}
