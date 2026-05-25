# Security Analysis: Miniscript for Tacit

## Malleability Guarantees (BIP 379 Type System)

BIP 379 defines a type system for miniscript fragments that guarantees **non-malleability** — an observer cannot alter a valid satisfaction to produce a different valid satisfaction for the same statement.

### HASSIG Property

Every miniscript satisfaction must include **at least one signature** (`HASSIG = H`). This is enforced by the type system at the policy level:

- `pk(key)` — requires signature → HASSIG
- `or_d(A, B)` — requires at least one of A or B to be satisfied, and both contain at least one HASSIG fragment
- `and_v(A, B)` — requires A (non-HASSIG) and B (HASSIG) → still HASSIG

The `or_i(A, B)` (inheritance OR) is the only non-HASSIG fragment, but it's excluded from standard miniscript by most toolchains.

**Implication for tacit**: any valid miniscript policy for a tacit UTXO must include at least one signature. This prevents witness malleability attacks where an attacker modifies the witness data (e.g., replaces a signature, changes a hash preimage) to produce a different valid witness that still passes consensus.

### Non-Malleable Satisfaction Algorithm

The `Miniscript::Satisfaction` algorithm in BIP 379 produces **canonical witnesses**:

1. For `or_d(A, B)`: always satisfies A if possible (left-to-right evaluation)
2. For `and_v(A, B)`: produces a fixed-order concatenation
3. For `thresh(k, ...)`: uses a deterministic key ordering
4. Stack element lengths are fixed (signatures are always 64/65 B, preimages are fixed-length)

**Implication for tacit**: the satisfaction of a miniscript policy is deterministic given the policy and the available secrets. Miners cannot malleate the witness to extract fees.

### Limitations

The type system assumes:
- **No key reuse** — if the same key appears in multiple positions, the type system cannot detect it
- **No access to private keys** — a signer who re-signs with a different nonce could produce two different valid satisfactions (but this is a protocol-level concern, not a consensus malleability)
- **Taproot script-path malleability** — if the policy appears in multiple leaves, the spender could satisfy either leaf; this is by design (spender chooses cheapest path)

---

## Attack Surface

### Timelock Racing

An attacker observes a timelocked recovery transaction being broadcast and tries to **front-run** it with their own spend.

**Scenario:**
- UTXO controlled by `or_d(pk(primary), and_v(v:pk(backup), older(52560)))`
- At block 52560, both `primary` and `backup` can spend
- Attacker (backup key holder) sees the primary's transaction in the mempool and broadcasts a conflicting spend with a higher fee rate

**Mitigation:** Use `or_d(pk(primary), and_v(v:pk(backup), older(N)))`. The `or_d` fragment gives **priority to the left branch** — if the primary signature is valid, the `or_d` satisfaction algorithm always selects the primary branch. Miners who see both valid satisfactions will include whichever pays higher fees, but:

- The primary can use **TRUC (v3) transactions** (BIP 431) to signal that their transaction should not be replaced
- The primary can use **CPFP carve-out** (if anchor outputs are present) to ensure confirmation

**Worse case:** if the backup key is also the kernel key (e.g., `or_d(pk(kernel), and_v(v:pk(kernel), older(N)))`), an attacker with the kernel key can spend at any time regardless of the timelock. **Never reuse a key across branches of an `or_d`.**

### Hashlock Front-Running

A hashlock-based swap: Alice locks tacit assets to `and_v(pk(Bob), sha256(H))`. Bob learns the preimage `preimage` and broadcasts the spend. **Anyone else who also knows the preimage** (e.g., because it was revealed on-chain from another transaction) can front-run Bob and claim the funds.

**Mitigation:** Use `and_v(pk(Bob), sha256(H))` — the hashlock is **combined with a pubkey check**. Only Bob's signature + the preimage will satisfy the script. Even if the preimage is public, no one else knows Bob's private key.

**However**: if the preimage is revealed on-chain as part of Bob's spend, a miner who sees both the spend and the preimage could theoretically construct a different transaction that satisfies the same script with Bob's signature. This is prevented by the **HASSIG property** — Bob's signature is bound to a specific transaction via `SIGHASH_DEFAULT` (sighash includes all inputs/outputs).

### Preimage Griefing

In a hashlock swap, Alice locks to `or_d(and_v(pk(Bob), sha256(H)), and_v(pk(Alice), older(144)))`. Bob has the preimage but **does not broadcast the spend**. Instead, Bob waits until near the timelock expiry, forcing Alice to either:

1. Wait for the timelock to expire (144 blocks ~ 1 day) and reclaim
2. Pay Bob to reveal the preimage early

**Mitigation:** Use a shorter timelock (e.g., `older(6)` ~ 1 hour). Alice's refund path should always be **usable before** Bob's optimal griefing window expires. In tacit, the kernel provides an independent spend path that cannot be griefed.

### Fee Siphoning

An attacker observes a timelocked recovery transaction and attaches a **CPFP (child-pays-for-parent)** child transaction that pays high fees to the same mempool. The miner includes the child (high fees) but the parent (recovery tx) has low fees. The attacker's child displaces the intended recipient's transactions.

**Mitigation:**
- Use **P2A (Pay-to-Anchor) outputs** (PR #30352, Bitcoin Core v28.0) for fee bumping — the anchor output is explicitly for CPFP and cannot be griefed
- Use **TRUC (v3) transactions** — v3 transactions have strict topological restrictions that prevent certain fee-siphoning patterns
- Sign with `SIGHASH_SINGLE` or `SIGHASH_ANYONECANPAY` if appropriate (limited use in practice)

---

## Key Management

### Kernel Key Compromise

The tacit kernel key controls the kernel signature. If compromised:

- **Today**: all tacit UTXOs can be stolen immediately
- **With miniscript + timelock**: the attacker can still steal assets, but the timelock provides a window for recovery
- **With miniscript + multisig**: the attacker must compromise additional keys

**Mitigation:**
- Hardware wallet for the kernel key (it only signs kernel messages, not arbitrary Bitcoin transactions)
- Geographically separated backup keys
- Rotation: periodic kernel key rotation (requires migrating UTXOs)

### Recovery Key Compromise

The recovery key only becomes relevant after a timelock expires. Compromise means an attacker can claim UTXOs after the timelock window.

**Mitigation:**
- Cold storage / paper backup for the recovery key
- The recovery key should be in a different jurisdiction / geographic region than the kernel key
- Use `thresh(M, N)` for recovery (e.g., 2-of-3) so single key compromise is insufficient

### Best Practices Summary

1. **Separate keys** for kernel, recovery, and any auxiliary roles
2. **Different BIP 32 derivation paths** for each role (e.g., `m/86'/0'/0'/0` for kernel, `m/48'/0'/0'/2'` for recovery)
3. **Hardware wallet** for the kernel key (the most active signer)
4. **Paper backup + passphrase** for the recovery key
5. **Geographic separation** of backup locations
6. **Regular audits** of UTXO set to verify no unauthorized spends
