# n8n Webhook Integration Guide for QuickBooks Data

## Overview
This webhook endpoint receives QuickBooks data from n8n workflows and stores it in the Convex database.

## Webhook Endpoint
```
POST https://ardent-dog-632.convex.site/webhook/n8n
```

## Supported Data Types
- `customers` - Customer/client records
- `invoices` - Invoice records
- `accounts` - Chart of accounts
- `payments` - Payment records

## Request Format

### Headers
```
Content-Type: application/json
```

### Request Body Structure
```json
{
  "dataType": "customers | invoices | accounts | payments",
  "timestamp": "2024-01-27T12:00:00Z",
  "syncSource": "quickbooks",
  "count": 10,
  "data": [...], // Array of records
  "summary": {
    "totalRecords": 10,
    "processed": 10,
    "failed": 0
  }
}
```

## Data Schemas

### Customers
```json
{
  "Id": "CUST001",
  "DisplayName": "Customer Name",
  "CompanyName": "Company Name",
  "Active": true,
  "Balance": "1000.00",
  "PrimaryEmailAddr": { "Address": "email@example.com" },
  "PrimaryPhone": { "FreeFormNumber": "555-0100" },
  "BillAddr": {
    "Line1": "123 Main St",
    "City": "San Francisco",
    "CountrySubDivisionCode": "CA",
    "PostalCode": "94105",
    "Country": "US"
  }
}
```

### Invoices
```json
{
  "Id": "INV001",
  "DocNumber": "1001",
  "CustomerRef": { "value": "CUST001", "name": "Customer Name" },
  "TxnDate": "2024-01-15",
  "DueDate": "2024-02-15",
  "TotalAmt": "5000.00",
  "Balance": "2500.00",
  "Line": [
    {
      "DetailType": "SalesItemLineDetail",
      "Amount": "5000.00",
      "Description": "Service Description",
      "SalesItemLineDetail": {
        "Qty": 10,
        "UnitPrice": 500
      }
    }
  ]
}
```

### Accounts
```json
{
  "Id": "ACC001",
  "Name": "Account Name",
  "FullyQualifiedName": "Parent:Account Name",
  "AccountType": "Bank",
  "AccountSubType": "Checking",
  "Active": true,
  "CurrentBalance": "50000.00",
  "CurrencyRef": { "value": "USD" }
}
```

### Payments
```json
{
  "Id": "PAY001",
  "TxnDate": "2024-01-25",
  "CustomerRef": { "value": "CUST001", "name": "Customer Name" },
  "TotalAmt": "2500.00",
  "PaymentMethodRef": { "name": "Check" },
  "PaymentRefNum": "CHK-1234",
  "Line": [
    {
      "Amount": "2500.00",
      "LinkedTxn": [
        {
          "TxnId": "INV001",
          "TxnType": "Invoice"
        }
      ]
    }
  ]
}
```

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "dataType": "customers",
  "recordsReceived": 10,
  "recordsProcessed": 9,
  "recordsFailed": 1,
  "processingTime": "123ms",
  "timestamp": "2024-01-27T12:00:00Z",
  "summary": {
    "created": 5,
    "updated": 4,
    "errors": [
      {
        "customerId": "CUST999",
        "error": "Missing required field: name"
      }
    ]
  }
}
```

### Error Response (400/500)
```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "dataType": "customers"
}
```

## n8n Workflow Configuration

### HTTP Request Node Settings
1. **Method**: POST
2. **URL**: `https://ardent-dog-632.convex.site/webhook/n8n`
3. **Authentication**: None required (webhook is public)
4. **Headers**: 
   - Content-Type: `application/json`
5. **Body**: JSON with the structure shown above

### Example n8n Workflow
1. **QuickBooks Node** → Fetch data (customers, invoices, etc.)
2. **Code Node** → Transform data to match webhook format
3. **HTTP Request Node** → Send to webhook endpoint
4. **If Node** → Check response status
5. **Set Node** → Log success/failure

## Rate Limiting
- The webhook implements basic rate limiting
- If you receive a 429 status code, wait 60 seconds before retrying
- Recommended: Process data in batches of 100 records or less

## Error Handling
- The webhook validates all incoming data
- Missing required fields will result in partial success
- Each record is processed independently
- Failed records are reported in the response

## Testing
Use the provided test script:
```bash
node test-n8n-webhook.js
```

This will send sample data for all four data types to verify the webhook is working.

## Monitoring
Check processed data in the Convex dashboard:
https://dashboard.convex.dev/d/ardent-dog-632/data

View tables:
- `customers`
- `invoices`
- `accounts`
- `payments`

## Security Notes
- The webhook endpoint is public (no authentication required)
- Implement IP whitelisting in production if needed
- Consider adding a shared secret header for additional security
- All data is validated before storage

## Support
For issues or questions:
1. Check the Convex logs for detailed error messages
2. Verify the data format matches the schemas above
3. Test with smaller batches if experiencing timeouts