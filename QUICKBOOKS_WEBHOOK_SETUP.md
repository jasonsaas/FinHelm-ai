# QuickBooks Webhook Configuration

## Your Webhook Endpoint URL

For your QuickBooks webhook configuration, use this URL:

### Development Environment:
```
https://ardent-dog-632.convex.site/quickbooks/webhook
```

### Production Environment:
```
https://expert-elephant-40.convex.site/quickbooks/webhook
```

## Quick Setup

1. **Go to your QuickBooks Webhooks page**:
   https://developer.intuit.com/appdetail/webhooks?appId=djQuMTo6OGQzYmJlYTI3Yg:b756a31e-3d1b-429a-b215-0e4525993e73

2. **Enter the Webhook URL**:
   - For testing: `https://ardent-dog-632.convex.site/quickbooks/webhook`
   - For production: `https://expert-elephant-40.convex.site/quickbooks/webhook`

3. **Select Events to Subscribe**:
   - Invoice (Create, Update, Delete)
   - Bill (Create, Update, Delete)
   - Account (Create, Update, Delete)
   - Customer (Create, Update)
   - Vendor (Create, Update)

4. **Save Configuration**

## Testing the Webhook

### Verify Endpoint is Working:
```bash
# Test the endpoint
curl https://ardent-dog-632.convex.site/quickbooks/webhook?challenge=test123

# Should return: test123
```

### Check Logs:
```bash
# View webhook activity
npx convex logs --filter webhook
```

## OAuth vs Webhook URLs

| Purpose | URL |
|---------|-----|
| **OAuth Redirect** | `http://localhost:3000/callback` |
| **Webhook Endpoint (Dev)** | `https://ardent-dog-632.convex.site/quickbooks/webhook` |
| **Webhook Endpoint (Prod)** | `https://expert-elephant-40.convex.site/quickbooks/webhook` |

## What Happens When You Receive a Webhook

1. QuickBooks sends event notification to your endpoint
2. Webhook handler identifies the company by Realm ID
3. Handler fetches updated data from QuickBooks API
4. Data is synced to your Convex database
5. Changes are immediately available in your app

## Supported Events

✅ **Invoice Events**
- Invoice Created
- Invoice Updated
- Invoice Deleted
- Invoice Voided

✅ **Bill Events**
- Bill Created
- Bill Updated
- Bill Deleted

✅ **Account Events**
- Account Created
- Account Updated
- Account Deleted

✅ **Customer Events**
- Customer Created
- Customer Updated

✅ **Vendor Events**
- Vendor Created
- Vendor Updated

---

**Ready to configure!** Use the webhook URL above in your QuickBooks app settings.