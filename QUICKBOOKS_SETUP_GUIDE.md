# QuickBooks Integration Setup Guide

## 🎯 Overview
This guide will help you configure QuickBooks Online OAuth 2.0 integration for your FinHelm.ai application.

## 📋 Prerequisites
- QuickBooks Online account (free trial available)
- QuickBooks Developer account (free)

## 🔧 Step-by-Step Setup

### Step 1: Create QuickBooks Developer Account

1. **Visit QuickBooks Developer Portal:**
   - Go to: https://developer.intuit.com/
   - Click "Sign Up" and create a free account

2. **Create a New App:**
   - Log in to the developer portal
   - Click "Create App" or "New App"
   - Choose "QuickBooks Online" as the app type
   - Select "OAuth 2.0" as the authentication method

### Step 2: Configure Your App

1. **App Details:**
   - **App Name:** FinHelm.ai
   - **Description:** Financial AI Assistant with QuickBooks Integration
   - **App Type:** QuickBooks Online
   - **Environment:** Sandbox (for testing)

2. **OAuth 2.0 Settings:**
   - **Redirect URI:** `http://localhost:5173/auth/quickbooks/callback`
   - **Scope:** `com.intuit.quickbooks.accounting`
   - **Grant Type:** Authorization Code

3. **Save Your Credentials:**
   - **Client ID:** Copy this value
   - **Client Secret:** Copy this value
   - **Environment:** Sandbox

### Step 3: Update Your Application Configuration

1. **Create Environment File:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Update .env File:**
   ```env
   # QuickBooks Configuration
   QBO_CLIENT_ID=your_actual_client_id_here
   QBO_CLIENT_SECRET=your_actual_client_secret_here
   QBO_ENVIRONMENT=sandbox
   QBO_REDIRECT_URI=http://localhost:5173/auth/quickbooks/callback
   
   # Security
   SECRET_KEY=bhowWZzekC3d5Rw5oebir082YTxYwja2LZF_sCpdvuA
   
   # Other settings...
   ```

### Step 4: Test the Integration

1. **Start Your Servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python3 -m uvicorn main:app --reload --port 8000
   
   # Terminal 2 - Frontend
   cd finhelm-ai-navigator
   npm run dev
   ```

2. **Test OAuth Flow:**
   - Open: http://localhost:5173
   - Navigate to QuickBooks connection
   - Click "Connect to QuickBooks"
   - Complete the OAuth flow

### Step 5: Production Configuration

For production deployment:

1. **Update Redirect URI:**
   - Change to your production domain
   - Example: `https://yourdomain.com/auth/quickbooks/callback`

2. **Switch to Production Environment:**
   - In QuickBooks Developer Portal, switch to "Production"
   - Update `QBO_ENVIRONMENT=production` in your .env

3. **Update Vercel Environment Variables:**
   ```bash
   vercel env add QBO_CLIENT_ID production
   vercel env add QBO_CLIENT_SECRET production
   vercel env add QBO_REDIRECT_URI production
   ```

## 🔍 Available API Endpoints

### QuickBooks OAuth Endpoints:
- `GET /auth/quickbooks/oauth-url` - Get OAuth authorization URL
- `POST /auth/quickbooks/callback` - Handle OAuth callback
- `GET /auth/quickbooks/status` - Check connection status
- `DELETE /auth/quickbooks/disconnect` - Disconnect QuickBooks

### QuickBooks Data Endpoints:
- `GET /api/quickbooks/company` - Get company information
- `GET /api/quickbooks/accounts` - Get chart of accounts
- `GET /api/quickbooks/transactions` - Get transactions
- `POST /api/quickbooks/forecast` - Generate financial forecasts

## 🧪 Testing

### Test OAuth Flow:
```bash
# Get OAuth URL (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/auth/quickbooks/oauth-url

# Check connection status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/auth/quickbooks/status
```

### Test with Frontend:
1. Open http://localhost:5173
2. Navigate to QuickBooks section
3. Click "Connect to QuickBooks"
4. Complete the OAuth flow
5. Verify connection status

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Ensure redirect URI matches exactly in QuickBooks Developer Portal
   - Check for trailing slashes or protocol differences

2. **"Client ID not found"**
   - Verify Client ID is correct
   - Ensure you're using the right environment (sandbox vs production)

3. **"Scope not allowed"**
   - Verify scope is set to `com.intuit.quickbooks.accounting`
   - Check app permissions in QuickBooks Developer Portal

4. **"Token expired"**
   - Implement token refresh logic
   - Check token expiration times

### Debug Mode:
Enable debug logging by setting:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

## 📚 Additional Resources

- [QuickBooks Developer Documentation](https://developer.intuit.com/docs)
- [OAuth 2.0 Guide](https://developer.intuit.com/docs/00_quickbooks_online/2_build/10_authentication_and_authorization/10_oauth_2.0)
- [API Reference](https://developer.intuit.com/docs/api/accounting)

## ✅ Success Checklist

- [ ] QuickBooks Developer account created
- [ ] App configured with correct OAuth settings
- [ ] Environment variables updated
- [ ] OAuth flow tested successfully
- [ ] Company data accessible
- [ ] Production environment configured (if needed)

---

**Need Help?** Check the logs in your terminal or browser console for detailed error messages.



