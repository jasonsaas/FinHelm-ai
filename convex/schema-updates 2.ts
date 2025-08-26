/**
 * FinHelm.ai Schema Updates for OAuth2 Support
 * Additional schema tables required for ERP OAuth2 authentication
 * 
 * Add these tables to your existing convex/schema.ts file
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// OAuth State Management for secure OAuth2 flows
export const oauthStates = defineTable({
  userId: v.id("users"),
  organizationId: v.optional(v.id("organizations")),
  erpType: v.union(
    v.literal("sage_intacct"),
    v.literal("quickbooks"),
    v.literal("netsuite"),
    v.literal("xero")
  ),
  state: v.string(), // Secure random state parameter
  nonce: v.string(), // Additional security nonce
  codeVerifier: v.optional(v.string()), // PKCE code verifier
  userRole: v.string(), // User role at time of OAuth initiation
  permissions: v.array(v.string()), // User permissions at time of OAuth
  createdAt: v.number(),
  expiresAt: v.number(), // OAuth state expiration (15 minutes)
})
  .index("by_state", ["state"])
  .index("by_user", ["userId"])
  .index("by_expiry", ["expiresAt"])
  .index("by_erp_type", ["erpType"]);

// Extended ERP Connections table (if not already present in your schema)
export const erpConnectionsExtended = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"), // User who created the connection
  erpType: v.union(
    v.literal("quickbooks"),
    v.literal("sage_intacct"), 
    v.literal("netsuite"),
    v.literal("xero")
  ),
  connectionName: v.string(),
  isActive: v.boolean(),
  
  // Enhanced credential storage
  credentials: v.object({
    // OAuth2 tokens (encrypted)
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()), // Usually "Bearer"
    
    // ERP-specific identifiers
    companyId: v.optional(v.string()), // Sage Intacct company ID
    realmId: v.optional(v.string()), // QuickBooks realm ID
    tenantId: v.optional(v.string()), // Generic tenant ID
    
    // Token metadata
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    issuedAt: v.optional(v.number()),
    
    // Connection metadata
    apiVersion: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    environment: v.optional(v.union(v.literal("sandbox"), v.literal("production"))),
  }),
  
  // Connection health and sync status
  lastSyncAt: v.optional(v.number()),
  lastHealthCheck: v.optional(v.number()),
  syncStatus: v.union(
    v.literal("active"),
    v.literal("failed"), 
    v.literal("pending"),
    v.literal("disabled"),
    v.literal("token_expired")
  ),
  
  // Error tracking
  lastError: v.optional(v.object({
    message: v.string(),
    code: v.optional(v.string()),
    timestamp: v.number(),
    retry_count: v.optional(v.number()),
  })),
  
  // OAuth-specific metadata
  oauthMetadata: v.optional(v.object({
    authorizationUrl: v.optional(v.string()),
    tokenUrl: v.optional(v.string()),
    userInfoUrl: v.optional(v.string()),
    revokeUrl: v.optional(v.string()),
    lastTokenRefresh: v.optional(v.number()),
    refreshAttempts: v.optional(v.number()),
  })),
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_erp_type", ["erpType"])
  .index("by_sync_status", ["syncStatus"])
  .index("by_active", ["isActive"])
  .index("by_health_check", ["lastHealthCheck"])
  .index("by_token_expiry", ["credentials.expiresAt"]);

// OAuth Token Refresh Log for audit and debugging
export const oauthTokenRefreshLog = defineTable({
  connectionId: v.id("erpConnections"),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  erpType: v.union(
    v.literal("sage_intacct"),
    v.literal("quickbooks"),
    v.literal("netsuite"), 
    v.literal("xero")
  ),
  
  // Refresh attempt details
  refreshAttempt: v.number(), // Attempt number for this connection
  success: v.boolean(),
  
  // Token details (non-sensitive)
  oldTokenExpiresAt: v.optional(v.number()),
  newTokenExpiresAt: v.optional(v.number()),
  tokenScope: v.optional(v.string()),
  
  // Error information
  error: v.optional(v.object({
    code: v.string(),
    message: v.string(),
    httpStatus: v.optional(v.number()),
    retryable: v.boolean(),
  })),
  
  // Performance tracking
  refreshDurationMs: v.optional(v.number()),
  
  // Compliance tracking
  triggeredBy: v.union(
    v.literal("automatic"), // System-triggered refresh
    v.literal("manual"), // User-triggered refresh
    v.literal("api_error"), // Triggered by API error
    v.literal("pre_expiry") // Triggered before expiry
  ),
  
  timestamp: v.number(),
})
  .index("by_connection", ["connectionId"])
  .index("by_organization", ["organizationId"])
  .index("by_success", ["success"])
  .index("by_timestamp", ["timestamp"])
  .index("by_erp_type", ["erpType"])
  .index("by_triggered_by", ["triggeredBy"]);

// User OAuth Preferences
export const userOAuthPreferences = defineTable({
  userId: v.id("users"),
  organizationId: v.optional(v.id("organizations")),
  
  // OAuth preferences
  preferredErpType: v.optional(v.union(
    v.literal("sage_intacct"),
    v.literal("quickbooks"), 
    v.literal("netsuite"),
    v.literal("xero")
  )),
  
  // Notification preferences for OAuth events
  notifications: v.object({
    tokenExpiring: v.boolean(), // Notify when tokens are about to expire
    connectionFailed: v.boolean(), // Notify when connection fails
    refreshSuccessful: v.boolean(), // Notify when token refresh succeeds
    newConnectionCreated: v.boolean(), // Notify when new connection is created
  }),
  
  // Security preferences
  requireMfaForOAuth: v.optional(v.boolean()),
  allowedIpRanges: v.optional(v.array(v.string())),
  sessionTimeout: v.optional(v.number()), // Custom session timeout for this user
  
  // Compliance preferences
  auditLogRetention: v.optional(v.number()), // Custom audit log retention period
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_preferred_erp", ["preferredErpType"]);

/**
 * Example usage in your main schema file:
 * 
 * In convex/schema.ts, add these tables to your existing schema definition:
 * 
 * export default defineSchema({
 *   // ... your existing tables ...
 *   
 *   // OAuth2 support tables
 *   oauthStates: oauthStates,
 *   oauthTokenRefreshLog: oauthTokenRefreshLog, 
 *   userOAuthPreferences: userOAuthPreferences,
 *   
 *   // Update your existing erpConnections table with the enhanced structure
 *   // OR rename it to erpConnectionsLegacy and use erpConnectionsExtended
 * });
 */

export default {
  oauthStates,
  erpConnectionsExtended,
  oauthTokenRefreshLog,
  userOAuthPreferences,
};