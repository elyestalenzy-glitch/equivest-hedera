// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDC
 * @dev Simple ERC20 token for Hedera testnet MVP
 * Mints initial supply to deployer
 */
contract TestUSDC is ERC20, Ownable {
    constructor() ERC20("USDC Test", "USDC") {
        // Mint 1,000,000 USDC (18 decimals) to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * Optional: allow owner to mint more for testing
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
