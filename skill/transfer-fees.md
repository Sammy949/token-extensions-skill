# Transfer Fee

**What it's for:** take a percentage cut on every transfer of a token. Fees are withheld *on the
recipient's account* at transfer time, then later harvested and withdrawn by an authority. Used for
creator royalties, protocol revenue, and memecoin taxes.

## When to use it
- You want a cut on **every** transfer, enforced by the token program itself → **yes**.
- You want a one-time mint/sale fee, or a fee only in your app → **no**, do it in your app logic.
- You need the fee to be invisible / on confidential balances → **no**, see the constraint below.

## Hard constraints
- **Set at mint creation, immutable presence.** You cannot add a transfer fee to an existing mint.
  The *rate* is updatable (`getSetTransferFeeInstruction`), the *existence* is not.
- **`InitializeTransferFeeConfig` must come before `InitializeMint`**, in the same transaction as the
  account creation. See [setup-and-stack.md](./setup-and-stack.md).
- **Fees are withheld, not auto-routed.** The fee is parked on the *recipient's* token account, then
  must be **harvested → withdrawn** by the `withdrawWithheldAuthority`. There is no automatic payout.
- **Use the fee-aware transfer.** A normal transfer of a fee mint is fine, but to assert the exact
  fee you expect, use `getTransferCheckedWithFeeInstruction` (the caller declares the fee).

## Minimal canonical setup

Create a mint with a 1.5% fee, capped at a maximum per transfer. Builds on the helpers in
[setup-and-stack.md](./setup-and-stack.md) (`payer`, `rpc`, `sendInstructions`).

```ts
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  extension,
  getMintSize,
  getInitializeMintInstruction,
  getInitializeTransferFeeConfigInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import { generateKeyPairSigner } from "@solana/kit";

const mint = await generateKeyPairSigner();

// Describe the extension so the account is sized correctly. The TransferFeeConfig
// struct mirrors the on-chain layout, so every field (incl. the u64s) must be set:
// a withheld-amount accumulator plus an "older" and "newer" fee schedule.
const transferFeeExtension = extension("TransferFeeConfig", {
  transferFeeConfigAuthority: payer.address, // may change the rate later
  withdrawWithheldAuthority: payer.address,  // may harvest/withdraw fees
  withheldAmount: 0n,
  olderTransferFee: { epoch: 0n, maximumFee: 5_000_000n, transferFeeBasisPoints: 150 },
  newerTransferFee: { epoch: 0n, maximumFee: 5_000_000n, transferFeeBasisPoints: 150 }, // 150 bps = 1.5%
});

const space = BigInt(getMintSize([transferFeeExtension]));
const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

await sendInstructions([
  getCreateAccountInstruction({
    payer,
    newAccount: mint,
    lamports: rent,
    space,
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
  }),
  // Order is mandatory: fee config BEFORE mint init.
  getInitializeTransferFeeConfigInstruction({
    mint: mint.address,
    transferFeeConfigAuthority: payer.address, // can change the rate later
    withdrawWithheldAuthority: payer.address,  // can harvest/withdraw fees
    transferFeeBasisPoints: 150,
    maximumFee: 5_000_000n,
  }),
  getInitializeMintInstruction({
    mint: mint.address,
    decimals: 6,
    mintAuthority: payer.address,
    freezeAuthority: payer.address,
  }),
]);
```

### Collecting fees (the part people forget)
Fees accumulate on holder accounts. To actually receive them:
1. `getHarvestWithheldTokensToMintInstruction` — sweep withheld fees from token accounts to the mint.
2. `getWithdrawWithheldTokensFromMintInstruction` — withdraw from the mint to your account.
   (Or `getWithdrawWithheldTokensFromAccountsInstruction` to pull directly from specific accounts.)

Both require the `withdrawWithheldAuthority` to sign.

## Footguns
- **Forgetting to harvest.** Fees sit on holder accounts indefinitely. No harvest → no revenue. Build
  a periodic harvest+withdraw job; you can't "set and forget."
- **Closing accounts with withheld fees.** A token account holding withheld fees can't be closed until
  the fees are harvested. Harvest first, then close.
- **Assuming the recipient gets the gross amount.** They receive `amount − fee`. UIs that show the sent
  amount as the received amount will mislead users; compute the net.

## Real-world mapping
The transfer-fee extension is the one extension that saw heavy *retail* adoption — memecoins use it
for creator taxes — and it's the safest "extra" to add to an otherwise normal, DEX-friendly token.
Heavier compliance/privacy needs belong in [transfer-hooks.md](./transfer-hooks.md) or
[confidential-transfers.md](./confidential-transfers.md).
