// Domain-separation tags for HMAC, BIP-340 Schnorr messages, and SHA256 hashes.
// Every cryptographic operation in the protocol uses a v1 domain tag to prevent
// cross-context replay. SPEC §3.5.

// --- HMAC blinding/keystream derivation domains ---
export const BLIND_DOMAIN        = 'tacit-blind-v1';
export const CHANGE_DOMAIN       = 'tacit-change-v1';
export const ETCH_BLIND_DOMAIN   = 'tacit-etch-v1';
export const ETCH_AMOUNT_DOMAIN  = 'tacit-etch-amount-v1';
export const MINT_BLIND_DOMAIN   = 'tacit-mint-blind-v1';
export const MINT_AMOUNT_DOMAIN  = 'tacit-mint-amount-v1';
export const AMOUNT_DOMAIN       = 'tacit-amount-v1';
export const AMOUNT_SELF_DOMAIN  = 'tacit-amount-self-v1';

// --- BIP-340 Schnorr signature-message domains ---
export const KERNEL_MSG_DOMAIN        = 'tacit-kernel-v1';
export const MINT_MSG_DOMAIN          = 'tacit-mint-v1';
export const DISCLOSURE_MSG_DOMAIN    = 'tacit-disclosure-v1';
export const AXINTENT_MSG_DOMAIN      = 'tacit-axintent-v1';
export const AXINTENT_CLAIM_DOMAIN    = 'tacit-axintent-claim-v2';
export const AXINTENT_FULFILMENT_DOMAIN = 'tacit-axintent-fulfilment-v1';
export const AXINTENT_CANCEL_DOMAIN   = 'tacit-axintent-cancel-v1';
export const AXINTENT_PUBLISH_DOMAIN  = 'tacit-axintent-publish-v1';
export const AXINTENT_CLAIM_V3_DOMAIN = 'tacit-axintent-claim-v3';
export const AXINTENT_FULFILMENT_V2_DOMAIN = 'tacit-axintent-fulfilment-v2';
export const BID_INTENT_DOMAIN        = 'tacit-bid-intent-v1';
export const BID_CLAIM_DOMAIN         = 'tacit-bid-claim-v1';
export const BID_CANCEL_DOMAIN        = 'tacit-bid-cancel-v1';
export const PREAUTH_SALE_DOMAIN      = 'tacit-preauth-sale-v1';
export const PREAUTH_SALE_ID_DOMAIN   = 'tacit-preauth-sale-id-v1';
export const PREAUTH_SALE_CANCEL_DOMAIN = 'tacit-preauth-sale-cancel-v1';
export const POOL_INIT_DOMAIN         = 'tacit-pool-init-v1';
export const DEPOSIT_DOMAIN           = 'tacit-deposit-v1';
export const DROP_DOMAIN              = 'tacit-drop-v1';
export const DROP_RECLAIM_DOMAIN      = 'tacit-drop-reclaim-v1';
export const WRAPPER_ATTEST_DOMAIN    = 'tacit-wrapper-attest-v1';

// --- Off-chain signing domains ---
export const OPENING_MSG_DOMAIN      = 'tacit-opening-v1';
export const LISTING_MSG_DOMAIN      = 'tacit-listing-v1';
export const LISTING_CANCEL_DOMAIN   = 'tacit-listing-cancel-v1';
export const LISTING_CLAIM_DOMAIN    = 'tacit-listing-claim-v1';
export const LISTING_RANGE_MSG_DOMAIN  = 'tacit-listing-range-v1';
export const LISTING_RANGE_CANCEL_DOMAIN = 'tacit-listing-range-cancel-v1';
export const LISTING_RANGE_CLAIM_DOMAIN = 'tacit-listing-range-claim-v1';
export const AIRDROP_LEAF_DOMAIN     = 'tacit-airdrop-leaf-v1';
export const AIRDROP_NODE_DOMAIN     = 'tacit-airdrop-node-v1';
export const AIRDROP_CLAIM_DOMAIN    = 'tacit-airdrop-claim-v1';

