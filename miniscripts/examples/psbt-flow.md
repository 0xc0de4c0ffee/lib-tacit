# PSBT Flow: Tacit + Miniscript Spend

How a Partially Signed Bitcoin Transaction (PSBT, BIP 174) carries the necessary data for a tacit confidential spend through a Miniscript-backed Taproot output. This covers the full lifecycle from output creation to spending via key path or script path.

---

## Overview

A PSBT for a tacit + miniscript Taproot output needs to carry:

- **Taproot tree structure** — the internal key and all script leaves (output-side)
- **Key material and derivation paths** — BIP 32 origin info for all keys in all leaves
- **Partial signatures** — Schnorr signatures for each key involved in the spend
- **Control block** — Merkle proof for the leaf being spent (script path only)
- **Tacit payload** — the opcode, kernel signature, Pedersen commitments, rangeproof

BIP 174 (PSBT) defines generic fields; BIP 371 (PSBT extensions for Taproot) adds Taproot-specific fields. The relevant field types are:

| Field | Type | Role |
|-------|------|------|
| `PSBT_IN_TAP_KEY_SIG` | 0x14 | 64-byte key-path Schnorr signature |
| `PSBT_IN_TAP_SCRIPT_SIG` | 0x15 | Per-key Schnorr sig for script-path leaves |
| `PSBT_IN_TAP_LEAF_SCRIPT` | 0x16 | The individual leaf script being satisfied |
| `PSBT_IN_TAP_LEAF_HASH` | 0x17 | Leaf hash for per-key leaf binding |
| `PSBT_IN_TAP_CONTROL_BLOCK` | 0x18 | Merkle proof (control block) for script path |
| `PSBT_OUT_TAP_INTERNAL_KEY` | 0x05 | The internal xonly pubkey |
| `PSBT_OUT_TAP_TREE` | 0x06 | Full taproot leaf script tree |
| `PSBT_OUT_TAP_BIP32_DERIVATION` | 0x07 | Key origin + leaf constraints per key |

---

## Step 1: Output Creation

The wallet constructs a `tr()` output with Miniscript leaves. The PSBT output fields capture the full taproot tree.

### Example Output: Tacit Wallet with Timelock Recovery

```
tr(tacit_internal_key, {
  and_v(v:pk([abcd/86h/1h/0h]xpub_rec/0/*), older(52560))
})
```

### PSBT_OUT Fields

**PSBT_OUT_TAP_INTERNAL_KEY (0x05):**
```
Key:  <outpoint>/0  (output at index 0 of this tx)
Value: 20 <32-byte internal key xonly>
```

The internal key is the tacit wallet's aggregate key — either a single key derived from the wallet seed or a MuSig2 aggregate of multiple cosigners. This key is **controlled by the wallet** (unlike the current NUMS key which has no private key).

**PSBT_OUT_TAP_TREE (0x06):**
```
Key:  <outpoint>/0
Value: <leaf_version_1byte> <script_len_compact> <script_bytes>
```

For the recovery leaf:
```
Value: c0 27 20<32B rec_key>ad 03 50cd00 b2
       │   │  └─ CHECKSIGVERIFY + 52560 + CHECKSEQUENCEVERIFY
       │   └─ script length (39 bytes)
       └─ leaf version 0xc0 (Tapscript)
```

**PSBT_OUT_TAP_BIP32_DERIVATION (0x07):**
```
Key:  <outpoint>/0/<32B_rec_key>
Value: <leaf_hashes_count> <leaf_hash(32B)> [leaf_hash(32B)...]
       <key_fingerprint(4B)> <derivation_path_len> <derivation_path>
```

This binds each public key to its BIP 32 derivation path AND the specific leaf(s) it appears in. For the recovery key in the recovery leaf only:

```
Value: 01
       <leaf_hash_of_recovery_script>
       abcd1234
       04 86 00000001 00000000  (m/86h/1h/0h)
```

### What the Output Side Tells the Signer

1. "There are N leaves in the taproot tree" — the signer can reconstruct the Merkle root
2. "The internal key is pubkey X" — the signer can check if it's their key
3. "Key A appears in leaf 1 with script S1" — binding key to leaf
4. "The output script is Q = P + tG" — the signer can verify their role

---

## Step 2: Input Spending — Key Path

The simplest case: the tacit wallet executes a normal key-path spend. The kernel signature IS the key-path signature.

### PSBT_IN Fields

**PSBT_IN_TAP_KEY_SIG (0x14):**
```
Key:  <input_txid>/<input_vout>
Value: <64-byte BIP-340 Schnorr signature>
```

This is the BIP-340 signature over the transaction sighash, verified against the **tweaked output key** `Q = P + t·G`. It binds the spend to the exact transaction outputs, amounts, and the Merkle root.

**No other Taproot-specific PSBT fields are needed.** The signer does not need to know the tree structure for a key-path spend — they just need the internal key's private key to produce the signature.

