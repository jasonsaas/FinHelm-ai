# QuickBooks Integration API Documentation

## Overview

The FinHelm AI QuickBooks integration provides seamless OAuth 2.0 authentication, data synchronization, and real-time webhook processing for QuickBooks Online. This integration supports both sandbox and production environments with comprehensive error handling and rate limiting.

## Table of Contents

1. [OAuth Authentication Flow](#oauth-authentication-flow)
2. [Webhook Configuration](#webhook-configuration)
3. [Rate Limiting](#rate-limiting)
4. [Error Codes and Handling](#error-codes-and-handling)
5. [Data Sync API](#data-sync-api)
6. [Code Examples](#code-examples)

## OAuth Authentication Flow

### 1. Authorization URL Generation

Generate the QuickBooks authorization URL to redirect users for consent.

**Endpoint:** `POST /api/quickbooks/auth/url`

**Request Body:**
```json
{
  "organizationId": "org_12345",
  "redirectUri": "https://app.finhelm.ai/auth/quickbooks/callback",
  "state": "csrf_token_12345"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?client_id=...&state=csrf_token_12345",
  "state": "csrf_token_12345",
  "expiresAt": 1704085200000
}
```

**TypeScript Interface:**
```typescript
interface AuthUrlRequest {
  organizationId: string;
  redirectUri: string;
  state: string;
  codeVerifier?: string; // Optional for PKCE
}

interface AuthUrlResponse {
  authorizationUrl: string;
  state: string;
  expiresAt: number;
}
```

### 2. OAuth Callback Processing

Process the authorization callback and exchange code for tokens.

**Endpoint:** `POST /api/quickbooks/auth/callback`

**Request Body:**
```json
{
  "code": "Q01txLNJE6fR8aEMz2UaDAV8XrKCrNBa6YSj9R7E5vPQzpMpGg",
  "state": "csrf_token_12345",
  "realmId": "4620816365291273400"
}
```

**Response:**
```json
{
  "connectionId": "qb_conn_67890",
  "tokens": {
    "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
    "refreshToken": "L01QaDwuOz6A3fBb...",
    "expiresAt": 1704088800000,
    "realmId": "4620816365291273400",
    "tokenType": "Bearer"
  },
  "companyInfo": {
    "companyName": "Sandbox Company_US_1",
    "country": "US",
    "fiscalYearStartMonth": "January"
  }
}
```

**TypeScript Interface:**
```typescript
interface CallbackRequest {
  code: string;
  state: string;
  realmId: string;
  codeVerifier?: string; // For PKCE
}

interface CallbackResponse {
  connectionId: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    realmId: string;
    tokenType: string;
  };
  companyInfo: {
    companyName: string;
    country: string;
    fiscalYearStartMonth: string;
  };
}
```

### 3. Token Refresh

Refresh expired access tokens using refresh tokens.

**Endpoint:** `POST /api/quickbooks/auth/refresh`

**Request Body:**
```json
{
  "connectionId": "qb_conn_67890"
}
```

**Response:**
```json
{
  "tokens": {
    "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
    "refreshToken": "L01QaDwuOz6A3fBb...",
    "expiresAt": 1704092400000,
    "tokenType": "Bearer"
  }
}
```

## Webhook Configuration

### Webhook Endpoint Setup

FinHelm AI automatically configures webhooks for real-time data synchronization.

**Webhook URL:** `https://api.finhelm.ai/webhooks/quickbooks`

**Supported Events:**
- `Item` - Products and services changes
- `Customer` - Customer information changes
- `Vendor` - Vendor information changes
- `Account` - Chart of accounts changes
- `Bill` - Bill transactions
- `Invoice` - Invoice transactions
- `Payment` - Payment transactions
- `JournalEntry` - Journal entries

### Webhook Payload Examples

#### Invoice Created/Updated
```json
{
  "eventNotifications": [
    {
      "realmId": "4620816365291273400",
      "name": "Invoice",
      "id": "145",
      "operation": "Create",
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

#### Account Updated
```json
{
  "eventNotifications": [
    {
      "realmId": "4620816365291273400",
      "name": "Account",
      "id": "35",
      "operation": "Update", 
      "lastUpdated": "2024-01-01T12:05:00.000Z"
    }
  ]
}
```

### Webhook Verification

All webhook payloads are signed using HMAC-SHA256. Verify signatures to ensure authenticity.

**Request Headers:**
```http
intuit-signature: QbJgX8YfzO3gPECOZSKdJvnLaOnJnI8zOOYlLnRJAfI=
```

**Verification Code (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Rate Limiting

QuickBooks API implements rate limiting to prevent abuse and ensure service stability.

### Rate Limits

| API Category | Sandbox | Production |
|--------------|---------|------------|
| Data APIs | 500 requests/minute | 500 requests/minute |
| Reporting APIs | 100 requests/minute | 100 requests/minute |
| Webhooks | 100 requests/minute | 100 requests/minute |

### Rate Limiting Headers

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1704085200
```

### Handling Rate Limits

FinHelm AI implements exponential backoff with jitter for rate limit handling:

```typescript
async function handleRateLimit(request: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        const jitter = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        continue;
      }
      throw error;
    }
  }
}
```

## Error Codes and Handling

### HTTP Status Codes

| Status Code | Description | Action Required |
|-------------|-------------|-----------------|
| `200` | Success | None |
| `400` | Bad Request | Check request format |
| `401` | Unauthorized | Refresh access token |
| `403` | Forbidden | Check scopes/permissions |
| `404` | Not Found | Verify resource exists |
| `429` | Too Many Requests | Implement backoff |
| `500` | Internal Server Error | Retry request |
| `503` | Service Unavailable | Retry with backoff |

### QuickBooks API Error Responses

#### Token Expired (401)
```json
{
  "Fault": {
    "Error": [
      {
        "code": "401",
        "Detail": "Unauthorized",
        "type": "AUTHENTICATION"
      }
    ]
  }
}
```

**Handling:**
```typescript
if (error.response?.status === 401) {
  // Attempt token refresh
  const newTokens = await refreshTokens(connectionId);
  // Retry original request with new token
  return await retryWithNewToken(originalRequest, newTokens.accessToken);
}
```

#### Validation Error (400)
```json
{
  "Fault": {
    "Error": [
      {
        "code": "6000",
        "Detail": "There was an error when saving Account",
        "type": "VALIDATION"
      }
    ]
  }
}
```

#### Rate Limit Exceeded (429)
```json
{
  "Fault": {
    "Error": [
      {
        "code": "3200",
        "Detail": "message=ThrottleExceeded; errorCode=003200; statusCode=429",
        "type": "THROTTLED"
      }
    ]
  }
}
```

### Common Error Scenarios

#### 1. Company File Connection Issues
```json
{
  "error": "INVALID_COMPANY_ID",
  "message": "The company file is no longer accessible or has been moved",
  "realmId": "4620816365291273400",
  "resolution": "User needs to reconnect their QuickBooks account"
}
```

#### 2. Insufficient Permissions
```json
{
  "error": "INSUFFICIENT_SCOPE",
  "message": "The current access token does not have permission to access this resource",
  "requiredScope": "com.intuit.quickbooks.accounting",
  "resolution": "Request user to reauthorize with additional scopes"
}
```

#### 3. Data Sync Conflicts
```json
{
  "error": "SYNC_CONFLICT",
  "message": "Account code already exists with different name",
  "conflictDetails": {
    "existingAccount": { "code": "4000", "name": "Sales Revenue" },
    "newAccount": { "code": "4000", "name": "Product Sales" }
  },
  "resolution": "Manual conflict resolution required"
}
```

## Data Sync API

### Sync Chart of Accounts

**Endpoint:** `POST /api/quickbooks/sync/accounts`

**Request:**
```json
{
  "connectionId": "qb_conn_67890",
  "options": {
    "includeInactive": true,
    "fuzzyMatchThreshold": 0.85,
    "autoResolveConflicts": false
  }
}
```

**Response:**
```json
{
  "syncJobId": "sync_12345",
  "status": "completed",
  "results": {
    "processed": 125,
    "inserted": 15,
    "updated": 110,
    "skipped": 0,
    "errors": []
  },
  "executionTime": 2350
}
```

### Sync Transactions

**Endpoint:** `POST /api/quickbooks/sync/transactions`

**Request:**
```json
{
  "connectionId": "qb_conn_67890",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "transactionTypes": ["Invoice", "Bill", "Payment", "JournalEntry"]
}
```

**Response:**
```json
{
  "syncJobId": "sync_12346",
  "status": "completed",
  "results": {
    "processed": 1250,
    "inserted": 245,
    "updated": 1005,
    "skipped": 0,
    "errors": []
  },
  "thirteenWeekForecast": {
    "projectedCashFlow": [
      { "week": 1, "amount": 125000, "confidence": 0.95 },
      { "week": 2, "amount": 132000, "confidence": 0.92 }
    ]
  }
}
```

### Get Sync Status

**Endpoint:** `GET /api/quickbooks/sync/{syncJobId}/status`

**Response:**
```json
{
  "syncJobId": "sync_12345",
  "status": "running",
  "progress": 65,
  "estimatedCompletion": 1704085500000,
  "currentStep": "Processing transactions",
  "results": {
    "processed": 815,
    "inserted": 123,
    "updated": 692,
    "skipped": 0,
    "errors": []
  }
}
```

## Code Examples

### Complete Integration Example

```typescript
import { QuickBooksIntegration } from '@finhelm/quickbooks';

class FinHelmQuickBooksService {
  private qb: QuickBooksIntegration;

  constructor(config: QuickBooksConfig) {
    this.qb = new QuickBooksIntegration(config, process.env.CONVEX_URL);
  }

  async initiateConnection(organizationId: string) {
    // Generate authorization URL
    const state = this.generateSecureState();
    const authUrl = this.qb.getAuthUri(state);
    
    // Store state for verification
    await this.storeAuthState(state, organizationId);
    
    return { authUrl, state };
  }

  async handleCallback(code: string, state: string, realmId: string) {
    // Verify state
    const storedState = await this.verifyAuthState(state);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await this.qb.handleCallback(code, realmId, state);
    
    // Store connection
    const connectionId = await this.storeConnection(
      storedState.organizationId,
      tokens
    );

    // Test connection
    const isConnected = await this.qb.testConnection(
      tokens.access_token,
      tokens.realmId
    );

    if (!isConnected) {
      throw new Error('Failed to establish connection to QuickBooks');
    }

    // Initial sync
    await this.performInitialSync(connectionId, tokens);

    return { connectionId, tokens };
  }

  async performInitialSync(connectionId: string, tokens: any) {
    // Sync chart of accounts
    await this.qb.syncToConvex(
      tokens.organizationId,
      connectionId,
      tokens.access_token,
      tokens.realmId,
      {
        syncAccounts: true,
        syncTransactions: true,
        fuzzyMatchThreshold: 0.9,
        autoApplyHighConfidenceMatches: true,
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          end: new Date()
        }
      }
    );
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const isValid = this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Process notifications
    for (const notification of payload.eventNotifications) {
      await this.processNotification(notification);
    }
  }

  private async processNotification(notification: any) {
    const { realmId, name: entityType, id, operation } = notification;
    
    // Find connection by realmId
    const connection = await this.findConnectionByRealmId(realmId);
    if (!connection) {
      console.warn(`No connection found for realmId: ${realmId}`);
      return;
    }

    // Perform incremental sync for the specific entity
    switch (entityType) {
      case 'Account':
        await this.syncSpecificAccount(connection, id);
        break;
      case 'Invoice':
      case 'Bill':
      case 'Payment':
      case 'JournalEntry':
        await this.syncSpecificTransaction(connection, entityType, id);
        break;
      default:
        console.log(`Unhandled entity type: ${entityType}`);
    }
  }

  private generateSecureState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.QB_WEBHOOK_SECRET!)
      .update(payload)
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

### Error Handling Best Practices

```typescript
class QuickBooksErrorHandler {
  static async handleApiError(error: any, context: string) {
    if (error.response?.status === 401) {
      // Token expired - attempt refresh
      console.log(`Token expired during ${context}, attempting refresh...`);
      throw new TokenExpiredError('Access token expired', error);
    }
    
    if (error.response?.status === 429) {
      // Rate limit - calculate backoff
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.log(`Rate limited during ${context}, retrying after ${retryAfter}s`);
      throw new RateLimitError(`Rate limited - retry after ${retryAfter}s`, retryAfter);
    }
    
    if (error.response?.status >= 500) {
      // Server error - implement retry with exponential backoff
      console.error(`Server error during ${context}:`, error.response.data);
      throw new ServerError('QuickBooks server error', error);
    }
    
    // Parse QuickBooks-specific errors
    const qbError = error.response?.data?.Fault?.Error?.[0];
    if (qbError) {
      throw new QuickBooksApiError(
        qbError.Detail || 'Unknown QuickBooks error',
        qbError.code,
        qbError.type
      );
    }
    
    // Generic error
    throw new IntegrationError(`Unexpected error during ${context}`, error);
  }
}
```

## Security Considerations

### Token Storage
- Store access tokens and refresh tokens encrypted in your database
- Use environment-specific encryption keys
- Implement token rotation policies
- Log token usage for audit purposes

### Webhook Security  
- Always verify webhook signatures
- Use HTTPS endpoints for webhooks
- Implement replay attack protection
- Rate limit webhook endpoints

### Data Privacy
- Follow GDPR and regional data protection laws
- Implement data retention policies
- Provide data export capabilities
- Log all data access for compliance

## Support and Resources

- **QuickBooks Developer Documentation:** https://developer.intuit.com/app/developer/qbo/docs/
- **FinHelm AI Support:** support@finhelm.ai
- **Rate Limit Monitoring:** Monitor via QuickBooks Developer Dashboard
- **Sandbox Testing:** Use QuickBooks Online Sandbox for development and testing