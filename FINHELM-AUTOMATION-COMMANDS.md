# FinHelm.ai Automation Commands Guide

## Quick Start Commands

### 1. Run Complete Automation
```bash
# Standard execution
npx ts-node finhelm-integration-run-verify.ts

# With debug logging
DEBUG=1 npx ts-node finhelm-integration-run-verify.ts
```

### 2. Individual Step Commands
```bash
# Step 1: Integration only (files, package.json update)
node -e "require('./finhelm-integration-run-verify.ts').step1Integration(require('./finhelm-integration-run-verify.ts').loadAutomationConfig())"

# Step 2: Deployment only
npm run deploy
# or with debug
npm run deploy:debug

# Step 3: Verification only
npx convex status
npx convex run --prod _system:listTables

# Step 4: Manual Linear update (see linear-integration-log.md for API template)

# Step 5: Day 3 prep (OAuth stub generation)
node -e "require('./finhelm-integration-run-verify.ts').step5Day3Preparation({})"
```

## Prerequisites Setup

### Install Dependencies
```bash
# Install TypeScript and ts-node if not present
npm install -g typescript ts-node

# Install project dependencies
npm install

# Install Convex CLI globally
npm install -g convex
```

### Environment Setup
```bash
# Create .env file with Convex configuration
echo "CONVEX_DEPLOYMENT=https://your-deployment.convex.cloud" > .env
echo "INTUIT_CLIENT_ID=your_intuit_client_id" >> .env
echo "INTUIT_CLIENT_SECRET=your_intuit_secret" >> .env
echo "INTUIT_REDIRECT_URI=https://yourapp.com/oauth/callback" >> .env
```

### Directory Structure Verification
```bash
# Check project structure
ls -la | grep -E "(convex|scripts|package.json)"

# Verify Convex configuration
cat convex.json
cat convex/schema.ts | head -20
```

## Verification Commands

### Pre-Deployment Checks
```bash
# Check Node.js and npm versions
node --version && npm --version

# Verify TypeScript compilation
npx tsc --noEmit

# Check Convex authentication
npx convex auth --help
npx convex status
```

### Post-Deployment Verification
```bash
# Test Convex deployment
npx convex dashboard

# Query schema tables
npx convex run --prod _system:listTables

# Test specific table
npx convex run --prod accounts:list --limit 5

# Check deployment logs
ls -la logs/finhelm-deployment-*.md
```

### Schema Verification Commands
```bash
# Count tables in schema
grep -c "defineTable" convex/schema.ts

# List all table definitions
grep "^\s*\w+:\s*defineTable" convex/schema.ts

# Check for nested structures
grep -A 5 "accounts:" convex/schema.ts
```

## Troubleshooting Commands

### Common Issues Resolution
```bash
# Fix permission issues
chmod +x finhelm-integration-run-verify.ts

# Clear Convex cache
rm -rf .convex/
npx convex dev --clear

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset Convex authentication
npx convex logout
npx convex login
```

### Debug Mode Analysis
```bash
# Run with maximum debugging
DEBUG=1 VERBOSE=1 npx ts-node finhelm-integration-run-verify.ts

# Check specific step failures
DEBUG=1 npx ts-node -e "
const script = require('./finhelm-integration-run-verify.ts');
script.step2RunDeployment(script.loadAutomationConfig()).catch(console.error);
"

# Analyze logs
tail -f logs/finhelm-deployment-*.md
```

### Performance Analysis
```bash
# Time the complete automation
time npx ts-node finhelm-integration-run-verify.ts

# Monitor resource usage
top -p $(pgrep -f "finhelm-integration")

# Check deployment URL response
curl -I https://your-deployment.convex.cloud
```

## Testing Commands

### Unit Testing (Future Implementation)
```bash
# Test individual functions
npm run test:unit

# Test integration
npm run test:integration

# Test OAuth stub
npm run test:oauth
```

### Validation Testing
```bash
# Validate configuration
node -e "console.log(JSON.stringify(require('./finhelm-integration-run-verify.ts').loadAutomationConfig(), null, 2))"

# Test file operations
ls -la deploy-convex.ts day3-auth.ts verification-logs-template.md

# Validate package.json updates
grep -A 10 '"scripts"' package.json
```

## Monitoring Commands

### Real-time Monitoring
```bash
# Monitor deployment progress
tail -f logs/finhelm-deployment-*.md

# Watch Convex status
watch -n 5 "npx convex status"

# Monitor log files
find logs/ -name "*.md" -exec tail -f {} +
```

### Performance Monitoring
```bash
# Check deployment metrics
grep -E "(Time|Duration|Score)" logs/finhelm-success-report-*.json

# Monitor confidence scores
grep -E "confidence.*[0-9]+\%" logs/*.md

# Track table verification
grep -c "✅.*table" logs/finhelm-deployment-*.md
```

## Automation Configuration

### Custom Configuration
```bash
# Create custom config file
cat > finhelm-automation-config.json << 'EOF'
{
  "expectedTables": [
    "users", "organizations", "accounts", "transactions", 
    "agents", "erpConnections", "syncJobs", "auditLogs"
  ],
  "timeouts": {
    "deployment": 300000,
    "verification": 90000
  }
}
EOF
```

### Environment-Specific Commands
```bash
# Development environment
NODE_ENV=development npx ts-node finhelm-integration-run-verify.ts

# Production environment
NODE_ENV=production npx ts-node finhelm-integration-run-verify.ts

# Staging environment
NODE_ENV=staging npx ts-node finhelm-integration-run-verify.ts
```

## Success Verification

### Expected Output Indicators
```bash
# Check for success indicators in output
grep -E "(✅|🎉|SUCCESS)" logs/finhelm-deployment-*.md

# Verify confidence score achievement
grep -E "Confidence.*9[0-9]\.[0-9]%" logs/*.md

# Check all steps completion
grep -c "Step [1-5].*completed" logs/finhelm-deployment-*.md
```

### Final Verification
```bash
# Complete system check
npx convex status && \
npx convex dashboard --check && \
curl -s https://your-deployment.convex.cloud && \
ls -la day3-auth.ts && \
echo "✅ FinHelm.ai automation verification complete!"
```

---

## Quick Reference

| Command | Purpose | Expected Time |
|---------|---------|---------------|
| `npx ts-node finhelm-integration-run-verify.ts` | Full automation | 3-5 minutes |
| `npm run deploy` | Deploy only | 1-2 minutes |
| `npx convex status` | Check status | 5-10 seconds |
| `DEBUG=1 npx ts-node finhelm-integration-run-verify.ts` | Debug mode | 3-5 minutes |

**Success Criteria**:
- ✅ All 5 steps completed
- ✅ Confidence score ≥ 90%
- ✅ 11/11 tables verified
- ✅ Deployment URL accessible
- ✅ OAuth stub created

---
*Generated for FinHelm.ai v2.1 automation pipeline*