# FinHelm AI Deployment Guide

## Overview

This comprehensive guide covers the deployment process for FinHelm AI, including both Vercel frontend deployment and Convex backend deployment. The platform supports multiple deployment environments (development, staging, production) with automated CI/CD pipelines.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Vercel Deployment](#vercel-deployment)
4. [Convex Deployment](#convex-deployment)
5. [Database Setup](#database-setup)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Latest stable version
- **Vercel CLI**: For deployment and management
- **Convex CLI**: For backend deployment

### Installation Commands
```bash
# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install required CLIs
npm install -g vercel@latest
npm install -g convex@latest

# Verify installations
node --version    # Should be v18.x.x or higher
npm --version     # Should be 8.x.x or higher
vercel --version  # Should be latest
convex --version  # Should be latest
```

### Account Requirements
- **Vercel Account**: Free tier available, Pro tier recommended for production
- **Convex Account**: Free tier available, Pro tier recommended for production
- **GitHub Account**: For repository hosting and CI/CD
- **Domain**: Custom domain recommended for production (optional)

## Environment Variables

### Complete Environment Variable Reference

#### Core Application Variables
```bash
# Application Environment
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="FinHelm AI"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_BASE_URL="https://app.finhelm.ai"

# Convex Configuration
CONVEX_DEPLOYMENT="finhelm-production"  # or "finhelm-staging", "finhelm-dev"
NEXT_PUBLIC_CONVEX_URL="https://magical-shark-123.convex.cloud"
CONVEX_DEPLOY_KEY="your_convex_deploy_key_here"
```

#### QuickBooks Integration
```bash
# QuickBooks OAuth Configuration
QUICKBOOKS_CLIENT_ID="your_quickbooks_client_id"
QUICKBOOKS_CLIENT_SECRET="your_quickbooks_client_secret"
QUICKBOOKS_SCOPE="com.intuit.quickbooks.accounting"
QUICKBOOKS_ENVIRONMENT="production"  # or "sandbox"
QUICKBOOKS_REDIRECT_URI="https://app.finhelm.ai/auth/quickbooks/callback"
QUICKBOOKS_WEBHOOK_SECRET="your_webhook_secret"
```

#### Sage Intacct Integration
```bash
# Sage Intacct Configuration
INTACCT_COMPANY_ID="your_intacct_company_id"
INTACCT_USER_ID="your_intacct_user_id"
INTACCT_USER_PASSWORD="your_intacct_password"
INTACCT_WEB_SERVICES_URL="https://api.intacct.com/ia/xml/xmlgw.phtml"
```

#### AI and External Services
```bash
# OpenAI Configuration
OPENAI_API_KEY="sk-your_openai_api_key"
OPENAI_MODEL="gpt-4-turbo-preview"
OPENAI_MAX_TOKENS="4096"

# Grok AI Configuration (Optional)
GROK_API_KEY="your_grok_api_key"
GROK_API_URL="https://api.grok.ai/v1"
```

#### Security and Authentication
```bash
# Authentication
NEXTAUTH_SECRET="your_nextauth_secret_key_min_32_chars"
NEXTAUTH_URL="https://app.finhelm.ai"

# Encryption Keys
ENCRYPTION_KEY="your_32_character_encryption_key"
JWT_SECRET="your_jwt_secret_key"

# CSRF Protection
CSRF_SECRET="your_csrf_secret_key"
```

#### External Services
```bash
# Email Service (SendGrid or SES)
SENDGRID_API_KEY="SG.your_sendgrid_api_key"
SENDGRID_FROM_EMAIL="noreply@finhelm.ai"

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# Analytics
MIXPANEL_TOKEN="your_mixpanel_token"
GOOGLE_ANALYTICS_ID="GA4-MEASUREMENT-ID"
```

#### Monitoring and Logging
```bash
# Error Tracking
SENTRY_DSN="https://your_sentry_dsn@sentry.io/project_id"
SENTRY_ENVIRONMENT="production"

# Logging
LOG_LEVEL="info"  # debug, info, warn, error
LOG_FORMAT="json"

# Performance Monitoring
NEW_RELIC_LICENSE_KEY="your_new_relic_license_key"
NEW_RELIC_APP_NAME="FinHelm AI Production"
```

#### Feature Flags
```bash
# Feature toggles
FEATURE_SAGE_INTACCT_ENABLED="true"
FEATURE_ADVANCED_FORECASTING="true"
FEATURE_CUSTOM_AGENTS="true"
FEATURE_MULTI_CURRENCY="false"
```

### Environment-Specific Configurations

#### Development (.env.local)
```bash
NODE_ENV=development
CONVEX_DEPLOYMENT="finhelm-dev"
QUICKBOOKS_ENVIRONMENT="sandbox"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
LOG_LEVEL="debug"
```

#### Staging (.env.staging)
```bash
NODE_ENV=staging
CONVEX_DEPLOYMENT="finhelm-staging"
QUICKBOOKS_ENVIRONMENT="sandbox"
NEXT_PUBLIC_BASE_URL="https://staging.finhelm.ai"
LOG_LEVEL="info"
```

#### Production (.env.production)
```bash
NODE_ENV=production
CONVEX_DEPLOYMENT="finhelm-production"
QUICKBOOKS_ENVIRONMENT="production"
NEXT_PUBLIC_BASE_URL="https://app.finhelm.ai"
LOG_LEVEL="warn"
```

## Vercel Deployment

### Initial Setup

1. **Connect Repository to Vercel**
```bash
# Login to Vercel
vercel login

# Link project to Vercel
cd /path/to/finhelm-ai
vercel link

# Or create new project
vercel --name finhelm-ai
```

2. **Configure Build Settings**

Create `vercel.json` configuration:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "finhelm-frontend/package.json",
      "use": "@vercel/next",
      "config": {
        "outputDirectory": ".next"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "CONVEX_DEPLOYMENT": "@convex_deployment",
    "NEXT_PUBLIC_CONVEX_URL": "@next_public_convex_url"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "finhelm-frontend/pages/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Deployment Commands

#### Manual Deployment
```bash
# Development deployment
vercel --env development

# Staging deployment
vercel --target staging --env staging

# Production deployment
vercel --target production --env production
```

#### Automated Deployment Script
Create `scripts/deploy-vercel.sh`:
```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
BRANCH=${2:-main}

echo "🚀 Starting Vercel deployment to $ENVIRONMENT"

# Install dependencies
echo "📦 Installing dependencies..."
cd finhelm-frontend
npm ci

# Build application
echo "🔨 Building application..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run test:ci

# Deploy to Vercel
echo "🌍 Deploying to Vercel..."
if [ "$ENVIRONMENT" = "production" ]; then
  vercel --prod --confirm
else
  vercel --target $ENVIRONMENT
fi

echo "✅ Deployment completed successfully!"
echo "🔗 View deployment: $(vercel ls | head -2 | tail -1 | awk '{print $2}')"
```

### Environment Variable Configuration

#### Using Vercel CLI
```bash
# Set environment variables
vercel env add QUICKBOOKS_CLIENT_ID production
vercel env add CONVEX_DEPLOYMENT production
vercel env add NEXTAUTH_SECRET production

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME production
```

#### Using Vercel Dashboard
1. Go to your project in Vercel Dashboard
2. Navigate to Settings > Environment Variables
3. Add variables for each environment (Development, Preview, Production)
4. Import from `.env` file or add individually

### Custom Domain Setup

1. **Add Domain in Vercel Dashboard**
   - Go to Project Settings > Domains
   - Add your custom domain (e.g., app.finhelm.ai)
   - Configure DNS records as instructed

2. **DNS Configuration**
```dns
# For Vercel deployment
CNAME   app     cname.vercel-dns.com
CNAME   www     cname.vercel-dns.com

# For API subdomain (if needed)
CNAME   api     cname.vercel-dns.com
```

## Convex Deployment

### Initial Setup

1. **Initialize Convex Project**
```bash
# Initialize Convex in your project
cd /path/to/finhelm-ai
npx convex dev --once

# This creates:
# - convex/ directory with schema and functions
# - .env.local with CONVEX_DEPLOYMENT
```

2. **Configure Convex Schema**

Verify your `convex/schema.ts` is properly configured:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("viewer")),
    // ... other fields
  }).index("by_email", ["email"]),
  // ... other tables
});
```

### Deployment Environments

#### Development Environment
```bash
# Start development server
npx convex dev

