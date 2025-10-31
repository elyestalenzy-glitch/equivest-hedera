# NOTE: Replace http://localhost:5000 with your actual backend URL if different.
# Ensure you are running your backend server (e.g., node backend/index.js) before executing this.

# --- USER INPUT REQUIRED ---
# 1. Get the NEW EVM ADDRESS of the recently redeployed MeridianERC20 contract.
# 2. Update the "tokenId" below with that new 0x... address.
NEW_MERIDIAN_EVM_ADDRESS="0x5f0bd4c091d2572646A265f1E0Ea4C8B85A79fA3" # <<< UPDATED WITH YOUR NEW ADDRESS!


echo "Attempting to register token $NEW_MERIDIAN_EVM_ADDRESS at $CURRENT_TIMESTAMP..."

curl -X POST http://localhost:5000/tokens/register \
-H "Content-Type: application/json" \
-d '{
    "tokenId": "'"$NEW_MERIDIAN_EVM_ADDRESS"'", 
    "propertyId": "test-property-003",
    "totalSupply": 250000, 
    "price": 10000000, 
}'