### Signer's View

The hardware wallet sees:
- "Spending P2TR output" (standard BIP 341)
- "Your key" (shows key fingerprint)
- Amount and destination addresses
- Normal UX — indistinguishable from signing any P2TR spend

### Final Witness (Broadcast)

```
wit[0] = <64 B schnorr_sig>
```

That's it. No script, no control block, no leaf structure revealed on chain. The indexer recognizes this as a tacit spend by the 64-byte sig + tacit payload in subsequent witness elements (or by recognizing the internal key as a well-known tacit key).

---

## Step 3: Input Spending — Script Path (Timelock Recovery)

When the key path is unavailable (e.g., wallet device lost), the spender uses a script-path leaf. The PSBT must carry additional data to identify the leaf and satisfy its conditions.

### Scenario

Recovering a tacit UTXO after the 52560-block timelock using the recovery key.

### PSBT_IN Fields

**PSBT_IN_TAP_SCRIPT_SIG (0x15):**
```
Key:  <input_txid>/<input_vout>/<32B xonly_recovery_key>/<32B leaf_hash>
Value: <64 B Schnorr signature>
```

The signature is for the recovery key, bound to the specific leaf hash. This prevents cross-leaf replay — a signature intended for one leaf cannot be reused in another.

**PSBT_IN_TAP_LEAF_SCRIPT (0x16):**
```
Key:  <input_txid>/<input_vout>/<32B_control_block>
Value: <script_bytes>
```

The `control_block` here is a commitment to the leaf, internal key, and Merkle path. The leaf script is the raw bytecode for the satisfaction:

```
20<32B rec_key> ad 03 50cd00 b2
= <rec_key> CHECKSIGVERIFY <52560> CHECKSEQUENCEVERIFY
```

**PSBT_IN_TAP_CONTROL_BLOCK (0x18):**
```
Key:  <input_txid>/<input_vout>
Value: <control_block_bytes>
```

The control block for the recovery leaf (depth 0 in a 1-leaf tree, or depth N in a larger tree):

```
C0 20<32B_internal_key> <32B_sibling_hash>
```

First byte `0xC0` (depth 0) or `0xC1` (depth 1) encodes leaf version parity + tree depth.

**PSBT_IN_TAP_BIP32_DERIVATION (0x17):**
```
Key:  <input_txid>/<input_vout>/<32B xonly_recovery_key>
Value: <leaf_hash_count=1> <32B leaf_hash>
       <fingerprint=abcd1234> <path_len=4> <path=m/86h/1h/0h>
```

Binds the recovery key's origin info to the specific leaf.

### Signer's View (Hardware Wallet)

The hardware wallet displays:
- **Spending via script path** (notification that this is not a normal P2TR spend)
- **Leaf script hash** (first 4 bytes shown for verification)
- **Policy:** "Recovery key + Timeout 52560" (parsed from the miniscript)
- **Destination address** and amount
- The user confirms they are performing a **recovery spend**

If the hardware wallet supports BIP 388 Wallet Policy Templates, it can show the full policy rather than raw script bytes.

### Final Witness (Broadcast)

```
wit[0] = <64 B schnorr_sig>        — recovery key signature
wit[1] = <recovery_leaf_script>     — ~39 B miniscript bytecode
wit[2] = <control_block>            — ~33-65 B (depending on tree depth)
```

---

## Step 4: Script Path — Hashlocked Atomic Swap

A more complex example: spending via a hashlocked leaf that requires a preimage revelation.

### Scenario

Alice has locked tacit assets in a UTXO with the policy:
```
and_v(v:pk(Bob), sha256(H))
```
Bob claims by providing his signature and the preimage.

### PSBT_IN Fields

**PSBT_IN_TAP_SCRIPT_SIG (0x15):**
```
Key:  <input>/<32B Bob_key>/<32B leaf_hash>
Value: <64 B Bob's signature>
```

**PSBT_IN_TAP_LEAF_SCRIPT (0x16):**
```
Key:  <input>/<control_block_hash>
Value: 20<32B Bob> ad 82 20 88 a8 20<32B H> 87
       = <Bob> CHECKSIGVERIFY SIZE 32 EQUALVERIFY SHA256 <H> EQUAL
```

**Other fields:** LEAF_HASH, CONTROL_BLOCK, BIP32_DERIVATION same as recovery case.

**Additional witness data:** The preimage is not a PSBT-level field — it's added by the finalizer/broadcaster. Preimages are typically not stored in PSBTs because they're ephemeral:

```
wit[0] = <32 B preimage>         — the SHA256 preimage (revealed at broadcast)
wit[1] = <64 B Bob's signature>
wit[2] = <leaf_script>
wit[3] = <control_block>
```

---

## Step 5: Hardware Wallet Signing

### BIP 388 Policy Registration

