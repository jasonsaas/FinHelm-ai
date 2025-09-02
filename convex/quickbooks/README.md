# QuickBooks OAuth 2.0 Integration for Convex

Complete QuickBooks OAuth 2.0 implementation with PKCE, token management, and API client for Convex backend.

## Features

✅ **OAuth 2.0 with PKCE** - Secure authorization flow with Proof Key for Code Exchange  
✅ **Automatic Token Refresh** - Tokens refresh automatically before expiry  
✅ **AES-256 Encryption** - Secure token storage with military-grade encryption  
✅ **Rate Limiting** - Built-in rate limiting (500 req/min, 10k req/day)  
✅ **Error Handling** - Comprehensive error handling with retry logic  
✅ **TypeScript Support** - Full TypeScript types and interfaces  

## Setup

### 1. Install Dependencies

The `intuit-oauth` package is already included in your package.json.

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# QuickBooks OAuth Configuration
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox # or "production"

# Token Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
QUICKBOOKS_TOKEN_ENCRYPTION_KEY=your_64_character_hex_key_here
```

### 3. Set Up Convex Environment Variables

```bash
npx convex env set QUICKBOOKS_CLIENT_ID your_client_id_here
npx convex env set QUICKBOOKS_CLIENT_SECRET your_client_secret_here
npx convex env set QUICKBOOKS_REDIRECT_URI http://localhost:3000/api/quickbooks/callback
npx convex env set QUICKBOOKS_ENVIRONMENT sandbox
npx convex env set QUICKBOOKS_TOKEN_ENCRYPTION_KEY your_64_character_hex_key_here
```

### 4. Generate Encryption Key

```javascript
// Run this to generate a secure encryption key
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

## Usage

### 1. Generate Authorization URL

```typescript
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

const generateAuthUrl = useMutation(api.quickbooks.auth.generateAuthUrl);

// In your component
const handleConnect = async () => {
  const { authUrl, state } = await generateAuthUrl({
    companyId: companyId,
    scopes: ["com.intuit.quickbooks.accounting"]
  });
  
  // Save state in session storage
  sessionStorage.setItem('qb_oauth_state', state);
  
  // Redirect user to QuickBooks
  window.location.href = authUrl;
};
```

### 2. Handle OAuth Callback

```typescript
// In your callback handler (e.g., /api/quickbooks/callback)
import { api } from "@/convex/_generated/api";

const exchangeCode = useMutation(api.quickbooks.auth.exchangeCodeForToken);

const handleCallback = async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  
  // Verify state matches
  const savedState = sessionStorage.getItem('qb_oauth_state');
  if (state !== savedState) {
    throw new Error('Invalid state - possible CSRF attack');
  }
  
  // Exchange code for tokens
  const result = await exchangeCode({
    companyId: companyId,
    code: code!,
    state: state!,
    realmId: realmId!
  });
  
  // Schedule automatic token refresh
  await scheduleTokenRefresh({ companyId });
  
  return result;
};
```

### 3. Sync QuickBooks Data

```typescript
import { api } from "@/convex/_generated/api";

// Sync invoices
const syncInvoices = useMutation(api.quickbooks.api.syncInvoices);
await syncInvoices({
  companyId: companyId,
  startDate: "2024-01-01",
  endDate: "2024-12-31"
});

// Sync bills
const syncBills = useMutation(api.quickbooks.api.syncBills);
await syncBills({
  companyId: companyId,
  startDate: "2024-01-01",
  endDate: "2024-12-31"
});

// Sync chart of accounts
const syncAccounts = useMutation(api.quickbooks.api.syncAccounts);
await syncAccounts({ companyId: companyId });
```

### 4. Check Token Status

```typescript
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

const tokenStatus = useQuery(api.quickbooks.tokenManager.getTokenStatus, {
  companyId: companyId
});

if (tokenStatus?.needsRefreshSoon) {
  // Token will expire soon, refresh will happen automatically
}
```

