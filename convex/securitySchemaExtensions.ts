import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Security-related table definitions to be added to the main schema.ts
 * These tables support the security features implemented in securityService.ts
 */

/**
 * CSRF Tokens table for CSRF protection
 * Add this to the main schema.ts
 */
export const csrfTokensTable = defineTable({
  token: v.string(),
  userId: v.id("users"),
  sessionId: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  used: v.boolean(),
  usedAt: v.optional(v.number()),
})
  .index("by_token", ["token"])
  .index("by_user_session", ["userId", "sessionId"])
  .index("by_expires", ["expiresAt"])
  .index("by_token_user", ["token", "userId"]);

/**
 * Rate Limits table for API rate limiting
 * Add this to the main schema.ts
 */
export const rateLimitsTable = defineTable({
  key: v.string(), // IP address, user ID, or API key
  endpoint: v.string(),
  requestCount: v.number(),
  windowStart: v.number(),
  windowSizeMs: v.number(),
  maxRequests: v.number(),
  lastRequestAt: v.number(),
  blocked: v.boolean(),
  blockedUntil: v.optional(v.number()),
})
  .index("by_key_endpoint", ["key", "endpoint"])
  .index("by_endpoint_window", ["endpoint", "windowStart"])
  .index("by_blocked_until", ["blockedUntil"])
  .index("by_last_request", ["lastRequestAt"])
  .index("by_key_blocked", ["key", "blocked"]);

/**
 * Security Events table for audit logging
 * Extends the existing auditLogs table with security-specific events
 */
