#!/bin/bash

echo "🚀 FinHelm.ai Netlify Deployment Script"
echo "======================================="
echo ""

# Check if netlify-cli is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI is not installed. Installing..."
    npm install -g netlify-cli
fi

echo "✅ Netlify CLI is installed"
echo ""

# Create a netlify.toml if it doesn't exist
if [ ! -f netlify.toml ]; then
    echo "❌ netlify.toml not found. Please ensure it exists."
    exit 1
fi

echo "✅ netlify.toml found"
echo ""

# Check for required directories
if [ ! -d quickstart ]; then
    echo "❌ quickstart directory not found!"
    exit 1
fi

if [ ! -d netlify/functions ]; then
    echo "❌ netlify/functions directory not found!"
    exit 1
fi

echo "✅ All required directories found"
echo ""

# Create .netlify directory if it doesn't exist
mkdir -p .netlify

echo "📝 Creating site configuration..."
cat > .netlify/state.json << 'EOF'
{
  "siteId": "finhelm-ai-quickbooks"
}
EOF

echo ""
echo "🔧 Manual Deployment Instructions:"
echo "==================================="
echo ""
echo "Since the interactive CLI has issues, please follow these steps:"
echo ""
echo "1. Go to: https://app.netlify.com/teams/jasonsaas/sites"
echo ""
echo "2. Click 'Add new site' → 'Deploy manually'"
echo ""
echo "3. Drag and drop the 'quickstart' folder to upload"
echo ""
echo "4. Once deployed, go to Site Settings → Functions"
echo "   - Set Functions directory to: netlify/functions"
echo ""
echo "5. Go to Site Settings → Environment Variables and add:"
echo "   QUICKBOOKS_CLIENT_ID=ABkjrJ2NnwrJFCMsdRFPOreagINh2DQIQdQvlWBaXgUdgNqxGw"
echo "   QUICKBOOKS_CLIENT_SECRET=gESvrhXBffOlVy2nT5FwIBWP5CjLs5APdNms1Njg"
echo "   QUICKBOOKS_ENVIRONMENT=sandbox"
echo ""
echo "6. Update your QuickBooks app redirect URI to:"
echo "   https://[your-site-name].netlify.app/quickstart/oauth.html"
echo ""
echo "Alternative: Use netlify deploy command directly:"
echo "netlify deploy --dir=quickstart --functions=netlify/functions --prod"
echo ""

# Try direct deployment
echo "Attempting direct deployment..."
echo "================================"
netlify deploy --dir=quickstart --functions=netlify/functions --prod --site finhelm-ai-$RANDOM

echo ""
echo "🎉 Deployment script complete!"