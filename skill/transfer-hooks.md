# Transfer Hook

**What it's for:** run your own on-chain program on **every transfer** of a token, with the power to
**reject** the transfer. This is the enforcement primitive — allowlists/KYC, geo-restriction,
lockups/vesting, per-transfer limits. If you need to *block* transfers, this is the only extension
that can.

## When to use it
- You must **gate** transfers on-chain (compliance, allowlist, lockup) → **yes**.
- You only need to *observe* transfers, not block them → **no**, index events off-chain instead.
- You need **amount privacy** → **no**, and you **cannot** combine this with confidential transfers
  (see constraint #1). Pick one.

## Hard constraints
- **Confidential Transfers ⊥ Transfer Hook.** Mutually exclusive on the same mint — a hook must read
  the amount, confidential transfers encrypt it. See [architecture-decisions.md](./architecture-decisions.md).
- **Set at mint creation, immutable.** `InitializeTransferHook` before `InitializeMint`, same tx.
- **You must ship an on-chain program**, not just a config. The hook points at a program ID that
  implements the **`spl-transfer-hook-interface`**. No program = no working hook.
- **The hook runs read-only.** During the transfer CPI, *all* accounts are passed as **read-only**.
  Your hook can validate and reject, but it **cannot mutate** the involved accounts inline.
- **Integration risk is real.** AMMs, lending, and CEX deposit flows that don't implement the
  transfer-hook interface will fail to transfer your token. Verify downstream support before shipping.

## Minimal canonical setup (mint side)

Builds on [setup-and-stack.md](./setup-and-stack.md) (`payer`, `rpc`, `sendInstructions`, `mint`).

```ts
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  extension,
  getMintSize,
  getInitializeMintInstruction,
  getInitializeTransferHookInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import { address, generateKeyPairSigner } from "@solana/kit";

const mint = await generateKeyPairSigner();
const hookProgramId = address("<YOUR_TRANSFER_HOOK_PROGRAM_ID>");

const hookExtension = extension("TransferHook", {
  authority: payer.address,
  programId: hookProgramId,
});

const space = BigInt(getMintSize([hookExtension]));
const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

await sendInstructions([
  getCreateAccountInstruction({
    payer, newAccount: mint, lamports: rent, space,
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
  }),
  getInitializeTransferHookInstruction({
    mint: mint.address,
    authority: payer.address,
    transferHookProgramId: hookProgramId, // your program, below
  }),
  getInitializeMintInstruction({
    mint: mint.address, decimals: 6,
    mintAuthority: payer.address, freezeAuthority: payer.address,
  }),
]);
```

## The on-chain program (the part that's actually the work)

The mint config is trivial; the hook **program** is the real deliverable. It must implement the
transfer-hook interface:

1. **`Execute` instruction** — Token-2022 CPIs into this on every transfer. Put your allow/deny
   logic here. Return an error to reject the transfer.
2. **An `extra-account-metas` PDA** — declares any extra accounts your `Execute` needs (e.g. an
   allowlist account). Seeds: `["extra-account-metas", mint]` under **your** program ID. Initialise it
   on-chain with `ExtraAccountMetaList::init::<ExecuteInstruction>(...)`.

```rust
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

// Anchor's discriminators differ from the interface's, so add a fallback that
// unpacks the raw interface instruction and routes Execute to your handler:
let instruction = TransferHookInstruction::unpack(data)?;
match instruction {
    TransferHookInstruction::Execute { amount } => {
        let amount_bytes = amount.to_le_bytes();
        __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
    }
    _ => return Err(ProgramError::InvalidInstructionData.into()),
}
```

### Client-side transfers
On a hook mint you must include the hook's extra accounts in the transfer. The legacy
`@solana/spl-token` helper `createTransferCheckedWithTransferHookInstruction` auto-derives them from
the `extra-account-metas` PDA — the cleanest current path. If you build the transfer manually under
Kit, you must resolve and append those extra accounts yourself.

> **Honest note on the stack:** the mint-side config above is modern `@solana/kit` +
> `@solana-program/token-2022`. The *program* and the transfer-resolution helpers are still most
> commonly shown with Anchor + legacy `@solana/spl-token`, because that's where the mature examples
> live in 2026. Use the modern client for setup; don't be surprised that hook tutorials lean Anchor.

## Footguns
- **Read-only accounts in the hook.** You can't write to the transfer's accounts during `Execute`.
  Need to record state? Use a separate PDA your program owns, or a delegate-PDA pattern.
- **Forgetting the extra-account-metas PDA.** If it's missing or wrong, every transfer fails. It must
  be initialised before the first transfer and list exactly the accounts `Execute` reads.
- **Anchor discriminator mismatch.** Without the fallback above, Token-2022's interface call won't
  route to your handler. This is the single most common "my hook never runs" bug.

## Real-world mapping
Transfer hooks are concentrated in **RWA and regulated tokens** (accreditation, geo, lockups) — e.g.
compliance-gated stablecoins. They are the on-chain *enforcement* half of compliance; for the
*visibility* half on a private token, see the auditor-key discussion in
[confidential-transfers.md](./confidential-transfers.md).
