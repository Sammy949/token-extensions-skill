# Token Extensions Architect

> A decision-first Claude Code / Codex skill for **SPL Token-2022 / Token Extensions** on Solana,
> current to the **2026 stack** (`@solana/kit` + `@solana-program/token-2022`).

Built for the [Superteam Brasil — Solana AI Kit](https://github.com/solanabr/solana-ai-kit) skill
bounty. Follows the kit's skill shape: a `SKILL.md` entry point that progressively routes to focused
`.md` files, so the agent loads only the context it needs.

## The problem it solves

Token Extensions are where Solana token development quietly goes wrong, in two ways:

1. **The stack moved; the examples didn't.** Most tutorials — and most LLM completions — still default
   to the legacy `@solana/web3.js` v1 + `@solana/spl-token` path. In 2026 the recommended stack is
   `@solana/kit` + `@solana-program/token-2022` (a Codama-generated, Kit-native client). Code written
   the old way compiles but no longer matches current docs or examples.
2. **The expensive mistakes are architectural, not syntactic.** Most extensions are **immutable after
   mint creation** — you can't add a transfer fee, compliance hook, or confidential balance to a live
   mint without minting a new token and migrating. And some extensions **can't coexist** (a transfer
   hook and confidential transfers are mutually exclusive).

This skill encodes both: the **modern stack** by default, and the **decision logic + hard constraints**
you need *before* you write the mint script.

## What it covers

- **Choosing extensions by requirement** — decide-by-need tables and worked designs (KYC stablecoin,
  private payroll, RWA, memecoin, soulbound credential).
- **The hard constraints** that cause dead-ends — mutual exclusivity, immutability, mint-side vs
  account-side setup, ecosystem composability.
- **Verified recipes** on the 2026 stack for: transfer fees, transfer hooks (compliance/KYC),
  confidential transfers (privacy), metadata, permanent delegate, non-transferable, default account
  state, interest-bearing, CPI guard.
- **Footguns** for each — the "this will break" notes, not just the happy path.

## Structure

```
token-extensions-skill/
├── skill/
│   ├── SKILL.md                  # entry point — router + the 3 rules
│   ├── architecture-decisions.md # choose extensions before you mint (the product)
│   ├── setup-and-stack.md        # @solana/kit toolchain + canonical tx pattern
│   ├── transfer-fees.md          # fees / royalties
│   ├── transfer-hooks.md         # on-chain transfer gating (compliance/KYC)
│   ├── confidential-transfers.md # private amounts + auditor-key compliance
│   ├── other-extensions.md       # metadata, permanent delegate, non-transferable, …
│   └── resources.md              # verified sources + program IDs
├── install.sh
├── LICENSE                       # MIT
└── README.md
```

`SKILL.md` is the only file the agent reads up front; it routes to the rest on demand
(token-efficient progressive loading).

## Install

```bash
git clone https://github.com/<your-username>/token-extensions-skill.git
cd token-extensions-skill
./install.sh            # installs to ~/.claude/skills/token-extensions  (use -y to skip the prompt)
```

Or drop the `skill/` folder into your project's skills directory manually. The skill works standalone
and is designed to slot alongside the core
[`solana-dev-skill`](https://github.com/solanabr/solana-dev-skill) in the Solana AI Kit.

## Usage

Once installed, ask your agent naturally — the skill loads when the task touches Token-2022:

- *"Design a KYC-gated stablecoin with Token Extensions."*
- *"Add a 1% transfer fee to a new Token-2022 mint using `@solana/kit`."*
- *"Should I use a transfer hook or confidential transfers for private payroll?"*
- *"My mint with metadata won't initialize — what's wrong with the instruction order?"*

## A note on accuracy

Instruction names, ordering rules, and constraints were verified against official Solana / Anza /
`solana-program` sources (see [`skill/resources.md`](./skill/resources.md)). Token Extensions and the
Kit SDK move quickly — before shipping production code, confirm the exact exported symbol names in your
installed `@solana-program/token-2022` version and test on devnet/localnet (clone-mainnet for
confidential transfers). The skill says so itself, in-context, rather than presenting any snippet as
infallible.

## License

MIT — see [LICENSE](./LICENSE). Free to merge or submodule into the Solana AI Kit.
