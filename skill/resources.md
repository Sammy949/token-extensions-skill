# Resources

Authoritative sources for SPL Token-2022 / Token Extensions, current to 2026. When generating code,
prefer these over older blog posts — the API changed with the move to `@solana/kit`.

## Program ID
- Token-2022 / Token Extensions program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
  (exported as `TOKEN_2022_PROGRAM_ADDRESS` from `@solana-program/token-2022`).

## The 2026 stack
- `@solana/kit` (formerly web3.js v2): https://www.solanakit.com — and the SDK repo
  https://github.com/anza-xyz/kit (see `examples/` for canonical transaction patterns).
  Currently at **v6.x** in 2026.
- "Meet Kit" announcement (Anza): https://www.anza.xyz/blog/meet-kit-the-new-solana-javascript-sdk
- `@solana-program/token-2022` (Codama/Kit client): https://github.com/solana-program/token-2022
  (npm: `@solana-program/token-2022`, currently **v0.9.x** — pre-1.0, so confirm exact exported symbol
  names against your installed version). It declares a **peer dependency on `@solana/kit@^6`** — pin an
  older Kit and `npm install` fails with an ERESOLVE peer conflict. The JS client lives under `clients/js`.
- `@solana-program/system` (for `getCreateAccountInstruction`): npm `@solana-program/system`.
- Legacy (for migration reference only): `@solana/web3.js` v1, `@solana/spl-token`.
- `gill` — a higher-level Kit-based wrapper (Helius) that bundles the Token-2022 client:
  https://www.helius.dev/blog/gill

## Token Extensions docs (official)
- Extensions overview: https://solana.com/docs/tokens/extensions
- Transfer fees: https://solana.com/docs/tokens/extensions/transfer-fees
- Transfer hook (guide): https://solana.com/developers/guides/token-extensions/transfer-hook
- Confidential transfer: https://solana.com/docs/tokens/extensions/confidential-transfer
- Confidential Balances suite: https://www.solana-program.com/docs/confidential-balances
- Metadata pointer + token metadata: https://solana.com/docs/tokens/extensions/metadata
- Default account state: https://solana.com/docs/tokens/extensions/default-state
- Interest-bearing tokens: https://solana.com/docs/tokens/extensions/interest-bearing-tokens
- Token-2022 program reference: https://www.solana-program.com/docs/token-2022

## Transfer hook internals
- Interface crate: `spl-transfer-hook-interface` (the `Execute` instruction + `ExtraAccountMetaList`).
- Extra-account-metas PDA seeds: `["extra-account-metas", mint]` under the hook program ID.
- Example program: https://github.com/solana-developers/program-examples/tree/main/tokens/token-2022/transfer-hook

## Confidential transfers internals
- Requires the **ZK ElGamal Proof Program** (equality / ciphertext-validity / range proofs).
- Per-account: ElGamal keypair + AES key; `ConfigureAccount` (or `ConfigureAccountWithRegistry`).
- Local testing: clone the mainnet Token Extension Program into your validator — it is **not** enabled
  on a default local validator.

## Useful third-party guides (verify against official docs before copying code)
- QuickNode Token-2022 guides: https://www.quicknode.com/guides/solana-development/spl-tokens/token-2022/overview
- RareSkills Token-2022 spec: https://rareskills.io/post/token-2022

## A note on accuracy
Token Extensions and the Kit SDK move quickly. The instruction names, ordering rules, and constraints
in this skill were verified against the sources above, but before shipping production code:
- check the exact exported symbol names in your **installed** `@solana-program/token-2022` version, and
- test mint creation on devnet/localnet (and clone-mainnet for confidential transfers).
