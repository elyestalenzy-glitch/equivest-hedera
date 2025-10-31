// backend/services/tokenCreateService.ts
import { Client, TokenCreateTransaction, PrivateKey, Hbar, TokenId, TokenAssociateTransaction } from "@hashgraph/sdk";

export interface TokenCreateParams {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  initialSupply: number;
  erc20ContractAddress: string; // the HBAR-based ERC20 contract that will manage this token
}

/**
 * Creates a new HTS token on Hedera Testnet and associates it with the ERC20/HBAR contract
 */
export async function createToken(
  client: Client,
  params: TokenCreateParams
): Promise<string> {
  const operatorKeyHex = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorKeyHex) {
    throw new Error("Operator key missing in .env");
  }

  const operatorKey = PrivateKey.fromString(operatorKeyHex);
  const treasuryAccountId = client.operatorAccountId;
  if (!treasuryAccountId) {
    throw new Error("Client operatorAccountId not set");
  }

  // 1️⃣ Create the token with the ERC20 contract as treasury
  const transaction = await new TokenCreateTransaction()
    .setTokenName(params.tokenName)
    .setTokenSymbol(params.tokenSymbol)
    .setDecimals(params.decimals)
    .setInitialSupply(params.initialSupply)
    .setTreasuryAccountId(params.erc20ContractAddress) // Set ERC20/HBAR contract as treasury
    .setMaxTransactionFee(new Hbar(10))
    .freezeWith(client);

  // Sign with operator key
  const signedTx = await transaction.sign(operatorKey);

  // Execute
  const txResponse = await signedTx.execute(client);

  // Get token ID
  const receipt = await txResponse.getReceipt(client);
  if (!receipt.tokenId) {
    throw new Error("Failed to create token: tokenId is null");
  }
  const tokenId = receipt.tokenId.toString();
  console.log(`✅ Created HTS token ${tokenId} with contract as treasury`);

  // 2️⃣ Associate the ERC20 contract with this token (necessary for EVM precompile)
  const associateTx = await new TokenAssociateTransaction()
    .setAccountId(params.erc20ContractAddress)
    .setTokenIds([TokenId.fromString(tokenId)])
    .freezeWith(client)
    .sign(operatorKey);

  const associateResponse = await associateTx.execute(client);
  const associateReceipt = await associateResponse.getReceipt(client);
  if (associateReceipt.status.toString() !== "SUCCESS") {
    throw new Error(`Failed to associate token ${tokenId} to contract`);
  }

  console.log(`✅ Associated HTS token ${tokenId} with ERC20/HBAR contract`);

  return tokenId;
}
