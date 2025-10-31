// backend/services/tokenCreateService.ts
import { Client, TokenCreateTransaction, PrivateKey, Hbar } from "@hashgraph/sdk";

export interface TokenCreateParams {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  initialSupply: number;
}

/**
 * Creates an HTS token on Hedera Testnet.
 * Uses the operator account configured in the Client.
 */
export async function createToken(
  client: Client,
  params: TokenCreateParams
): Promise<string> {
  // Use the operator key from the client
  const operatorKeyHex = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorKeyHex) {
    throw new Error("Operator key missing in .env");
  }

  const operatorKey = PrivateKey.fromString(operatorKeyHex);
  const treasuryAccountId = client.operatorAccountId;
  if (!treasuryAccountId) {
    throw new Error("Client operatorAccountId not set");
  }

  // Create the token
  const transaction = await new TokenCreateTransaction()
    .setTokenName(params.tokenName)
    .setTokenSymbol(params.tokenSymbol)
    .setDecimals(params.decimals)
    .setInitialSupply(params.initialSupply)
    .setTreasuryAccountId(treasuryAccountId)
    .setMaxTransactionFee(new Hbar(10)) // increased from 2 to 10 HBAR
    .freezeWith(client);

  // Sign the transaction with operator key
  const signedTx = await transaction.sign(operatorKey);

  // Execute the transaction
  const txResponse = await signedTx.execute(client);

  // Get the receipt to obtain token ID
  const receipt = await txResponse.getReceipt(client);
  if (!receipt.tokenId) {
    throw new Error("Failed to create token: tokenId is null");
  }

  return receipt.tokenId.toString();
}
