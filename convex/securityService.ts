import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Security Service for FinHelm.ai
 * Implements comprehensive security measures including webhook validation,
 * rate limiting, CSRF protection, and audit logging
 */

/**
 * QuickBooks Webhook Signature Validation
 */
export const validateQuickBooksWebhook = action({
  args: {
    payload: v.string(),
    signature: v.string(),
    webhookSecret: v.string(),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Timestamp validation (prevent replay attacks)
      const now = Date.now();
      const requestTime = args.timestamp || now;
      const timeDiff = Math.abs(now - requestTime);
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (timeDiff > maxAge) {
        return {
          valid: false,
          error: "Request timestamp too old",
          errorCode: "TIMESTAMP_INVALID"
        };
      }
      
      // Create expected signature
      const expectedSignature = createHmac('sha256', args.webhookSecret)
        .update(args.payload)
        .digest('base64');
      
      // Extract signature from header (format: "sha256=signature")
      const providedSignature = args.signature.replace('sha256=', '');
      
      // Timing-safe comparison to prevent timing attacks
      const sigBuffer1 = Buffer.from(expectedSignature, 'base64');
      const sigBuffer2 = Buffer.from(providedSignature, 'base64');
      
      if (sigBuffer1.length !== sigBuffer2.length) {
        return {
          valid: false,
          error: "Invalid signature format",
          errorCode: "SIGNATURE_FORMAT_INVALID"
        };
      }
      
      const isValid = timingSafeEqual(sigBuffer1, sigBuffer2);
      
      return {
        valid: isValid,
        error: isValid ? null : "Signature validation failed",
        errorCode: isValid ? null : "SIGNATURE_INVALID"
      };
      
    } catch (error) {
      console.error("Webhook validation error:", error);
      return {
        valid: false,
        error: "Signature validation error",
        errorCode: "VALIDATION_ERROR"
      };
    }
  },
});

/**
 * Rate Limiting Service
 * Implements sliding window rate limiting for API endpoints
 */
export const checkRateLimit = mutation({
  args: {
    key: v.string(), // IP address, user ID, or API key
    endpoint: v.string(),
    maxRequests: v.optional(v.number()),
    windowSizeMs: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const maxRequests = args.maxRequests || 10; // Default: 10 requests
    const windowSizeMs = args.windowSizeMs || 60 * 1000; // Default: 1 minute
    const windowStart = now - windowSizeMs;
    
    // Get existing rate limit entry
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key_endpoint", (q) => 
        q.eq("key", args.key).eq("endpoint", args.endpoint)
      )
      .first();
    
    if (!existing) {
      // Create new rate limit entry
      await ctx.db.insert("rateLimits", {
        key: args.key,
        endpoint: args.endpoint,
        requestCount: 1,
        windowStart: now,
        windowSizeMs,
        maxRequests,
        lastRequestAt: now,
        blocked: false,
      });
      
      return {
        allowed: true,
        requestCount: 1,
        remaining: maxRequests - 1,
        resetTime: now + windowSizeMs,
      };
    }
    
    // Check if we're in a new window
    if (existing.windowStart < windowStart) {
      // Reset counter for new window
      await ctx.db.patch(existing._id, {
        requestCount: 1,
        windowStart: now,
        lastRequestAt: now,
        blocked: false,
      });
      
      return {
        allowed: true,
        requestCount: 1,
        remaining: maxRequests - 1,
        resetTime: now + windowSizeMs,
      };
    }
    
    // Check if blocked
    if (existing.blocked && existing.blockedUntil && existing.blockedUntil > now) {
      return {
        allowed: false,
        requestCount: existing.requestCount,
        remaining: 0,
        resetTime: existing.blockedUntil,
        blocked: true,
      };
    }
    
    // Increment request count
    const newCount = existing.requestCount + 1;
    const exceeded = newCount > maxRequests;
    const blocked = exceeded;
    const blockedUntil = blocked ? now + windowSizeMs : undefined;
    
    await ctx.db.patch(existing._id, {
      requestCount: newCount,
      lastRequestAt: now,
      blocked,
      blockedUntil,
    });
    
    // Log rate limit violations
    if (exceeded) {
      await ctx.runMutation(api.securityService.logSecurityEvent, {
        eventType: "rate_limit_exceeded",
        severity: "warning",
        details: {
          key: args.key,
          endpoint: args.endpoint,
          requestCount: newCount,
          maxRequests,
          userId: args.userId,
        },
      });
    }
    
    return {
      allowed: !exceeded,
      requestCount: newCount,
      remaining: Math.max(0, maxRequests - newCount),
      resetTime: existing.windowStart + windowSizeMs,
      blocked: exceeded,
    };
  },
});

