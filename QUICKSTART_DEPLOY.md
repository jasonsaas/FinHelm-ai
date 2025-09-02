# 🚀 FinHelm.ai QuickBooks Integration - Quick Deploy Guide

## ✅ Your Files Are Ready!

All necessary files have been created and are ready for deployment:
- ✅ Static HTML pages in `quickstart/` folder
- ✅ Serverless functions in `netlify/functions/` folder
- ✅ Configuration files (`netlify.toml`, `.env`)

## 📦 Option 1: Deploy via Netlify Web Interface (RECOMMENDED)

### Step 1: Go to Netlify
1. Open: https://app.netlify.com
2. Log in with your account (jason@brisbaneandassociates.com)

### Step 2: Create New Site
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Select repository: **jasonsaas/FinHelm-ai**
4. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: `echo "No build needed"`
   - **Publish directory**: `quickstart`
   - **Functions directory**: `netlify/functions`

### Step 3: Add Environment Variables
Before deploying, click **"Show advanced"** and add:
```
QUICKBOOKS_CLIENT_ID = ABkjrJ2NnwrJFCMsdRFPOreagINh2DQIQdQvlWBaXgUdgNqxGw
QUICKBOOKS_CLIENT_SECRET = gESvrhXBffOlVy2nT5FwIBWP5CjLs5APdNms1Njg
QUICKBOOKS_ENVIRONMENT = sandbox
```

### Step 4: Deploy
Click **"Deploy site"**

## 📦 Option 2: Manual Drag & Drop Deploy

### Step 1: Prepare Files
The files are already prepared in your project.

### Step 2: Deploy via Netlify Drop
1. Open: https://app.netlify.com/drop
2. Drag the entire `quickstart` folder to the browser
3. Wait for upload to complete

### Step 3: Configure Functions (IMPORTANT)
1. Go to **Site settings** → **Functions**
2. Click **"Configure"**
3. Set Functions directory to: `netlify/functions`
4. Deploy the functions by pushing to GitHub

### Step 4: Add Environment Variables
1. Go to **Site settings** → **Environment variables**
2. Add each variable:
   - `QUICKBOOKS_CLIENT_ID`: ABkjrJ2NnwrJFCMsdRFPOreagINh2DQIQdQvlWBaXgUdgNqxGw
   - `QUICKBOOKS_CLIENT_SECRET`: gESvrhXBffOlVy2nT5FwIBWP5CjLs5APdNms1Njg
   - `QUICKBOOKS_ENVIRONMENT`: sandbox

## 🔗 Option 3: Deploy via GitHub (Continuous Deployment)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add QuickBooks integration MVP"
git push origin feature/erpinsightai-initial-architecture
```

### Step 2: Connect GitHub to Netlify
1. Go to: https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub**
4. Select: **jasonsaas/FinHelm-ai**
5. Deploy from branch: **feature/erpinsightai-initial-architecture**

## 🔧 After Deployment: Update QuickBooks App

### CRITICAL: Update Redirect URI
1. Go to: https://app.developer.intuit.com
2. Select your app: **"FinHelm AI"**
3. Go to **"Keys & OAuth"** (left sidebar)
4. Update **Redirect URIs** to:
   ```
   https://[your-netlify-site-name].netlify.app/quickstart/oauth.html
   ```
   Example: `https://finhelm-ai.netlify.app/quickstart/oauth.html`
5. Click **Save**

## 🧪 Test Your Integration

1. Visit your deployed site: `https://[your-site-name].netlify.app`
2. Click **"Connect QuickBooks"**
3. Log in with QuickBooks sandbox credentials
4. Authorize the connection
5. View your live QuickBooks data on the dashboard!

## 🆘 Troubleshooting

### If OAuth fails:
- Verify redirect URI matches EXACTLY in QuickBooks app
- Check environment variables are set in Netlify
- Use browser developer console to check for errors

### If functions don't work:
- Ensure `netlify/functions` directory is configured
- Check function logs in Netlify dashboard
- Verify `intuit-oauth` package is installed

### Test Locally First:
```bash
# Install dependencies
npm install intuit-oauth

# Test with Netlify Dev (if CLI works)
netlify dev

# Or use simple test server
node test-local.js
```

## 📱 Quick Links

- **Your GitHub Repo**: https://github.com/jasonsaas/FinHelm-ai
- **Netlify Dashboard**: https://app.netlify.com/teams/jasonsaas/sites
- **QuickBooks App**: https://app.developer.intuit.com
- **Convex Backend**: https://ardent-dog-632.convex.cloud

## ✨ What You've Built

- ✅ OAuth 2.0 authentication with QuickBooks
- ✅ Serverless functions for secure token exchange
- ✅ Live company data display
- ✅ Account balances dashboard
- ✅ Auto-refresh every 30 seconds
- ✅ Responsive design with Tailwind CSS
- ✅ No build process - pure HTML/JS
- ✅ Production-ready error handling

## 🎉 Success Metrics

Your MVP is complete when:
1. ✅ Site deploys successfully to Netlify
2. ✅ OAuth flow completes without errors
3. ✅ Company name displays on dashboard
4. ✅ At least one account balance shows
5. ✅ Data refreshes automatically

---

**Need Help?** Check the browser console for detailed error messages or review the `DEPLOY.md` file for additional instructions.