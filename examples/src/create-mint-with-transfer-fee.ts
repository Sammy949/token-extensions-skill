/**
 * Create a Token-2022 mint with a Transfer Fee (1.5%, capped).
 *
 * Demonstrates the core Token Extensions pattern:
 *   size the account for the extension → create account → initialize the
 *   extension → initialize the mint, all in ONE transaction, in that order.
 *
 * Run (with a local validator on :8899):  npm run transfer-fee
 * See skill/transfer-fees.md for the full explanation and footguns.
 */
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  extension,
  getMintSize,
  getInitializeMintInstruction,
  getInitializeTransferFeeConfigInstruction,
  fetchMint,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import { generateKeyPairSigner } from "@solana/kit";
import { rpc, fundedSigner, sendInstructions } from "./shared.js";

const FEE_BASIS_POINTS = 150; // 1.5%
const MAX_FEE = 5_000_000n; // cap per transfer, in base units

async function main() {
  const payer = await fundedSigner();
  const mint = await generateKeyPairSigner();

  // The TransferFeeConfig extension struct mirrors the on-chain layout — every
  // field (including the u64s) must be present for the descriptor to encode.
  const transferFeeExtension = extension("TransferFeeConfig", {
    transferFeeConfigAuthority: payer.address,
    withdrawWithheldAuthority: payer.address,
    withheldAmount: 0n,
    olderTransferFee: { epoch: 0n, maximumFee: MAX_FEE, transferFeeBasisPoints: FEE_BASIS_POINTS },
    newerTransferFee: { epoch: 0n, maximumFee: MAX_FEE, transferFeeBasisPoints: FEE_BASIS_POINTS },
  });

  const space = BigInt(getMintSize([transferFeeExtension]));
  const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

  const signature = await sendInstructions(
    [
      getCreateAccountInstruction({
        payer,
        newAccount: mint,
        lamports: rent,
        space,
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      }),
      // Order matters: the fee config must be initialized BEFORE the mint.
      getInitializeTransferFeeConfigInstruction({
        mint: mint.address,
        transferFeeConfigAuthority: payer.address,
        withdrawWithheldAuthority: payer.address,
        transferFeeBasisPoints: FEE_BASIS_POINTS,
        maximumFee: MAX_FEE,
      }),
      getInitializeMintInstruction({
        mint: mint.address,
        decimals: 6,
        mintAuthority: payer.address,
        freezeAuthority: payer.address,
      }),
    ],
    payer,
  );

  const account = await fetchMint(rpc, mint.address);
  console.log("✓ created Token-2022 mint with transfer fee");
  console.log("  mint:", mint.address);
  console.log("  tx:  ", signature);
  console.log(
    "  extensions:",
    JSON.stringify(
      account.data.extensions,
      (_k, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );
}

main().catch((e) => {
  console.error("✗ failed:", e);
  process.exit(1);
});
