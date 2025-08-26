# FinHelm.ai Deployment Guide

This guide provides step-by-step instructions for deploying the FinHelm.ai backend foundation to production using Convex.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Testing Deployment](#testing-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Modern web browser for Convex dashboard access

### Accounts Required
- [Convex Account](https://convex.dev) (free tier available)
- GitHub account (for repository access)
- Domain name (for production deployment)

### Development Tools
- Text editor or IDE (VS Code recommended)
- Command line terminal
- Web browser for testing

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/jasonsaas/FinHelm-ai.git
cd FinHelm-ai
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies (if using workspace structure)
cd backend && npm install && cd ..
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Minimum required configuration:**
```env
NODE_ENV=development
PORT=3000
CONVEX_DEPLOYMENT=  # Will be set after Convex setup
```

### 4. Initialize Convex
```bash
# Install Convex CLI globally (optional)
npm install -g convex

# Initialize Convex project
npx convex dev
```

**Follow the prompts:**
1. Create new Convex account or login
2. Create new project or select existing
3. Choose deployment name
4. Wait for initial deployment

### 5. Update Environment
After Convex initialization, update your `.env` file:
```env
CONVEX_DEPLOYMENT=https://ardent-dog-632.convex.cloud
CONVEX_URL=https://ardent-dog-632.convex.cloud
```

**Current Deployment**: `ardent-dog-632` (Team: jason-cf1f8, Project: finhelm-ai)

### 6. Verify Setup
```bash
# Run deployment readiness test
node deploy-test-simple.js

# Test individual functions
npx ts-node convex/finHelmTestSimple.ts

# Start development server
npm run dev
```

## Production Deployment

### 1. Create Production Environment
```bash
# Create production deployment
npx convex deploy --prod

# Or specify environment name
npx convex deploy --cmd-name production
```

### 2. Set Production Environment Variables
Create `.env.production` file:
```env
NODE_ENV=production
CONVEX_DEPLOYMENT=your-prod-deployment
CONVEX_URL=https://your-prod-deployment.convex.cloud

# Security settings
JWT_SECRET=your-strong-jwt-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key-here
SESSION_SECRET=your-session-secret-here

# CORS for production domain
CORS_ORIGINS=https://app.finhelm.ai,https://finhelm.ai

# Rate limiting (more restrictive for production)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60

# Monitoring and logging
SENTRY_DSN=your-sentry-dsn
DEBUG=false
```

### 3. Deploy Functions
```bash
# Deploy all functions to production
npx convex deploy --prod

# Verify deployment
npx convex function list --prod
```

### 4. Configure Custom Domain (Optional)
```bash
# Set custom domain in Convex dashboard
# Or use Convex CLI (when available)
```

### 5. Set up SSL/TLS
Convex automatically provides HTTPS for all deployments. For custom domains:
1. Configure DNS CNAME record
2. Add domain in Convex dashboard
3. Verify SSL certificate

## Environment Configuration

### Development Environment
```env
# Basic development setup
NODE_ENV=development
DEBUG=finhelm:*
USE_MOCK_DATA=true
DISABLE_HTTPS_REDIRECT=true

# Convex settings
CONVEX_DEPLOYMENT=dev-finhelm-12345
CONVEX_URL=https://dev-finhelm-12345.convex.cloud

# Relaxed security for development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX_REQUESTS=1000
```

### Staging Environment
```env
# Staging environment
NODE_ENV=staging
DEBUG=finhelm:error,finhelm:warn

# Staging Convex deployment
CONVEX_DEPLOYMENT=staging-finhelm-67890
CONVEX_URL=https://staging-finhelm-67890.convex.cloud

# Production-like security
CORS_ORIGINS=https://staging.finhelm.ai
RATE_LIMIT_MAX_REQUESTS=200

# Test integrations
ENABLE_AI_AGENTS=true
ENABLE_QUICKBOOKS_INTEGRATION=false  # Use sandbox
ENABLE_SAGE_INTACCT_INTEGRATION=false
```

### Production Environment
```env
# Production settings
NODE_ENV=production
DEBUG=false

# Production Convex deployment
CONVEX_DEPLOYMENT=prod-finhelm-abcdef
CONVEX_URL=https://prod-finhelm-abcdef.convex.cloud

# Strict security
CORS_ORIGINS=https://app.finhelm.ai
RATE_LIMIT_MAX_REQUESTS=100
TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8

# Production integrations
ENABLE_AI_AGENTS=true
ENABLE_QUICKBOOKS_INTEGRATION=true
ENABLE_SAGE_INTACCT_INTEGRATION=true
ENABLE_AUDIT_LOGGING=true

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

## Testing Deployment

### 1. Automated Testing
```bash
# Run comprehensive deployment test
node deploy-test-simple.js

# Test specific functions
npx convex function run finHelmTest.finHelmTest '{"query": "Production test", "testScenario": "full_demo"}'
```

### 2. Manual Testing Checklist

#### Basic Functionality
- [ ] Convex functions deploy successfully
- [ ] Database schema is created correctly
- [ ] Test function returns expected results
- [ ] Error handling works properly

#### User Management
- [ ] User creation works
- [ ] User authentication functions
- [ ] Organization assignment works
- [ ] Role-based permissions function

#### Account Management
- [ ] Account hierarchy loads correctly
- [ ] Account search returns results
- [ ] Account creation/updates work
- [ ] Balance calculations are accurate

#### Transaction Processing
- [ ] Transactions can be recorded
- [ ] Transaction filtering works
- [ ] Transaction summaries are accurate
- [ ] Reconciliation status updates

#### ERP Integration
- [ ] Data sync functions work
- [ ] Fuzzy matching performs correctly
- [ ] Error handling for failed syncs
- [ ] Audit logging captures changes

#### AI Agents
- [ ] Agent execution completes
- [ ] Insights are generated correctly
- [ ] Response format matches specification
- [ ] Error handling for failed executions

### 3. Performance Testing
```bash
# Test with larger datasets
npx convex function run finHelmTest.finHelmTest '{"includeRawData": true}'

# Monitor response times in Convex dashboard
# Verify memory usage and execution times
```

### 4. Security Testing
- [ ] Authentication required for protected endpoints
- [ ] Rate limiting functions correctly
- [ ] Input validation prevents injection attacks
- [ ] Sensitive data is properly encrypted
- [ ] CORS settings are restrictive
- [ ] Error messages don't leak sensitive information

## Monitoring and Maintenance

### 1. Convex Dashboard Monitoring
Monitor in the Convex dashboard:
- Function execution times
- Error rates and types
- Database query performance
- Storage usage
- Bandwidth usage

### 2. Application Monitoring
```typescript
// Add monitoring to functions
export const monitoredFunction = action({
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      // Function logic here
      const result = await performOperation(args);
      
      // Log success metrics
      console.log(`Function completed in ${Date.now() - startTime}ms`);
      return result;
      
    } catch (error) {
      // Log error metrics
      console.error(`Function failed after ${Date.now() - startTime}ms:`, error);
      throw error;
    }
  }
});
```

### 3. Health Checks
Create a health check endpoint:
```typescript
export const healthCheck = query({
  handler: async (ctx) => {
    const checks = {
      database: true,
      functions: true,
      timestamp: Date.now()
    };
    
    // Add specific health checks
    try {
      await ctx.db.query("users").take(1);
      checks.database = true;
    } catch {
      checks.database = false;
    }
    
    return {
      status: Object.values(checks).every(Boolean) ? "healthy" : "unhealthy",
      checks
    };
  }
});
```

### 4. Automated Backups
```bash
# Export data regularly
npx convex export --output backup-$(date +%Y%m%d).zip