/**
 * CSRF Token Generation and Validation
 */
export const generateCSRFToken = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.string(),
    expiresInMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresInMinutes = args.expiresInMinutes || 60; // 1 hour default
    const expiresAt = now + (expiresInMinutes * 60 * 1000);
    
    // Generate cryptographically secure token
    const tokenBytes = randomBytes(32);
    const token = tokenBytes.toString('base64url');
    
    // Store token with expiration
    await ctx.db.insert("csrfTokens", {
      token,
      userId: args.userId,
      sessionId: args.sessionId,
      createdAt: now,
      expiresAt,
      used: false,
    });
    
    return {
      token,
      expiresAt,
    };
  },
});

export const validateCSRFToken = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    sessionId: v.string(),
    markAsUsed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const tokenRecord = await ctx.db
      .query("csrfTokens")
      .filter((q) => 
        q.and(
          q.eq(q.field("token"), args.token),
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("sessionId"), args.sessionId)
        )
      )
      .first();
    
    if (!tokenRecord) {
      await ctx.runMutation(api.securityService.logSecurityEvent, {
        eventType: "csrf_token_invalid",
        severity: "high",
        details: {
          userId: args.userId,
          sessionId: args.sessionId,
          token: args.token.substring(0, 8) + "...", // Log partial token
        },
      });
      
      return {
        valid: false,
        error: "Invalid CSRF token",
      };
    }
    
    // Check expiration
    if (tokenRecord.expiresAt < now) {
      return {
        valid: false,
        error: "CSRF token expired",
      };
    }
    
    // Check if already used (for one-time tokens)
    if (tokenRecord.used && args.markAsUsed) {
      return {
        valid: false,
        error: "CSRF token already used",
      };
    }
    
    // Mark as used if requested
    if (args.markAsUsed) {
      await ctx.db.patch(tokenRecord._id, {
        used: true,
        usedAt: now,
      });
    }
    
    return {
      valid: true,
      createdAt: tokenRecord.createdAt,
    };
  },
});

/**
 * OAuth Token Refresh with Automatic Retry Logic
 */
export const refreshOAuthToken = action({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.erpConnectionId);
    
    if (!connection || connection.organizationId !== args.organizationId) {
      throw new Error("ERP connection not found");
    }
    
    const now = Date.now();
    const credentials = connection.credentials;
    
    // Check if refresh is needed
    if (!args.forceRefresh && credentials.expiresAt && credentials.expiresAt > now + (5 * 60 * 1000)) {
      return {
        refreshed: false,
        reason: "Token still valid",
        expiresAt: credentials.expiresAt,
      };
    }
    
    if (!credentials.refreshToken) {
      throw new Error("No refresh token available");
    }
    
    try {
      // Attempt token refresh with retry logic
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const refreshResult = await performOAuthRefresh(
            connection.erpType,
            credentials.refreshToken,
            connection.credentials.companyId
          );
          
          // Update connection with new tokens
          await ctx.db.patch(args.erpConnectionId, {
            credentials: {
              ...credentials,
              accessToken: refreshResult.accessToken,
              refreshToken: refreshResult.refreshToken || credentials.refreshToken,
              expiresAt: now + (refreshResult.expiresIn * 1000),
            },
            lastSyncAt: now,
            syncStatus: "active",
            updatedAt: now,
          });
          
          // Log successful refresh
          await ctx.runMutation(api.securityService.logSecurityEvent, {
            eventType: "oauth_token_refreshed",
            severity: "info",
            details: {
              organizationId: args.organizationId,
              erpConnectionId: args.erpConnectionId,
              erpType: connection.erpType,
              attempt,
            },
          });
          
          return {
            refreshed: true,
            expiresAt: now + (refreshResult.expiresIn * 1000),
            attempts: attempt,
          };
          
        } catch (error) {
          lastError = error;
          
          if (attempt < maxRetries) {
            // Exponential backoff
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries failed
      await ctx.db.patch(args.erpConnectionId, {
        syncStatus: "failed",
        updatedAt: now,
      });
      
      await ctx.runMutation(api.securityService.logSecurityEvent, {
        eventType: "oauth_refresh_failed",
        severity: "high",
        details: {
          organizationId: args.organizationId,
          erpConnectionId: args.erpConnectionId,
          error: lastError instanceof Error ? lastError.message : "Unknown error",
          maxRetries,
        },
      });
      
      throw new Error(`Token refresh failed after ${maxRetries} attempts`);
      
    } catch (error) {
      throw error;
    }
  },
});

