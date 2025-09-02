/**
 * QuickBooks Integration Module
 * Central export point for all QuickBooks functionality
 */

// Export auth functions
export {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeTokens,
  checkTokenValidity,
  QuickBooksAuthError,
  type OAuthConfig,
  type TokenResponse,
  type PKCEChallenge,
} from "./auth";

// Export token management functions
export {
  storeTokens,
  getTokens,
  autoRefreshToken,
  scheduleTokenRefresh,
  clearTokens,
  getTokenStatus,
  ensureValidToken,
  type StoredToken,
  type RefreshConfig,
} from "./tokenManager";

// Export API client and functions
export {
  QuickBooksClient,
  createClient,
  syncInvoices,
  syncBills,
  syncAccounts,
  type Invoice,
  type Bill,
  type Account,
  type QueryResponse,
  type ErrorResponse,
} from "./api";

/**
 * QuickBooks OAuth 2.0 Implementation Summary
 * 
 * This module provides complete QuickBooks OAuth 2.0 integration with:
 * 
 * 1. Authentication (auth.ts):
 *    - OAuth 2.0 flow with PKCE for enhanced security
 *    - Token exchange and refresh functionality
 *    - Automatic token expiry handling
 *    - Secure state management for CSRF protection
 * 
 * 2. Token Management (tokenManager.ts):
 *    - AES-256-GCM encryption for token storage
 *    - Automatic token refresh before expiry
 *    - Scheduled refresh with configurable buffer time
 *    - Token validation and status checking
 * 
 * 3. API Client (api.ts):
 *    - Rate limiting (500 req/min, 10k req/day)
 *    - Automatic retry with exponential backoff
 *    - Query builder for invoices, bills, and accounts
 *    - Full CRUD operations support
 *    - Batch sync functionality
 * 
 * Environment Variables Required:
 * - QUICKBOOKS_CLIENT_ID: OAuth app client ID
 * - QUICKBOOKS_CLIENT_SECRET: OAuth app client secret
 * - QUICKBOOKS_REDIRECT_URI: OAuth callback URL
 * - QUICKBOOKS_ENVIRONMENT: "sandbox" or "production"
 * - QUICKBOOKS_TOKEN_ENCRYPTION_KEY: 64 hex characters for AES-256
 * 
 * Usage Example:
 * ```typescript
 * // 1. Generate auth URL for user
 * const { authUrl, state } = await generateAuthUrl({
 *   companyId: companyId,
 *   scopes: ["com.intuit.quickbooks.accounting"]
 * });
 * 
 * // 2. After user authorizes, exchange code for tokens
 * await exchangeCodeForToken({
 *   companyId: companyId,
 *   code: authCode,
 *   state: state,
 *   realmId: realmId
 * });
 * 
 * // 3. Schedule automatic token refresh
 * await scheduleTokenRefresh({ companyId });
 * 
 * // 4. Use API client to fetch data
 * await syncInvoices({ companyId });
 * await syncBills({ companyId });
 * await syncAccounts({ companyId });
 * ```
 */

// Helper function to generate encryption key
export function generateEncryptionKey(): string {
  // Generate a random key for simple obfuscation
  // For production, use a proper key management service
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Export helper to validate environment setup
export function validateEnvironment(): {
  isValid: boolean;
  missing: string[];
} {
  const required = [
    "QUICKBOOKS_CLIENT_ID",
    "QUICKBOOKS_CLIENT_SECRET",
    "QUICKBOOKS_REDIRECT_URI",
    "QUICKBOOKS_TOKEN_ENCRYPTION_KEY",
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}