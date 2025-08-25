# OAuth2 Setup Guide for FinHelm.ai

This guide covers the complete setup and configuration of OAuth2 authentication for Sage Intacct and QuickBooks integration in FinHelm.ai.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Sage Intacct OAuth2 Setup](#sage-intacct-oauth2-setup)
3. [QuickBooks OAuth2 Setup](#quickbooks-oauth2-setup)
4. [Environment Configuration](#environment-configuration)
5. [Development Setup](#development-setup)
6. [Production Deployment](#production-deployment)
7. [Testing OAuth Flows](#testing-oauth-flows)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Compliance & Audit](#compliance--audit)

## 🔧 Prerequisites

### System Requirements
- Node.js 18+ and npm 8+
- Convex account and deployment
- Valid FinHelm.ai development environment
- Access to ERP provider developer portals

### Required Accounts
- **Sage Intacct**: Developer account with OAuth2 app registration access
- **QuickBooks**: Intuit Developer account for QuickBooks app creation
- **FinHelm.ai**: Admin access to configure OAuth settings

### Knowledge Requirements
- Understanding of OAuth2 authorization flow
- Basic familiarity with Convex actions and database operations
- Knowledge of environment variable management
- Understanding of role-based access control (RBAC)

## 🏢 Sage Intacct OAuth2 Setup

### Step 1: Register OAuth Application

1. **Access Sage Intacct Developer Portal**
   - Navigate to [Sage Intacct Developer Portal](https://developer.intacct.com/)
   - Sign in with your developer account credentials

2. **Create New OAuth Application**
   ```
   Application Name: FinHelm.ai OAuth Integration
   Description: AI-powered financial management platform integration
   Application Type: Web Application
   Redirect URIs:
     - Development: http://localhost:3000/oauth/sage-intacct/callback
     - Staging: https://staging.finhelm.ai/oauth/sage-intacct/callback
     - Production: https://app.finhelm.ai/oauth/sage-intacct/callback
   ```

3. **Configure OAuth Scopes**
   - `openid`: Basic authentication
   - `profile`: User profile information
   - `company`: Company data access
   - `accounting`: Financial data access (if available)

4. **Note Application Credentials**
   ```
   Client ID: [Your Sage Intacct Client ID]
   Client Secret: [Your Sage Intacct Client Secret]
   ```

### Step 2: Web Services Configuration

1. **Enable Web Services**
   - In Sage Intacct, go to Company → Admin → Web Services
   - Enable "Web Services" for your company
   - Note the Sender ID and Sender Password

2. **Create Application User**
   ```
   User ID: finhelm_oauth_user
   Password: [Secure password]
   Role: Full access or custom role with required permissions
   ```

### Step 3: Sandbox Environment Setup

1. **Request Sandbox Access**
   - Contact Sage Intacct support for sandbox environment access
   - Provide your application details and use case

2. **Configure Sandbox Endpoints**
   ```
   Discovery URL: https://api-sandbox.intacct.com/oauth2/.well-known/openid_configuration
   Token URL: https://api-sandbox.intacct.com/oauth2/token
   Revoke URL: https://api-sandbox.intacct.com/oauth2/revoke
   API Base URL: https://api-sandbox.intacct.com
   ```

## 💼 QuickBooks OAuth2 Setup

### Step 1: Create Intuit Developer Account

1. **Register Developer Account**
   - Go to [Intuit Developer Portal](https://developer.intuit.com/)
   - Create account or sign in with existing credentials

2. **Create New App**
   ```
   App Name: FinHelm.ai QuickBooks Integration
   Description: AI-powered financial management and analysis
   Platform: QuickBooks Online
   ```

### Step 2: Configure OAuth Settings

1. **OAuth 2.0 Configuration**
   ```
   Redirect URIs:
     - Development: http://localhost:3000/oauth/quickbooks/callback
     - Staging: https://staging.finhelm.ai/oauth/quickbooks/callback
     - Production: https://app.finhelm.ai/oauth/quickbooks/callback
   ```

2. **Scope Selection**
   - `com.intuit.quickbooks.accounting`: Full accounting access
   - Additional scopes as needed for specific features

3. **Note Application Credentials**
   ```
   Client ID: [Your QuickBooks App ID]
   Client Secret: [Your QuickBooks Client Secret]
   ```

### Step 3: Sandbox Company Setup

1. **Create Test Company**
   - Use QuickBooks Sandbox to create test company
   - Populate with sample data for testing

2. **Configure Sandbox Endpoints**
   ```
   Base URL: https://sandbox-quickbooks.api.intuit.com
   Discovery Document: https://appcenter.intuit.com/api/v1/openid_connect/discovery
   ```

## ⚙️ Environment Configuration

### Development Environment (.env)

Create a `.env` file based on `.env.example`:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual credentials
nano .env
```

### Required Environment Variables

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your-convex-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Sage Intacct OAuth2
SAGE_INTACCT_CLIENT_ID=your-sage-intacct-client-id
SAGE_INTACCT_CLIENT_SECRET=your-sage-intacct-client-secret
SAGE_INTACCT_REDIRECT_URI=http://localhost:3000/oauth/sage-intacct/callback
SAGE_INTACCT_DISCOVERY_URL=https://api-sandbox.intacct.com/oauth2/.well-known/openid_configuration
SAGE_INTACCT_TOKEN_URL=https://api-sandbox.intacct.com/oauth2/token
SAGE_INTACCT_API_URL=https://api-sandbox.intacct.com

# Sage Intacct Web Services (for XML API fallback)
SAGE_INTACCT_SENDER_ID=your-sender-id
SAGE_INTACCT_SENDER_PASSWORD=your-sender-password
SAGE_INTACCT_USER_ID=your-user-id
SAGE_INTACCT_COMPANY_ID=your-company-id
SAGE_INTACCT_USER_PASSWORD=your-user-password

# QuickBooks OAuth2
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/oauth/quickbooks/callback

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
OAUTH_TOKEN_ENCRYPTION_KEY=your-32-char-encryption-key-here
SESSION_SECRET=your-session-secret-key

# Compliance & Audit
ENABLE_COMPLIANCE_MONITORING=true
AUDIT_LOG_LEVEL=info
TOKEN_RETENTION_DAYS=90
DATA_CLASSIFICATION=confidential
```

### Environment-Specific Configuration

#### Staging Environment
```bash
NODE_ENV=staging
SAGE_INTACCT_REDIRECT_URI=https://staging.finhelm.ai/oauth/sage-intacct/callback
QUICKBOOKS_REDIRECT_URI=https://staging.finhelm.ai/oauth/quickbooks/callback
```

#### Production Environment
```bash
NODE_ENV=production
SAGE_INTACCT_DISCOVERY_URL=https://api.intacct.com/oauth2/.well-known/openid_configuration
SAGE_INTACCT_TOKEN_URL=https://api.intacct.com/oauth2/token
SAGE_INTACCT_API_URL=https://api.intacct.com
SAGE_INTACCT_REDIRECT_URI=https://app.finhelm.ai/oauth/sage-intacct/callback
QUICKBOOKS_REDIRECT_URI=https://app.finhelm.ai/oauth/quickbooks/callback
```

## 🛠️ Development Setup

### Step 1: Install Dependencies

```bash
# Install project dependencies
npm install

# Verify intuit-oauth is installed
npm list intuit-oauth
```

### Step 2: Database Schema Setup

```bash
# Deploy Convex schema with OAuth extensions
npx convex dev
npx convex deploy
```

### Step 3: Verify Configuration

```bash
# Test environment variables
npm run test:oauth

# Run OAuth-specific tests
npm run test convex/tests/erp-auth.test.ts
```

### Step 4: Local Development

```bash
# Start development server
npm run dev:workspaces

# Test OAuth flows at:
# http://localhost:3000/oauth/sage-intacct/authorize
# http://localhost:3000/oauth/quickbooks/authorize
```

## 🚀 Production Deployment

### Step 1: Production App Registration

1. **Update OAuth Apps for Production**
   - Sage Intacct: Update redirect URIs to production URLs
   - QuickBooks: Update redirect URIs to production URLs

2. **Security Review**
   - Rotate all client secrets
   - Update environment variables
   - Enable production security features

### Step 2: Environment Preparation

```bash
# Set production environment variables
export NODE_ENV=production
export SAGE_INTACCT_DISCOVERY_URL=https://api.intacct.com/oauth2/.well-known/openid_configuration
# ... other production variables

# Deploy to production
npx convex deploy --prod
```

### Step 3: Health Checks

```bash
# Test OAuth endpoints
curl -X POST /api/oauth/sage-intacct/test
curl -X POST /api/oauth/quickbooks/test

# Verify compliance logging
tail -f /var/log/finhelm/oauth-audit.log
```

## 🧪 Testing OAuth Flows

### Unit Testing

```bash
# Run OAuth unit tests
npm run test:oauth

# Run with coverage
npm run test:coverage
```

### Integration Testing

```bash
# Test with sandbox APIs
RUN_INTEGRATION_TESTS=true npm run test:integration

# Test specific provider
npm test -- --grep "Sage Intacct"
npm test -- --grep "QuickBooks"
```

### Manual Testing

#### Sage Intacct OAuth Flow
1. Navigate to authorization endpoint
2. Complete OAuth authorization
3. Verify token exchange
4. Test API connectivity
5. Verify token refresh

#### QuickBooks OAuth Flow
1. Navigate to authorization endpoint
2. Select sandbox company
3. Complete OAuth authorization
4. Verify token storage
5. Test API calls

### Role-Based Access Testing

```bash
# Test admin user OAuth flow
curl -X POST /api/oauth/authorize \
  -H "Authorization: Bearer admin-token" \
  -d '{"provider": "sage_intacct", "organizationId": "org-123"}'

# Test compliance agent token refresh
curl -X POST /api/oauth/refresh \
  -H "Authorization: Bearer compliance-token" \
  -d '{"connectionId": "conn-123"}'
```

## 🔧 Troubleshooting

### Common Issues

#### 1. OAuth Authorization Fails

**Symptoms:**
- Users redirected to error page
- "Invalid client_id" error
- "Redirect URI mismatch" error

**Solutions:**
```bash
# Verify client credentials
echo $SAGE_INTACCT_CLIENT_ID
echo $QUICKBOOKS_CLIENT_ID

# Check redirect URI configuration
curl -v https://api-sandbox.intacct.com/oauth2/.well-known/openid_configuration

# Verify redirect URI matches exactly
grep REDIRECT_URI .env
```

#### 2. Token Exchange Errors

**Symptoms:**
- "Invalid grant" error
- "Authorization code expired" error
- Token exchange timeout

**Solutions:**
```bash
# Check authorization code validity (must be used immediately)
# Verify token endpoint configuration
curl -X POST https://api-sandbox.intacct.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=test&client_id=$SAGE_INTACCT_CLIENT_ID"

# Test network connectivity to token endpoint
telnet api-sandbox.intacct.com 443
```

#### 3. Token Refresh Issues

**Symptoms:**
- "Invalid refresh token" error
- Tokens not updating in database
- Refresh token expired

**Solutions:**
```bash
# Check refresh token storage
npx convex run oauth:getConnection --connectionId "conn-123"

# Test refresh token manually
curl -X POST /api/oauth/refresh \
  -H "Content-Type: application/json" \
  -d '{"connectionId": "conn-123"}'

# Verify token encryption/decryption
node -e "console.log(process.env.OAUTH_TOKEN_ENCRYPTION_KEY?.length)"
```

#### 4. API Connectivity Problems

**Symptoms:**
- "Connection test failed" errors
- Timeout errors during API calls
- Authentication errors with valid tokens

**Solutions:**
```bash
# Test Sage Intacct XML API
curl -X POST https://api-sandbox.intacct.com/ia/xml/xmlgw.phtml \
  -H "Content-Type: application/xml" \
  -d @test-request.xml

# Test QuickBooks API
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://sandbox-quickbooks.api.intuit.com/v3/company/$REALM_ID/companyinfo/$REALM_ID"

# Check firewall/network rules
ping api-sandbox.intacct.com
ping sandbox-quickbooks.api.intuit.com
```

### Debugging Tools

#### Enable Debug Logging
```bash
# Enable OAuth debug logs
export DEBUG=oauth:*
export LOG_LEVEL=debug

# Enable intuit-oauth library logging
export INTUIT_OAUTH_DEBUG=true
```

#### Database Debugging
```bash
# Check OAuth tokens table
npx convex run debug:listOAuthTokens

# Check audit logs
npx convex run debug:getAuditLogs --action "oauth_*"

# Monitor connection status
npx convex run oauth:getConnectionStatus --organizationId "org-123"
```

## 🔒 Security Considerations

### Token Security

1. **Encryption at Rest**
   - All tokens encrypted using AES-256
   - Encryption keys rotated regularly
   - Key versioning implemented

2. **Transmission Security**
   - HTTPS required for all OAuth flows
   - TLS 1.2+ enforced
   - Certificate pinning in production

3. **Token Lifecycle Management**
   ```bash
   # Automatic token cleanup
   npx convex run oauth:cleanupExpiredTokens
   
   # Token rotation schedule
   0 2 * * * /usr/local/bin/rotate-oauth-tokens.sh
   ```

### Access Control

1. **Role-Based Permissions**
   - Admin: Full OAuth management
   - Compliance Agent: Token refresh and monitoring
   - Data Sync Agent: Connection testing only
   - User: Authorization initiation only
   - Viewer: No OAuth access

2. **Organization-Level Isolation**
   - Users can only access their organization's OAuth connections
   - Cross-organization access prevented
   - Audit trails maintain organization context

### Rate Limiting

```bash
# OAuth-specific rate limits
OAUTH_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
OAUTH_RATE_LIMIT_MAX_REQUESTS=10   # 10 requests per window per user
```

### Audit & Monitoring

1. **Comprehensive Logging**
   - All OAuth operations logged
   - Failed attempts tracked with details
   - Token usage monitored
   - Compliance events recorded

2. **Alerting**
   ```bash
   # Set up monitoring alerts
   # Multiple failed OAuth attempts
   # Token refresh failures
   # Unusual access patterns
   # Compliance violations
   ```

## 📊 Compliance & Audit

### Regulatory Requirements

1. **SOX Compliance**
   - Complete audit trail of financial data access
   - User access logging and monitoring
   - Regular access reviews and certifications

2. **GDPR Compliance**
   - Data subject consent tracking
   - Right to erasure implementation
   - Data processing purpose limitation

3. **Industry Standards**
   - OAuth 2.0 RFC 6749 compliance
   - PKCE implementation for enhanced security
   - OpenID Connect compatibility

### Audit Procedures

1. **Regular Access Reviews**
   ```bash
   # Generate OAuth access report
   npx convex run audit:generateOAuthAccessReport --month $(date +%Y-%m)
   
   # Review user permissions
   npx convex run audit:reviewUserPermissions --organizationId "org-123"
   ```

2. **Compliance Monitoring**
   ```bash
   # Check compliance status
   npx convex run compliance:checkOAuthCompliance
   
   # Generate audit report
   npx convex run audit:generateComplianceReport --startDate "2024-01-01" --endDate "2024-12-31"
   ```

3. **Security Assessments**
   - Quarterly OAuth security reviews
   - Annual penetration testing
   - Regular vulnerability assessments

### Documentation Maintenance

1. **Keep Documentation Current**
   - Update OAuth setup instructions
   - Maintain API documentation
   - Document configuration changes

2. **Compliance Documentation**
   - Data flow diagrams
   - Security control documentation
   - Incident response procedures

---

## 📞 Support & Resources

### Internal Support
- **Engineering Team**: engineering@finhelm.ai
- **Security Team**: security@finhelm.ai
- **Compliance Team**: compliance@finhelm.ai

### External Resources
- **Sage Intacct Developer Portal**: https://developer.intacct.com/
- **QuickBooks API Documentation**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting
- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749

### Emergency Contacts
- **Production Issues**: +1-555-FINHELM (24/7)
- **Security Incidents**: security-incident@finhelm.ai
- **Compliance Concerns**: compliance-urgent@finhelm.ai

---

*This guide is maintained by the FinHelm.ai Engineering Team. Last updated: August 2024*