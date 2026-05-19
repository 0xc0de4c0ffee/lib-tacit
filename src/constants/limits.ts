// Protocol limits extracted from SPEC.
export const N_BITS = 64;
export const SECP_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
export const SECP_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;

export const BP_MAX_M = 8;
export const BP_MAX_NM = N_BITS * BP_MAX_M; // 512
export const BP_AGG_CAPS = [1, 2, 4, 8] as const;

export const TICKER_MAX_LEN = 16;
export const DECIMALS_MAX = 8;
export const IMAGE_URI_MAX_LEN = 256;
export const MINT_AUTHORITY_LEN = 32;
export const ASSET_ID_LEN = 32;
export const KERNEL_SIG_LEN = 64;
export const COMPRESSED_POINT_LEN = 33;
export const XONLY_PUBKEY_LEN = 32;
export const AMOUNT_CT_LEN = 8;
export const TXID_HEX_LEN = 64;
export const TXID_BE_LEN = 32;
export const VOUT_LE_LEN = 4;
export const ANCHOR_LEN = 36; // txid_BE(32) || vout_LE(4)
export const BLINDING_LEN = 32;

export const DUST_SATS = 546;