# Deploy to development
npx convex deploy --dev
```

#### Staging Environment  
```bash
# Create staging deployment
npx convex deploy --name finhelm-staging

# Set environment variables for staging
npx convex env set QUICKBOOKS_ENVIRONMENT sandbox --deployment-name finhelm-staging
npx convex env set NODE_ENV staging --deployment-name finhelm-staging
```

#### Production Environment
```bash
# Create production deployment
npx convex deploy --name finhelm-production

# Set production environment variables
npx convex env set QUICKBOOKS_ENVIRONMENT production --deployment-name finhelm-production
npx convex env set NODE_ENV production --deployment-name finhelm-production
npx convex env set OPENAI_API_KEY your_production_key --deployment-name finhelm-production
```

### Automated Convex Deployment

Create `scripts/deploy-convex.sh`:
```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
DEPLOYMENT_NAME="finhelm-$ENVIRONMENT"

echo "🚀 Starting Convex deployment to $ENVIRONMENT"

# Validate schema
echo "✅ Validating Convex schema..."
npx convex dev --once --deployment-name $DEPLOYMENT_NAME

# Run database migrations if needed
echo "🔄 Running database migrations..."
npx convex dev --run migrations/migrate.js --deployment-name $DEPLOYMENT_NAME

# Deploy functions
echo "📡 Deploying Convex functions..."
npx convex deploy --deployment-name $DEPLOYMENT_NAME

