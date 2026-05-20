# Skill: T_WRAPPER_ATTEST (0x38) — Wrapper Attestation

## Domain Knowledge

Optional on-chain envelope for wrapper-issuer attestation. Pins an external-wallet → tacit-key binding so wallet-portable identity becomes auditable by third parties. Part of the wrapper convention (SPEC §4.2).

## Wire Format

```
T_WRAPPER_ATTEST(1) || asset_id(32) || issuer_sig(64) || attestation_payload(...)
```

## Key Properties

- BIP-340 signed under `attestation.issuer_pubkey` from the wrapper metadata
- Domain tag: `tacit-wrapper-attest-v1`
- Freshness computed from `as_of_height` vs current tip
