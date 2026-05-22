# Hashlock-Based Preauth Bid Settlement (HTLC)

> **Branch:** `research/miniscript-integration`
> **Status:** R&D — design proposal

## 1. Problem: Preauth Bid Complexity

Current preauth bid (T_PREAUTH_BID, opcode 0x5B; T_PREAUTH_BID_VAR, opcode 0x5C) uses a complex **off-chain pre-signing** mechanism:

1. Buyer creates a bid output with Pedersen commitment and kernel sig
2. Buyer pre-signs a SIGHASH_SINGLE_ACP transaction that sends the bid to the seller
3. Seller holds the pre-signed tx and can broadcast it at any time
4. When the seller delivers the asset, the buyer reveals the pre-signed tx

### Pain points

| Issue | Description |
|-------|-------------|
| PSBT coordination | Both parties must exchange partial signatures, requiring multi-round communication |
| SIGHASH_SINGLE_ACP | Non-standard sighash flag; some wallets/signers may not support it |
| SIGHASH_SINGLE_ACP | `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY` = 0x83, but with `SIGHASH_ACP` convention = `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY` (0x83) — actually `0x83` is `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY` which is 0x83. The "ACP" in the codebase means "Anyone-Can-Pay" but the standard flag is `SIGHASH_ANYONECANPAY` = 0x80. So SIGHASH_SINGLE_ACP = 0x01 | 0x80 = 0x83. |
| Reuse risk | Pre-signed tx could be broadcast at any time; no expiry mechanism |
| Complexity | Error-prone for wallet implementers |
| On-chain size | 872–1076 B including rangeproofs |

## 2. Solution: Hashlock Miniscript Leaf (HTLC)

Replace the pre-signing mechanism with an on-chain **hashlock** using a Miniscript leaf:

```
and_v(v:pk(seller), sha256(bid_secret_hash))
```

### How it works

1. **Buyer generates secret**: random 32-byte value `s`, computes `H = SHA256(s)`
2. **Buyer creates bid UTXO** with a taproot tree containing a hashlock leaf
3. **Buyer gives `s` to seller** off-chain (after receiving the asset, or atomically)
4. **Seller claims** by revealing `s` in the witness (SHA256 preimage)

### Compiled script

```
<seller_pubkey> CHECKSIGVERIFY SIZE 32 EQUALVERIFY SHA256 <H> EQUAL
```

The `SIZE 32 EQUALVERIFY` ensures the preimage is exactly 32 bytes (preventing hash length extension attacks).

| Component | Bytes |
|-----------|-------|
| Seller pubkey push | 33 |
| CHECKSIGVERIFY | 1 |
| SIZE | 1 |
| 32 | 1 |
| EQUALVERIFY | 1 |
| SHA256 | 1 |
| Hash push (`<H>`) | 33 |
| EQUAL | 1 |
| **Total leaf script** | **~73 B** |

### Witness structure (seller claiming)

```
witness: [
  <seller_sig>,     // 64 B (BIP-340)
  <preimage_s>,     // 34 B (0x20 || 32-byte preimage)
  <hashlock_script>, // ~73 B
  <control_block>   // 33 B (1-leaf tree)
]
```

| Spend scenario | Sigs | Witness total vB |
|----------------|------|------------------|
| Key path (buyer reclaim) | 1 | 64 B |
| Hashlock (seller claim) | 1 sig + 32 B preimage | 64+34+73+33 = **204 vB** |
| Combined (seller sig + preimage) | 1 sig + 34 B preimage | **204 vB** |

## 3. Atomic Swap via Hashlock (Cross-Chain)

The classic HTLC atomic swap pattern works natively with Miniscript:

### Alice has Asset A, Bob has Asset B

```
1. Alice generates secret s, computes H = SHA256(s)

2. Alice creates UTXO_A:
   Taproot internal key: Alice's kernel key K_a
   Leaf: and_v(v:pk(Bob), sha256(H))
   → Bob can claim with (Bob_sig + s)

3. Bob creates UTXO_B:
   Taproot internal key: Bob's kernel key K_b
   Leaf: and_v(v:pk(Alice), sha256(H))
   → Alice can claim with (Alice_sig + s)

4. Alice reveals s to Bob (off-chain, e.g. after Bob delivers Asset A)

5. Bob claims UTXO_A using (Bob_sig + s) — reveals s on-chain

6. Alice sees s on-chain, claims UTXO_B using (Alice_sig + s)
```

### Atomicity guarantee

| Scenario | UTXO_A | UTXO_B | Result |
|----------|--------|--------|--------|
| Both settle | Bob claims A with s | Alice claims B with s | Fair exchange |
| Alice never reveals s | Bob cannot claim A | Alice cannot claim B | Both refund |
| Alice reveals s, Bob doesn't claim | Bob can claim A (s on-chain) | Alice claims B (s on-chain) | Alice may lose A |

### Timelock fallback

To prevent the scenario where Alice reveals `s` but Bob doesn't claim UTXO_A (leaving Alice's asset locked), add a **refund leaf**:

