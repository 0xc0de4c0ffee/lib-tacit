# Fee Quantification: Envelope vs Miniscript

## Fee Context

Bitcoin transaction fees = (virtual bytes) × (fee rate in sat/vB). The fee rate varies dramatically:

| Fee Environment | sat/vB | Typical Conditions |
|---|---|---|
| Low fee (weekend) | 5–10 | Low mempool pressure |
| Medium fee | 10–50 | Normal weekday |
| High fee | 50–250 | Congestion, ordinals inscription wave |
| Extreme fee | 250–1000 | Black swan, mempool panic |

---

## Current Tacit Envelope Sizes

| Opcode | Description | vB | Notes |
|---|---|---|---|---|
| PETCH (0x27) | Permissionless etch | ~76 | Minimal payload: ticker, supply, keys |
| CETCH (0x21) | Conf. etch | ~120 | Adds commitment to block |
| **CXFER (0x23)** | **Conf. transfer** | **~368** | **2 outputs: asset + change; BP range proof. 879 B script = 879 WU. Non-witness: 139 B × 4 = 556 WU. Total: 556 + 879 + 34 (ctrl) = 1469 WU → 368 vB** |
| MINT (0x24) | Mint | ~200 | Kernel sig + single output |
| BURN (0x25) | Burn | ~150 | Kernel sig + burn proof |
| DROP (0x2B) | Public claim | ~180 | Simple claim script |
| DCLAIM (0x2C) | Permissionless claim | ~220 | With DLEQ proof (but not needed?) |
| T_PETCH (0x27) | Fair-launch | ~160 | Timelocked ETCH |

### Sizes in vB (Witness-Weighted)

All sizes are in **virtual bytes** (vB), where 1 vB = 4 WU (witness bytes) for segwit inputs.

> CXFER sizes are approximate and vary with N (number of outputs) and rangeproof size (classic BP vs BP+).

| Tx Type | vB |
|---|---|
| CXFER (current) | ~368 |
| PETCH (current) | ~76 |

---

### Current v1 CXFER (N=2) baseline

Non-witness: version(4) + marker(1) + flag(1) + input count(1) + outpoint(36) +
scriptSigLen(1) + sequence(4) + output count(1) + P2TR output(43) + OP_RETURN(43) +
locktime(4) = 139 B × 4 = 556 WU

Witness: item count(1) + envelope_script(879 B) + control_block(33 B) = 913 WU

Total: 556 + 913 = 1469 WU → 368 vB

**v2 equivalent** (script-path, N=2 individual spends):
556 (non-witness) + 1 (witness count) + 2×(64+33+8+688) + 2×33 (control blocks) + 2×34
(two leaf scripts) = 556 + 1 + 1586 + 66 + 68 = 2277 WU → 570 vB

Key path (if possible): 556 (non-witness) + 1 (witness count) + 64 (sig) = 621 WU → 156 vB
(but key path can't carry protocol data — shown for reference)

**Important note**: Simple fee comparisons are misleading because v2 outputs are
individual P2TR UTXOs. A v2 "batch" of N outputs is N transactions (N×156 vB min),
not 1 transaction. The comparison should be at the protocol level, not the transaction level.

---

## Miniscript Alternative Sizes

Sizes for a taproot miniscript spend of a CXFER-like UTXO.

| Spend Type | vB | Components |
|---|---|---|
| Key path (taproot) | ~105 | 1 input (64 B sig + 1 B sighash) + tx overhead + 2 outputs |
| Script path (single leaf) | ~123 | 1 input + leaf script (~35 B) + control block (~65 B) + satisfaction |
| Script path (multi-leaf, depth 3) | ~135 | Larger control block (+~32 B per tree level) |
| P2WSH miniscript | ~115 | No control block, larger script push |

**Key path savings:**
- Current CXFER: ~368 vB
- Key path: N/A — key-path cannot carry commitments or rangeproofs for confidential ops
- **Key path is not viable for confidential outputs**

**Script path savings:**
- Current CXFER: ~368 vB
- Script path (kernel leaf): ~258 vB
- **Savings: ~110 vB (30%)**

---

## Dollar Breakdown

| Fee Rate | CXFER (env.) | Key Path | Script Path | PETCH (env.) |
|---|---|---|---|---|
| 10 sat/vB | 3,050 sats ($2.67) | 1,050 sats ($0.92) | 1,230 sats ($1.08) | 760 sats ($0.66) |
| 50 sat/vB | 15,250 sats ($13.34) | 5,250 sats ($4.59) | 6,150 sats ($5.38) | 3,800 sats ($3.32) |
| 250 sat/vB | 76,250 sats ($66.72) | 26,250 sats ($22.97) | 30,750 sats ($26.91) | 19,000 sats ($16.62) |

*Assumes $87,000/BTC (market price ~May 2026).*

---

## Cumulative Savings at Scale

### 1,000 CXFER Transactions

| Scenario | Total sats | Total BTC | Total USD |
|---|---|---|---|
| Current envelope | 3,050,000 | 0.0305 | $2,654 |
| Key path | 1,050,000 | 0.0105 | $914 |
| Script path | 1,230,000 | 0.0123 | $1,070 |
| **Savings (key vs env)** | **2,000,000** | **0.0200** | **$1,740** |

### 10,000 CXFER Transactions

| Scenario | Total sats | Total BTC | Total USD |
|---|---|---|---|
| Current envelope | 30,500,000 | 0.305 | $26,535 |
| Key path | 10,500,000 | 0.105 | $9,135 |
| **Savings** | **20,000,000** | **0.200** | **$17,400** |

### 100,000 CXFER Transactions

| Scenario | Total sats | Total BTC | Total USD |
|---|---|---|---|
| Current envelope | 305,000,000 | 3.05 | $265,350 |
| Key path | 105,000,000 | 1.05 | $91,350 |
| **Savings** | **200,000,000** | **2.00** | **$174,000** |

At scale, the fee savings from key-path spends alone could offset the development cost of miniscript integration within the first ~10,000 transactions.

---

## Anchor Output Cost

Adding a **P2A (Pay-to-Anchor)** output for CPFP fee bumping:

```
Output:  0 OP_RETURN (or OP_1 <32 zeros>)
Size: 31 vB
Cost at 10 sat/vB: 310 sats ($0.27)
Cost at 250 sat/vB: 7,750 sats ($6.78)
```

The anchor is a fixed overhead that applies equally to all approaches. It's optional and only used when fee bumping is anticipated.

---

## Comparison Table

| | Envelope | P2WSH Miniscript | Taproot Miniscript |
|---|---|---|---|
| **Base output** | 43 vB | 32 vB | 43 vB (P2TR) |
| **Witness overhead** | ~262 vB | ~83 vB | ~62 vB (key) / ~80 vB (script) |
| **Total CXFER** | ~305 vB | ~115 vB | ~105 vB (key) |
| **% of envelope** | 100% | ~38% | ~34% |
| **Annual savings (10k txs, 50 sat/vB)** | — | 1.0 BTC | 1.04 BTC |

---

## Operational Considerations

1. **Batch spends**: With key-path spends, multiple tacit UTXOs can be batched into a single transaction
2. **Fee estimation**: Miniscript satisfactions have deterministic sizes → better fee estimation → fewer overpays
3. **TRUC/v3 transactions**: V3 transactions (BIP 431) enable 1-child-1-parent CPFP with predictable topology, reducing fee-siphoning risk

The key insight: **key-path spends are both cheaper and more private than envelope spends**. The development cost of miniscript integration is a one-time cost; the fee savings are perpetual.
