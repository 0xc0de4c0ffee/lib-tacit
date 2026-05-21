// ECDH trial decryption of tacit output amounts.
// Uses the self (change) derivation path to trial-decrypt: the wallet's own
// private key derives both the blinding factor and the amount keystream via
// domain-separated HMAC. If the resulting Pedersen commitment matches, the
// amount is returned; otherwise null.

import { pedersenCommit, tryBytesToPoint } from '../crypto/pedersen.js';
import {
  deriveChangeBlinding,
  deriveAmountKeystreamSelf,
  decryptAmount,
} from '../crypto/ecdh.js';
import { ANCHOR_LEN, AMOUNT_CT_LEN, COMPRESSED_POINT_LEN } from '../constants/limits.js';

export function tryDecryptOutput(
  encryptedAmount: Uint8Array,
  commitment: Uint8Array,
  privkey: Uint8Array,
  anchor: Uint8Array,
  vout: number,
): bigint | null {
  if (encryptedAmount.length !== AMOUNT_CT_LEN) return null;
  if (commitment.length !== COMPRESSED_POINT_LEN) return null;
  if (anchor.length !== ANCHOR_LEN) return null;

  const commPoint = tryBytesToPoint(commitment);
  if (!commPoint) return null;

  const keystream = deriveAmountKeystreamSelf(privkey, anchor, vout);
  const amount = decryptAmount(encryptedAmount, keystream);
  const blinding = deriveChangeBlinding(privkey, anchor, vout);

  if (pedersenCommit(amount, blinding).equals(commPoint)) {
    return amount;
  }

  return null;
}

export function tryDecryptOutputs(
  outputs: { encryptedAmount: Uint8Array; commitment: Uint8Array; anchor: Uint8Array; vout: number }[],
  privkey: Uint8Array,
): (bigint | null)[] {
  return outputs.map(o => tryDecryptOutput(o.encryptedAmount, o.commitment, privkey, o.anchor, o.vout));
}
