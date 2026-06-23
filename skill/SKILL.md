---
name: token-extensions
description: >-
  Expert guidance for SPL Token-2022 / Token Extensions on Solana, current to the 2026 stack
  (@solana/kit + @solana-program/token-2022). Use when designing or building a token that needs
  transfer fees, transfer hooks (compliance/KYC), confidential transfers (privacy), metadata,
  permanent delegate, non-transferable, default account state, or interest-bearing behavior — or
  whenever choosing between extensions or debugging a mint that won't initialize.
---

# Token Extensions Architect

A decision-first skill for **SPL Token-2022 / Token Extensions**. It exists to prevent the two
expensive failure modes: (1) building on the **deprecated stack** that models default to, and (2)
choosing an **extension architecture you can't change** once the mint is live.

> **The thesis:** the 2026 stack moved, most examples didn't. Use `@solana/kit` +
> `@solana-program/token-2022` (modern), not `@solana/web3.js` v1 + `@solana/spl-token` (legacy). And
> because extensions are mostly **immutable after mint creation**, decide the architecture *before*
> you write the mint script.

## Start here, every time
1. **Setting up / writing any code?** → [setup-and-stack.md](./setup-and-stack.md)
   (the modern toolchain, the canonical transaction pattern, the create-mint-with-extensions shape).
2. **Choosing which extensions to use?** → [architecture-decisions.md](./architecture-decisions.md)
   (decide by requirement; the hard constraints; worked designs).

## Route by need

| The token needs… | Go to |
| --- | --- |
| A cut on every transfer (fees / royalties / tax) | [transfer-fees.md](./transfer-fees.md) |
| On-chain **gating** of transfers (KYC / allowlist / lockup) | [transfer-hooks.md](./transfer-hooks.md) |
| **Hidden amounts** (private payroll / treasury) | [confidential-transfers.md](./confidential-transfers.md) |
| On-chain metadata (name/symbol/URI, no Metaplex) | [other-extensions.md](./other-extensions.md#metadata-pointer--token-metadata) |
| Clawback / recovery authority over any holder | [other-extensions.md](./other-extensions.md#permanent-delegate) |
| Soulbound / non-transferable | [other-extensions.md](./other-extensions.md#non-transferable-soulbound) |
| New accounts frozen until approved | [other-extensions.md](./other-extensions.md#default-account-state) |
| Interest-accruing display balance | [other-extensions.md](./other-extensions.md#interest-bearing) |
| Not sure yet / comparing options | [architecture-decisions.md](./architecture-decisions.md) |
| Links, source docs, program IDs | [resources.md](./resources.md) |

## The three rules behind everything here
1. **Modern stack.** `get…Instruction` + `@solana-program/token-2022`, not `create…Instruction` +
   `@solana/spl-token`. If you see `new Connection` or `SystemProgram.createAccount`, you're on the
   old path.
2. **Immutable presence.** Most extensions are set at mint creation and can't be added later. Pick the
   full set up front; only some *parameters* update afterward.
3. **One pair can't coexist:** **Confidential Transfers ⊥ Transfer Hook.** Privacy (encrypted amounts)
   and on-chain gating (needs to read amounts) are mutually exclusive. Choose the dominant requirement.

## How to use this skill
- For a **design question** ("KYC stablecoin? private payroll? RWA?"), read
  [architecture-decisions.md](./architecture-decisions.md) — it has worked answers.
- For an **implementation**, read [setup-and-stack.md](./setup-and-stack.md) once, then the specific
  extension page. Every recipe builds the mint in a single transaction with the extension initialised
  before the mint.
- When generating code, **prefer the modern imports** shown here and treat any legacy
  `@solana/spl-token` snippet as something to migrate, not copy.