// --- Generator derivation domains (SPEC §3.1) ---
export const GENERATOR_H_DOMAIN  = 'tacit-generator-H-v1';
export const GENERATOR_BP_G_DOMAIN = 'tacit-bp-G-v1';
export const GENERATOR_BP_H_DOMAIN = 'tacit-bp-H-v1';
export const GENERATOR_BP_Q_DOMAIN = 'tacit-bp-Q-v1';

// --- BP Fiat-Shamir transcript domain ---
export const BP_TRANSCRIPT_DOMAIN = 'tacit-bp-v1';

// --- Atomic-intent ECDH blinding domains ---
export const AXINTENT_BLINDING_DOMAIN = 'tacit-axintent-blinding-v1';
export const AXINTENT_ONCHAIN_AMOUNT_DOMAIN = 'tacit-axintent-onchain-amount-v1';
export const AXINTENT_ONCHAIN_BLINDING_DOMAIN = 'tacit-axintent-onchain-blinding-v1';
export const AXINTENT_CHANGE_DOMAIN = 'tacit-axintent-change-v1';

// --- Mixer withdraw bind domain (SHA256) ---
export const WITHDRAW_BIND_DOMAIN = 'tacit-withdraw-bind-v1';

// --- AMM asset ID domains (SPEC §4.1) ---
export const AMM_POOL_ID_DOMAIN = 'tacit-amm-pool-v1';
export const AMM_LP_ASSET_ID_DOMAIN = 'tacit-amm-lp-v1';

// --- AMM BabyJubJub generator domains (SPEC §3.9) ---
export const AMM_BJJ_H_DOMAIN = 'tacit-amm-bjj-H-v1';
export const AMM_BJJ_G_DOMAIN = 'tacit-amm-bjj-G-v1';

// --- AMM sigma cross-curve domain (SPEC §3.10) ---
export const AMM_XCURVE_DOMAIN = 'tacit-amm-xcurve-v1';

// --- AMM swap-var domains (SPEC §5.20) ---
export const AMM_SWAP_VAR_DOMAIN = 'tacit-amm-swap-var-v1';
export const AMM_SWAP_VAR_RECEIPT_DOMAIN = 'tacit-amm-swap-var-receipt-v1';
export const AMM_SWAP_VAR_RECV_DOMAIN = 'tacit-amm-swap-var-recv-v1';
export const AMM_SWAP_VAR_CHANGE_DOMAIN = 'tacit-amm-swap-var-change-v1';
export const AMM_SWAP_VAR_TIP_DOMAIN = 'tacit-amm-swap-var-tip-v1';

// --- AMM protocol message domains ---
export const AMM_LP_ADD_DOMAIN = 'tacit-amm-lp-add-v1';
export const AMM_LP_REMOVE_DOMAIN = 'tacit-amm-lp-remove-v1';
export const AMM_INTENT_DOMAIN = 'tacit-amm-intent-v1';
export const AMM_LAUNCHER_GATE_DOMAIN = 'tacit-amm-launcher-gate-v1';
export const AMM_PROTOCOL_FEE_CLAIM_DOMAIN = 'tacit-amm-protocol-fee-claim-v1';
export const AMM_QSET_DOMAIN = 'tacit-amm-qset-v1';

// --- Intent attestation domain (SPEC §5.17) ---
export const INTENT_ATTEST_DOMAIN = 'tacit-intent-attest-v1';

// --- Variable-amount AXINTENT additional domains ---
export const AXINTENT_ID_DOMAIN = 'tacit-axintent-id-v1';
export const AXINTENT_ONCHAIN_MAKER_AMOUNT_DOMAIN = 'tacit-axintent-onchain-maker-amount-v1';
export const AXINTENT_ONCHAIN_MAKER_BLINDING_DOMAIN = 'tacit-axintent-onchain-maker-blinding-v1';

// --- Envelope constants ---
export const ENVELOPE_MAGIC = 'TACIT';
export const ENVELOPE_VERSION = 0x01;
export const MAX_SCRIPT_PUSH = 520;

// --- Tapscript opcodes used in envelope construction ---
export const OP_FALSE     = 0x00;
export const OP_PUSHDATA1 = 0x4c;
export const OP_PUSHDATA2 = 0x4d;
export const OP_IF        = 0x63;
export const OP_ENDIF     = 0x68;
export const OP_CHECKSIG  = 0xac;