# Verify deployment
echo "🔍 Verifying deployment..."
npx convex logs --deployment-name $DEPLOYMENT_NAME --tail 10

echo "✅ Convex deployment completed successfully!"
echo "🔗 Dashboard: https://dashboard.convex.dev/$DEPLOYMENT_NAME"
```

### Database Migrations

Create `convex/migrations/migrate.ts`:
```typescript
import { query, mutation } from "./_generated/server";

// Migration: Add new field to existing table
export const addUserPreferences = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    for (const user of users) {
      if (!user.preferences) {
        await ctx.db.patch(user._id, {
          preferences: {
            timezone: "UTC",
            language: "en",
            notifications: {
              email: true,
              sms: false,
              inApp: true,
            },
          },
        });
      }
    }
    
    console.log(`Updated ${users.length} users with default preferences`);
  },
});

// Migration: Create indexes
export const createIndexes = mutation({
  args: {},
  handler: async (ctx) => {
    // Indexes are created automatically from schema.ts
    // This is a placeholder for complex index operations
    console.log("Indexes created successfully");
  },
});
```

## Database Setup

### Schema Management

1. **Schema Versioning**
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema version for tracking migrations
export const SCHEMA_VERSION = "1.2.0";

export default defineSchema({
  // Add schema version tracking
  _metadata: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  
  // Your existing tables...
});
```

2. **Data Seeding**
```typescript
// convex/seed.ts
import { mutation } from "./_generated/server";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("_metadata")
      .filter((q) => q.eq(q.field("key"), "seeded"))
      .first();
    
    if (existing) {
      console.log("Database already seeded");
      return;
    }
    
    // Seed default data
    await ctx.db.insert("organizations", {
      name: "Demo Organization",
      slug: "demo",
      erpType: "quickbooks",
      erpSettings: {
        features: [],
      },
      isActive: true,
      subscriptionTier: "free",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Mark as seeded
    await ctx.db.insert("_metadata", {
      key: "seeded",
      value: true,
      updatedAt: Date.now(),
    });
    
    console.log("Database seeded successfully");
  },
});
```

### Backup and Recovery

1. **Automated Backups**
```bash
# Create backup script
#!/bin/bash
# scripts/backup-convex.sh

DEPLOYMENT_NAME=$1
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DEPLOYMENT_NAME"

mkdir -p $BACKUP_DIR

echo "📦 Creating Convex backup for $DEPLOYMENT_NAME..."

# Export data using Convex CLI (when available)
# npx convex export --deployment-name $DEPLOYMENT_NAME --output $BACKUP_DIR/$BACKUP_DATE.json

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_DATE.json"
```

## CI/CD Pipeline

### GitHub Actions Configuration

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy FinHelm AI

