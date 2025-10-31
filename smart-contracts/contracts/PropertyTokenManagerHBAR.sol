// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./hedera/HederaTokenService.sol";
import "./hedera/HederaResponseCodes.sol";
import "./hedera/IHederaTokenService.sol";


/**
 * @title PropertyTokenManagerHBAR
 * @notice Manages property token sales using HBAR as payment
 *         Handles token purchases, refunds, treasury withdrawals, and proceeds distribution
 */
contract PropertyTokenManagerHBAR is Ownable, HederaTokenService {

    struct TokenInfo {
        string tokenId;          // HTS token ID (like "0.0.x")
        uint256 totalSupply;     // Number of fractional tokens
        uint256 price;           // Price per token in tinybars (1 hbar = 10^8 tinybars)
        uint256 launchTime;      // Sale start time
        uint256 tokensSold;      // Number of tokens sold
        bool fullyFunded;        // True when all tokens sold
        bool settled;            // True if proceeds already withdrawn or distributed
    }

    // tokenId => TokenInfo
    mapping(string => TokenInfo) public tokens;

    // buyer => tokenId => amount
    mapping(address => mapping(string => uint256)) public buyerBalances;

    string[] public tokenList;

    // --- EVENTS ---
    event TokenRegistered(string tokenId, uint256 totalSupply, uint256 price, uint256 launchTime);
    event TokensPurchased(address indexed buyer, string tokenId, uint256 amount);
    event TokensRedeemed(address indexed buyer, string tokenId, uint256 amount, uint256 refundHBAR);
    event FullRefundExecuted(string tokenId);
    event ProceedsWithdrawn(address indexed to, uint256 amount);
    event PropertySettled(string tokenId);
    event ProceedsDistributed(string tokenId, uint256 totalAmount, uint256 holderCount);

    constructor() {}

    // --- ADMIN: Register new property token ---
    function registerToken(
        string memory tokenId,
        uint256 totalSupply,
        uint256 price,       // in tinybars
        uint256 launchTime
    ) external onlyOwner {
        require(bytes(tokens[tokenId].tokenId).length == 0, "Token already registered");

        tokens[tokenId] = TokenInfo({
            tokenId: tokenId,
            totalSupply: totalSupply,
            price: price,
            launchTime: launchTime,
            tokensSold: 0,
            fullyFunded: false,
            settled: false
        });

        tokenList.push(tokenId);
        emit TokenRegistered(tokenId, totalSupply, price, launchTime);
    }

    // --- USER: Buy tokens using HBAR ---
    function buyTokens(string memory tokenId, uint256 amount) external payable {
        TokenInfo storage info = tokens[tokenId];
        require(bytes(info.tokenId).length > 0, "Token not registered");
        require(block.timestamp >= info.launchTime, "Sale not started");
        require(block.timestamp <= info.launchTime + 60 days, "Sale period over");
        require(info.tokensSold + amount <= info.totalSupply, "Not enough tokens remaining");
        require(!info.settled, "Property already settled");

        uint256 totalCost = amount * info.price;
        require(msg.value == totalCost, "Incorrect HBAR sent");

        // Transfer MHT HTS token to buyer
        int response = HederaTokenService.transferToken(
            stringToAddress(info.tokenId), // treasury address for HTS token
            address(this),
            msg.sender,
            int64(int256(amount))
        );
        require(response == HederaResponseCodes.SUCCESS, "MHT transfer failed");

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

        // Refund HBAR
        payable(msg.sender).transfer(refund);

        // Optionally, take back MHT HTS tokens
        int response = HederaTokenService.transferToken(
            stringToAddress(info.tokenId),
            msg.sender,
            address(this),
            int64(int256(amount))
        );
        require(response == HederaResponseCodes.SUCCESS, "MHT reclaim failed");

        emit TokensRedeemed(msg.sender, tokenId, amount, refund);
    }

    // --- ADMIN: Refund all buyers if not funded ---
    function redeemFull(string memory tokenId, address[] calldata buyers) external onlyOwner {
        TokenInfo storage info = tokens[tokenId];
        require(block.timestamp > info.launchTime + 60 days, "Sale period not over");
        require(!info.fullyFunded, "Property fully funded");
        require(!info.settled, "Already settled");

        for (uint256 i = 0; i < buyers.length; i++) {
            address buyer = buyers[i];
            uint256 amount = buyerBalances[buyer][tokenId];
            if (amount > 0) {
                uint256 refund = amount * info.price;
                buyerBalances[buyer][tokenId] = 0;
                payable(buyer).transfer(refund);

                // Reclaim MHT
                int response = HederaTokenService.transferToken(
                    stringToAddress(info.tokenId),
                    buyer,
                    address(this),
                    int64(int256(amount))
                );
                require(response == HederaResponseCodes.SUCCESS, "MHT reclaim failed");
            }
        }

        info.settled = true;
        emit FullRefundExecuted(tokenId);
    }

    // --- ADMIN: Withdraw collected HBAR ---
    function withdrawProceeds(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient HBAR");

        to.transfer(amount);
        emit ProceedsWithdrawn(to, amount);
    }

    function withdrawAllProceeds(address payable to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No HBAR to withdraw");

        to.transfer(balance);
        emit ProceedsWithdrawn(to, balance);
    }

    // --- ADMIN: Distribute sale proceeds to token holders ---
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
        require(address(this).balance >= totalSaleProceeds, "Insufficient HBAR");

        uint256 totalSupply = info.totalSupply;
        for (uint256 i = 0; i < holders.length; i++) {
            uint256 share = (totalSaleProceeds * holdings[i]) / totalSupply;
            if (share > 0) {
                payable(holders[i]).transfer(share);
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

    function getContractHBARBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Helper: convert string tokenId to address (Hedera precompile expects address)
    function stringToAddress(string memory tokenId) internal pure returns (address) {
        return address(uint160(uint256(keccak256(bytes(tokenId)))));
    }
}
