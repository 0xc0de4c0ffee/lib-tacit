# T_SWAP_ROUTE (0x33) — Multi-Hop Route Swap

**Status:** ✅ Shipped (SPEC §5.22)

**Produces 1 confidential receipt UTXO** (`vout[1]`). The route is filled atomically across 2–8 hops. All hops execute against distinct pools in sequence; the output of hop k becomes the input of hop k+1.

## Wire Layout

| Offset | Size | Field | Type | Notes |
|---|---|---|---|---|
| 0 | 1 | opcode | u8 | `0x33` |
| 1 | 1 | n_hops | u8 | `2..8` |
| 2 | 32 | trader_input_asset_id | bytes | first hop input asset |
| 34 | 32 | trader_output_asset_id | bytes | last hop output asset |
| 66 | 8 | min_out | u64 LE | overall minimum output |
| 74 | 4 | expiry_height | u32 LE | |
| 78 | 33 | trader_pubkey | bytes33 | compressed secp256k1 |
| 111 | n_hops × 67 | hops[] | — | see hop layout below |
| 111 + 67n | 32 | trader_input_txidBE | bytes | source txid |
| 143 + 67n | 4 | trader_input_vout | u32 LE | source vout |
| 147 + 67n | 33 | C_in_secp | bytes | trader's input UTXO commitment |
| 180 + 67n | 33 | C_receipt_secp | bytes | receipt commitment |
| 213 + 67n | 32 | r_receipt | bytes | scalar mod n_secp, BE |
| 245 + 67n | 2 | range_proof_len | u16 LE | |
| 247 + 67n | N | range_proof | bytes | bulletproof m=2 |
| 247 + 67n | 64 | kernel_sig | bytes64 | BIP-340 over kernel_msg |
| 311 + 67n | 64 | intent_sig | bytes64 | BIP-340 over intent_msg |

### Hop Layout (67 bytes each)

| Offset | Size | Field | Type | Notes |
|---|---|---|---|---|
| 0 | 32 | pool_id | bytes | target pool |
| 32 | 1 | direction | u8 | 0 = A→B, 1 = B→A |
| 33 | 2 | fee_bps | u16 LE | pool fee, 0..1000 |
| 35 | 8 | R_A_pre | u64 LE | trader's view of reserve A |
| 43 | 8 | R_B_pre | u64 LE | trader's view of reserve B |
| 51 | 8 | delta_A_net_mag | u64 LE | net magnitude through asset A |
| 59 | 8 | delta_B_net_mag | u64 LE | net magnitude through asset B |

### Constraints

- `n_hops ∈ [2, 8]`
- `trader_input_asset_id ≠ trader_output_asset_id`
- `direction ∈ {0, 1}` per hop
- `fee_bps ∈ [0, 1000]` per hop
- `current_height < expiry_height`
- `r_receipt < n_secp`
- `range_proof_len > 0`
- All secp pubkeys must be valid compressed curve points
- OP_RETURN at vout[0] contains SHA256(payload)

### Implementation

✅ Wire encode/decode available in `src/opcodes/amm-swap.ts`:
- `encodeSwapRoute(input: SwapRouteInput): Uint8Array`
- `decodeSwapRoute(payload: Uint8Array): SwapRouteDecoded | null`

---

**Reference:** [Tacit SPEC.md §5.22](https://github.com/z0r0z/tacit/blob/main/SPEC.md) — authoritative wire format definition.
**Index:** [All opcodes](./index.md)
