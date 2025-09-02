# FinHelm AI Deployment Guide

## Overview
FinHelm AI is a Next.js application with Convex backend that can be deployed to Netlify, Vercel, or any platform supporting Next.js.

## Prerequisites
- Node.js 20+
- npm or yarn
- Convex account (https://convex.dev)
- Netlify account (for Netlify deployment)

## Environment Variables
Set these in your deployment platform:
- `NEXT_PUBLIC_CONVEX_URL`: https://ardent-dog-632.convex.cloud
- `QUICKBOOKS_CLIENT_ID`: Your QuickBooks OAuth client ID
- `QUICKBOOKS_CLIENT_SECRET`: Your QuickBooks OAuth client secret
- `QUICKBOOKS_ENVIRONMENT`: sandbox or production

## Quick Deploy

### Netlify (Recommended)
1. Push to GitHub main branch
2. Netlify will auto-deploy using the configured `netlify.toml`

### Manual Netlify Deploy
```bash
# Generate Convex files and build
npm run deploy:netlify

# Deploy to Netlify
netlify deploy --prod --dir=frontend/.next
```

### Vercel Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Build Process

### Local Build Test
```bash
# Run the test script to verify everything works
./fix-and-test.sh
```

### Manual Build Steps
1. Generate Convex files:
   ```bash
   npx convex codegen
   ```

2. Build frontend:
   ```bash
   cd frontend && npm run build
   ```

## CI/CD Pipeline

### GitHub Actions
The repository includes a GitHub Actions workflow that:
1. Generates Convex files
2. Builds the Next.js frontend
3. Deploys to Netlify

To enable:
1. Add secrets to GitHub repository:
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`

### Build Commands by Platform

#### Netlify
```bash
npm install && npx convex codegen && cd frontend && npm ci && npm run build
```
- Publish directory: `frontend/.next`

#### Vercel
```bash
npx convex codegen && cd frontend && npm run build
```
- Output directory: `frontend/.next`

## Troubleshooting

### Convex Files Not Found
If you see errors about missing `convex/_generated` files:
1. Ensure `npx convex codegen` runs before the build
2. Check that the Convex symlink exists: `frontend/convex -> ../convex`

### Build Failures
1. Clean old builds:
   ```bash
   rm -rf frontend/.next
   rm -rf convex/_generated
   ```

2. Regenerate and rebuild:
   ```bash
   npx convex codegen
   cd frontend && npm run build
   ```

### TypeScript Errors
- Ensure all imports use the correct paths
- The frontend uses `@/` as the base path alias
- Convex files are accessed via the symlink

## Project Structure
```
FinHelm.ai/
├── convex/              # Convex backend functions
│   └── _generated/      # Auto-generated Convex files
├── frontend/            # Next.js frontend
│   ├── app/            # Next.js app directory
│   ├── convex/         # Symlink to ../convex
│   └── .next/          # Build output
├── netlify.toml        # Netlify configuration
├── vercel.json         # Vercel configuration
└── package.json        # Root package with build scripts
```

## Available Scripts

### Root package.json
- `npm run build:all` - Generate Convex files and build frontend
- `npm run convex:generate` - Generate Convex files only
- `npm run frontend:build` - Build frontend only
- `npm run deploy:netlify` - Full build for Netlify

### Frontend package.json
- `npm run build` - Standard Next.js build
- `npm run build:with-convex` - Build with Convex generation
- `npm run dev` - Development server

## Support
For issues or questions:
- GitHub Issues: https://github.com/jasonsaas/FinHelm-ai
- Convex Dashboard: https://dashboard.convex.dev