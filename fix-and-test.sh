#!/bin/bash
set -e

echo "🧹 Cleaning old builds..."
rm -rf frontend/.next
rm -rf frontend/out
rm -rf convex/_generated

echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

echo "🔧 Generating Convex files..."
npx convex codegen

echo "✅ Checking Convex files exist..."
if [ ! -d "convex/_generated" ]; then
    echo "❌ Error: Convex files not generated"
    exit 1
fi

echo "🏗️ Building frontend..."
cd frontend
npm run build

echo "✅ Build successful! Ready to deploy."
echo ""
echo "📋 Next steps:"
echo "1. Commit all changes"
echo "2. Push to GitHub"
echo "3. Netlify will auto-deploy"