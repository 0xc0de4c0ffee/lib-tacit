# Skill: Blinded-Pubkey Stealth (SPEC-BLINDED-PUBKEY-AMENDMENT)

## Domain Knowledge

Class-2 stealth hides the recipient pubkey at the on-chain dust marker. Each transfer uses a per-tx unique P2WPKH or P2TR address derived from ECDH + HMAC, without changing tacit envelope wire formats for shipped opcodes like `T_CXFER`.

- **commit** = `P_recipient + b·G`
- **tweaked_sk** = `(recipient_priv + b) mod n`
- **b** = `HMAC-SHA256(shared, domain || network_tag || tx_anchor) mod n`
- **shared** = `SHA256(x_only(ECDH(priv, P_sender_aggregate)))` — x-only is normative

Reference: `tacit-specs/spec/amendments/SPEC-BLINDED-PUBKEY-AMENDMENT.md`, `tacit-specs/tests/stealth-primitives.mjs`.

## Address Format (§D.1)

| Network | HRP |
|---------|-----|
| mainnet | `tcs` |
| signet | `tcsts` |
| regtest | `tcsrt` |

Payload: `version(0x00) || mode || data` where mode `0x00` = single 33-byte pubkey, `0x01` = scan+spend (66 bytes).

## Implementation (`src/crypto/stealth.ts`)

```typescript
import {
  encodeStealthAddress,
  decodeStealthAddress,
  stealthTxAnchorHead,
  senderComputeStealthCommit,
  recipientScanTxForStealth,
  DOMAIN_CXFER_STEALTH,
  STEALTH_DOMAIN_BY_OPCODE,
} from 'lib-tacit';

// Recipient advertises signet stealth address
const addr = encodeStealthAddress({ network: 'signet', recipientPub: wallet.pub });

// Sender: anchor = first asset input outpoint (vin[1] for envelope txs)
const head = stealthTxAnchorHead(assetTxidHex, assetVout);
const { commit } = senderComputeStealthCommit({
  senderEligibleInputPrivs: [senderPriv],
  recipientPub: wallet.pub,
  networkTag: 'signet',
  domain: DOMAIN_CXFER_STEALTH,
  txAnchorHead: head,
  voutIndex: markerVout,
});
// Place marker at P2WPKH(hash160(commit))

// Recipient scan
const credits = recipientScanTxForStealth({
  classifiedInputs: inputs.map(classifyStealthInput),
  outputs: tx.outputs,
  walletPriv,
  walletPub: wallet.pub,
  networkTag: 'signet',
  domain: STEALTH_DOMAIN_BY_OPCODE.get(0x23)!,
  txAnchorHead: head,
});
```

## Validation Rules

1. **§A.2.5** — Only P2WPKH and P2TR key-path inputs aggregate into `P_sender`; mixer-derived prevouts excluded first.
2. **§F.7** — All eligible inputs must be wallet-owned before emitting stealth (`checkStealthEmissionSafety`).
3. **§C** — `tx_anchor_head` = `txid_LE(32) || vout_LE(4)` of first asset input; append output `vout_index` for per-output disambiguation.

## Tests

`tests/crypto/stealth.test.ts` — ported from reference `cxfer-stealth.test.mjs` / `stealth-primitives.mjs` (run only in lib-tacit, never in submodule).

## Common Pitfalls

- Using compressed (33-byte) ECDH serialization instead of x-only SHA256 — recipients miss payments.
- Using display-order txid in anchor instead of wire LE bytes.
- Legacy `st`/`tst` bech32 HRP — production uses `tcs`/`tcsts`/`tcsrt`.
