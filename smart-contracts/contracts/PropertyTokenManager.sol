// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PropertyTokenManager
 * @notice Manages property-based token offerings, investor purchases, refunds, 
 * treasury withdrawals, and revenue distribution upon property sale.
 * Sale period checks have been removed to simplify testing.
 */
contract PropertyTokenManager is Ownable {
    struct TokenInfo {
        string tokenId;             // HTS token ID (like "0.0.x")
        uint256 totalSupply;        // Number of fractional tokens
        uint256 price;              // Price per token in USDC (6 decimals)
        // launchTime removed
        uint256 tokensSold;         // Number of tokens sold
        bool fullyFunded;           // True when all tokens sold
        bool settled;               // True if proceeds already withdrawn or distributed
    }

    IERC20 public usdcToken;

    // tokenId => TokenInfo
    mapping(string => TokenInfo) public tokens;

    // buyer => tokenId => amount
    mapping(address => mapping(string => uint256)) public buyerBalances;

    string[] public tokenList;

    // --- EVENTS ---
    // launchTime removed from event signature
    event TokenRegistered(string tokenId, uint256 totalSupply, uint256 price); 
    event TokensPurchased(address indexed buyer, string tokenId, uint256 amount);
    event TokensRedeemed(address indexed buyer, string tokenId, uint256 amount, uint256 refund);
    event FullRefundExecuted(string tokenId);
    event ProceedsWithdrawn(address indexed to, uint256 amount);
    event PropertySettled(string tokenId);
    event ProceedsDistributed(string tokenId, uint256 totalAmount, uint256 holderCount);

    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
    }

    // --- ADMIN: Register new property token ---
    function registerToken(
        string memory tokenId,
        uint256 totalSupply,
        uint256 price
        // launchTime removed
    ) external onlyOwner {
        require(bytes(tokens[tokenId].tokenId).length == 0, "Token already registered");

        tokens[tokenId] = TokenInfo({
            tokenId: tokenId,
            totalSupply: totalSupply,
            price: price,
            // launchTime: launchTime, // Removed
            tokensSold: 0,
            fullyFunded: false,
            settled: false
        });

        tokenList.push(tokenId);
        // launchTime removed from event argument
        emit TokenRegistered(tokenId, totalSupply, price); 
    }

    // --- USER: Buy tokens in USDC ---
    function buyTokens(string memory tokenId, uint256 amount) external {
        TokenInfo storage info = tokens[tokenId];
        require(bytes(info.tokenId).length > 0, "Token not registered");
        
        // Removed: require(block.timestamp >= info.launchTime, "Sale not started");
        // Removed: require(block.timestamp <= info.launchTime + 60 days, "Sale period over");
        
        require(info.tokensSold + amount <= info.totalSupply, "Not enough tokens remaining");
        require(!info.settled, "Property already settled");

        uint256 totalCost = amount * info.price;
        require(usdcToken.transferFrom(msg.sender, address(this), totalCost), "USDC transfer failed");

        info.tokensSold += amount;
        buyerBalances[msg.sender][tokenId] += amount;

        if (info.tokensSold == info.totalSupply) {
            info.fullyFunded = true;
        }

        emit TokensPurchased(msg.sender, tokenId, amount);
    }

    // --- USER: Partial refund before sale settlement ---
    function redeemPartial(string memory tokenId, uint256 amount) external {
        require(buyerBalances[msg.sender][tokenId] >= amount, "Not enough tokens to redeem");
        TokenInfo storage info = tokens[tokenId];
        require(!info.settled, "Property already settled");

        uint256 refund = (amount * info.price * 95) / 100; // 95% refund
        buyerBalances[msg.sender][tokenId] -= amount;
        info.tokensSold -= amount;
        info.fullyFunded = false;

        require(usdcToken.transfer(msg.sender, refund), "USDC transfer failed");
        emit TokensRedeemed(msg.sender, tokenId, amount, refund);
    }

    // --- ADMIN: Refund all buyers if not funded ---
    function redeemFull(string memory tokenId, address[] calldata buyers) external onlyOwner {
        TokenInfo storage info = tokens[tokenId];
        // Removed: require(block.timestamp > info.launchTime + 60 days, "Sale period not over");
        
        require(!info.fullyFunded, "Property fully funded");
        require(!info.settled, "Already settled");

        for (uint256 i = 0; i < buyers.length; i++) {
            address buyer = buyers[i];
            uint256 amount = buyerBalances[buyer][tokenId];
            if (amount > 0) {
                uint256 refund = amount * info.price;
                buyerBalances[buyer][tokenId] = 0;
                require(usdcToken.transfer(buyer, refund), "USDC transfer failed");
            }
        }

        info.settled = true;
        emit FullRefundExecuted(tokenId);
    }

    // --- ADMIN: Withdraw proceeds manually ---
    function withdrawProceeds(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient USDC");

        require(usdcToken.transfer(to, amount), "USDC transfer failed");
        emit ProceedsWithdrawn(to, amount);
    }

    // --- ADMIN: Withdraw all ---
    function withdrawAllProceeds(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");

        require(usdcToken.transfer(to, balance), "USDC transfer failed");
        emit ProceedsWithdrawn(to, balance);
    }

    // --- ADMIN: Distribute sale proceeds to holders ---
    /**
     * @notice Called when the real-world property is sold.
     * @param tokenId The token representing the property.
     * @param holders The list of addresses owning the tokens (fetched via mirror node).
     * @param holdings The number of tokens held by each address (same order as `holders`).
     * @param totalSaleProceeds Total amount of USDC to be distributed.
     */
    function distributeSaleProceeds(
        string memory tokenId,
        address[] calldata holders,
        uint256[] calldata holdings,
        uint256 totalSaleProceeds
    ) external onlyOwner {
        TokenInfo storage info = tokens[tokenId];
        require(!info.settled, "Already settled");
        require(holders.length == holdings.length, "Array length mismatch");
        require(totalSaleProceeds > 0, "No proceeds");
        require(usdcToken.balanceOf(address(this)) >= totalSaleProceeds, "Insufficient USDC in contract");

        uint256 totalSupply = info.totalSupply;
        for (uint256 i = 0; i < holders.length; i++) {
            uint256 share = (totalSaleProceeds * holdings[i]) / totalSupply;
            if (share > 0) {
                require(usdcToken.transfer(holders[i], share), "USDC payout failed");
            }
        }

        info.settled = true;
        emit ProceedsDistributed(tokenId, totalSaleProceeds, holders.length);
        emit PropertySettled(tokenId);
    }

    // --- VIEWS ---
    function getAllTokens() external view returns (string[] memory) {
        return tokenList;
    }

    function getBuyerBalance(address buyer, string memory tokenId) external view returns (uint256) {
        return buyerBalances[buyer][tokenId];
    }

    function getContractUSDCBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
}
