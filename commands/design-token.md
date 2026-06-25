---
description: >-
  Design an SPL Token-2022 mint from requirements. Walks the Token Extensions decision tree, enforces
  the hard constraints, and outputs a concrete extension plan + 2026-stack scaffold.
argument-hint: "[what you're building, e.g. 'KYC-gated stablecoin' or 'private payroll token']"
---

You are running the **/design-token** workflow from the `token-extensions` skill. Goal: turn a
plain-language token idea into a correct, buildable Token-2022 extension plan — architecture first,
code second.

The user's idea: **$ARGUMENTS**
(If that is empty, ask what they're building before proceeding.)

Ground everything in the skill files (read them; don't rely on memory). If installed, they're under
`~/.claude/skills/token-extensions/`: `architecture-decisions.md`, `setup-and-stack.md`, and the
per-extension recipe pages.

## Steps

1. **Extract requirements.** From the idea, infer what the token must do over its lifetime. If any of
   these are unclear, ask (briefly, batched):
   - Does it need a cut on every transfer (fees/royalties)?
   - Must transfers be gated/blocked on-chain (KYC, allowlist, geo, lockup)?
   - Must amounts be private on-chain?
   - Does it need on-chain metadata (name/symbol/URI)?
   - Does the issuer need clawback/recovery over holders?
   - Is it soulbound (non-transferable)?
   - Should new accounts start frozen until approved?

2. **Produce the extension plan.** Map each requirement to an extension and list them. State which are
   mint-side vs account-side.

3. **Run the constraint check — explicitly call out any that apply:**
   - Confidential Transfers ⊥ Transfer Hook (can't have both — pick the dominant need).
   - Auditor key is visibility, not enforcement.
   - Most extensions are immutable after creation — confirm the full set now.
   - Non-Transferable + Permanent Delegate is usually contradictory.
   - Verify the chosen set composes with the wallets/DEXs/custodians the user cares about.

4. **Output the design**, in this shape:
   - **Extensions:** the chosen list, one line of rationale each.
   - **Constraints flagged:** any conflicts/immutability notes that apply to this design.
   - **Footguns:** the 2–3 that matter for this token.
   - **Scaffold:** a `@solana/kit` + `@solana-program/token-2022` mint-creation outline — create
     account → initialize extension(s) (in order) → initialize mint, in one transaction. Pull the
     concrete instruction calls from the relevant recipe page.

5. **Close with the honesty note:** `@solana-program/token-2022` is pre-1.0 — confirm exact exported
   symbol names against the installed version, and test on devnet/localnet (clone-mainnet for
   confidential transfers).

Be decision-dense: short rationale, sharp constraints, one clean scaffold. Do not write the full
program for a transfer hook — note that the hook *program* is a separate Rust/Anchor deliverable and
point to `transfer-hooks.md`.
