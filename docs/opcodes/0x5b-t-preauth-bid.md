# T_PREAUTH_BID (0x5B) — Buyer-Offline Preauth Bid

**Status:** ✅ Shipped (SPEC-PREAUTH-BID-AMENDMENT §5.7.11)

Buyer-offline preauth bid. Symmetric counterpart to preauth-sale: buyer pre-signs sats input + canonical bid-context OP_RETURN under `SIGHASH_SINGLE_ACP` (`0x83`), any seller appends asset UTXO + payout output and broadcasts. Reuses `T_AXFER` kernel-sig + Pedersen + bulletproof stack.

## Library Implementation

📝 Drafted — `src/opcodes/preauth-bid.ts` has type definitions and stub wire codec. Full encode/decode TBD.
