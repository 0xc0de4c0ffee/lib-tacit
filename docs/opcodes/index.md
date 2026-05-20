# Tacit Protocol Opcode Wire Formats

> Wire format reference for all shipped, drafted, reserved, and free opcodes in the [Tacit protocol](https://tacit.finance).
> The authoritative spec lives at [`tacit-specs/SPEC.md`](../../tacit-specs/SPEC.md) §1.1 (canonical opcode table).

| Opcode | Name | Section | Status | Description |
|--------|------|---------|--------|-------------|
| `0x21` | [CETCH](./0x21-cetch.md) | §5.1 | ✅ Shipped | Issue a new asset with hidden initial supply. Optionally mintable. |
| `0x22` | [T_CXFER_BPP](./0x22-cxfer-bpp.md) | §5.21 | ✅ Shipped | Confidential transfer with Bulletproofs+ aggregated rangeproof. ~14% smaller witness than CXFER. |
| `0x23` | [CXFER](./0x23-cxfer.md) | §5.2 | ✅ Shipped | Transfer (split) confidential value between parties. Optional opt-in shielded recipient (§5.2.1). |
| `0x24` | [T_MINT](./0x24-t-mint.md) | §5.3 | ✅ Shipped | Issuer issues additional supply on a mintable asset. |
| `0x25` | [T_BURN](./0x25-t-burn.md) | §5.4 | ✅ Shipped | Any holder destroys part or all of their balance. Burn amount is public. |
| `0x26` | [T_AXFER](./0x26-t-axfer.md) | §5.7 | ✅ Shipped | CXFER variant that allows non-tacit auxiliary inputs (BTC payment) in the same tx. |
| `0x27` | [T_PETCH](./0x27-t-petch.md) | §5.8 | ✅ Shipped | Permissionless-mint deployment record. Declares ticker, decimals, lifetime cap, fixed per-mint amount. |
| `0x28` | [T_PMINT](./0x28-t-pmint.md) | §5.9 | ✅ Shipped | Permissionless mint event against a T_PETCH ancestor. |
| `0x29` | [T_DEPOSIT](./0x29-t-deposit.md) | §5.10 | ✅ Shipped | Lock a fixed-denomination UTXO into a shielded pool. |
| `0x2A` | [T_WITHDRAW](./0x2a-t-withdraw.md) | §5.11 | ✅ Shipped | Anonymous mint from a shielded pool with Groth16 proof. |
| `0x2B` | [T_DROP](./0x2b-t-drop.md) | §5.12 | ✅ Shipped | Lock existing supply into a public-claim pool. |
| `0x2C` | [T_DCLAIM](./0x2c-t-dclaim.md) | §5.13 | ✅ Shipped | Permissionless claim event against a T_DROP ancestor. |
| `0x2D` | [T_LP_ADD](./0x2d-t-lp-add.md) | §5.14 | 📝 Drafted | Add liquidity to AMM pool. variant=1 doubles as POOL_INIT. |
| `0x2E` | [T_LP_REMOVE](./0x2e-t-lp-remove.md) | §5.15 | 📝 Drafted | Burn LP-share UTXOs for proportional withdrawal. |
| `0x2F` | [T_SWAP_BATCH](./0x2f-t-swap-batch.md) | §5.16 | 📝 Drafted | Settle N confidential swap intents at uniform clearing price. Groth16 proof. |
| `0x30` | [T_INTENT_ATTEST](./0x30-t-intent-attest.md) | §5.17 | 📝 Drafted | Scope-generic preconfirmation channel attestation. |
| `0x31` | [T_PROTOCOL_FEE_CLAIM](./0x31-t-protocol-fee-claim.md) | §5.18 | 📝 Drafted | Mint accrued protocol fee shares. |
| `0x32` | [T_SWAP_VAR](./0x32-t-swap-var.md) | §5.20 | 📝 Drafted | Per-trade variable-amount AMM swap. Sigma cross-curve proof. |
| `0x33` | [T_SWAP_ROUTE](./0x33-t-swap-route.md) | §5.22 | 📝 Drafted | Atomic multi-hop AMM routing (2–4 hops in one Bitcoin tx). |
| `0x34` | [T_FARM_INIT](./0x34-t-farm-init.md) | §5.40 | 📝 Drafted | Launcher-funded LP-staking reward farm creation. |
| `0x35` | [T_LP_BOND](./0x35-t-lp-bond.md) | §5.41 | 📝 Drafted | Bond LP shares against a farm. |
| `0x36` | [T_LP_UNBOND](./0x36-t-lp-unbond.md) | §5.42 | 📝 Drafted | Settle bond: mint LP + reward UTXOs, delete bond record. |
| `0x37` | [T_AXFER_VAR](./0x37-t-axfer-var.md) | §5.7.9 | ✅ Shipped | Variable-amount atomic settlement with BP on buyer's BTC leg. |
| `0x38` | [T_WRAPPER_ATTEST](./0x38-t-wrapper-attest.md) | §5.19 | ✅ Shipped | On-chain wrapper-issuer attestation. |
| `0x39` | [T_TRADE_BATCH](./0x39-t-trade-batch.md) | §5.20 | 📝 Drafted | Atomic cross-surface settlement: AMM intents + orderbook pairs. |
| `0x3A` | [T_RANGE_ATTEST](./0x3a-t-range-attest.md) | §5.21 | 📝 Drafted | On-chain range-attestation: commitment ≥ K. |
| `0x3B` | [T_LP_HARVEST](./0x3b-t-lp-harvest.md) | §5.43 | 📝 Drafted | Claim accrued farm reward without unbonding. |
| `0x3C` | [T_AXFER_BPP](./0x3c-t-axfer-bpp.md) | — | 📝 Drafted | BP+ variant of T_AXFER. ~14% smaller witness. |
| `0x3D` | [T_AXFER_VAR_BPP](./0x3d-t-axfer-var-bpp.md) | — | 📝 Drafted | BP+ variant of T_AXFER_VAR. |
| `0x3E` | [T_FARM_REFUND](./0x3e-t-farm-refund.md) | §5.44 | 📝 Drafted | Launcher reclaims unspent treasury after expiry. |
| `0x3F`–`0x42` | T_LP_ADD_RANGE / T_LP_REMOVE_RANGE / T_LP_REPOSITION / T_LP_MIGRATE_V | — | 🔒 Reserved | Range-LP follow-up amendment. |
| `0x43` | [T_SLOT_MINT](./0x43-t-slot-mint.md) | §5.21 | ✅ Shipped | Self-custody-slot wrapper atomic mint. |
| `0x44` | [T_SLOT_BURN](./0x44-t-slot-burn.md) | §5.22 | ✅ Shipped | Self-custody-slot wrapper atomic redeem. |
| `0x45` | [T_SLOT_ROTATE](./0x45-t-slot-rotate.md) | §5.23 | ✅ Shipped | Self-custody-slot wrapper atomic transfer (key rotation). |
| `0x46` | [T_SLOT_SPLIT](./0x46-t-slot-split.md) | §5.24 | ✅ Shipped | Atomic 1→N slot split, ΣD_new = D_old. |
| `0x47` | [T_SLOT_MERGE](./0x47-t-slot-merge.md) | §5.25 | ✅ Shipped | Atomic N→1 slot merge, ΣD_old ≥ D_new. |
| `0x48` | T_SLOT_NOTE | §5.26 | 🔒 Reserved | Encrypted slot note attachment. |
| `0x49` | T_CBTC_TAC_DEPOSIT | §5.47 | ✅ Shipped | LP-share lien mint: cBTC.zk slot + LP-share lien → cBTC.tac. |
| `0x4A` | T_CBTC_TAC_WITHDRAW | §5.47 | ✅ Shipped | Cooperative unwind: burn cBTC.tac → release lien + spend slot. |
| `0x4B` | T_CBTC_TAC_FORCE_CLOSE | §5.47 | ✅ Shipped | Permissionless lien transfer when LP value < 1.2× slot. |
| `0x4C` | T_CTAC_LIEN_CLAIM | §5.47 | ✅ Shipped | Burn cBTC.tac → mint pro-rata LP-share from claim pool. |
| `0x4D` | T_SLOT_FRACTIONALIZE | §5.25 | 🔒 Reserved | Slot → standard tacit shares. |
| `0x4E` | T_SLOT_RECONSOLIDATE | §5.26 | 🔒 Reserved | Standard tacit shares → slot. |
| `0x4F` | T_CTAC_LIEN_SPLIT | §5.47 | ✅ Shipped | Split liened LP-share UTXO. |
| `0x50` | T_GOV_PROPOSAL | — | 📝 Drafted | TAC DAO proposal. |
| `0x51` | T_GOV_VOTE | — | 📝 Drafted | TAC DAO vote. |
| `0x52` | T_GOV_VETO | — | 📝 Drafted | TAC DAO veto. |
| `0x53` | T_GOV_EXECUTE | — | 📝 Drafted | TAC DAO execute. |
| `0x54` | T_CUSD_TAC_DEPOSIT | §6.3 | 📝 Drafted | Open cUSD.tac position. |
| `0x55` | T_CUSD_TAC_WITHDRAW | §6.4 | 📝 Drafted | Close cUSD.tac position. |
| `0x56` | T_CUSD_TAC_FORCE_CLOSE | §6.5 | 📝 Drafted | Permissionless cUSD.tac liquidation. |
| `0x57` | T_CBTC_TAC_DEPOSIT_ATOMIC | §5.48 | ✅ Shipped | Atomic LP_ADD + cBTC.tac DEPOSIT — single envelope. |
| `0x58` | T_CBTC_TAC_WITHDRAW_ATOMIC | §5.49 | ✅ Shipped | Atomic cBTC.tac WITHDRAW + LP_REMOVE — single envelope. |
| `0x59` | T_CBTC_TAC_TOP_UP | §5.47 | ✅ Shipped | Top-up cBTC.tac position with additional LP shares. |
| `0x5A` | T_CBTC_TAC_BOND_RELEASE | §5.47 | ✅ Shipped | Release bond from cBTC.tac position. |
| `0x5B`–`0xFF` | — | — | ⬜ Free | Available for future opcodes. |

**Status reference** (per [SPEC.md §1.1](../../tacit-specs/SPEC.md)):
- ✅ **Shipped** — in production worker + dapp, validators enforce wire format
- 📝 **Drafted** — spec amendment exists, may have reference impl in tests/; not yet enforced in production
- 🔒 **Reserved** — opcode byte claimed by an amendment for future activation
- ⬜ **Free** — unassigned, may be claimed by a new amendment

## Library Implementation Status

| Opcode | Library Module | Encoder | Decoder | Tests |
|--------|---------------|---------|---------|-------|
| CETCH (0x21) | `etch.ts` | ✅ `encodeCEtch` | ✅ `decodeCEtch` | ✅ |
| T_CXFER_BPP (0x22) | `cxfer-bpp.ts` | ✅ wire | ✅ wire | ✅ (BP+ verify N/A) |
| CXFER (0x23) | `transfer.ts` | ✅ `encodeCXfer` | ✅ `decodeCXfer` | ✅ |
| T_MINT (0x24) | `mint.ts` | ✅ `encodeCMint` | ✅ `decodeCMint` | ✅ |
| T_BURN (0x25) | `burn.ts` | ✅ `encodeCBurn` | ✅ `decodeCBurn` | ✅ |
| T_AXFER (0x26) | `axfer.ts` | ✅ `encodeAXfer` | ✅ `decodeAXfer` | ✅ |
| T_PETCH (0x27) | `petch.ts` | ✅ `encodePEtch` | ✅ `decodePEtch` | ✅ |
| T_PMINT (0x28) | `pmint.ts` | ✅ `encodePMint` | ✅ `decodePMint` | ✅ |
| T_DEPOSIT (0x29) | `deposit.ts` | ✅ `encodeDeposit` / `encodePoolInit` | ✅ `decodeDeposit` | ✅ |
| T_WITHDRAW (0x2A) | `withdraw.ts` | ✅ `encodeWithdraw` | ✅ `decodeWithdraw` | ✅ |
| T_DROP (0x2B) | `drop.ts` | ✅ `encodeCDrop` | ✅ `decodeCDrop` | ✅ |
| T_DCLAIM (0x2C) | `dclaim.ts` | ✅ `encodeCDClaim` | ✅ `decodeCDClaim` | ✅ |
| T_AXFER_VAR (0x37) | `axfer-var.ts` | ✅ `encodeAXferVar` | ✅ `decodeAXferVar` | ✅ |
| T_WRAPPER_ATTEST (0x38) | `wrapper-attest.ts` | ✅ `encodeWrapperAttest` | ✅ `decodeWrapperAttest` | ✅ |
| T_SLOT_* (0x43–0x47) | `slot.ts` | ❌ types only | ❌ types only | ❌ |
| T_CBTC_TAC_* (0x49–0x4F, 0x57–0x5A) | `cbtc-tac.ts` | ❌ types only | ❌ types only | ❌ |
| Drafted AMM (0x2D–0x33) | `amm-drafts.ts` | ❌ Drafted | ❌ Drafted | ❌ |
| Drafted Farm (0x34–0x3E) | `farm-drafts.ts` | ❌ Drafted | ❌ Drafted | ❌ |
| Drafted Gov (0x50–0x56) | `gov-drafts.ts` | ❌ Drafted | ❌ Drafted | ❌ |

## Per-Opcode Documentation

Each shipped opcode has a dedicated document covering wire format, constraints, and TypeScript interface:

- [`0x21-cetch.md`](./0x21-cetch.md) — Asset creation
- [`0x22-cxfer-bpp.md`](./0x22-cxfer-bpp.md) — Confidential transfer with BP+
- [`0x23-cxfer.md`](./0x23-cxfer.md) — Confidential transfer
- [`0x24-t-mint.md`](./0x24-t-mint.md) — Mint additional supply
- [`0x25-t-burn.md`](./0x25-t-burn.md) — Destroy supply
- [`0x26-t-axfer.md`](./0x26-t-axfer.md) — Atomic OTC settlement
- [`0x27-t-petch.md`](./0x27-t-petch.md) — Fair-launch deployment
- [`0x28-t-pmint.md`](./0x28-t-pmint.md) — Permissionless mint
- [`0x29-t-deposit.md`](./0x29-t-deposit.md) — Shielded pool deposit
- [`0x2a-t-withdraw.md`](./0x2a-t-withdraw.md) — Shielded pool withdrawal
- [`0x2b-t-drop.md`](./0x2b-t-drop.md) — Public-claim pool
- [`0x2c-t-dclaim.md`](./0x2c-t-dclaim.md) — Claim event
- [`0x37-t-axfer-var.md`](./0x37-t-axfer-var.md) — Variable-amount atomic settlement
- [`0x38-t-wrapper-attest.md`](./0x38-t-wrapper-attest.md) — Wrapper attestation

Drafted and reserved opcodes link to their respective amendment specs in `tacit-specs/spec/amendments/`.
