# Architecture Decisions — choose extensions *before* you mint

> This is the heart of the skill. Token Extensions are mostly **immutable after mint creation**, so
> the expensive mistakes are architectural, not syntactic. Decide here first, then go to the recipe
> page for the extension(s) you picked.

## Why this page exists

You cannot bolt most extensions onto an existing mint. If you ship a mint and later realise you
needed a transfer fee, a compliance hook, or confidential balances, the fix is usually **a new mint
and a migration** — painful once tokens are circulating. Five minutes here saves that.

## Decide by requirement

Start from what the token must *do*, not from the extension list.

| You need… | Use | Page | Do **not** assume |
| --- | --- | --- | --- |
| A cut on every transfer (fees/royalties) | **Transfer Fee** | [transfer-fees.md](./transfer-fees.md) | that you can add it later |
| KYC / allowlist / geo / lockup enforced on transfer | **Transfer Hook** | [transfer-hooks.md](./transfer-hooks.md) | that it composes with confidential transfers |
| Amounts hidden on-chain (private payroll/treasury) | **Confidential Transfers** | [confidential-transfers.md](./confidential-transfers.md) | that it's a flag — it's a whole lifecycle |
| On-chain name/symbol/URI without Metaplex | **Metadata Pointer + Metadata** | [other-extensions.md](./other-extensions.md) | fixed account size — it's variable length |
| A recovery / clawback authority over any holder | **Permanent Delegate** | [other-extensions.md](./other-extensions.md) | holders can opt out — they can't |
| Soulbound / non-transferable token | **Non-Transferable** | [other-extensions.md](./other-extensions.md) | it can still be burned/closed |
| Accounts frozen until you approve them | **Default Account State** | [other-extensions.md](./other-extensions.md) | — |
| Balance that accrues interest (display) | **Interest-Bearing** | [other-extensions.md](./other-extensions.md) | the chain moves tokens — it's a display rate |

## The hard constraints (memorise these)

These are the ones models get wrong and that cause architectural dead-ends.

### 1. Confidential Transfers ⊥ Transfer Hooks — mutually exclusive
You **cannot** have both on the same mint. A transfer hook needs to *read the transfer amount* to
make a decision; confidential transfers *encrypt the amount*. They are fundamentally incompatible.

> **Implication for compliance + privacy:** you cannot enforce an on-chain KYC hook *and* hide
> amounts on the same token. First separate two different jobs that people conflate:
> - **Transfer Hook = enforcement.** It answers *"should this transfer happen?"* and can block it.
> - **Confidential Transfers + auditor ElGamal key = visibility.** It answers *"can this transfer be
>   inspected later?"* An auditor can **decrypt** amounts — it does **not** gate or block anything.
>
> So they are not substitutes; they solve different layers. Pick by which job dominates:
> - Need to **block** non-compliant transfers on-chain → Transfer Hook (amounts public). No
>   confidential transfers, no auditor key — enforcement lives entirely in the hook.
> - Need **amount privacy** with regulated oversight → Confidential Transfers + auditor key (so a
>   compliance officer can decrypt) + **Permanent Delegate** for clawback/freeze. Note this gives you
>   *visibility + recovery*, not pre-transfer gating — there is no on-chain "reject this transfer"
>   step, because a hook can't read encrypted amounts. Enforce eligibility at the edges (mint/burn
>   authority, account approval, off-chain allowlist), not in-flight.

### 2. Most extensions are immutable after creation
Transfer fee, transfer hook, confidential-transfer config, permanent delegate, non-transferable,
metadata pointer, default account state — all set at mint init. You generally cannot add or remove
them later. Some *parameters* are updatable (e.g. the fee rate via `SetTransferFee`, metadata fields
via `UpdateField`) but the *presence* of the extension is fixed. **Plan the full set up front.**

### 3. Account-side vs mint-side extensions
Some extensions live on the **mint** (transfer fee, transfer hook, metadata, permanent delegate);
some require setup on each **token account** (confidential transfers need per-account configuration;
default account state changes how new accounts initialise). If an extension touches accounts, every
holder's onboarding flow changes — account for that in your UX, not just your mint script.

### 4. Composability with the rest of the ecosystem
Not every protocol supports every extension. A **transfer hook** or **non-transferable** token can be
rejected or break integrations with AMMs, lending, and CEX deposit flows that don't implement the
transfer-hook interface or expect freely transferable tokens. The more exotic the extension, the more
you must verify downstream support (wallets, DEXs, custodians) before committing.

## Worked decisions

**"KYC-gated stablecoin"**
→ Transfer Hook (enforce allowlist on transfer) + likely Permanent Delegate (compliance clawback/freeze).
→ **Not** Confidential Transfers (incompatible with the hook). Amounts are public.

**"Private payroll / confidential treasury"**
→ Confidential Transfers (hide amounts) + Permanent Delegate (recovery) + optionally an **auditor
ElGamal key** so a compliance officer can decrypt.
→ **Not** a Transfer Hook (incompatible). Enforce policy off-chain or via the delegate, not a hook.

**"Memecoin with a 1% creator fee"**
→ Transfer Fee. Optionally Metadata for on-chain name/symbol/URI.
→ Keep it boring — exotic extensions hurt DEX/wallet support, which a memecoin needs.

**"Tokenized real-world asset (RWA)"**
→ Transfer Hook (accreditation/geo/lockup) + Permanent Delegate (legal clawback) + Metadata +
possibly Default Account State (accounts frozen until approved).
→ Confidential Transfers only if amount privacy is required *and* you can drop the hook (use auditor
key + delegate for compliance instead).

**"Soulbound credential / badge"**
→ Non-Transferable + Metadata. Optionally Default Account State.

## Decision checklist before you write the mint script
- [ ] Listed every behaviour the token needs over its whole lifetime (not just launch).
- [ ] Confirmed no pair you chose is mutually exclusive (esp. hook + confidential).
- [ ] Confirmed which extensions are mint-side vs account-side, and updated holder onboarding.
- [ ] Verified the wallets / DEXs / custodians you care about support these extensions.
- [ ] Only now: go to the recipe page(s) and build the mint in one transaction (see
      [setup-and-stack.md](./setup-and-stack.md)).
