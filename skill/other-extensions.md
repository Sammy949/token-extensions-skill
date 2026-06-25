# Other Extensions

Shorter recipes for the remaining extensions. All follow the same shape as the headline pages: set at
mint creation, initialise the extension **before** `InitializeMint`, in one transaction (see
[setup-and-stack.md](./setup-and-stack.md)). All instruction names follow the Codama
`getInitialize…Instruction` convention; confirm the exact export against the installed
`@solana-program/token-2022` version before shipping (`import * as t from "@solana-program/token-2022"`
and check the autocomplete).

---

## Metadata Pointer + Token Metadata
**For:** on-chain name / symbol / URI directly on the mint, no Metaplex account.

This one is special: **variable-length**, so rent is handled differently. Sequence (one tx):
`getCreateAccountInstruction` → `getInitializeMetadataPointerInstruction` → `getInitializeMintInstruction`
→ `getInitializeTokenMetadataInstruction` → (optional) `getUpdateTokenMetadataFieldInstruction`.

```ts
import {
  extension, getMintSize,
  getInitializeMetadataPointerInstruction,
  getInitializeMintInstruction,
  getInitializeTokenMetadataInstruction,
} from "@solana-program/token-2022";

// The metadata pointer points at the MINT ITSELF.
const metadataPointer = extension("MetadataPointer", {
  authority: payer.address,
  metadataAddress: mint.address, // self-reference
});

// Variable length: size the ACCOUNT for base + pointer, but fund RENT for the max future size.
const space = BigInt(getMintSize([metadataPointer]));
// Build the TokenMetadata with the largest expected values to compute MAX size.
// All fields are required for the descriptor to encode (incl. additionalMetadata).
const maxMetadata = extension("TokenMetadata", {
  updateAuthority: payer.address,
  mint: mint.address,
  name: "My Token",
  symbol: "MTK",
  uri: "https://example.com/meta.json",
  additionalMetadata: new Map<string, string>(),
});
const maxSpace = BigInt(getMintSize([metadataPointer, maxMetadata]));
const rent = await rpc.getMinimumBalanceForRentExemption(maxSpace).send(); // fund for MAX, not base

// Then, in one transaction (order matters):
//   getCreateAccountInstruction({ ... space, programAddress: TOKEN_2022_PROGRAM_ADDRESS })
//   getInitializeMetadataPointerInstruction({ mint: mint.address, authority: payer.address, metadataAddress: mint.address })
//   getInitializeMintInstruction({ mint: mint.address, decimals, mintAuthority, freezeAuthority })
//   getInitializeTokenMetadataInstruction({ metadata: mint.address, updateAuthority: payer.address,
//     mint: mint.address, mintAuthority: payer /* signer */, name, symbol, uri })
```

**Footguns**
- `MetadataPointer` init must come **before** `InitializeMint`; `InitializeTokenMetadata` comes
  **after** the mint exists.
- `InitializeTokenMetadata`/`UpdateField`/`RemoveKey` **resize the account but don't add lamports**.
  Pre-fund rent for the max size, or transfer lamports before growing past it.
- Lock metadata forever with `getUpdateTokenMetadataUpdateAuthorityInstruction({ newUpdateAuthority: null })`.

---

## Permanent Delegate
**For:** a mint-level authority that can transfer or burn tokens from **any** holder account —
clawback, compliance freezes, recovery.

Initialise the permanent-delegate extension before `InitializeMint`, setting the delegate address.
(Export name follows the `getInitialize…Instruction` pattern; verify the exact symbol in your
installed version.)

**Footguns**
- **Holders cannot opt out.** A permanent delegate is absolute control over every account of this
  mint. Disclose it — sophisticated holders will check for it, and a hidden one reads as a rug.
- It is the standard **recovery** pair for [confidential-transfers.md](./confidential-transfers.md)
  (oversight via auditor key + recovery via permanent delegate).

---

## Non-Transferable ("soulbound")
**For:** tokens that can be held but never transferred — credentials, badges, non-tradable receipts.

Initialise the non-transferable extension before `InitializeMint`.

**Footguns**
- **Non-transferable ≠ indestructible.** The holder can still **burn** the token and **close** the
  account. It prevents transfer, not removal.
- Many integrations assume tokens are transferable; expect DEX/wallet flows to reject it.
- **Conflicts with Permanent Delegate.** Non-transferable says *"no one can move this"*; a permanent
  delegate is an authority that *can force-transfer it from anyone*. Combining them is usually
  contradictory — the delegate's clawback silently defeats the soulbound guarantee. If you genuinely
  want "holder can't move it, but issuer can revoke," do that deliberately and document it; most of the
  time, picking both is a design mistake.

---

## Default Account State
**For:** make every new token account start **frozen** until you approve it — an allowlist gate at the
account level (common for regulated tokens alongside a transfer hook).

```ts
import { getInitializeDefaultAccountStateInstruction } from "@solana-program/token-2022";
// state: frozen → new accounts begin frozen; the freeze authority must thaw each one.
getInitializeDefaultAccountStateInstruction({ mint: mint.address, state: /* Frozen */ });
```

**Footguns**
- Requires a **freeze authority** on the mint, and an operational process to thaw approved accounts —
  if you forget to thaw, holders can't use the token.
- Updatable later via the update-default-account-state instruction (the state default is *not* one of
  the permanently-frozen-at-creation settings), but plan the approval flow up front.

---

## Interest-Bearing
**For:** display a balance that accrues interest at a set rate.

```ts
import { getInitializeInterestBearingMintInstruction } from "@solana-program/token-2022";
getInitializeInterestBearingMintInstruction({
  mint: mint.address,
  rateAuthority: payer.address,
  rate: 500, // basis points
});
```

**Footgun — the important one**
- **This is a display rate, not real yield.** The extension changes the *UI amount* shown via the
  interest calculation; it does **not** mint or move tokens. No new tokens are created. Don't promise
  holders real returns based on this extension alone.

---

## CPI Guard (account-level)
**For:** protect token accounts from certain actions (e.g. unwanted approvals/transfers) when invoked
via cross-program invocation. Enabled per **account**, not on the mint.

**Footgun**
- It's an account-side protection a user opts into; it isn't a mint-level policy you can impose on all
  holders. Useful to recommend to users, not to enforce.

---

## Cross-cutting reminders
- **Immutable presence.** For all of the above, the *existence* of the extension is fixed at creation;
  only certain parameters update later.
- **Compose deliberately.** You can stack several extensions on one mint (e.g. metadata + permanent
  delegate + default state for an RWA) — size with `getMintSize([...allExtensions])` and init each
  before `InitializeMint`. But check the one pair that can't coexist: confidential transfers + transfer
  hook. See [architecture-decisions.md](./architecture-decisions.md).
