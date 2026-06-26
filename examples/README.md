# Examples — runnable, on-chain-verified

These are **real, runnable** Token-2022 recipes from the skill, not pseudo-code. Each script builds a
mint and lands a transaction on a Solana validator. They use the exact 2026 stack the skill teaches:
`@solana/kit` v6 + `@solana-program/token-2022`.

| Script | What it creates | Skill page |
| --- | --- | --- |
| `src/create-mint-with-transfer-fee.ts` | A mint with a 1.5% transfer fee | [transfer-fees.md](../skill/transfer-fees.md) |
| `src/create-mint-with-metadata.ts` | A mint with on-chain metadata (no Metaplex) | [other-extensions.md](../skill/other-extensions.md) |

`src/shared.ts` holds the canonical `@solana/kit` connect → build → sign → send pattern.

## Run them

**1. Start a local validator** (in its own terminal — leave it running):
```bash
solana-test-validator -r
```

**2. In a second terminal**, install and run:
```bash
cd examples
npm install
npm run transfer-fee
npm run metadata
```

To run against **devnet** instead (transactions then viewable on a public explorer):
```bash
RPC_URL=https://api.devnet.solana.com RPC_WS=wss://api.devnet.solana.com npm run transfer-fee
```

## Example output

From a local-validator run (`solana-cli 4.0.2`, `@solana/kit@6`, `@solana-program/token-2022@0.9`).
Local-validator signatures are ephemeral — run it yourself to reproduce, or use the devnet command
above for publicly-inspectable transactions.

```
✓ created Token-2022 mint with transfer fee
  mint: 75hYow9CQ59f2X1qKapJRXavLTdiz5dfsVRGtM3QXncg
  extensions: {
    "__kind": "TransferFeeConfig",
    "transferFeeConfigAuthority": "AGB3Cf4yNMJJCmsxjweW4DjCtzaSsB1dbgpjMwDk92GR",
    "withdrawWithheldAuthority": "AGB3Cf4yNMJJCmsxjweW4DjCtzaSsB1dbgpjMwDk92GR",
    "withheldAmount": "0",
    "olderTransferFee": { "epoch": "0", "maximumFee": "5000000", "transferFeeBasisPoints": 150 },
    "newerTransferFee": { "epoch": "0", "maximumFee": "5000000", "transferFeeBasisPoints": 150 }
  }

✓ created Token-2022 mint with on-chain metadata
  mint: 6EFWxgqWemNyUxoYqVi7XsFdiBArTuQBT8wpj4Pqfcnm
```

## Why these exist

Most Token-2022 guidance — and most LLM output — is written against the deprecated stack
(`@solana/web3.js` v1 + `@solana/spl-token`) and is never executed. These examples were run on a live
validator to confirm the skill's recipes actually work on the current stack, including the
non-obvious details: the `TransferFeeConfig` descriptor must be fully populated, metadata is
variable-length so you size the account for the base but fund rent for the max, and extensions are
initialized **before** the mint in a single transaction.

> Not covered here yet: transfer hooks (need a deployed Rust program) and confidential transfers
> (not enabled on a default local validator — requires cloning the mainnet Token Extension Program).
> See the corresponding skill pages.
