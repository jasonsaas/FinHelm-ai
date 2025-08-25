# OAuth2 API Documentation

## Overview

The FinHelm.ai OAuth2 API provides secure authentication and authorization for Sage Intacct and QuickBooks integrations. All endpoints implement role-based access control (RBAC) and comprehensive audit logging.

## Base URL

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.finhelm.ai`
- **Production**: `https://app.finhelm.ai`

## Authentication

All OAuth API endpoints require a valid Convex authentication token in the request headers.

```http
Authorization: Bearer <convex_auth_token>
```

## Role-Based Permissions

| Role | Permissions |
|------|-------------|
| `admin` | Full OAuth management |
| `compliance_agent` | Token management, monitoring, testing |
| `data_sync_agent` | Connection testing, status monitoring |
| `user` | Authorization initiation only |
| `viewer` | No OAuth access |

## Endpoints

### 1. Initiate OAuth Authorization

Starts the OAuth2 authorization flow for a specified ERP provider.

**Endpoint**: `POST /oauth/authorize`

**Convex Action**: `api.erpAuth.authorize`

**Required Role**: `admin`, `user`

#### Request

```typescript
{
  provider: "sage_intacct" | "quickbooks";
  organizationId: Id<"organizations">;
  state?: string;
}
```

#### Response

```typescript
{
  authorizationUrl: string;
  provider: "sage_intacct" | "quickbooks";
  state: string;
}
```

#### Example

```bash
curl -X POST https://app.finhelm.ai/oauth/authorize \
  -H "Authorization: Bearer your-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sage_intacct",
    "organizationId": "org_123456789",
    "state": "custom-state-value"
  }'
```

### 2. Exchange Authorization Code for Token

Exchanges the authorization code received from the OAuth provider for access and refresh tokens.

**Endpoint**: `POST /oauth/token`

**Convex Action**: `api.erpAuth.getToken`

**Required Role**: `admin`, `compliance_agent`, `data_sync_agent`

#### Request

```typescript
{
  provider: "sage_intacct" | "quickbooks";
  code: string;
  state: string;
  realmId?: string; // Required for QuickBooks
}
```

#### Response

```typescript
{
  success: boolean;
  provider: "sage_intacct" | "quickbooks";
  companyId: string;
  expiresAt: number;
}
```

#### Example

```bash
curl -X POST https://app.finhelm.ai/oauth/token \
  -H "Authorization: Bearer your-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sage_intacct",
    "code": "auth_code_from_provider",
    "state": "org_123_user_456_1640995200000",
    "realmId": "company_realm_id"
  }'
```

### 3. Refresh Access Token

Refreshes an expired access token using the stored refresh token.

**Endpoint**: `POST /oauth/refresh`

**Convex Action**: `api.erpAuth.refreshToken`

**Required Role**: `admin`, `compliance_agent`, `data_sync_agent`

#### Request

```typescript
{
  connectionId: Id<"erpConnections">;
}
```

#### Response

```typescript
{
  success: boolean;
  provider: "sage_intacct" | "quickbooks";
  expiresAt: number;
}
```

#### Example

```bash
curl -X POST https://app.finhelm.ai/oauth/refresh \
  -H "Authorization: Bearer your-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123456789"
  }'
```

### 4. Test OAuth Connection

Tests the health and validity of an OAuth connection by making a test API call.

**Endpoint**: `POST /oauth/test`

**Convex Action**: `api.erpAuth.testConnection`

**Required Role**: `admin`, `compliance_agent`, `data_sync_agent`

#### Request

```typescript
{
  connectionId: Id<"erpConnections">;
}
```

#### Response

```typescript
{
  success: boolean;
  healthy: boolean;
  provider: "sage_intacct" | "quickbooks";
  companyId?: string;
  error?: string;
  lastTested: number;
}
```

#### Example

```bash
curl -X POST https://app.finhelm.ai/oauth/test \
  -H "Authorization: Bearer your-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123456789"
  }'
```

