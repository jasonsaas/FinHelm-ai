# FinHelm AI - Quick Deploy to Netlify

## Prerequisites
- Node.js installed
- Git repository: https://github.com/jasonsaas/FinHelm-ai

## Quick Deploy Steps

### 1. Install Dependencies
```bash
npm install intuit-oauth
```

### 2. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 3. Login to Netlify
```bash
netlify login
```

### 4. Initialize Netlify Site
```bash
netlify init
```
- Choose: **Create & configure a new site**
- Team: Select your team
- Site name: **finhelm-ai** (or your preferred name)

### 5. Set Environment Variables
```bash
netlify env:set QUICKBOOKS_CLIENT_ID ABkjrJ2NnwrJFCMsdRFPOreagINh2DQIQdQvlWBaXgUdgNqxGw
netlify env:set QUICKBOOKS_CLIENT_SECRET gESvrhXBffOlVy2nT5FwIBWP5CjLs5APdNms1Njg
netlify env:set QUICKBOOKS_ENVIRONMENT sandbox
```

### 6. Deploy to Production
```bash
netlify deploy --prod
```

### 7. Update QuickBooks App Settings
1. Go to: https://app.developer.intuit.com
2. Select your app
3. Go to "Keys & OAuth"
4. Update Redirect URI to: `https://[your-site-name].netlify.app/quickstart/oauth.html`
   - Example: `https://finhelm-ai.netlify.app/quickstart/oauth.html`

### 8. Test the Integration
1. Visit: `https://[your-site-name].netlify.app`
2. Click "Connect QuickBooks"
3. Authorize the connection
4. View your QuickBooks data on the dashboard

## Local Development

### Run locally with Netlify Dev:
```bash
netlify dev
```
- Opens at: http://localhost:8888
- Functions run at: http://localhost:8888/.netlify/functions/

### Test with simple HTTP server:
```bash
node test-local.js
```
- Opens at: http://localhost:3000

## File Structure
```
finhelm-ai/
├── quickstart/           # Static HTML files
│   ├── index.html       # Landing page with OAuth button
│   ├── oauth.html       # OAuth callback handler
│   └── dashboard.html   # Data display dashboard
├── netlify/
│   └── functions/       # Serverless functions
│       ├── get-auth-url.js      # Generate OAuth URL
│       ├── exchange-token.js    # Exchange code for tokens
│       ├── get-company-info.js  # Fetch company data
│       └── get-accounts.js      # Fetch account balances
├── netlify.toml         # Netlify configuration
├── package.json         # Dependencies
└── .env                # Environment variables (local only)
```

## Troubleshooting

### OAuth Error
- Verify redirect URI matches exactly in QuickBooks app settings
- Check environment variables are set correctly
- Ensure you're using sandbox credentials for sandbox environment

### Function Errors
- Check Netlify function logs: `netlify functions:log`
- Verify intuit-oauth package is installed
- Check API credentials are correct

### Connection Issues
- Clear browser localStorage
- Try incognito/private browsing mode
- Check browser console for errors

## Production Checklist
- [ ] Environment variables set in Netlify
- [ ] Redirect URI updated in QuickBooks app
- [ ] Site deployed successfully
- [ ] OAuth flow tested end-to-end
- [ ] Company data loads on dashboard
- [ ] Account balances display correctly

## Support
- QuickBooks API Docs: https://developer.intuit.com/app/developer/qbo/docs
- Netlify Docs: https://docs.netlify.com
- GitHub Issues: https://github.com/jasonsaas/FinHelm-ai/issues