export const securityEventsTable = defineTable({
  organizationId: v.optional(v.id("organizations")),
  userId: v.optional(v.id("users")),
  eventType: v.union(
    v.literal("rate_limit_exceeded"),
    v.literal("csrf_token_invalid"),
    v.literal("webhook_validation_failed"),
    v.literal("oauth_token_refreshed"),
    v.literal("oauth_refresh_failed"),
    v.literal("api_key_rotated"),
    v.literal("suspicious_login"),
    v.literal("failed_authentication"),
    v.literal("account_locked"),
    v.literal("privilege_escalation_attempt"),
    v.literal("data_export_requested"),
    v.literal("bulk_operation_performed"),
  ),
  severity: v.union(
    v.literal("info"),
    v.literal("warning"),
    v.literal("high"),
    v.literal("critical")
  ),
  details: v.object({}),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  timestamp: v.number(),
  resolved: v.boolean(),
  resolvedAt: v.optional(v.number()),
  resolvedBy: v.optional(v.id("users")),
  notes: v.optional(v.string()),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_event_type", ["eventType"])
  .index("by_severity", ["severity"])
  .index("by_timestamp", ["timestamp"])
  .index("by_org_timestamp", ["organizationId", "timestamp"])
  .index("by_severity_timestamp", ["severity", "timestamp"])
  .index("by_resolved", ["resolved"])
  .index("by_event_severity", ["eventType", "severity"]);

/**
 * Session Management table for secure session handling
 */
export const sessionsTable = defineTable({
  sessionId: v.string(),
  userId: v.id("users"),
  organizationId: v.optional(v.id("organizations")),
  ipAddress: v.string(),
  userAgent: v.string(),
  isActive: v.boolean(),
  createdAt: v.number(),
  lastAccessedAt: v.number(),
  expiresAt: v.number(),
  csrfToken: v.optional(v.string()),
  metadata: v.optional(v.object({
    loginMethod: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    location: v.optional(v.object({
      country: v.string(),
      city: v.optional(v.string()),
    })),
  })),
})
  .index("by_session_id", ["sessionId"])
  .index("by_user", ["userId"])
  .index("by_user_active", ["userId", "isActive"])
  .index("by_expires", ["expiresAt"])
  .index("by_last_accessed", ["lastAccessedAt"])
  .index("by_ip_address", ["ipAddress"]);

/**
 * Login Attempts table for monitoring authentication
 */
export const loginAttemptsTable = defineTable({
  identifier: v.string(), // email or username
  ipAddress: v.string(),
  successful: v.boolean(),
  failureReason: v.optional(v.union(
    v.literal("invalid_credentials"),
    v.literal("account_locked"),
    v.literal("account_disabled"),
    v.literal("rate_limited"),
    v.literal("mfa_required"),
    v.literal("mfa_failed")
  )),
  userAgent: v.string(),
  timestamp: v.number(),
  userId: v.optional(v.id("users")),
  organizationId: v.optional(v.id("organizations")),
  metadata: v.optional(v.object({})),
})
  .index("by_identifier", ["identifier"])
  .index("by_ip_address", ["ipAddress"])
  .index("by_timestamp", ["timestamp"])
  .index("by_successful", ["successful"])
  .index("by_identifier_timestamp", ["identifier", "timestamp"])
  .index("by_ip_timestamp", ["ipAddress", "timestamp"])
  .index("by_user_timestamp", ["userId", "timestamp"]);

/**
 * Data Encryption Keys table for encryption at rest
 */
export const encryptionKeysTable = defineTable({
  organizationId: v.id("organizations"),
  keyType: v.union(
    v.literal("data_encryption"),
    v.literal("backup_encryption"),
    v.literal("webhook_signing"),
    v.literal("api_signing")
  ),
  keyId: v.string(), // Key identifier (not the actual key)
  algorithm: v.string(),
  isActive: v.boolean(),
  createdAt: v.number(),
  rotatedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  rotationSchedule: v.optional(v.union(
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("yearly"),
    v.literal("manual")
  )),
  usageCount: v.number(),
  maxUsage: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_key_type", ["keyType"])
  .index("by_key_id", ["keyId"])
  .index("by_active", ["isActive"])
  .index("by_expires", ["expiresAt"])
  .index("by_org_type", ["organizationId", "keyType"]);

/**
 * Webhook Deliveries table for webhook security monitoring
 */
export const webhookDeliveriesTable = defineTable({
  organizationId: v.id("organizations"),
  webhookUrl: v.string(),
  event: v.string(),
  payload: v.string(),
  signature: v.string(),
  attempts: v.number(),
  successful: v.boolean(),
  statusCode: v.optional(v.number()),
  responseTime: v.optional(v.number()),
  lastAttemptAt: v.number(),
  nextRetryAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_url", ["webhookUrl"])
  .index("by_event", ["event"])
  .index("by_successful", ["successful"])
  .index("by_created_at", ["createdAt"])
  .index("by_next_retry", ["nextRetryAt"])
  .index("by_org_event", ["organizationId", "event"]);

/**
 * Security Policies table for organization-specific security settings
 */
export const securityPoliciesTable = defineTable({
  organizationId: v.id("organizations"),
  policyType: v.union(
    v.literal("password_policy"),
    v.literal("session_policy"),
    v.literal("mfa_policy"),
    v.literal("api_access_policy"),
    v.literal("data_retention_policy"),
    v.literal("encryption_policy")
  ),
  settings: v.object({
    enabled: v.boolean(),
    rules: v.object({}),
    exemptions: v.optional(v.array(v.string())),
    lastReview: v.optional(v.number()),
    reviewInterval: v.optional(v.number()),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  lastUpdatedBy: v.id("users"),
  version: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_policy_type", ["policyType"])
  .index("by_org_type", ["organizationId", "policyType"])
  .index("by_updated", ["updatedAt"]);

// Usage example for adding to main schema.ts:
/*
import { 
  csrfTokensTable,
  rateLimitsTable,
  securityEventsTable,
  sessionsTable,
  loginAttemptsTable,
  encryptionKeysTable,
  webhookDeliveriesTable,
  securityPoliciesTable
} from "./securitySchemaExtensions";

export default defineSchema({
  // ... existing tables ...
  
  // Security tables
  csrfTokens: csrfTokensTable,
  rateLimits: rateLimitsTable,
  securityEvents: securityEventsTable,
  sessions: sessionsTable,
  loginAttempts: loginAttemptsTable,
  encryptionKeys: encryptionKeysTable,
  webhookDeliveries: webhookDeliveriesTable,
  securityPolicies: securityPoliciesTable,
});
*/