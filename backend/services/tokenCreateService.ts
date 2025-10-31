// backend/services/tokenCreateService.ts
import { Client, TokenCreateTransaction, PrivateKey, Hbar } from "@hashgraph/sdk";

export interface TokenCreateParams {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  initialSupply: number;
}

/**
 * Creates a mutable HTS token on Hedera Testnet.
 * Uses the operator account configured in the Client.
 * Sets the supply and admin keys to the ECDSA key for EVM contract management.
 */
export async function createToken(
  client: Client,
  params: TokenCreateParams
): Promise<string> {
  // Operator key (for signing) remains ED25519
  const operatorKeyHex = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorKeyHex) {
    throw new Error("Operator key missing in .env");
  }
  const operatorKey = PrivateKey.fromStringED25519(operatorKeyHex);

  // Treasury account = operator by default
  const treasuryAccountId = client.operatorAccountId;
  if (!treasuryAccountId) {
    throw new Error("Client operatorAccountId not set");
  }

  // ECDSA key for contract management
  const ecdsaKeyHex = process.env.ECDSA_PRIVATE_KEY;
  if (!ecdsaKeyHex) {
    throw new Error("ECDSA key missing in .env");
  }
  const ecdsaKey = PrivateKey.fromString(ecdsaKeyHex);

  // Create the token
  const transaction = await new TokenCreateTransaction()
    .setTokenName(params.tokenName)
    .setTokenSymbol(params.tokenSymbol)
    .setDecimals(params.decimals)
    .setInitialSupply(params.initialSupply)
    .setTreasuryAccountId(treasuryAccountId)
    .setSupplyKey(ecdsaKey)   // <-- use ECDSA key so contract can manage supply
    .setAdminKey(ecdsaKey)    // <-- optional: allows updating token info
    .setMaxTransactionFee(new Hbar(10))
    .freezeWith(client);

  // Sign with operator key
  const signedTx = await transaction.sign(operatorKey);

  // Execute the transaction
  const txResponse = await signedTx.execute(client);

  // Get token ID
  const receipt = await txResponse.getReceipt(client);
  if (!receipt.tokenId) {
    throw new Error("Failed to create token: tokenId is null");
  }

  return receipt.tokenId.toString();
}
