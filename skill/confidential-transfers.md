# Confidential Transfers

**What it's for:** hide transfer **amounts** (and balances) on-chain while keeping the token public
and ownership transparent. The use case is private payroll, treasury movements, and B2B payments
where *who* can be public but *how much* must not be. Part of the "Confidential Balances" suite.

> **Set expectations:** this is **not a flag you flip.** It is a multi-step lifecycle with
> per-account cryptographic setup and zero-knowledge proofs. Budget real engineering time. If you
> only need *some* privacy, weigh whether off-chain settlement is simpler.

## When to use it
- Amounts must be **hidden on-chain**, with optional regulated visibility → **yes**.
- You need to **block / gate** transfers on-chain → **no** — you can't, and you can't add a transfer
  hook (constraint #1). Enforcement must happen at the edges.
- You want privacy with minimal effort → reconsider; the setup cost is significant.

## Hard constraints
- **Confidential Transfers ⊥ Transfer Hook.** Mutually exclusive — a hook can't read an encrypted
  amount. No on-chain per-transfer gating on a confidential mint.
- **Mint init is co-located.** The confidential-transfer `InitializeMint` must be in the **same
  transaction** as the base `InitializeMint`.
- **Per-account setup is mandatory.** Every participating token account must be *configured* for
  confidential transfers (reallocate + configure) before it can receive confidential balances. This
  changes every holder's onboarding flow, not just your mint script.
- **Amounts are public until deposited.** Tokens enter as a normal public balance, then `Deposit`
  moves them into a *pending* confidential balance, and `ApplyPendingBalance` makes them *available*.
  Privacy starts after deposit, not at mint.
- **Local validators don't have it by default.** You must **clone the mainnet Token Extension
  Program** (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`) into your local validator to test.

## The lifecycle (what you actually implement)

```
1. Create mint        → base InitializeMint + ConfidentialTransfer InitializeMint (same tx)
2. Configure account  → create ATA → reallocate (ConfidentialTransferAccount) → ConfigureAccount
3. Deposit            → public balance → pending confidential balance
4. ApplyPendingBalance→ pending → available (decryptable by the owner)
5. Transfer           → available → recipient's pending (with ZK proofs)
6. ApplyPendingBalance→ recipient makes it available
7. Withdraw           → confidential → public balance (with ZK proofs)
```

### Keys and proofs (the cryptographic part)
- Each account generates an **ElGamal keypair** (encrypts amounts) and an **AES key** (`AeKey`, for
  the owner's own decryptable balance).
- Configuring an account requires a **validity proof** (`PubkeyValidityProofData`). Alternatively,
  `ConfigureAccountWithRegistry` uses an on-chain **ElGamal registry** account and skips that proof.
- Each transfer/withdraw requires **proof context accounts** verified by the **ZK ElGamal Proof
  Program**: an *equality* proof, a *ciphertext-validity* proof, and a *range* proof. Create them with
  `confidential_transfer_create_context_state_account` and **close them afterward to reclaim rent**.

> The mint-side init parameters (`authority`, `auto_approve_new_accounts`, `auditor_elgamal_pubkey`)
> are stable and verified. The full JS proof-generation flow is involved and evolving — drive it from
> the current `@solana-program/token-2022` confidential-transfer examples rather than from memory, and
> test against a cloned-mainnet local validator.

## Compliance: the auditor key is **visibility, not enforcement**
Confidential transfers support an optional **auditor ElGamal public key** set at mint creation. An
auditor holding the matching secret can **decrypt** transfer amounts.

Keep the boundary sharp — this is the distinction judges and auditors care about:
- **Auditor key answers:** *"can this transfer be inspected later?"* → yes, decryptable.
- **It does NOT answer:** *"should this transfer be allowed?"* → it cannot block anything.

So a confidential token gives you **oversight + recovery**, not **gating**:
- Oversight → auditor key (decrypt for compliance review).
- Recovery/clawback → pair with a **Permanent Delegate** (see [other-extensions.md](./other-extensions.md)).
- Eligibility enforcement → must live at the edges: mint/burn authority, account approval
  (`auto_approve_new_accounts: false`), or an off-chain allowlist — **not** an in-flight hook.

## Footguns
- **Treating it as a config flag.** It's a lifecycle with per-account setup; underestimating this is
  the #1 planning mistake.
- **Testing on a default local validator.** It silently won't work — clone the mainnet program first.
- **Leaking via deposit/withdraw.** The public `Deposit` and `Withdraw` amounts are visible on-chain.
  Frequent round-trips between public and confidential balances erode the privacy you set up.
- **Leaving proof-context accounts open.** They cost rent; close them after use.

## Real-world mapping
The flagship example is **PayPal's PYUSD**, which uses confidential transfer support together with a
permanent delegate for compliance freezes — exactly the "private amounts + oversight + recovery"
pattern above. That combination, not a transfer hook, is how regulated privacy is done on Solana.
