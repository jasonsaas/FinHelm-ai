import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Security Configuration and Constants
 * Centralized security settings and utilities for the FinHelm.ai application
 */

/**
 * Security Configuration Constants
 */
export const SECURITY_CONFIG = {
  // Rate Limiting
  RATE_LIMITS: {
    API_DEFAULT: { requests: 100, windowMs: 60 * 1000 }, // 100 per minute
    AI_ENDPOINTS: { requests: 10, windowMs: 60 * 1000 }, // 10 per minute
    AUTH_ENDPOINTS: { requests: 5, windowMs: 60 * 1000 }, // 5 per minute
    WEBHOOK_ENDPOINTS: { requests: 50, windowMs: 60 * 1000 }, // 50 per minute
    BULK_OPERATIONS: { requests: 2, windowMs: 60 * 1000 }, // 2 per minute
  },
  
  // Session Management
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    IDLE_TIMEOUT: 4 * 60 * 60 * 1000, // 4 hours
    MAX_CONCURRENT_SESSIONS: 5,
    REQUIRE_SECURE_COOKIES: true,
    SESSION_ROTATION_INTERVAL: 60 * 60 * 1000, // 1 hour
  },
  
  // CSRF Protection
  CSRF: {
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
    REQUIRE_SAME_ORIGIN: true,
  },
  
  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_AGE_DAYS: 90,
    PREVENT_REUSE_COUNT: 5,
  },
  
  // Encryption
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_ROTATION_INTERVAL: 90 * 24 * 60 * 60 * 1000, // 90 days
    BACKUP_KEY_COUNT: 3,
  },
  
  // Audit Logging
  AUDIT: {
    RETENTION_DAYS: 365,
    HIGH_SECURITY_RETENTION_DAYS: 2555, // 7 years
    LOG_ALL_DATA_ACCESS: true,
    LOG_FAILED_ATTEMPTS: true,
  },
  
  // Content Security Policy
  CSP: {
    REPORT_URI: '/api/csp-report',
    ENFORCE_HTTPS: true,
    ALLOW_UNSAFE_INLINE: false, // Set to false for production
  },
  
  // API Security
  API: {
    MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
    REQUIRE_API_KEY: true,
    API_KEY_ROTATION_DAYS: 30,
    WEBHOOK_TIMEOUT_MS: 30 * 1000, // 30 seconds
  }
};

/**
 * Security Policy Management
 */
export const getSecurityPolicy = query({
  args: {
    organizationId: v.id("organizations"),
    policyType: v.union(
      v.literal("password_policy"),
      v.literal("session_policy"),
      v.literal("mfa_policy"),
      v.literal("api_access_policy"),
      v.literal("data_retention_policy"),
      v.literal("encryption_policy")
    ),
  },
  handler: async (ctx, args) => {
    const policy = await ctx.db
      .query("securityPolicies")
      .withIndex("by_org_type", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("policyType", args.policyType)
      )
      .first();
    
    if (!policy) {
      // Return default policy
      return getDefaultSecurityPolicy(args.policyType);
    }
    
    return {
      ...policy,
      isDefault: false,
      lastReview: policy.settings.lastReview,
      nextReview: policy.settings.lastReview && policy.settings.reviewInterval
        ? policy.settings.lastReview + policy.settings.reviewInterval
        : null,
    };
  },
});

/**
 * Update security policy
 */
export const updateSecurityPolicy = mutation({
  args: {
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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const existing = await ctx.db
      .query("securityPolicies")
      .withIndex("by_org_type", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("policyType", args.policyType)
      )
      .first();
    
    if (existing) {
      // Update existing policy
      await ctx.db.patch(existing._id, {
        settings: args.settings,
        updatedAt: now,
        lastUpdatedBy: args.userId,
        version: existing.version + 1,
      });
      return existing._id;
    } else {
      // Create new policy
      const policyId = await ctx.db.insert("securityPolicies", {
        organizationId: args.organizationId,
        policyType: args.policyType,
        settings: args.settings,
        createdAt: now,
        updatedAt: now,
        createdBy: args.userId,
        lastUpdatedBy: args.userId,
        version: 1,
      });
      return policyId;
    }
  },
});

