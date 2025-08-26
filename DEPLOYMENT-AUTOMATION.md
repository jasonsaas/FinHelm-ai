# Autonomous Convex Deployment Script

Comprehensive automation script for FinHelm.ai Convex deployment workflow including authentication, deployment, configuration, and verification.

## Features

- ✅ **Autonomous Operation**: Handles complete deployment workflow
- 🔐 **Authentication Management**: Automated Convex login handling
- 🚀 **Deployment Automation**: Captures deployment URL automatically
- ⚙️ **Environment Management**: Updates .env with deployment configuration
- 📋 **Schema Validation**: Verifies all 11 expected tables
- 🧪 **Test Integration**: Runs verification tests automatically
- 📝 **Git Operations**: Commits and pushes deployment changes
- 📊 **Comprehensive Reporting**: Detailed success metrics and performance data

## Quick Start

### Prerequisites

- Node.js 18+ with TypeScript support
- Git repository initialized
- Convex CLI available (installed with project dependencies)
- Internet connection for Convex deployment

### Basic Usage

```bash
# Standard deployment
npm run deploy

# Or directly with ts-node
npx ts-node deploy-convex.ts

# Debug mode (verbose logging)
npm run deploy:debug
```

## Step-by-Step Process

The script executes a 7-step deployment workflow:

### 1. 🔍 Project Validation
- Checks for required files: `package.json`, `convex.json`
- Verifies `convex/` directory exists
- Confirms FinHelm.ai project structure

### 2. 🔐 Authentication
- Checks current Convex authentication status
- Prompts for login if not authenticated
- Handles browser-based OAuth flow

### 3. 🚀 Convex Deployment
- Executes `npx convex dev`
- Monitors stdout for deployment URL
- Captures URL patterns: `https://*.convex.cloud` or `https://*.convex.site`
- Timeout: 2 minutes (configurable)

### 4. ⚙️ Environment Update
- Parses existing `.env` file or creates new
- Adds/updates `CONVEX_DEPLOYMENT=URL`
- Preserves all existing environment variables
- Creates backup of previous configuration

### 5. 📋 Schema Validation
- Queries Convex deployment for table list
- Validates against expected 11 tables:
  - `users`, `organizations`, `accounts`, `transactions`
  - `agents`, `erpConnections`, `syncJobs`, `auditLogs`
  - `agentExecutions`, `reconciliations`, `predictions`
- Calculates confidence score
- Reports missing tables

### 6. 🧪 Verification Tests
- Runs `node deploy-test-simple.js`
- Captures test output and success metrics
- Looks for confidence scores (e.g., 92.7%)
- Reports test pass/fail rates

### 7. 📝 Git Operations
- Stages relevant files: `.env.example`, `DEPLOYMENT.md`, `README.md`
- Commits with detailed message
- Pushes to current branch
- Handles gitignored files appropriately

## Configuration

### Default Configuration
The script uses built-in defaults but can be customized via `convex-deployment-config.json`:

```json
{
  "expectedTables": ["users", "organizations", "accounts", ...],
  "testCommands": ["node deploy-test-simple.js"],
  "gitFiles": [".env.example", "DEPLOYMENT.md", "README.md"],
  "timeouts": {
    "deployment": 120000,
    "authentication": 300000,
    "schemaValidation": 30000
  }
}
```

### Customization Options
- **Expected Tables**: Modify the list of tables to validate
- **Test Commands**: Add additional verification commands
- **Git Files**: Specify which files to stage and commit
- **Timeouts**: Adjust timeout values for different operations
- **Features**: Enable/disable specific functionality

## Output and Reporting

