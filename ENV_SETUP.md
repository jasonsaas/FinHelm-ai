# Environment Configuration Guide

## Quick Start

1. **Run the setup wizard** (recommended for first-time setup):
   ```bash
   npm install
   npm run setup
   ```

2. **Or copy the example file** and edit manually:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Validate your configuration**:
   ```bash
   npm run env:validate
   ```

## Environment Files

- `.env.local` - Your actual configuration (git-ignored)
- `.env.example` - Template with placeholders (safe to commit)
- `frontend/.env.local` - Frontend-specific config (auto-generated)

## Required Services

### 1. Convex Database
- Run `npx convex dev` to create a deployment
- Copy the deployment name and URL

### 2. QuickBooks Integration
1. Go to [developer.intuit.com](https://developer.intuit.com)
2. Create a new app for QuickBooks Online
3. Get OAuth 2.0 credentials:
   - Client ID
   - Client Secret
   - Set redirect URI: `http://localhost:3000/api/quickbooks/callback`
4. Use sandbox environment for development

### 3. Clerk Authentication
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application
3. Get your API keys:
   - Publishable Key
   - Secret Key

## Optional Services

### AI Services
- **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic**: Get API key from [console.anthropic.com](https://console.anthropic.com)

### Monitoring (Sentry)
- Create account at [sentry.io](https://sentry.io)
- Get DSN from project settings

### Email (Resend)
- Get API key from [resend.com](https://resend.com)

### Workflow Automation (n8n)
- Set up n8n instance
- Create webhook and get URL

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Interactive setup wizard |
| `npm run env:validate` | Validate environment configuration |
| `npx tsx scripts/setup-wizard.ts` | Run setup wizard directly |
| `npx tsx scripts/validate-env.ts` | Run validation directly |

## Configuration Module

Use the type-safe configuration in your code:

```typescript
// Root configuration
import { getConfig } from './lib/config';

const config = getConfig();
console.log(config.quickbooks.clientId);

// Frontend configuration
import { getFrontendConfig } from './frontend/lib/config';

const frontendConfig = getFrontendConfig();
console.log(frontendConfig.clerk.publishableKey);
```

## Environment-Specific Settings

### Development
```
NODE_ENV=development
QUICKBOOKS_ENVIRONMENT=sandbox
```

### Production
```
NODE_ENV=production
QUICKBOOKS_ENVIRONMENT=production
```

## Security Notes

- **Never commit** `.env.local` files
- **Keep secrets secure** - use environment variables in production
- **Generate strong tokens**: `openssl rand -hex 32`
- **Rotate keys regularly** in production

## Troubleshooting

### Missing Environment Variables
Run `npm run env:validate` to see which variables are missing.

### Invalid Configuration Format
Check that URLs include protocol (https://) and API keys match expected format.

### Connection Issues
The validation script tests connectivity to services. Yellow warnings indicate optional services.

### QuickBooks Sandbox
- Use sandbox environment for development
- Test company data is available in sandbox
- Switch to production only when ready to go live

## Support

For issues with:
- **Convex**: Check [docs.convex.dev](https://docs.convex.dev)
- **QuickBooks**: See [developer.intuit.com/docs](https://developer.intuit.com/app/developer/qbo/docs/get-started)
- **Clerk**: Visit [clerk.com/docs](https://clerk.com/docs)
- **Project Setup**: Check this guide or file an issue