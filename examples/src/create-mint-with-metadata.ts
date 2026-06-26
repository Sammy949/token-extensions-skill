/**
 * Create a Token-2022 mint with on-chain metadata (no Metaplex account).
 *
 * Uses two extensions together: MetadataPointer (points at the mint itself)
 * and TokenMetadata (the name/symbol/uri stored in the mint account).
 *
 * Key footgun shown here: TokenMetadata is VARIABLE length. Size the account
 * for base + pointer, but fund RENT for the maximum size (pointer + metadata),
 * because the InitializeTokenMetadata instruction resizes the account without
 * transferring extra lamports.
 *
 * Run (with a local validator on :8899):  npm run metadata
 * See skill/other-extensions.md (Metadata section) for the full explanation.
 */
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  extension,
  getMintSize,
  getInitializeMintInstruction,
  getInitializeMetadataPointerInstruction,
  getInitializeTokenMetadataInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import { generateKeyPairSigner } from "@solana/kit";
import { rpc, fundedSigner, sendInstructions } from "./shared.js";

const NAME = "Example Token";
const SYMBOL = "EXMPL";
const URI = "https://example.com/token.json";

async function main() {
  const payer = await fundedSigner();
  const mint = await generateKeyPairSigner();

  // The pointer references the MINT ITSELF as the metadata account.
  const metadataPointer = extension("MetadataPointer", {
    authority: payer.address,
    metadataAddress: mint.address,
  });

  // Built with the largest expected values to compute the MAX size for rent.
  const tokenMetadata = extension("TokenMetadata", {
    updateAuthority: payer.address,
    mint: mint.address,
    name: NAME,
    symbol: SYMBOL,
    uri: URI,
    additionalMetadata: new Map<string, string>(),
  });

  // Account is sized for base + pointer; rent is funded for the max (incl. metadata).
  const space = BigInt(getMintSize([metadataPointer]));
  const maxSpace = BigInt(getMintSize([metadataPointer, tokenMetadata]));
  const rent = await rpc.getMinimumBalanceForRentExemption(maxSpace).send();

  const signature = await sendInstructions(
    [
      getCreateAccountInstruction({
        payer,
        newAccount: mint,
        lamports: rent, // rent for MAX; account created at base size
        space,
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      }),
      // MetadataPointer must be initialized before the mint.
      getInitializeMetadataPointerInstruction({
        mint: mint.address,
        authority: payer.address,
        metadataAddress: mint.address,
      }),
      getInitializeMintInstruction({
        mint: mint.address,
        decimals: 0,
        mintAuthority: payer.address,
        freezeAuthority: payer.address,
      }),
      // TokenMetadata is initialized AFTER the mint exists.
      getInitializeTokenMetadataInstruction({
        metadata: mint.address,
        updateAuthority: payer.address,
        mint: mint.address,
        mintAuthority: payer, // signer
        name: NAME,
        symbol: SYMBOL,
        uri: URI,
      }),
    ],
    payer,
  );

  console.log("✓ created Token-2022 mint with on-chain metadata");
  console.log("  mint:", mint.address);
  console.log("  tx:  ", signature);
}

main().catch((e) => {
  console.error("✗ failed:", e);
  process.exit(1);
});