### Success Output Example
```
🚀 FinHelm.ai Convex Deployment Assistant
==========================================

[1/7] 🔍 Validating project structure...
✅ Project structure validated

[2/7] 🔐 Checking Convex authentication...
✅ Already authenticated with Convex

[3/7] 🚀 Deploying to Convex...
✅ Deployment successful: https://ardent-dog-632.convex.cloud

[4/7] 🔧 Updating environment configuration...
✅ Environment updated: .env
   CONVEX_DEPLOYMENT=https://ardent-dog-632.convex.cloud

[5/7] 📋 Validating Convex schemas...
✅ Schema validation complete
   Tables found: 11
   Expected match: 11/11
   Confidence: 100.0%

[6/7] 🧪 Running verification tests...
   Running: node deploy-test-simple.js
   ✅ Deployment checks passed
   ✅ Confidence score: 92.7%
✅ Tests completed: 1/1 passed (100.0%)

[7/7] 📝 Handling git operations...
   ✅ Staged: .env.example
   ✅ Staged: DEPLOYMENT.md
   ✅ Staged: README.md
   ✅ Changes committed
   ✅ Changes pushed to remote

==================================================
🎉 CONVEX DEPLOYMENT COMPLETE
==================================================

📊 Deployment Summary:
✅ Deployment URL: https://ardent-dog-632.convex.cloud
✅ Schema Validation: 11 tables found
✅ Confidence Score: 100.0%
✅ Critical Tables: Present
✅ Tests: 1/1 passed
✅ Git Operations: 3 files staged, committed: true

⏱️  Performance Metrics:
   Total Execution Time: 67.3s
   Deployment Time: 23.1s

🚀 Next Steps:
   1. Test your Convex functions at: https://ardent-dog-632.convex.cloud
   2. Open Convex Dashboard to monitor deployment
   3. Run your FinHelm.ai application: npm run dev
   4. Verify ERP integrations are working

🎯 Deployment completed successfully! 🎉
```

## Error Handling

### Common Issues and Solutions

#### 1. Authentication Failures
```
❌ Authentication failed
```
**Solution**: Ensure internet connectivity and valid Convex account

#### 2. Deployment Timeouts
```
❌ Deployment timed out
```
**Solutions**:
- Check internet connectivity
- Increase timeout in config file
- Verify Convex CLI installation

#### 3. Schema Validation Failures
```
⚠️ Missing tables: agents, predictions
```
**Solutions**:
- Check Convex schema definitions
- Verify deployment completed successfully
- Update expected tables in config

#### 4. Git Operation Failures
```
❌ Git operations failed
```
**Solutions**:
- Ensure you're in a git repository
- Check git credentials and permissions
- Verify remote repository access

### Debug Mode
Enable verbose logging for troubleshooting:
```bash
DEBUG=1 npm run deploy
```

## Integration with FinHelm.ai

### Environment Variables Set
- `CONVEX_DEPLOYMENT`: Main deployment URL
- `CONVEX_URL`: Same as deployment URL (for compatibility)

### Schema Validation for FinHelm.ai
Validates PRD v2.1 requirements:
- **User Management**: `users`, `organizations` tables
- **ERP Integration**: `erpConnections`, `syncJobs` tables  
- **AI Agents**: `agents`, `agentExecutions` tables
- **Financial Data**: `accounts`, `transactions` tables
- **Compliance**: `auditLogs`, `reconciliations` tables

### Success Metrics Tracking
- **Deployment Time**: Time to complete Convex deployment
- **Schema Confidence**: Percentage of expected tables found
- **Test Success Rate**: Verification test pass percentage
- **Git Success**: Whether changes were successfully committed/pushed

## Advanced Usage

### Custom Configuration
Create `convex-deployment-config.json`:
```json
{
  "expectedTables": ["custom-table-1", "custom-table-2"],
  "confidenceThreshold": 85.0,
  "features": {
    "autoRetry": true,
    "skipGitOperations": false
  }
}
```

### CI/CD Integration
For automated deployments:
```bash
# Non-interactive mode (requires pre-auth)
CI=true npm run deploy
```

### Rollback Capability
If deployment fails, the script preserves:
- Previous `.env` configuration
- Git history (no force operations)
- Original schema state

## Security Notes

- ✅ **Environment Safety**: Preserves existing environment variables
- ✅ **Git Safety**: Respects `.gitignore`, no force operations
- ✅ **Authentication**: Uses secure Convex OAuth flow
- ✅ **No Secrets**: Doesn't expose or log sensitive information

## Contributing

To enhance the deployment script:
1. Update `deploy-convex.ts` with new functionality
2. Modify `convex-deployment-config.json` for new options
3. Test with `DEBUG=1 npm run deploy`
4. Update this documentation

## Version History

- **v1.0**: Initial autonomous deployment script
- Support for 7-step deployment workflow
- Comprehensive error handling and reporting
- Git integration with smart file staging