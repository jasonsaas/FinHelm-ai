import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

/**
 * Enhanced Database Schema with Optimized Indexes
 * This file contains the additional tables and index optimizations
 * that should be added to the main schema.ts
 */

/**
 * Cache entries table for API response caching
 * Add this to the main schema.ts
 */
export const cacheEntriesTable = defineTable({
  key: v.string(),
  value: v.any(),
  expiresAt: v.number(),
  organizationId: v.id("organizations"),
  cacheType: v.union(
    v.literal("qb_reports"),
    v.literal("qb_customers"),
    v.literal("qb_items"), 
    v.literal("dashboard_metrics"),
    v.literal("search_results"),
    v.literal("ai_responses"),
    v.literal("account_balances")
  ),
  createdAt: v.number(),
  accessCount: v.number(),
  lastAccessedAt: v.number(),
  sizeBytes: v.optional(v.number()),
})
  .index("by_key", ["key"])
  .index("by_expires", ["expiresAt"])
  .index("by_organization_type", ["organizationId", "cacheType"])
  .index("by_last_accessed", ["lastAccessedAt"])
  .index("by_organization_expires", ["organizationId", "expiresAt"])
  .index("by_cache_type_expires", ["cacheType", "expiresAt"]);

/**
 * Compound indexes for transactions table - add these to existing transactions table
 */
export const transactionIndexes = [
  // Multi-field indexes for common query patterns
  .index("by_org_date", ["organizationId", "transactionDate"])
  .index("by_org_status_date", ["organizationId", "status", "transactionDate"])
  .index("by_account_date", ["accountId", "transactionDate"])
  .index("by_account_status", ["accountId", "status"])
  .index("by_org_type_date", ["organizationId", "type", "transactionDate"])
  .index("by_customer_date", ["customerId", "transactionDate"])
  .index("by_vendor_date", ["vendorId", "transactionDate"])
  .index("by_location_date", ["locationId", "transactionDate"])
  
  // Indexes for reconciliation and bulk operations
  .index("by_org_reconciliation", ["organizationId", "reconciliationStatus"])
  .index("by_external_id_org", ["externalId", "organizationId"])
  .index("by_reference_org", ["referenceNumber", "organizationId"])
  
  // Amount-based indexes for reporting
  .index("by_org_amount", ["organizationId", "amount"])
  .index("by_org_date_amount", ["organizationId", "transactionDate", "amount"])
];

/**
 * Account indexes for hierarchy and balance queries - add to existing accounts table
 */
export const accountIndexes = [
  // Hierarchy indexes
  .index("by_org_parent", ["organizationId", "parentId"])
  .index("by_org_level", ["organizationId", "level"])
  .index("by_org_type_level", ["organizationId", "type", "level"])
  
  // Balance and sync indexes  
  .index("by_org_balance", ["organizationId", "balance"])
  .index("by_org_sync", ["organizationId", "lastSyncAt"])
  .index("by_connection_sync", ["erpConnectionId", "lastSyncAt"])
  
  // Search and filtering indexes
  .index("by_org_active", ["organizationId", "isActive"])
  .index("by_org_type_active", ["organizationId", "type", "isActive"])
];

/**
 * Chat message indexes for conversation retrieval
 */
export const chatMessageIndexes = [
  // Session-based queries with time ordering
  .index("by_session_created", ["sessionId", "createdAt"])
  .index("by_org_user_created", ["organizationId", "userId", "createdAt"])
  .index("by_org_type_created", ["organizationId", "type", "createdAt"])
  
  // Agent execution tracking
  .index("by_agent_execution", ["agentExecutionId"])
  .index("by_org_agent_execution", ["organizationId", "agentExecutionId"])
];

/**
 * Agent execution indexes for performance monitoring
 */