### 5. Disconnect QuickBooks

```typescript
const revokeTokens = useMutation(api.quickbooks.auth.revokeTokens);

const handleDisconnect = async () => {
  await revokeTokens({ companyId: companyId });
};
```

## API Methods

### Authentication (`auth.ts`)

- `generateAuthUrl` - Generate OAuth authorization URL with PKCE
- `exchangeCodeForToken` - Exchange authorization code for tokens
- `refreshAccessToken` - Refresh expired access token
- `revokeTokens` - Revoke tokens and disconnect
- `checkTokenValidity` - Check if tokens are valid

### Token Management (`tokenManager.ts`)

- `storeTokens` - Store encrypted tokens
- `getTokens` - Retrieve and decrypt tokens
- `autoRefreshToken` - Automatically refresh tokens
- `scheduleTokenRefresh` - Schedule token refresh
- `clearTokens` - Clear stored tokens
- `getTokenStatus` - Get token status without decrypting
- `ensureValidToken` - Ensure token is valid before API calls

### API Client (`api.ts`)

- `syncInvoices` - Fetch and sync invoices
- `syncBills` - Fetch and sync bills
- `syncAccounts` - Fetch and sync chart of accounts
- `QuickBooksClient` - Main API client class with:
  - `getInvoices()` - Fetch invoices with filtering
  - `getBills()` - Fetch bills with filtering
  - `getAccounts()` - Fetch accounts with filtering
  - `getById()` - Get entity by ID
  - `create()` - Create new entity
  - `update()` - Update existing entity
  - `delete()` - Delete entity

## Rate Limiting

The API client includes built-in rate limiting:

- **Per Minute**: 500 requests
- **Per Day**: 10,000 requests
- **Auto Retry**: Automatic retry with exponential backoff
- **429 Handling**: Respects Retry-After headers

## Security

- **PKCE**: OAuth 2.0 with Proof Key for Code Exchange
- **AES-256-GCM**: Military-grade encryption for token storage
- **CSRF Protection**: State parameter validation
- **Token Rotation**: Automatic refresh token rotation
- **Secure Storage**: Encrypted tokens in Convex database

## Error Handling

All errors are wrapped in `QuickBooksAuthError` with:

- Error message
- Error code
- Additional details

```typescript
try {
  await syncInvoices({ companyId });
} catch (error) {
  if (error instanceof QuickBooksAuthError) {
    console.error(`QuickBooks Error: ${error.message} (${error.code})`);
    console.error('Details:', error.details);
  }
}
```

## Testing

### Sandbox Environment

1. Create a QuickBooks Developer account
2. Create a sandbox company
3. Set `QUICKBOOKS_ENVIRONMENT=sandbox`
4. Use sandbox credentials

### Production Environment

1. Get production app credentials
2. Set `QUICKBOOKS_ENVIRONMENT=production`
3. Complete app verification process
4. Use production credentials

## Troubleshooting

### Token Expired

Tokens automatically refresh, but if refresh token expires:

```typescript
// Check token status
const status = await getTokenStatus({ companyId });
if (!status.refreshTokenValid) {
  // Need to reauthorize
  const { authUrl } = await generateAuthUrl({ companyId });
  // Redirect user to authUrl
}
```

### Rate Limit Exceeded

The client automatically handles rate limits, but you can configure:

```typescript
const client = new QuickBooksClient(
  companyId,
  accessToken,
  realmId,
  "sandbox",
  {
    maxRequestsPerMinute: 300, // Lower limit
    retryAfterRateLimit: true,
    maxRetries: 5
  }
);
```

### Missing Environment Variables

```typescript
import { validateEnvironment } from '@/convex/quickbooks';

const { isValid, missing } = validateEnvironment();
if (!isValid) {
  console.error('Missing environment variables:', missing);
}
```

## Support

For QuickBooks API documentation: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account

For Convex documentation: https://docs.convex.dev/