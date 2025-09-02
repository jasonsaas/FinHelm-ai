# QuickBooks OAuth 2.0 Configuration Complete ✅

## Your Credentials Are Now Active!

Successfully configured QuickBooks OAuth 2.0 with your real sandbox credentials.

## Current Configuration

```bash
QUICKBOOKS_CLIENT_ID=ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4
QUICKBOOKS_CLIENT_SECRET=HuIMdXCUBsX3d255iKhtT0LAzlNNttsuzWj3QO2r
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/callback
QUICKBOOKS_ENVIRONMENT=sandbox
```

## Generated OAuth URL

Your QuickBooks authorization URL is ready:

```
https://sandbox-quickbooks.api.intuit.com/oauth2/v1/authorize?client_id=ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4&scope=com.intuit.quickbooks.accounting+com.intuit.quickbooks.payment+openid+profile+email&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&response_type=code&state=Ef444zygsOz2vzbBYjpzn_ESSd5S_FM0JH_R9SbEcl8&code_challenge=z3hBAmGiEfR2-GaX4KwAnjOMt1iv8MkbrDbbwh-Q6Ck&code_challenge_method=S256
```

## Testing Your Implementation

### 1. Start Local Server
Make sure you have a server running on `http://localhost:3000` to handle the callback.

### 2. Authorize with QuickBooks
1. Open the generated OAuth URL in your browser
2. Log in with your QuickBooks sandbox credentials
3. Select a sandbox company
4. Authorize the connection
5. You'll be redirected to `http://localhost:3000/callback` with the authorization code

### 3. Exchange Code for Tokens
After receiving the callback, use this function to exchange the code:

```typescript
import { api } from "@/convex/_generated/api";

// In your callback handler
const result = await exchangeCodeForToken({
  companyId: "your_company_id",
  code: "received_auth_code",
  state: "Ef444zygsOz2vzbBYjpzn_ESSd5S_FM0JH_R9SbEcl8",
  realmId: "received_realm_id"
});
```

### 4. Available API Functions
Once authorized, you can use:

- `quickbooks/api:syncInvoices` - Fetch and sync invoices
- `quickbooks/api:syncBills` - Fetch and sync bills
- `quickbooks/api:syncAccounts` - Fetch and sync chart of accounts
- `quickbooks/auth:refreshAccessToken` - Refresh expired tokens
- `quickbooks/tokenManager:getTokenStatus` - Check token status

## Important Notes

- **State Parameter**: `Ef444zygsOz2vzbBYjpzn_ESSd5S_FM0JH_R9SbEcl8` - Save this for CSRF validation
- **Redirect URI**: Must match exactly: `http://localhost:3000/callback`
- **Environment**: Currently set to `sandbox` for testing
- **Token Expiry**: Access tokens expire in 1 hour, refresh tokens in 100 days
- **Auto-Refresh**: Tokens will automatically refresh before expiry

## Next Steps

1. **Create Callback Handler**: Implement `/callback` route in your frontend
2. **Test Authorization**: Click the OAuth URL and authorize a sandbox company
3. **Sync Data**: Use the API functions to pull QuickBooks data
4. **Monitor Tokens**: Check token status regularly

## Troubleshooting

If you encounter issues:

1. **Redirect URI Mismatch**: Ensure your app settings in QuickBooks match exactly
2. **Invalid Client**: Check credentials are correct in QuickBooks developer dashboard
3. **Token Expired**: Use `refreshAccessToken` or re-authorize
4. **Rate Limits**: Built-in rate limiting handles 500 req/min

## Security Reminder

- Never expose your `CLIENT_SECRET` in frontend code
- Always validate the `state` parameter to prevent CSRF attacks
- Store tokens securely (already encrypted in Convex)

---
**Your QuickBooks integration is ready to use!** 🎉