export const agentExecutionIndexes = [
  // Performance monitoring indexes
  .index("by_org_started", ["organizationId", "startedAt"])
  .index("by_agent_started", ["agentId", "startedAt"])
  .index("by_org_status_started", ["organizationId", "status", "startedAt"])
  
  // User activity tracking
  .index("by_user_started", ["userId", "startedAt"])
  .index("by_org_user_started", ["organizationId", "userId", "startedAt"])
];

/**
 * Query performance monitoring table
 */
export const queryPerformanceTable = defineTable({
  queryName: v.string(),
  organizationId: v.optional(v.id("organizations")),
  executionTimeMs: v.number(),
  resultCount: v.number(),
  cacheHit: v.boolean(),
  parameters: v.optional(v.object({})),
  errorMessage: v.optional(v.string()),
  executedAt: v.number(),
  userId: v.optional(v.id("users")),
})
  .index("by_query_time", ["queryName", "executedAt"])
  .index("by_org_time", ["organizationId", "executedAt"]) 
  .index("by_performance", ["executionTimeMs"])
  .index("by_query_performance", ["queryName", "executionTimeMs"]);

/**
 * Rate limiting table for API endpoints
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
  .index("by_last_request", ["lastRequestAt"]);

/**
 * API key management for external integrations
 */
export const apiKeysTable = defineTable({
  organizationId: v.id("organizations"),
  keyName: v.string(),
  hashedKey: v.string(),
  service: v.union(
    v.literal("quickbooks"),
    v.literal("sage_intacct"),
    v.literal("openai"),
    v.literal("anthropic"),
    v.literal("webhook")
  ),
  permissions: v.array(v.string()),
  isActive: v.boolean(),
  expiresAt: v.optional(v.number()),
  lastUsedAt: v.optional(v.number()),
  usageCount: v.number(),
  maxUsage: v.optional(v.number()),
  rateLimitPerHour: v.optional(v.number()),
  createdAt: v.number(),
  rotatedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_service", ["service"])
  .index("by_hashed_key", ["hashedKey"])
  .index("by_expires", ["expiresAt"])
  .index("by_last_used", ["lastUsedAt"]);

/**
 * Audit logs with partitioning by time for efficient cleanup
 */
export const auditLogsIndexes = [
  // Time-based partitioning indexes
  .index("by_org_timestamp_desc", ["organizationId", "timestamp"])
  .index("by_user_timestamp_desc", ["userId", "timestamp"])
  .index("by_action_timestamp", ["action", "timestamp"])
  
  // Resource-based indexes
  .index("by_resource_type_timestamp", ["resourceType", "timestamp"])
  .index("by_org_resource_timestamp", ["organizationId", "resourceType", "timestamp"]),
];

/**
 * Batch processing jobs for data sync operations
 */
export const batchJobsTable = defineTable({
  organizationId: v.id("organizations"),
  jobType: v.union(
    v.literal("transaction_sync"),
    v.literal("account_sync"), 
    v.literal("customer_sync"),
    v.literal("reconciliation"),
    v.literal("cache_cleanup"),
    v.literal("audit_cleanup"),
    v.literal("report_generation")
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled")
  ),
  priority: v.union(
    v.literal("low"),
    v.literal("normal"),
    v.literal("high"),
    v.literal("critical")
  ),
  parameters: v.object({}),
  progress: v.number(), // 0-100
  recordsProcessed: v.number(),
  recordsTotal: v.number(),
  errorsEncountered: v.number(),
  lastError: v.optional(v.string()),
  scheduledAt: v.number(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  executionTimeMs: v.optional(v.number()),
  retryCount: v.number(),
  maxRetries: v.number(),
  nextRetryAt: v.optional(v.number()),
})
  .index("by_org_scheduled", ["organizationId", "scheduledAt"])
  .index("by_status_scheduled", ["status", "scheduledAt"])
  .index("by_type_status", ["jobType", "status"])
  .index("by_priority_scheduled", ["priority", "scheduledAt"])
  .index("by_org_type_status", ["organizationId", "jobType", "status"])
  .index("by_next_retry", ["nextRetryAt"]);