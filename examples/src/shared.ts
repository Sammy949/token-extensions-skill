// Shared @solana/kit setup used by the examples.
// This is the canonical 2026 transaction pattern from the skill's setup-and-stack.md.

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
  lamports,
  type KeyPairSigner,
  type Instruction,
} from "@solana/kit";

// Defaults to a local validator. Override for devnet:
//   RPC_URL=https://api.devnet.solana.com RPC_WS=wss://api.devnet.solana.com
const HTTP = process.env.RPC_URL ?? "http://127.0.0.1:8899";
const WS = process.env.RPC_WS ?? "ws://127.0.0.1:8900";

export const rpc = createSolanaRpc(HTTP);
export const rpcSubscriptions = createSolanaRpcSubscriptions(WS);
export const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

/** Generate a fresh keypair and fund it (works on localnet / devnet). */
export async function fundedSigner(): Promise<KeyPairSigner> {
  const signer = await generateKeyPairSigner();
  await rpc.requestAirdrop(signer.address, lamports(1_000_000_000n)).send();
  await new Promise((r) => setTimeout(r, 2000)); // let the airdrop confirm
  return signer;
}

/** Build → sign → send a v0 transaction. Fetch the blockhash as late as possible. */
export async function sendInstructions(
  instructions: Instruction[],
  feePayer: KeyPairSigner,
): Promise<string> {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );
  const signed = await signTransactionMessageWithSigners(message);
  assertIsTransactionWithBlockhashLifetime(signed); // narrows lifetime for the sender
  const signature = getSignatureFromTransaction(signed);
  await sendAndConfirmTransaction(signed, { commitment: "confirmed" });
  return signature;
}
