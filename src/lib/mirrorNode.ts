// src/lib/mirrorNode.ts
const MIRROR_NODE_BASE = "https://testnet.mirrornode.hedera.com/api/v1";

/**
 * Fetch general token info (totalSupply, decimals, name, symbol)
 */
export const getTokenInfo = async (tokenId: string) => {
  console.log(`🟢 Fetching token info from Mirror Node for ${tokenId}...`);
  try {
    const resp = await fetch(`${MIRROR_NODE_BASE}/tokens/${tokenId}`);
    if (!resp.ok) throw new Error(`Mirror Node returned ${resp.status}`);

    const data = await resp.json();
    const tokenInfo = {
      totalSupply: Number(data?.total_supply ?? 0),
      decimals: Number(data?.decimals ?? 0),
      name: data?.name ?? "Unknown",
      symbol: data?.symbol ?? "N/A",
    };

    console.log(`ℹ️ Mirror Node token info for ${tokenId}:`, tokenInfo);
    return tokenInfo;
  } catch (err) {
    console.error(`❌ Failed to fetch token info for ${tokenId}:`, err);
    return null;
  }
};

/**
 * Fetch token balance for a specific account
 */
export const getAccountTokenBalance = async (tokenId: string, accountId: string) => {
  console.log(`🟢 Fetching token balance from Mirror Node for ${tokenId}/${accountId}...`);
  try {
    const resp = await fetch(`${MIRROR_NODE_BASE}/accounts/${accountId}`);
    if (!resp.ok) throw new Error(`Mirror Node returned ${resp.status}`);

    const data = await resp.json();

    // The correct structure (as per Mirror Node API spec)
    const tokenData = data?.balance?.tokens?.find((t: any) => t.token_id === tokenId);

    console.log(`ℹ️ Mirror Node token balance for ${tokenId}/${accountId}:`, tokenData);
    return tokenData ? Number(tokenData.balance) : 0;
  } catch (err) {
    console.error(`❌ Failed to fetch token balance for ${tokenId}/${accountId}:`, err);
    return 0;
  }
};
