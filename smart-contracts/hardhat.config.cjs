require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

const { PRIVATE_KEY, HEDERA_RPC_URL } = process.env;

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "hederaTestnet",
  networks: {
    hederaTestnet: {
      url: HEDERA_RPC_URL,
      chainId: 296,
      accounts: [PRIVATE_KEY.trim()] // 32-byte hex string, no 0x prefix
    }
  }
};
