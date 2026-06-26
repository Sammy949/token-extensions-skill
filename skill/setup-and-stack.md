# Setup & Stack — the 2026 Token Extensions toolchain

> **Read this first if you are writing any code.** The #1 reason Token Extensions code breaks
> in 2026 is using the *legacy* stack. Most tutorials, Stack Overflow answers, and LLM
> completions still default to `@solana/web3.js` v1 + `@solana/spl-token`. That path still
> compiles, but it is no longer the recommended one and it will not match current examples.

## The stack shift

| Concern | Legacy (what models default to) | Modern 2026 (use this) |
| --- | --- | --- |
| Core SDK | `@solana/web3.js` (v1, maintenance mode) | `@solana/kit` (formerly web3.js v2; now at **v6.x** in 2026) |
| Token client | `@solana/spl-token` | `@solana-program/token-2022` (Codama-generated, Kit-native) |
| System program | `SystemProgram.createAccount` | `getCreateAccountInstruction` (`@solana-program/system`) |
| RPC | `new Connection(url)` | `createSolanaRpc(url)` + `createSolanaRpcSubscriptions(wsUrl)` |
| Instruction builders | `createInitialize*Instruction` | `getInitialize*Instruction` |
| Send | `sendAndConfirmTransaction(conn, tx, [signers])` | `sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })` |

**Rule of thumb:** if you see `create…Instruction`, `new Connection`, or `import … from "@solana/spl-token"`,
you are on the legacy path. The modern path uses `get…Instruction` and `@solana-program/token-2022`.

> `@solana/spl-token` is not *wrong* — it still supports Token-2022. But for new code in 2026 the
> maintainers themselves point you to the `@solana-program/*` Kit clients. This skill teaches the
> modern path and shows the legacy mapping where it helps you migrate.

## Install

```bash
npm install @solana/kit @solana-program/token-2022 @solana-program/system
```

> **Version pairing matters.** `@solana-program/token-2022` (currently v0.9.x) declares a **peer
> dependency on `@solana/kit@^6`**. Pinning an older Kit (e.g. v2) causes an `ERESOLVE` peer conflict
> on install. Let npm resolve the latest of each, or pin `@solana/kit@^6`. The `@solana-program/*`
> clients are still pre-1.0, so always check exported symbol names against your installed version.

## The canonical transaction pattern (`@solana/kit`)

Every recipe in this skill builds on this exact shape. Learn it once.

```ts
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory,
  generateKeyPairSigner,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  assertIsTransactionWithBlockhashLifetime,
} from "@solana/kit";

// 1. Connect (HTTP for requests, WS for confirmation subscriptions)
const rpc = createSolanaRpc("http://127.0.0.1:8899");
const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");
const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

// 2. Signers
const payer = await generateKeyPairSigner(); // fund this on devnet/localnet first

// 3. Build → sign → send (fetch the blockhash as LATE as possible)
async function sendInstructions(instructions, feePayer = payer) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );

  const signedTransaction = await signTransactionMessageWithSigners(message);
  assertIsTransactionWithBlockhashLifetime(signedTransaction); // narrows the type for the sender
  const signature = getSignatureFromTransaction(signedTransaction);
  await sendAndConfirmTransaction(signedTransaction, { commitment: "confirmed" });
  return signature;
}
```

Notes that trip people up:
- RPC calls are lazy — you must call `.send()` (e.g. `rpc.getLatestBlockhash().send()`).
- Amounts are `bigint` (`1_000_000n`), wrapped with `lamports(...)` where a lamport type is expected.
- Passing a **signer** (not a bare address) into an instruction is what lets
  `signTransactionMessageWithSigners` sign automatically — no manual signer array.

## Creating a mint *with extensions* — the shape every recipe follows

Token Extensions are **not** added after the fact. You size the mint account for the extensions you
want, then initialise the extensions **before** you initialise the mint — all in **one transaction**.

```ts
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  getMintSize,
  getInitializeMintInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
  // ...the get-initialize instruction(s) for the extension(s) you want
} from "@solana-program/token-2022";

const mint = await generateKeyPairSigner();

// 1. Size the account for the chosen extensions (see each extension page for the descriptor)
const space = BigInt(getMintSize([/* extension descriptors */]));
const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

// 2. Order matters: createAccount → initialize EXTENSION(s) → initializeMint, same tx
await sendInstructions([
  getCreateAccountInstruction({
    payer,
    newAccount: mint,
    lamports: rent,
    space,
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
  }),
  // getInitialize<Extension>Instruction({ mint: mint.address, ... }),  ← BEFORE the mint init
  getInitializeMintInstruction({
    mint: mint.address,
    decimals: 2,
    mintAuthority: payer.address,
    freezeAuthority: payer.address,
  }),
]);
```

### The two rules you cannot break
1. **Extensions are (mostly) immutable.** Most extensions must be set at mint creation. You
   generally **cannot** add a transfer fee, transfer hook, etc. to an existing mint. Decide the
   architecture *before* you create the mint → see [architecture-decisions.md](./architecture-decisions.md).
2. **Initialise the extension before the mint.** Every extension's `Initialize…` instruction must
   come **before** `InitializeMint`, and all of them must be in the **same transaction** as the
   `createAccount`. Get the order wrong and the transaction fails.

## Program ID

Token-2022 / Token Extensions program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
(exported as `TOKEN_2022_PROGRAM_ADDRESS`). This is a **different** program from the original SPL
Token program — a mint created under one cannot be used as if it were under the other.

## Where to go next
- Deciding *which* extensions to use → [architecture-decisions.md](./architecture-decisions.md)
- Fees / royalties → [transfer-fees.md](./transfer-fees.md)
- Compliance / KYC gating → [transfer-hooks.md](./transfer-hooks.md)
- Privacy → [confidential-transfers.md](./confidential-transfers.md)
- Everything else (metadata, permanent delegate, non-transferable, default state, interest-bearing)
  → [other-extensions.md](./other-extensions.md)