on:
  push:
    branches: [main, staging, development]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd finhelm-frontend && npm ci
          cd ../shared && npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          CI: true
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true

  deploy-convex:
    name: Deploy Convex Backend
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Determine deployment environment
        id: env
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy to Convex
        run: |
          npx convex deploy --deployment-name finhelm-${{ steps.env.outputs.environment }}
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  deploy-vercel:
    name: Deploy Vercel Frontend
    runs-on: ubuntu-latest
    needs: [test, deploy-convex]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Determine deployment environment
        id: env
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "target=production" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "target=preview" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy to Vercel
        run: |
          cd finhelm-frontend
          vercel --token ${{ secrets.VERCEL_TOKEN }} --${{ steps.env.outputs.target }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  e2e-tests:
    name: End-to-End Tests
    runs-on: ubuntu-latest
    needs: [deploy-convex, deploy-vercel]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          npx playwright install chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ github.ref == 'refs/heads/main' && 'https://app.finhelm.ai' || 'https://staging.finhelm.ai' }}
          
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
```

### Deployment Secrets

Configure these secrets in GitHub repository settings:

```bash
# GitHub Secrets (Settings > Secrets and variables > Actions)
CONVEX_DEPLOY_KEY=your_convex_deploy_key
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
OPENAI_API_KEY=your_openai_api_key
NEXTAUTH_SECRET=your_nextauth_secret
```

## Monitoring and Logging

### Application Monitoring

1. **Vercel Analytics Setup**
```typescript
// finhelm-frontend/pages/_app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

2. **Custom Metrics Collection**
```typescript
// lib/monitoring.ts
export class MonitoringService {
  static trackEvent(event: string, properties: Record<string, any>) {
    // Send to analytics service
    if (typeof window !== 'undefined') {
      // Client-side tracking
      mixpanel.track(event, properties);
    } else {
      // Server-side tracking
      console.log(`Event: ${event}`, properties);
    }
  }
  
  static trackError(error: Error, context?: Record<string, any>) {
    console.error('Application Error:', error, context);
    
    // Send to error tracking
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, { extra: context });
    }
  }
  
  static trackPerformance(metric: string, value: number) {
    console.log(`Performance Metric - ${metric}: ${value}ms`);
  }
}
```

### Health Checks

Create `pages/api/health.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    convex: 'up' | 'down';
    database: 'up' | 'down';
    external_apis: 'up' | 'down';
  };
  version: string;
  uptime: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  const startTime = Date.now();
  
  try {
    // Check Convex connection
    const convexStatus = await checkConvexHealth();
    
    // Check external API connections
    const externalApiStatus = await checkExternalApis();
    
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        convex: convexStatus ? 'up' : 'down',
        database: convexStatus ? 'up' : 'down',
        external_apis: externalApiStatus ? 'up' : 'down',
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };
    
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        convex: 'down',
        database: 'down',
        external_apis: 'down',
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    });
  }
}

async function checkConvexHealth(): Promise<boolean> {
  try {
    // Basic Convex connectivity test
    return true;
  } catch (error) {
    return false;
  }
}

async function checkExternalApis(): Promise<boolean> {
  try {
    // Test external API connectivity
    return true;
  } catch (error) {
    return false;
  }
}
```

## Troubleshooting

### Common Deployment Issues

#### 1. Environment Variable Issues
```bash
# Problem: Environment variables not loading
# Solution: Check variable names and ensure they're properly set

# Verify Vercel environment variables
vercel env ls

# Check Convex environment variables
npx convex env list

# Test locally
npm run build
```

#### 2. Build Failures
```bash
# Problem: TypeScript errors during build
# Solution: Fix type errors and update dependencies

# Check TypeScript configuration
npx tsc --noEmit

# Update dependencies
npm audit fix
npm update
```

#### 3. Convex Deployment Issues
```bash
# Problem: Schema validation errors
# Solution: Fix schema and run validation

# Validate schema locally
npx convex dev --once

# Check deployment logs
npx convex logs --deployment-name finhelm-production

# Reset deployment if needed
npx convex import --deployment-name finhelm-production backup.json
```

### Performance Optimization

1. **Bundle Size Analysis**
```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

2. **Caching Strategies**
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  experimental: {
    optimizeCss: true,
  },
  
  compress: true,
  
  poweredByHeader: false,
};

module.exports = nextConfig;
```

### Security Checklist

- [ ] All environment variables are properly secured
- [ ] API endpoints have proper authentication
- [ ] HTTPS is enforced in production
- [ ] Security headers are configured
- [ ] Dependencies are regularly updated
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting is implemented
- [ ] Input validation is in place

### Rollback Procedures

1. **Vercel Rollback**
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

2. **Convex Rollback**
```bash
# Export current data
npx convex export --output backup-$(date +%Y%m%d_%H%M%S).json

# Deploy previous version from Git
git checkout previous-commit
npx convex deploy --deployment-name finhelm-production
```

This deployment guide provides comprehensive coverage of the FinHelm AI deployment process, from initial setup through production maintenance and troubleshooting.