/**
 * Comprehensive Audit Logging
 */
export const logSecurityEvent = mutation({
  args: {
    eventType: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("high"),
      v.literal("critical")
    ),
    userId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    details: v.optional(v.object({})),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: args.eventType,
      resourceType: args.resourceType || "security",
      resourceId: args.resourceId,
      details: {
        severity: args.severity,
        ...args.details,
      },
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: now,
    });
    
    // For high/critical events, consider additional alerting
    if (args.severity === "high" || args.severity === "critical") {
      console.warn(`Security event: ${args.eventType}`, {
        severity: args.severity,
        userId: args.userId,
        organizationId: args.organizationId,
        details: args.details,
      });
    }
    
    return true;
  },
});

/**
 * Content Security Policy Header Generation
 */
export const generateCSPHeader = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    environment: v.optional(v.union(
      v.literal("development"),
      v.literal("staging"),
      v.literal("production")
    )),
  },
  handler: async (ctx, args) => {
    const env = args.environment || "production";
    const isDev = env === "development";
    
    // Base CSP directives
    const directives = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'", // Remove in production for stricter security
        "https://js.stripe.com",
        "https://connect.facebook.net",
        "https://www.google-analytics.com",
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      "img-src": [
        "'self'",
        "data:",
        "https:",
        "blob:",
      ],
      "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      "connect-src": [
        "'self'",
        "https://api.stripe.com",
        "https://graph.facebook.com",
        "https://www.google-analytics.com",
        "https://quickbooks-api.intuit.com",
        "https://sandbox-quickbooks.api.intuit.com",
      ],
      "frame-src": [
        "'self'",
        "https://js.stripe.com",
      ],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "block-all-mixed-content": [],
      "upgrade-insecure-requests": isDev ? [] : [""],
    };
    
    // Build CSP header value
    const cspValue = Object.entries(directives)
      .map(([directive, sources]) => 
        sources.length > 0 
          ? `${directive} ${sources.join(" ")}`
          : directive
      )
      .join("; ");
    
    return {
      header: "Content-Security-Policy",
      value: cspValue,
      environment: env,
    };
  },
});

/**
 * API Key Management and Rotation
 */
export const rotateAPIKey = mutation({
  args: {
    organizationId: v.id("organizations"),
    keyId: v.id("apiKeys"),
    service: v.union(
      v.literal("quickbooks"),
      v.literal("sage_intacct"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
  },
  handler: async (ctx, args) => {
    const existingKey = await ctx.db.get(args.keyId);
    
    if (!existingKey || existingKey.organizationId !== args.organizationId) {
      throw new Error("API key not found");
    }
    
    const now = Date.now();
    
    // Generate new key
    const newKeyBytes = randomBytes(32);
    const newKey = `${args.service}_${newKeyBytes.toString('base64url')}`;
    const hashedNewKey = createHmac('sha256', process.env.KEY_HASH_SECRET || 'default-secret')
      .update(newKey)
      .digest('hex');
    
    // Update existing key
    await ctx.db.patch(args.keyId, {
      hashedKey: hashedNewKey,
      rotatedAt: now,
      updatedAt: now,
      usageCount: 0, // Reset usage count
    });
    
    // Log rotation
    await ctx.runMutation(api.securityService.logSecurityEvent, {
      eventType: "api_key_rotated",
      severity: "info",
      organizationId: args.organizationId,
      resourceType: "api_key",
      resourceId: args.keyId,
      details: {
        service: args.service,
        keyName: existingKey.keyName,
      },
    });
    
    return {
      keyId: args.keyId,
      newKey: newKey, // Return once to caller, then never store in plain text
      rotatedAt: now,
    };
  },
});

/**
 * Helper function for OAuth refresh (mock implementation)
 */
async function performOAuthRefresh(erpType: string, refreshToken: string, companyId?: string) {
  // Simulate OAuth refresh API call
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock successful refresh response
  return {
    accessToken: `new_access_token_${Date.now()}`,
    refreshToken: `new_refresh_token_${Date.now()}`,
    expiresIn: 3600, // 1 hour
    tokenType: "Bearer",
  };
}