```
Taproot tree:
  Leaf 1: and_v(v:pk(Bob), sha256(H))    // hashlock — Bob claims
  Leaf 2: and_v(v:pk(Alice), older(N))    // refund — Alice reclaims after N blocks
```

Now if Bob doesn't claim UTXO_A after `s` is revealed, Alice can reclaim after N blocks using her key path (actually key path is always available, but Bob could front-run with the hashlock). The refund leaf gives Alice a guaranteed exit.

## 4. Refund Leaf Integration

The full taproot tree for a bidirectional atomic swap:

```
Internal key: K_Alice (key path — Alice can always spend quietly)
  Leaf 1: and_v(v:pk(Bob), sha256(H))     // Hashlock — Bob claims with s
  Leaf 2: and_v(v:pk(Alice), older(N))    // Refund — Alice reclaims after timeout
```

### Timelock coordination

| Condition | Action | Timing |
|-----------|--------|--------|
| Bob has s | Bob signs + reveals s → claims UTXO | Any time before timeout |
| Alice never shares s | Neither can claim via hashlock; Alice waits | After N blocks |
| Alice shares s; Bob doesn't claim | Bob can claim; Alice refunds after N | Alice waits N blocks |
| Alice shares s; Bob claims | Bob claims UTXO_A, reveals s; Alice claims UTXO_B | Instant (after Bob's tx confirms) |

### Security: timelock ordering

For cross-atomic swaps, Bob's timelock must be **shorter** than Alice's timelock:

```
UTXO_A (Alice's asset):  refund_leaf timelock = N
UTXO_B (Bob's asset):    refund_leaf timelock = N + M  (M ≥ 1 block)
```

If Bob claims UTXO_A (revealing `s`), Alice has at least M blocks to claim UTXO_B before Bob can refund it. This prevents Bob from claiming both assets.

### Concrete timelock values

| Trade context | N (Alice refund) | M (Alice claim window) |
|---------------|------------------|----------------------|
| Same-chain swap | 144 blocks (~24h) | 72 blocks (~12h) |
| Lightning-to-tacit | 144 blocks | 72 blocks |
| Cross-chain (BTC↔tacit) | Depends on BTC confs | 2× BTC conf target |

## 5. Comparison with Preauth Bid Wire Format

| Aspect | Preauth bid (0x5B) | Hashlock (HTLC) |
|--------|-------------------|-----------------|
| On-chain size (N=1, classic BP) | 969 B | ~400–600 B (tacit envelope + hashlock leaf) |
| On-chain size (N=1, BP+) | 872 B | ~400–600 B |
| Off-chain communication | PSBT exchange, pre-signing | Secret exchange (32 B) |
| Sighash complexity | SIGHASH_SINGLE_ACP (0x83) | Standard SIGHASH_DEFAULT (0x00) |
| Atomicity | Implicit (pre-signed tx) | Explicit (preimage revelation) |
| Refund mechanism | Timelocked bid (if implemented) | Timelocked refund leaf |
| Privacy | Medium (kernel sig) | Medium (hashlock leaf on dispute) |
| Implementation complexity | High (PSBT, custom sighash) | Low (standard signing) |

### Estimated on-chain size breakdown

**Hashlock + tacit envelope hybrid** (bid output):

| Component | Bytes |
|-----------|-------|
| Taproot output (internal key + merkle root) | 34 B (1P2TR) |
| Key path witness (buyer reclaim, no hashlock) | 64 B (sig) |
| Hashlock leaf script | ~73 B |
| Hashlock witness (seller claims with preimage) | 64 (sig) + 34 (preimage) + 73 (script) + 33 (cb) = 204 B |
| Refund leaf script | ~38 B |
| Refund witness (buyer after timeout) | 64 (sig) + 38 (script) + 33 (cb) = 135 B |
| **Total UTXO** | **34 B** (fixed) |
| **Key path spend** | **98 B** (buyer reclaims immediately) |
| **Hashlock spend** | **238 B** (seller claims with preimage) |
| **Refund spend** | **169 B** (buyer reclaims after timeout) |

> The bid UTXO itself is always 34 B (standard P2TR). The path chosen determines the spend cost.

## 6. Security Analysis

### Preimage security

| Property | Value |
|----------|-------|
| Preimage size | 32 bytes (enforced by `SIZE 32 EQUALVERIFY`) |
| Hash function | SHA256 (standard, Bitcoin-native) |
| Preimage resistance | 2^256 |
| Second-preimage resistance | Guaranteed by SHA256 |
| Length extension | Blocked by explicit SIZE check |

### Replay protection

The preimage `s` is revealed on-chain when the hashlock is claimed. **Anyone can see `s`** and use it to claim any other UTXO that uses the same `H`. Mitigations:

- **Per-trade secrets**: Generate a fresh `s` for each trade
- **Bid-specific H**: The hash commits to the bid ID or trade parameters: `H = SHA256(s || bid_id)`
- **One-time use**: After `s` is revealed, the hashlock path is effectively public

### Malleability

The hashlock script uses `SIZE 32 EQUALVERIFY` before `SHA256 <H> EQUAL`. This means:

- Any preimage that is exactly 32 bytes and hashes to `H` will satisfy the script
- There is exactly one 32-byte preimage for `H` (assuming SHA256 is collision-resistant)
- Witness malleability: the preimage cannot be replaced with a different-length value

## 7. Integration with Tacit Protocol

### Bid ID as preimage

Current preauth bid has a 16-byte **bid ID**. This could be extended to 32 bytes to serve double duty as the hashlock preimage:

```
bid_id = SHA256(seckey || trade_params)[:16]  // current: 16 B
bid_id = SHA256(seckey || trade_params)        // proposed: 32 B = preimage
```

This eliminates the need for a separate `s` value. The bid ID IS the preimage.

### Opcode extension

Instead of replacing T_PREAUTH_BID, add a **new variant** or a **flag bit** in the opcode that switches from pre-signed to hashlock mode:

```
T_PREAUTH_BID (0x5B)       → pre-signed mode (current)
T_PREAUTH_BID_HTLC (0x5D)  → hashlock mode (new, proposed)
```

### Wallet flow (seller side)

```
1. Bob sees Alice's bid UTXO on-chain
2. Bob reads the taproot merkle root from the UTXO (off-chain or via indexer)
3. Bob sees the hashlock leaf: and_v(v:pk(Bob), sha256(H))
4. Bob sends Asset B to Alice off-chain
5. Alice reveals s to Bob
6. Bob broadcasts: inputs = [bid_UTXO], outputs = [Bob's claim]
   Witness: <Bob_sig> <s> <hashlock_script> <control_block>
7. Alice monitors chain for s, uses it to claim Bob's matching UTXO
```

This is simpler than the current preauth flow: no PSBT, no pre-signing, no SIGHASH_SINGLE_ACP.

## 8. Limitations and Trade-offs

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Preimage revealed on-chain | One-time use per hash | Fresh `s` per trade |
| Larger script path | 204 B vs 64 B key path | Key path for refunds; hashlock only for claim |
| No kernel supply proof | Hashlock can't verify asset amounts | Combine hashlock leaf + tacit key path for the kernel sig |
| Timelock coordination | Must ensure correct ordering | Wallet handles automatically |
| Mempool reactivity | Bob must claim before timeout; Alice must claim after Bob reveals | Watchtowers / automated monitoring |

### Combining hashlock with kernel proof

The most interesting design: **use both key path AND script path in the same UTXO**:

```
Taproot tree:
  Leaf 1: and_v(v:pk(Bob), sha256(H))   // hashlock claim

Spending via key path:
  - Buyer (Alice) signs with kernel key K_a
  - Provides kernel sig proving supply conservation
  - This is the "refund" or "reclaim" path

Spending via script path (Leaf 1):
  - Bob reveals s + his sig
  - No kernel proof (Bob is not the kernel key holder)
  - Amount is whatever the UTXO commitment says
```

This means:
- **Key path**: tacit kernel proof (supply conservation) + Alice's signature
- **Script path**: hashlock proof (preimage) + Bob's signature — no kernel proof

For atomic swaps, this is acceptable: Bob only cares that he can claim the UTXO (the amount is fixed by the Pedersen commitment). The kernel proof is only needed for the overall transaction balance, which Bob's wallet verifies before signing.

## 9. Comparison: Preauth Bid vs. Hashlock vs. Hybrid

| Dimension | Preauth bid (0x5B) | Hashlock leaf | Hybrid (both) |
|-----------|-------------------|---------------|---------------|
| Atomic swap | Yes | Yes | Yes |
| Pre-signing required | Yes (SIGHASH_SINGLE_ACP) | No | No |
| On-chain overhead | 872–1076 B (bid + rangeproof) | 34 B UTXO + 204 B claim | ~34 B UTXO + flexible |
| Refund mechanism | Timelock (optional) | Refund leaf (explicit) | Key path (built-in) |
| Seller claim cost | Included in bid | 204 B | 204 B |
| Buyer refund cost | Depends on timelock | 98 B (key path) | 98 B (key path) |
| Communication rounds | 2+ (PSBT exchange) | 1 (secret exchange) | 1 |
| Protocol complexity | High | Low | Low |

## 10. Recommendation

| Use case | Recommended approach |
|----------|---------------------|
| Peer-to-peer atomic swap | Hashlock leaf + refund leaf + key path (full taproot tree) |
| Marketplace bid | Hashlock leaf (simpler than preauth bid) |
| Cross-chain atomic swap | Hashlock leaf with carefully ordered timelocks |
| High-value OTC | Hashlock + escrow leaf (2-of-3, parties can dispute) |
| Existing preauth bid migration | Add variant opcode T_PREAUTH_BID_HTLC (0x5D) |

**Primary recommendation**: Replace the pre-signed SIGHASH_SINGLE_ACP mechanism with a hashlock Miniscript leaf. This reduces protocol complexity, eliminates PSBT coordination, and provides a cleaner atomic swap primitive. The key path remains available for buyer refunds, making the overall design simpler and more robust than the current preauth bid protocol.
