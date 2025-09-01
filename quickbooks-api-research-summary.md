# QuickBooks Online API Research - Complete Summary

## Overview
This document provides a comprehensive summary of the QuickBooks Online API research covering all requested aspects: endpoints, rate limiting, webhooks, error codes, and token management best practices.

## 1. Available Endpoints ✅
**Documentation**: `quickbooks-api-endpoints.md`

### Base URLs
- **Sandbox**: `https://sandbox-quickbooks.api.intuit.com`
- **Production**: `https://quickbooks.api.intuit.com`
- **Pattern**: `/v3/company/{realmID}/{entity}`

### Key Findings
- **Current API Version**: v3 (Minor version 70 as of December 2023)
- **Authentication**: OAuth 2.0
- **Supported HTTP Methods**: GET, POST, PUT, DELETE
- **Response Format**: JSON

### Endpoint Categories
1. **Transaction Endpoints**: Invoice, Bill, Payment, Credit Memo, Sales Receipt, Estimate, Journal Entry, Deposit, Vendor Credit
2. **Master Data Endpoints**: Account, Customer, Item, Vendor, Employee, Department
3. **Reports Endpoints**: Balance Sheet, Profit & Loss, Cash Flow, Trial Balance, General Ledger
4. **Company Information**: Company Info, Preferences
5. **Utility Endpoints**: Time Activity, Payment Method, Budget

### API Scopes
- `com.intuit.quickbooks.accounting` - Full access to accounting API
- `com.intuit.quickbooks.payment` - Access to payments API

## 2. Rate Limiting Details ✅
**Documentation**: `quickbooks-api-rate-limiting.md`

### Core Limits
- **500 requests per minute** per realm ID (company)
- **10 concurrent requests maximum** per realm ID per application
- **40 batch requests per minute** per realm ID
- **200 requests per minute** for resource-intensive endpoints

### Error Handling
- **HTTP 429** response when limits exceeded
- **Error Code**: "003001" with "ThrottleExceeded" message
- **Recovery Strategy**: Exponential backoff with jitter

### Best Practices
- Single-threaded API calls to same realm ID
- Implement request queuing during peak periods
- Use batch operations when possible
- Monitor rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

## 3. Webhook Event Types ✅
**Documentation**: `quickbooks-api-webhooks.md`

### Supported Entities
**Core Business Entities**: Account, Bill, Customer, Invoice, Item, Payment, Vendor

**Transaction Entities**: BillPayment, CreditMemo, Purchase, RefundReceipt, SalesReceipt, Transfer, VendorCredit

**Additional Entities**: Budget, Currency, Department, Deposit, JournalCode, JournalEntry, PaymentMethod, Preferences, TaxAgency, Term, TimeActivity

### Supported Operations
- **Create** - New entity creation
- **Update** - Entity modifications
- **Delete** - Entity deletion
- **Merge** - Entity merging
- **Void** - Transaction voiding

### Security Features
- **HMAC-SHA256 signature verification** using intuit-signature header
- **Verifier token** for payload validation
- **HTTPS requirement** for webhook endpoints

### Payload Structure
```json
{
  "eventNotifications": [{
    "realmId": "1185883450",
    "dataChangeEvent": {
      "entities": [{
        "name": "Customer",
        "id": "1",
        "operation": "Create",
        "lastUpdated": "2022-04-22T15:00:00-0700"
      }]
    }
  }]
}
```

## 4. Error Codes Reference ✅
**Documentation**: `quickbooks-api-error-handling-token-management.md`

### HTTP Status Codes
- **400 Bad Request**: Malformed requests, missing required fields
- **401 Unauthorized**: Expired/invalid access tokens
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded (Error Code: 003001)
- **500 Internal Server Error**: Server errors, often UTF-8 encoding issues

### Business Logic Errors
- **Error 120**: Authorization Failure - loss of QB Online access
- **Error 500**: Unsupported Operation - non-UTF-8 characters
- **Error 610**: Object Not Found - inactive/deleted entities
- **Duplicate DocNumber Errors**: Custom transaction number conflicts

### Error Response Format
```json
{
  "Fault": {
    "Error": [{
      "Detail": "Required parameter customer is missing",
      "code": "400",
      "element": "customer"
    }],
    "type": "ValidationFault"
  }
}
```

## 5. Token Management Best Practices ✅
**Documentation**: `quickbooks-api-error-handling-token-management.md`

### Token Lifecycle
- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 100 days (rolling expiration)
- **Refresh Token Cycling**: New refresh token issued every 24 hours

### Critical Best Practices
1. **Always store latest refresh token** from API responses
2. **Proactive token refresh** before expiration
3. **Handle token cycling** - refresh token changes every 24 hours
4. **Secure token storage** with encryption
5. **Multi-company token management** for different realm IDs

### Implementation Patterns
- **Token refresh automation** with background scheduling
- **Exponential backoff** for retry logic
- **Circuit breaker pattern** for fault tolerance
- **Secure token revocation** when users disconnect

### Security Considerations
- Encrypt tokens at rest
- Use HTTPS for all token operations
- Implement proper token revocation
- Monitor token usage patterns

## Key Integration Recommendations

### 1. Development Strategy
- Start with sandbox environment for testing
- Implement comprehensive error handling for all status codes
- Use official Intuit SDKs when available
- Follow OAuth 2.0 best practices rigorously

### 2. Production Deployment
- Implement robust token refresh mechanisms
- Set up webhook endpoints with proper signature verification
- Monitor rate limits proactively
- Plan for token expiration scenarios

### 3. Scalability Considerations
- Use batch operations to reduce API calls
- Implement request queuing for high-volume scenarios
- Design for multi-tenant token management
- Set up comprehensive monitoring and alerting

### 4. Security Requirements
- HTTPS endpoints for all operations
- HMAC-SHA256 webhook signature verification
- Encrypted token storage
- Proper OAuth 2.0 scope management

## Additional Resources
- **Official Intuit Developer Portal**: https://developer.intuit.com/app/developer/qbo/docs/develop
- **API Reference**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/account
- **Webhook Documentation**: https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks

## Files Created
1. `quickbooks-api-endpoints.md` - Complete endpoint documentation
2. `quickbooks-api-rate-limiting.md` - Rate limiting details and strategies
3. `quickbooks-api-webhooks.md` - Webhook events and integration patterns
4. `quickbooks-api-error-handling-token-management.md` - Error codes and token management
5. `quickbooks-api-research-summary.md` - This comprehensive summary

All documentation includes practical code examples, implementation patterns, and best practices for robust QuickBooks Online API integration.