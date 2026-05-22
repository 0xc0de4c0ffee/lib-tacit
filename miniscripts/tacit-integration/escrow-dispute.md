# Escrow & Dispute Resolution for Tacit Atomic Settlements

> **Branch:** `research/miniscript-integration`
> **Status:** R&D — design proposal

## 1. Problem

Current tacit atomic settlement (T_AXFER, T_PREAUTH_BID) requires **both parties to be online and cooperative**:

1. Buyer creates a CXFER output committing `v_buyer` amount
2. Seller creates a CXFER output committing `v_seller` amount
3. Both must sign a single transaction with kernel excess summing to zero
4. If either party disappears or refuses to sign, settlement fails

This is a **bilateral protocol** — there is no recourse if the counterparty cheats, disappears, or fails to deliver. In traditional finance, escrow agents, arbitration panels, and dispute resolution mechanisms handle these failure modes.

## 2. Solution: 2-of-3 Escrow Miniscript Leaf

Add an **escrow leaf** to the taproot tree that enables a neutral third party to resolve disputes:

```
Taproot output = internal_key (tacit kernel pubkey) + Merkle root of:
  Leaf 1: thresh(2, pk(buyer), pk(seller), pk(arbitrator))
```

### Miniscript

```
thresh(2, pk(buyer), s:pk(seller), s:pk(arbitrator))
```

### Compiled script

```
<buyer> CHECKSIG <seller> CHECKSIG ADD <arbitrator> CHECKSIG ADD 2 EQUAL
```

| Component | Bytes |
|-----------|-------|
| 3 public key pushes | 33 × 3 = 99 B |
| Opcodes (CHECKSIG × 3, ADD × 2, 2, EQUAL) | 7 B |
| **Total leaf script** | **~106 B** |

### Witness (spending via escrow leaf)

```
witness: [
  <sig_A>,   // 64 B
  <sig_B>,   // 64 B (any 2 of buyer, seller, arbitrator)
  <script>,  // ~106 B
  <control_block>  // 33 B
]
```

| Spend scenario | Sigs | Total witness vB |
|----------------|------|------------------|
| Cooperative (buyer + seller) | 2 | 64+64+106+33 = **267 vB** |
| Buyer dispute (buyer + arb) | 2 | **267 vB** |
| Seller dispute (seller + arb) | 2 | **267 vB** |
| Key path (no dispute) | 1 | **64 vB** (no control block) |

## 3. How It Works On-Chain

### Flow diagram

```
1. OUTPUT CREATION
   Buyer creates UTXO with:
   - Internal key: tacit kernel pk (key path spend)
   - Merkle leaf: 2-of-3 escrow (buyer, seller, arbitrator)

2. NORMAL SETTLEMENT (happy path)
   - Buyer + seller sign using key path (single tacit kernel sig)
   - Cost: 98 vB
   - No control block, no escrow overhead

3. DISPUTE (unhappy path)
   - Buyer claims seller didn't deliver
   - Buyer + arbitrator sign via escrow leaf
   - Funds released to buyer (or split, or to arbitrator judgment)
   - Cost: 267 vB

4. COUNTER-DISPUTE
   - Seller claims buyer didn't pay
   - Seller + arbitrator sign via escrow leaf
   - Funds released to seller
   - Cost: 267 vB
```

### The arbitrator's role

The arbitrator is a **neutral third party** who can sign with either party to resolve a dispute. Possible arbitrators:

| Arbitrator type | Pros | Cons |
|----------------|------|------|
| DAO multisig (3-of-5 federation) | Decentralized, transparent | Slow, expensive |
| Programmatic oracle (DLC) | Automated, trustless | Complex, limited to on-chain data |
| Designated professional escrow | Fast, human judgment | Centralized, fee-based |
| Lightning Network routing node | Fast, automated | Requires LN integration |
| Fixed rule (`older(N)`) | Trustless, simple | Inflexible |

### Trust model

| Scenario | Trust assumption |
|----------|-----------------|
| Buyer + seller cooperate | None (atomic exchange via tacit kernel) |
| Buyer + arbitrator | Buyer trusts arb won't collude with seller |
| Seller + arbitrator | Seller trusts arb won't collude with buyer |
| All three malicious | Funds lost (standard assumption) |

> The arbitrator cannot spend alone — 2-of-3 means any two of the three parties must cooperate. The arbitrator alone can never steal funds.

## 4. Time-Delayed Escrow Pattern

A more sophisticated pattern: allow the buyer to recover funds unilaterally after a timeout, in addition to the 2-of-3 path.

### Miniscript

```
or_i(
  thresh(2, pk(buyer), pk(seller), pk(arbitrator)),
  and_v(v:pk(buyer), older(N))
)
```

### Compiled behavior

| Condition | Spendable by | Sigs | Timelock |
|-----------|-------------|------|----------|
| Cooperative | Buyer + seller | 2 | None |
| Buyer + arbitrator | Buyer + arb | 2 | None |
| Seller + arbitrator | Seller + arb | 2 | None |
| Buyer timeout | Buyer only | 1 | N blocks |
| Seller timeout (if added) | Seller only | 1 | N blocks |

### Script size

`or_i(thresh(2, pk(A), pk(B), pk(C)), and_v(v:pk(A), older(N)))` compiles to approximately:

```
<A> CHECKSIG <B> CHECKSIG ADD <C> CHECKSIG ADD 2 EQUAL
IF_NOT
  <A> CHECKSIGVERIFY <N> CHECKSEQUENCEVERIFY
ENDIF
```

~142 B (estimate, depends on compiler).

This gives the buyer a **guaranteed recovery path**: even if the seller and arbitrator both disappear, the buyer can reclaim after N blocks.

## 5. Comparison with Current Tacit