/**
 * Default security policies
 */
function getDefaultSecurityPolicy(policyType: string) {
  const now = Date.now();
  
  switch (policyType) {
    case "password_policy":
      return {
        policyType: "password_policy",
        settings: {
          enabled: true,
          rules: {
            minLength: SECURITY_CONFIG.PASSWORD.MIN_LENGTH,
            requireUppercase: SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE,
            requireLowercase: SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE,
            requireNumbers: SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS,
            requireSymbols: SECURITY_CONFIG.PASSWORD.REQUIRE_SYMBOLS,
            maxAgeDays: SECURITY_CONFIG.PASSWORD.MAX_AGE_DAYS,
            preventReuseCount: SECURITY_CONFIG.PASSWORD.PREVENT_REUSE_COUNT,
          },
          exemptions: [],
          reviewInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
        },
        isDefault: true,
      };
      
    case "session_policy":
      return {
        policyType: "session_policy",
        settings: {
          enabled: true,
          rules: {
            maxAge: SECURITY_CONFIG.SESSION.MAX_AGE,
            idleTimeout: SECURITY_CONFIG.SESSION.IDLE_TIMEOUT,
            maxConcurrentSessions: SECURITY_CONFIG.SESSION.MAX_CONCURRENT_SESSIONS,
            requireSecureCookies: SECURITY_CONFIG.SESSION.REQUIRE_SECURE_COOKIES,
            rotationInterval: SECURITY_CONFIG.SESSION.SESSION_ROTATION_INTERVAL,
          },
          exemptions: [],
          reviewInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        isDefault: true,
      };
      
    case "mfa_policy":
      return {
        policyType: "mfa_policy",
        settings: {
          enabled: false, // Default to disabled for flexibility
          rules: {
            required: false,
            methods: ["totp", "sms", "email"],
            grace_period_hours: 24,
            require_for_admin: true,
          },
          exemptions: [],
          reviewInterval: 60 * 24 * 60 * 60 * 1000, // 60 days
        },
        isDefault: true,
      };
      
    case "api_access_policy":
      return {
        policyType: "api_access_policy",
        settings: {
          enabled: true,
          rules: {
            requireApiKey: SECURITY_CONFIG.API.REQUIRE_API_KEY,
            maxRequestSize: SECURITY_CONFIG.API.MAX_REQUEST_SIZE,
            rateLimits: SECURITY_CONFIG.RATE_LIMITS,
            allowedOrigins: ["https://app.finhelm.ai"],
            keyRotationDays: SECURITY_CONFIG.API.API_KEY_ROTATION_DAYS,
          },
          exemptions: [],
          reviewInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        isDefault: true,
      };
      
    case "data_retention_policy":
      return {
        policyType: "data_retention_policy",
        settings: {
          enabled: true,
          rules: {
            auditLogRetentionDays: SECURITY_CONFIG.AUDIT.RETENTION_DAYS,
            highSecurityRetentionDays: SECURITY_CONFIG.AUDIT.HIGH_SECURITY_RETENTION_DAYS,
            transactionRetentionYears: 7,
            chatLogRetentionDays: 90,
            errorLogRetentionDays: 30,
            autoCleanup: true,
          },
          exemptions: [],
          reviewInterval: 365 * 24 * 60 * 60 * 1000, // 1 year
        },
        isDefault: true,
      };
      
    case "encryption_policy":
      return {
        policyType: "encryption_policy",
        settings: {
          enabled: true,
          rules: {
            algorithm: SECURITY_CONFIG.ENCRYPTION.ALGORITHM,
            keyRotationInterval: SECURITY_CONFIG.ENCRYPTION.KEY_ROTATION_INTERVAL,
            backupKeyCount: SECURITY_CONFIG.ENCRYPTION.BACKUP_KEY_COUNT,
            encryptAtRest: true,
            encryptInTransit: true,
            encryptSensitiveFields: true,
          },
          exemptions: [],
          reviewInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
        },
        isDefault: true,
      };
      
    default:
      throw new Error(`Unknown policy type: ${policyType}`);
  }
}

/**
 * Security compliance checker
 */
export const checkSecurityCompliance = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const issues: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      recommendation: string;
    }> = [];
    
    // Check for recent security events
    const recentEvents = await ctx.db
      .query("securityEvents")
      .withIndex("by_org_timestamp", (q) => 
        q.eq("organizationId", args.organizationId)
         .gte("timestamp", now - (7 * 24 * 60 * 60 * 1000)) // Last 7 days
      )
      .collect();
    
    const highSeverityEvents = recentEvents.filter(e => 
      e.severity === "high" || e.severity === "critical"
    );
    
    if (highSeverityEvents.length > 0) {
      issues.push({
        type: "unresolved_security_events",
        severity: "high",
        description: `${highSeverityEvents.length} high/critical security events in the last 7 days`,
        recommendation: "Review and resolve security events immediately",
      });
    }
    
    // Check encryption keys
    const encryptionKeys = await ctx.db
      .query("encryptionKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const expiredKeys = encryptionKeys.filter(key => 
      key.expiresAt && key.expiresAt < now
    );
    
    if (expiredKeys.length > 0) {
      issues.push({
        type: "expired_encryption_keys",
        severity: "high",
        description: `${expiredKeys.length} encryption keys have expired`,
        recommendation: "Rotate expired encryption keys immediately",
      });
    }
    
    const oldKeys = encryptionKeys.filter(key => 
      key.rotatedAt && (now - key.rotatedAt) > SECURITY_CONFIG.ENCRYPTION.KEY_ROTATION_INTERVAL
    );
    
    if (oldKeys.length > 0) {
      issues.push({
        type: "old_encryption_keys",
        severity: "medium",
        description: `${oldKeys.length} encryption keys need rotation`,
        recommendation: "Schedule encryption key rotation",
      });
    }
    
    // Check API key usage
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const oldApiKeys = apiKeys.filter(key => 
      key.rotatedAt && (now - key.rotatedAt) > (SECURITY_CONFIG.API.API_KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000)
    );
    
    if (oldApiKeys.length > 0) {
      issues.push({
        type: "old_api_keys",
        severity: "medium",
        description: `${oldApiKeys.length} API keys need rotation`,
        recommendation: "Rotate API keys according to security policy",
      });
    }
    
    // Check for policy reviews
    const policies = await ctx.db
      .query("securityPolicies")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    
    const overduePolicies = policies.filter(policy => 
      policy.settings.lastReview && 
      policy.settings.reviewInterval &&
      (now - policy.settings.lastReview) > policy.settings.reviewInterval
    );
    
    if (overduePolicies.length > 0) {
      issues.push({
        type: "overdue_policy_reviews",
        severity: "low",
        description: `${overduePolicies.length} security policies need review`,
        recommendation: "Schedule security policy reviews",
      });
    }
    
    // Calculate compliance score
    const totalChecks = 6; // Number of compliance checks
    const passedChecks = totalChecks - issues.length;
    const complianceScore = Math.round((passedChecks / totalChecks) * 100);
    
    return {
      organizationId: args.organizationId,
      complianceScore,
      issues,
      lastChecked: now,
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === "critical").length,
        highIssues: issues.filter(i => i.severity === "high").length,
        mediumIssues: issues.filter(i => i.severity === "medium").length,
        lowIssues: issues.filter(i => i.severity === "low").length,
      },
    };
  },
});

/**
 * Security headers configuration
 */
export const getSecurityHeaders = () => {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
  };
};

export default {
  SECURITY_CONFIG,
  getSecurityPolicy,
  updateSecurityPolicy,
  checkSecurityCompliance,
  getSecurityHeaders,
};