// Transaction builder: commit-reveal tx construction.
// Builds the commit tx and the script-path reveal tx that carries the envelope.

import { sha256 } from '@noble/hashes/sha256';
import { concatBytes } from '@noble/hashes/utils';
import type { TxTemplate, TxInput, TxOutput } from './sighash.js';
import { encodeEnvelopeScript } from '../envelope/script.js';
import { reverseBytesHex } from './utils.js';

export interface CommitTxParams {
  commitmentValue: number;
  commitmentScript: Uint8Array;  // P2TR output script (OP_1 || 32-byte key)
  changeScript: Uint8Array;
  changeValue: number;
  inputs: TxInput[];
  locktime?: number;
}

export interface RevealTxParams {
  commitTxid: string;
  commitVout: number;
  commitValue: number;
  signingPubXonly: Uint8Array;
  envelopePayload: Uint8Array;
  outputs: TxOutput[];
  locktime?: number;
}

// Build a commit tx — sends funds to a user-provided output script
export function buildCommitTx(params: CommitTxParams): TxTemplate {
  return {
    version: 2,
    inputs: params.inputs,
    outputs: [
      { value: params.commitmentValue, script: params.commitmentScript },
      { value: params.changeValue, script: params.changeScript },
    ],
    locktime: params.locktime ?? 0,
  };
}

// Build a reveal tx — spends the P2TR via script-path, exposing the envelope
export function buildRevealTx(params: RevealTxParams): TxTemplate {
  const envelopeWitness = encodeEnvelopeScript(params.signingPubXonly, params.envelopePayload);
  return {
    version: 2,
    inputs: [{
      txid: params.commitTxid,
      vout: params.commitVout,
      sequence: 0xfffffffd,
      witness: [
        new Uint8Array(64),  // placeholder: BIP-340 signature (caller fills)
        envelopeWitness,
      ],
    }],
    outputs: params.outputs,
    locktime: params.locktime ?? 0,
  };
}

// Compute asset_id from a reveal tx
export function computeAssetIdFromTx(revealTxidHex: string): Uint8Array {
  const voutLE = new Uint8Array(4);
  new DataView(voutLE.buffer).setUint32(0, 0, true);
  return sha256(concatBytes(reverseBytesHex(revealTxidHex), voutLE));
}