### 5. Get Connection Status

Retrieves the status of all OAuth connections for an organization.

**Endpoint**: `GET /oauth/status`

**Convex Action**: `api.erpAuth.getConnectionStatus`

**Required Role**: All authenticated users (organization-scoped)

#### Request

```typescript
{
  organizationId: Id<"organizations">;
  provider?: "sage_intacct" | "quickbooks";
}
```

#### Response

```typescript
{
  organizationId: Id<"organizations">;
  connections: Array<{
    id: Id<"erpConnections">;
    provider: "sage_intacct" | "quickbooks";
    name: string;
    isActive: boolean;
    syncStatus: "active" | "failed" | "pending" | "disabled";
    companyId?: string;
    expiresAt?: number;
    isExpired: boolean;
    lastSyncAt?: number;
    createdAt: number;
    updatedAt: number;
  }>;
  summary: {
    total: number;
    active: number;
    expired: number;
    failed: number;
  };
}
```

#### Example

```bash
curl -X GET "https://app.finhelm.ai/oauth/status?organizationId=org_123456789&provider=sage_intacct" \
  -H "Authorization: Bearer your-auth-token"
```

## Error Handling

All API endpoints return standardized error responses:

### Error Response Format

```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: number;
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for the operation |
| `INVALID_PROVIDER` | 400 | Unsupported OAuth provider specified |
| `INVALID_STATE` | 400 | OAuth state parameter is invalid or expired |
| `TOKEN_EXCHANGE_FAILED` | 400 | Failed to exchange authorization code for token |
| `TOKEN_REFRESH_FAILED` | 400 | Failed to refresh access token |
| `CONNECTION_NOT_FOUND` | 404 | OAuth connection not found |
| `ORGANIZATION_ACCESS_DENIED` | 403 | User doesn't have access to organization |
| `OAUTH_CREDENTIALS_MISSING` | 500 | OAuth client credentials not configured |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests within time window |

### Example Error Responses

#### Authentication Error
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": 1640995200000
  }
}
```

#### Permission Error
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions for OAuth authorization",
    "timestamp": 1640995200000
  }
}
```

#### Token Exchange Error
```json
{
  "error": {
    "code": "TOKEN_EXCHANGE_FAILED",
    "message": "Token exchange failed: Invalid authorization code",
    "details": {
      "provider": "sage_intacct",
      "originalError": "invalid_grant"
    },
    "timestamp": 1640995200000
  }
}
```

## Rate Limiting

OAuth API endpoints have specific rate limits to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/oauth/authorize` | 10 requests | 15 minutes per user |
| `/oauth/token` | 10 requests | 15 minutes per user |
| `/oauth/refresh` | 30 requests | 15 minutes per user |
| `/oauth/test` | 20 requests | 15 minutes per user |
| `/oauth/status` | 60 requests | 15 minutes per user |