Before any signing occurs, the hardware wallet must be registered with the miniscript policy. This is a one-time setup:

1. **Wallet app** sends the BIP 388 policy map to the hardware device:
   ```json
   {
     "policy": "tr(@0/**,{and_v(v:pk(@1/**),older(52560))})",
     "keys": [
       "[fingerprint/86h/0h/0h]xpub_main...",
       "[fingerprint/86h/1h/0h]xpub_rec..."
     ]
   }
   ```
2. **Hardware wallet** parses the policy, displays a human-readable summary:
   - "Taproot wallet with timelocked recovery"
   - "Primary key: abcd1234 (m/86h/0h/0h)"
   - "Recovery key: efgh5678 (m/86h/1h/0h)"
   - "Timelock: 52560 blocks (~1 year)"
3. **User confirms** on device. The device stores `HMAC(policy_map)` for verification.

### Signing Verification

When a PSBT arrives for signing:

1. Device looks up stored policy by the PSBT's key fingerprints
2. Device verifies HMAC(policy_map) matches the stored HMAC
3. For each input that uses a key the device controls:
   - If key-path: standard P2TR signing, no policy re-verification needed
   - If script-path: verify the leaf script matches one of the registered policy leaves
   - Verify the derivation path matches the registered key origin
   - Verify the control block commits to the same internal key and tree
4. Device displays: "Signing tacit spend via recovery leaf (timeout path)"
5. User confirms — device produces partial Schnorr signature

### HMAC Verification Detail

The HMAC prevents a compromised wallet app from swapping policies:

```
stored_hmac = HMAC(device_secret, policy_map_string)
```

On each signing request:
```
computed_hmac = HMAC(device_secret, psbt_policy_map)
require(computed_hmac == stored_hmac)
```

If an attacker modifies the policy (e.g., removes the timelock), the HMAC won't match and the device refuses to sign.

---

## Concrete PSBT Hex Example

A simplified PSBT for a tacit key-path spend. PSBT format (BIP 174) uses compact-size-prefixed key-value maps. Only taproot-relevant fields shown.

```
70736274ff01009a0200000001abcd...0100000000ffffffff...  ← unsigned tx

// GLOBAL (per-PSBT metadata)
0100  // version = 0

// INPUT 0
0200 // PSBT_IN_NON_PSBT_UTXO (no prevout needed for this example)
...

0300 // PSBT_IN_PARTIAL_SIG (none — Schnorr sigs are not partial in key-path)

// TAP INPUTS
1400 // PSBT_IN_TAP_KEY_SIG
<compact_size(64)>  <64 B Schnorr signature>

1600 // PSBT_IN_TAP_LEAF_SCRIPT (not present for key-path)
...

1800 // PSBT_IN_TAP_CONTROL_BLOCK (not present for key-path)
...

// OUTPUT 0
0500 // PSBT_OUT_TAP_INTERNAL_KEY
20 <32B internal key>

0600 // PSBT_OUT_TAP_TREE
c0 27 20<32B rec_key> ad 03 50cd00 b2

0700 // PSBT_OUT_TAP_BIP32_DERIVATION
<32B rec_key> : 01 <32B leaf_hash> abcd1234 04 86 00000001 00000000

00  // separator
```

Key: `PSBT_IN_TAP_KEY_SIG (0x14)` is present for key-path. For script-path, replace `0x14` with:
- `0x15` (PSBT_IN_TAP_SCRIPT_SIG) — per-key signature for a script leaf
- `0x16` (PSBT_IN_TAP_LEAF_SCRIPT) — the leaf script
- `0x18` (PSBT_IN_TAP_CONTROL_BLOCK) — merkle proof

---

## Summary: PSBT Fields by Spend Path

| Field | Key Path | Script Path (Recovery) | Script Path (Hashlock) |
|-------|----------|----------------------|----------------------|
| PSBT_IN_TAP_KEY_SIG | ✓ (64 B) | — | — |
| PSBT_IN_TAP_SCRIPT_SIG | — | ✓ (64 B per key) | ✓ (64 B per key) |
| PSBT_IN_TAP_LEAF_SCRIPT | — | ✓ (~39 B script) | ✓ (~73 B script) |
| PSBT_IN_TAP_LEAF_HASH | — | ✓ (32 B hash) | ✓ (32 B hash) |
| PSBT_IN_TAP_CONTROL_BLOCK | — | ✓ (33-65 B) | ✓ (33-65 B) |
| PSBT_IN_BIP32_DERIVATION | ✓ (standard) | ✓ (per leaf key) | ✓ (per leaf key) |
| PSBT_OUT_TAP_INTERNAL_KEY | ✓ | ✓ | ✓ |
| PSBT_OUT_TAP_TREE | ✓ | ✓ | ✓ |
| Additional witness | — | — | Preimage (not PSBT) |

Key path is strictly simpler — fewer PSBT fields, no leaf verification, normal hardware wallet UX.
