#!/bin/bash

# Generate a random encryption key
ENCRYPTION_KEY=$(node -e "const a=new Uint8Array(32);crypto.getRandomValues(a);console.log(Array.from(a,b=>b.toString(16).padStart(2,'0')).join(''))")

echo "Setting QuickBooks environment variables for Convex..."

# Set test/development values
npx convex env set QUICKBOOKS_CLIENT_ID "test_client_id_placeholder"
npx convex env set QUICKBOOKS_CLIENT_SECRET "test_client_secret_placeholder"
npx convex env set QUICKBOOKS_REDIRECT_URI "http://localhost:3000/api/quickbooks/callback"
npx convex env set QUICKBOOKS_ENVIRONMENT "sandbox"
npx convex env set QUICKBOOKS_TOKEN_ENCRYPTION_KEY "$ENCRYPTION_KEY"

echo "Environment variables set. Encryption key generated: $ENCRYPTION_KEY"
echo ""
echo "To use real QuickBooks integration:"
echo "1. Create a QuickBooks app at https://developer.intuit.com"
echo "2. Replace the placeholder values with your actual credentials"
echo "3. Run: npx convex env set QUICKBOOKS_CLIENT_ID your_actual_client_id"
echo "4. Run: npx convex env set QUICKBOOKS_CLIENT_SECRET your_actual_secret"