When rate limits are exceeded, the API returns a `429 Too Many Requests` status with the following headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995500
Retry-After: 300
```

## Security Considerations

### Token Security
- All tokens are encrypted at rest using AES-256
- Refresh tokens are automatically rotated on each use
- Access tokens have a maximum lifetime of 1 hour
- All token operations are logged for audit purposes

### State Parameter Security
- State parameters include organization ID, user ID, and timestamp
- States expire after 10 minutes to prevent replay attacks
- State validation prevents CSRF attacks

### Transport Security
- All requests must use HTTPS in production
- TLS 1.2 or higher is required
- Certificate pinning is enforced for API calls

### Access Control
- All endpoints enforce role-based access control
- Organization-level isolation prevents cross-tenant access
- User permissions are validated on each request

## Audit Logging

All OAuth operations are logged for compliance and security monitoring:

### Logged Events
- `oauth_authorize_initiated`: Authorization flow started
- `oauth_token_exchanged`: Successful token exchange
- `oauth_token_exchange_failed`: Failed token exchange
- `oauth_token_refreshed`: Successful token refresh
- `oauth_token_refresh_failed`: Failed token refresh
- `connection_tested`: Connection health check performed
- `connection_test_failed`: Connection test failed

### Log Format
```json
{
  "timestamp": 1640995200000,
  "organizationId": "org_123456789",
  "userId": "user_987654321",
  "action": "oauth_token_exchanged",
  "resourceType": "erp_connection",
  "resourceId": "sage_intacct",
  "details": {
    "provider": "sage_intacct",
    "companyId": "INTACCT_COMPANY_123",
    "expiresAt": 1640998800000,
    "userAgent": "FinHelm.ai/1.0",
    "ipAddress": "192.168.1.100"
  }
}
```

## Compliance Features

### Data Classification
- All OAuth tokens are classified as "confidential"
- Audit logs are retained for 7 years for compliance
- PII is automatically detected and masked in logs

### Consent Management
- User consent is tracked for data access
- Consent can be revoked, causing token deletion
- Consent status is included in audit logs

### Data Retention
- Access tokens: Deleted after expiration (max 1 hour)
- Refresh tokens: Rotated every use, deleted after 90 days inactive
- Audit logs: Retained for 7 years
- Connection metadata: Deleted when connection is removed

## SDKs and Integration Examples

### JavaScript/TypeScript (Convex)

```typescript
import { api } from "./convex/_generated/api";
import { useConvexAuth, useMutation, useAction } from "convex/react";

// Hook for OAuth authorization
const useOAuthAuthorize = () => {
  return useAction(api.erpAuth.authorize);
};

// Hook for token refresh
const useOAuthRefresh = () => {
  return useAction(api.erpAuth.refreshToken);
};

// Usage example
function OAuthIntegration() {
  const { isAuthenticated } = useConvexAuth();
  const authorize = useOAuthAuthorize();
  const refresh = useOAuthRefresh();

  const handleAuthorize = async () => {
    try {
      const result = await authorize({
        provider: "sage_intacct",
        organizationId: "org_123456789"
      });
      
      // Redirect to OAuth provider
      window.location.href = result.authorizationUrl;
    } catch (error) {
      console.error("OAuth authorization failed:", error);
    }
  };

  const handleRefresh = async (connectionId: string) => {
    try {
      await refresh({ connectionId });
      console.log("Token refreshed successfully");
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleAuthorize}>
        Connect to Sage Intacct
      </button>
    </div>
  );
}
```

### cURL Examples

#### Complete OAuth Flow

1. **Start Authorization**
```bash
curl -X POST https://app.finhelm.ai/oauth/authorize \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sage_intacct",
    "organizationId": "org_123456789"
  }'
```

2. **Exchange Code for Token** (after user authorizes)
```bash
curl -X POST https://app.finhelm.ai/oauth/token \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sage_intacct",
    "code": "authorization_code_from_callback",
    "state": "state_from_authorize_response"
  }'
```

3. **Test Connection**
```bash
curl -X POST https://app.finhelm.ai/oauth/test \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_from_token_response"
  }'
```

## Troubleshooting

### Common Issues

#### "Invalid client_id" Error
- Verify OAuth client credentials in environment variables
- Check that the provider app is properly registered
- Ensure redirect URIs match exactly

#### "Token refresh failed" Error
- Check if refresh token has expired (90 days max)
- Verify connection is still active
- Re-authorize if refresh token is invalid

#### "Connection test failed" Error
- Verify network connectivity to provider APIs
- Check if access token has expired
- Ensure user has necessary permissions in the ERP system

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export DEBUG=oauth:*
export LOG_LEVEL=debug
npm run dev
```

### Support

For OAuth API support:
- **Technical Issues**: engineering@finhelm.ai
- **Security Concerns**: security@finhelm.ai
- **Compliance Questions**: compliance@finhelm.ai

---

*This API documentation is maintained by the FinHelm.ai Engineering Team. Last updated: August 2024*