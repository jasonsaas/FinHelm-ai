# FinHelm n8n QuickBooks Sync Workflow Setup Instructions

## Overview
This n8n workflow automatically syncs QuickBooks data (Invoices, Payments, Expenses, Accounts, Company Info) to the FinHelm Convex backend every 15 minutes.

## Prerequisites
- n8n instance (cloud or self-hosted)
- QuickBooks sandbox/production account with OAuth configured
- FinHelm Convex backend deployed
- Access to environment variable configuration

## Environment Variables Required

Set these environment variables in your n8n instance:

```bash
FINHELM_WEBHOOK_TOKEN=your_secret_webhook_token_here
```

## QuickBooks API Setup

### Sandbox Configuration
1. Create QuickBooks Developer account at https://developer.intuit.com/
2. Create a sandbox app
3. Note down:
   - Client ID
   - Client Secret
   - Sandbox Base URL: `https://sandbox-quickbooks.api.intuit.com`
   - OAuth Redirect URI (configured in Convex)

### Production Configuration
1. Request production access from Intuit
2. Update API URLs from `sandbox-quickbooks.api.intuit.com` to `quickbooks.api.intuit.com`
3. Update environment variables for production

## Installation Steps

### 1. Import Workflow
1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Upload the `n8n-workflow-finhelm-quickbooks-sync.json` file
4. Click **Import**

### 2. Configure Environment Variables
1. Go to **Settings** → **Environment Variables** (or configure via Docker/deployment)
2. Add:
   ```
   FINHELM_WEBHOOK_TOKEN=your_actual_token_here
   ```

### 3. Test the Workflow

#### Manual Test
1. Open the imported workflow
2. Click **Execute Workflow** button
3. Monitor execution in the **Executions** panel
4. Check logs for any errors

#### Scheduled Test
1. Activate the workflow (toggle switch in top-right)
2. Wait for next 15-minute interval
3. Check **Executions** history for automated runs

### 4. Monitor Execution
- Go to **Executions** to see run history
- Check individual execution logs for detailed information
- Monitor error rates and performance

## Workflow Components

### 1. Schedule Trigger
- Runs every 15 minutes
- Timezone: America/New_York
- Can be modified in the trigger node settings

### 2. Token Management
- Retrieves active QuickBooks OAuth token from Convex
- Validates token expiration
- Handles token refresh scenarios

### 3. Parallel API Calls
- **Company Info**: Basic company information
- **Invoices**: All invoices updated since last sync
- **Payments**: All payments updated since last sync
- **Expenses**: All purchase transactions updated since last sync
- **Accounts**: All chart of accounts (full sync every time)

### 4. Data Transformation
- Merges all API responses
- Transforms to FinHelm webhook format
- Sanitizes data to prevent injection attacks
- Validates required fields

### 5. Webhook Delivery
- Posts to FinHelm Convex endpoint
- Includes Bearer token authentication
- Implements retry logic (3 attempts with exponential backoff)
- Full response capture for debugging

### 6. State Management
- Tracks last successful sync timestamp
- Uses n8n static data for persistence
- Updates timestamp only after successful delivery

## Error Handling

### Automatic Retry Logic
- QuickBooks API calls: 3 retries with 2-second intervals
- Webhook delivery: 3 retries with 5-15 second exponential backoff
- Token retrieval: 3 retries with 1-second intervals

### Error Notifications
- Currently logs errors to console
- TODO: Configure Slack/Email notifications
- Error details include execution ID and timestamp

### Common Issues & Solutions

#### 1. Token Expiration
- **Error**: "Access token has expired"
- **Solution**: Ensure Convex token refresh is working
- **Check**: Convex logs for OAuth refresh issues

#### 2. QuickBooks API Rate Limits
- **Error**: 429 Too Many Requests
- **Solution**: Increase retry delays or reduce frequency
- **Note**: Sandbox has lower rate limits than production

#### 3. Webhook Authentication
- **Error**: 401 Unauthorized
- **Solution**: Verify FINHELM_WEBHOOK_TOKEN is correct
- **Check**: Token format and expiration

#### 4. Data Transformation Errors
- **Error**: Cannot read property of undefined
- **Solution**: Check QuickBooks API response format
- **Debug**: Enable detailed logging in Transform Data node

## Production Deployment

### 1. Update API URLs
Replace all `sandbox-quickbooks.api.intuit.com` with `quickbooks.api.intuit.com`

### 2. Configure Production Credentials
- Update QuickBooks app credentials
- Set production webhook token
- Verify Convex production endpoints

### 3. Set Up Monitoring
- Configure error alerts (Slack/Email)
- Set up uptime monitoring
- Monitor execution performance

### 4. Security Considerations
- Use secure environment variable storage
- Implement IP restrictions if needed
- Monitor for unusual API usage patterns

## Testing Procedure

### 1. Unit Testing
```bash
# Test individual nodes
1. Execute "Initialize Variables" node manually
2. Execute "Get QuickBooks Token" node
3. Execute each API call node individually
4. Test data transformation with sample data
5. Test webhook delivery to development endpoint
```

### 2. Integration Testing
```bash
# End-to-end workflow testing
1. Run complete workflow manually
2. Verify data appears in Convex backend
3. Check all 5 data types are synced correctly
4. Validate incremental sync (only new/updated records)
5. Test error scenarios (invalid token, API downtime)
```

### 3. Load Testing
```bash
# Performance validation
1. Test with large datasets (500+ invoices)
2. Monitor execution time and memory usage
3. Validate webhook payload size limits
4. Test concurrent execution handling
```

## Maintenance

### Regular Tasks
- [ ] Monitor execution success rates weekly
- [ ] Review error logs monthly
- [ ] Update QuickBooks API tokens before expiration
- [ ] Validate sync accuracy quarterly

### Updates
- [ ] Update n8n version regularly
- [ ] Monitor QuickBooks API changes
- [ ] Update workflow if Convex schema changes
- [ ] Review and optimize performance monthly

## Support
- n8n Documentation: https://docs.n8n.io/
- QuickBooks API Docs: https://developer.intuit.com/app/developer/qbo/docs/api/
- FinHelm Support: [Contact Information]

---

## Workflow JSON Export Info
- **File**: `n8n-workflow-finhelm-quickbooks-sync.json`
- **Nodes**: 16 total
- **Version**: 1.0
- **Last Updated**: 2024-12-01