# Store backups in secure location (S3, etc.)
```

### 5. Log Management
```typescript
// Structured logging
const log = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: "info",
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  },
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({
      level: "error", 
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    }));
  }
};
```

## Troubleshooting

### Common Deployment Issues

#### 1. Convex Deployment Fails
```bash
Error: Failed to deploy functions
```
**Solutions:**
- Check TypeScript compilation: `npm run build`
- Verify function syntax and imports
- Check Convex account limits
- Try redeploying: `npx convex deploy --force`

#### 2. Environment Variables Not Set
```bash
Error: CONVEX_DEPLOYMENT not configured
```
**Solutions:**
- Run `npx convex dev` to initialize
- Update `.env` file with correct values
- Verify environment file is loaded
- Check for typos in variable names

#### 3. Function Execution Timeouts
```bash
Error: Function execution timed out
```
**Solutions:**
- Optimize function performance
- Break large operations into smaller chunks
- Use pagination for large datasets
- Add caching for frequently accessed data

#### 4. Database Schema Issues
```bash
Error: Invalid schema definition
```
**Solutions:**
- Verify Convex schema syntax
- Check relationship definitions
- Validate validator usage
- Review index definitions

#### 5. Authentication Errors
```bash
Error: Authentication failed
```
**Solutions:**
- Verify API keys are correct
- Check token expiration
- Validate user permissions
- Review CORS settings

### Performance Issues

#### 1. Slow Query Performance
**Diagnosis:**
```bash
# Monitor in Convex dashboard
# Check function execution times
```

**Solutions:**
- Add appropriate database indexes
- Optimize query filters
- Use pagination for large results
- Cache frequently accessed data

#### 2. High Memory Usage
**Solutions:**
- Optimize data structures
- Stream large datasets
- Implement data cleanup routines
- Use more efficient algorithms

### Security Issues

#### 1. Rate Limiting Triggered
```bash
Error: Rate limit exceeded
```
**Solutions:**
- Implement exponential backoff
- Optimize API usage patterns
- Request rate limit increases
- Cache responses when possible

#### 2. CORS Errors
```bash
Error: CORS policy violation
```
**Solutions:**
- Add domain to CORS_ORIGINS
- Verify HTTPS usage
- Check subdomain configuration
- Review proxy settings

## Rollback Procedures

### 1. Function Rollback
```bash
# Deploy previous version
npx convex deploy --version previous

# Or deploy specific version
npx convex deploy --version 1.2.3
```

### 2. Database Rollback
```bash
# Restore from backup
npx convex import backup-20241201.zip

# Or use point-in-time recovery (if available)
```

### 3. Environment Rollback
```bash
# Revert environment variables
git checkout HEAD~1 .env.production

# Redeploy with previous config
npx convex deploy --prod
```

## Production Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Security settings reviewed
- [ ] Performance benchmarks met
- [ ] Backup procedures in place

### Deployment
- [ ] Deploy to staging first
- [ ] Run integration tests
- [ ] Verify monitoring setup
- [ ] Deploy to production
- [ ] Verify deployment health
- [ ] Update documentation

### Post-deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify user functionality
- [ ] Update stakeholders
- [ ] Schedule follow-up review

## Support and Resources

### Documentation
- [Convex Documentation](https://docs.convex.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [FinHelm.ai API Documentation](./API.md)

### Monitoring Tools
- [Convex Dashboard](https://dashboard.convex.dev)
- [Sentry](https://sentry.io) - Error tracking
- [New Relic](https://newrelic.com) - APM

### Support Channels
- GitHub Issues: [Report Issues](https://github.com/jasonsaas/FinHelm-ai/issues)
- Convex Discord: [Community Support](https://discord.gg/convex)

---

**Note**: This deployment guide assumes the Day 2 backend foundation implementation. Additional steps may be required for ERP integrations, AI service connections, and frontend deployment.