| Aspect | Tacit today | With escrow leaf |
|--------|-------------|------------------|
| Atomic settlement | Yes (kernel supply conservation) | Yes + dispute resolution |
| Counterparty risk | Full (must trust or use atomic swap) | Reduced (arbitrator can adjudicate) |
| Offline tolerance | None (both must sign) | Partial (arb + one party can settle) |
| Key path cost | 98 vB | 98 vB (unchanged) |
| Script path cost | N/A | 267 vB (dispute) |
| Privacy | High (kernel sig, no script) | Medium (reveals escrow script on dispute) |
| Complexity | Low | Medium (needs arbitrator coordination) |

## 6. Integration with T_AXFER

Today's T_AXFER settlement flow:

```
1. Alice creates CXFER → asset A (v_a, r_a) with kernel key K_a
2. Bob creates CXFER → asset B (v_b, r_b) with kernel key K_b
3. Alice + Bob sign settlement tx: inputs = [C_a, C_b], outputs = [C'_a, C'_b]
4. Kernel excess E' = (C'_a + C'_b) - (C_a + C_b) = committed(v'_a - v_a + v'_b - v_b, r'_a - r_a + r'_b - r_b)
5. Schnorr sig over E' proves no value created/destroyed
```

With escrow leaf:

```
1. Alice creates CXFER → asset A (v_a, r_a)
   Taproot internal key: K_a
   Merkle leaf: thresh(2, pk(Alice), pk(Bob), pk(Arb))
2. Bob creates CXFER → asset B (v_b, r_b)
   Taproot internal key: K_b
   Merkle leaf: thresh(2, pk(Alice), pk(Bob), pk(Arb))
3. Normal settlement: Alice + Bob sign with K_a, K_b (key path) — exactly as today
4. Dispute: Alice + Bob use escrow leaf — new capability
```

The key insight: **the escrow leaf is invisible during normal operation**. The key path spend is identical to today's tacit transaction. The escrow capability only appears if a dispute arises.

## 7. Integration with T_PREAUTH_BID

Current preauth bid (T_PREAUTH_BID / 0x5B):

```
bid_output: C_bid = PedersenCommit(v_bid, r_bid)
  with kernel sig authorizing excess
pre_signed_seller_tx: SIGHASH_SINGLE_ACP pre-signed
  seller can claim bid output by revealing the pre-signed tx
```

With escrow leaf, the bid output can have:

```
bid_output: taproot(K_bid, merkle_root=Hash(escrow_leaf))
  escrow_leaf: thresh(2, pk(buyer), pk(seller), pk(marketplace_arb))
```

If the seller doesn't deliver the asset:
- Preauth path: seller uses pre-signed tx (requires seller to cooperate)
- Escrow path: buyer + arbitrator sign to reclaim the bid (no seller cooperation needed)

This fixes a real problem: in the current preauth bid protocol, if the seller pre-signs then disappears, the buyer's bid is locked until the bid output's timelock expires (if any). With escrow, the buyer + arb can reclaim immediately.

## 8. Fee Implications

| Path | vB | Fee at 10 sat/vB | Fee at 500 sat/vB |
|------|-----|------------------|-------------------|
| Key path (happy) | 98 | 980 sats | 0.00049 BTC |
| Escrow (dispute) | 267 | 2,670 sats | 0.001335 BTC |
| Escrow + timeout | 302 | 3,020 sats | 0.00151 BTC |

Dispute resolution costs ~2.7× more than normal settlement. During high fee periods, this could be significant (up to ~$40 USD at 500 sat/vB with BTC at $60K).

Mitigation strategies:
- **P2A anchor output**: Always include `OP_TRUE` anchor for CPFP fee bumping on dispute tx
- **Arbitrator fee split**: The arbitrator's fee can cover the additional on-chain cost
- **Batch dispute resolution**: A single tx can resolve multiple escrow UTXOs (if the same parties are involved)

## 9. Practical Considerations

### Arbitrator selection

The parties must agree on an arbitrator before creating the CXFER output. Options:

- **Fixed**: Use the tacit DAO multisig as the default arbitrator
- **Chosen**: Both parties pick a mutually agreed third party
- **Programmatic**: Use a `sha256(H)` oracle that releases preimage on dispute outcome (how? DLC-like)

### On-chain privacy

- **Happy path**: Key path spend — no escrow leaf is ever revealed. The UTXO looks like any other P2TR output.
- **Dispute path**: The escrow script is revealed in the witness. This reveals that a dispute occurred, and who the parties are (buyer, seller, arb pubkeys).

For privacy-sensitive users: the escrow leaf could be replaced with a **hashlock** that only the arbitrator can open (using a preimage). This hides the arbitrator's identity.

### Legal enforceability

A 2-of-3 escrow with a known arbitrator could be **legally enforceable**. If the arbitrator is a licensed escrow agent, their signature represents a binding decision. This bridges tacit assets to traditional dispute resolution frameworks.

## 10. Recommendation

| Use case | Recommended escrow pattern |
|----------|---------------------------|
| Peer-to-peer trade | `thresh(2, pk(buyer), pk(seller), pk(marketplace))` |
| High-value OTC | Time-delayed: `or_i(thresh(2, A, B, C), and_v(v:A, older(N)))` |
| DAO treasury swap | `thresh(2, pk(dao), pk(counterparty), pk(arbitration_dao))` |
| Retail marketplace | Fixed arbitrator (platform) + buyer timeout |
| Privacy-focused | Hashlock-based escrow (hidden arbitrator) |

The time-delayed pattern (`or_i(thresh(2, A, B, C), and_v(v:A, older(N)))`) is the most versatile: it provides dispute resolution AND a guaranteed fallback for both parties.
