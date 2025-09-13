# FinHelm.ai Live Data Pipeline Setup Guide

## 🚀 QuickBooks → n8n → Convex → Frontend Integration

This guide documents the complete live data pipeline implementation for FinHelm.ai.

## Architecture Overview

```
QuickBooks API
    ↓
n8n Workflows (ETL)
    ↓
Webhook Endpoints (/api/webhooks/quickbooks)
    ↓
Convex Database (Real-time sync)
    ↓
Frontend Dashboard (Live updates)
```

## 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=your-convex-deploy-key

# n8n Webhook Security
N8N_WEBHOOK_SECRET=your-secure-webhook-secret

# QuickBooks (if direct API access needed)
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
```

## 2. n8n Workflow Configuration

### Create these workflows in n8n:

#### A. QuickBooks Data Sync Workflow
1. **Trigger**: Webhook or Schedule (every 5 minutes)
2. **QuickBooks Node**: Fetch data (accounts, invoices, customers, bills, vendors)
3. **Transform Node**: Format data for Convex schema
4. **HTTP Request Node**: POST to `/api/webhooks/quickbooks`

#### B. Real-time Updates Workflow
1. **Trigger**: QuickBooks Webhook (for real-time updates)
2. **Filter Node**: Validate webhook payload
3. **Transform Node**: Extract relevant data
4. **HTTP Request Node**: POST to `/api/webhooks/quickbooks`

### n8n Webhook Configuration:

```javascript
// n8n HTTP Request Node Configuration
{
  "method": "POST",
  "url": "https://your-app.vercel.app/api/webhooks/quickbooks",
  "headers": {
    "Content-Type": "application/json",
    "x-n8n-signature": "={{$env.WEBHOOK_SECRET}}"
  },
  "body": {
    "type": "full_sync",  // or specific sync type
    "companyId": "={{$node.QuickBooks.json.companyId}}",
    "accounts": "={{$node.QuickBooks.json.accounts}}",
    "invoices": "={{$node.QuickBooks.json.invoices}}",
    "customers": "={{$node.QuickBooks.json.customers}}",
    "bills": "={{$node.QuickBooks.json.bills}}",
    "vendors": "={{$node.QuickBooks.json.vendors}}"
  }
}
```

## 3. Convex Setup

### Initialize Convex functions:

```bash
# Run Convex dev server
npx convex dev

# Deploy to production
npx convex deploy
```

### Key Convex Files:
- `/convex/queries.ts` - Live data queries
- `/convex/quickbooks/dataSync.ts` - Sync mutations
- `/convex/schema.ts` - Database schema

## 4. Frontend Integration

### Using the Live Dashboard:

```tsx
import LiveDashboard from '@/app/dashboard/LiveDashboard';

export default function DashboardPage() {
  return <LiveDashboard />;
}
```

### Using Individual Hooks:

```tsx
import { 
  useLiveQuickBooksData,
  useDashboardMetrics,
  useCashFlow 
} from '@/app/hooks/useLiveQuickBooks';

function MyComponent() {
  const companyId = "your-company-id";
  
  // Get live data with real-time updates
  const { accounts, invoices, syncStatus } = useLiveQuickBooksData(companyId);
  
  // Get calculated metrics
  const { metrics, recentAnomalies } = useDashboardMetrics(companyId);
  
  // Get cash flow forecast
  const { currentCash, forecast } = useCashFlow(companyId);
  
  return (
    // Your UI components
  );
}
```

## 5. Testing the Pipeline

### A. Test Webhook Endpoint:

```bash
# Make executable
chmod +x test-live-pipeline.js

# Run tests
N8N_WEBHOOK_SECRET=your-secret \
WEBHOOK_URL=http://localhost:3000/api/webhooks/quickbooks \
TEST_COMPANY_ID=your-company-id \
node test-live-pipeline.js
```

### B. Manual Testing:

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/quickbooks \
  -H "Content-Type: application/json" \
  -H "x-n8n-signature: your-signature" \
  -d '{
    "type": "accounts_sync",
    "companyId": "test_company_123",
    "accounts": [...]
  }'
```

### C. Monitor Real-time Updates:

1. Open the Live Dashboard
2. Trigger a sync from n8n
3. Watch data update in real-time
4. Check sync status badge

## 6. Webhook Types

The system supports these webhook types:

- `accounts_sync` - Sync chart of accounts
- `invoices_sync` - Sync customer invoices
- `customers_sync` - Sync customer data
- `bills_sync` - Sync vendor bills
- `vendors_sync` - Sync vendor data
- `full_sync` - Complete data sync

## 7. Security Considerations

### Webhook Signature Validation:
- All webhooks must include `x-n8n-signature` header
- Signature is HMAC-SHA256 of request body
- Requests without valid signatures are rejected

### Rate Limiting:
- Consider implementing rate limiting for webhook endpoints
- Use Vercel's built-in rate limiting or custom middleware

### Data Validation:
- All incoming data is validated against Convex schema
- Invalid data is logged and rejected

## 8. Monitoring & Debugging

### Check Sync Status:
```tsx
const { syncStatus, lastSyncAt, recentLogs } = useSyncStatus(companyId);
```

### View Convex Logs:
```bash
npx convex logs
```

### Check Webhook Logs:
- Vercel Dashboard → Functions → View logs
- Check browser console for client-side errors

## 9. Production Deployment

### Deploy to Vercel:
```bash
vercel deploy --prod
```

### Environment Variables in Vercel:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add all required environment variables
3. Redeploy to apply changes

### n8n Production Setup:
1. Deploy n8n to your preferred hosting
2. Update webhook URLs to production domain
3. Configure production QuickBooks credentials
4. Enable webhook signature validation

## 10. Troubleshooting

### Common Issues:

**Issue**: Data not updating in real-time
- Check Convex connection status
- Verify webhook signatures match
- Check n8n workflow execution logs

**Issue**: Sync fails with error
- Check Convex function logs: `npx convex logs`
- Verify data schema matches
- Check webhook payload structure

**Issue**: Performance issues
- Implement pagination for large datasets
- Use Convex indexes for queries
- Consider batch processing for bulk updates

## 📚 Additional Resources

- [Convex Documentation](https://docs.convex.dev)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [QuickBooks API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## 🎉 Success Indicators

When everything is working correctly:
- ✅ Sync status shows "Connected" with recent timestamp
- ✅ Dashboard displays live data
- ✅ Changes in QuickBooks appear within 5 minutes
- ✅ No errors in Convex or Vercel logs
- ✅ Webhook test script passes all tests