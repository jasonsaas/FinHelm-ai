import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Security Middleware and Utilities
 * Provides reusable security functions for protecting endpoints and data
 */

/**
 * Middleware function to check authentication and authorization
 */
export const withAuth = (handler: any) => {
  return async (ctx: any, args: any) => {
    // Extract user information from context (assuming Clerk or similar auth)
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Authentication required");
    }
    
    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();
    
    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }
    
    // Add user info to context
    const enrichedCtx = {
      ...ctx,
      user,
      identity,
    };
    
    return handler(enrichedCtx, { ...args, userId: user._id });
  };
};

/**
 * Rate limiting middleware wrapper
 */
export const withRateLimit = (
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60000
) => {
  return (handler: any) => {
    return async (ctx: any, args: any) => {
      // Use IP or user ID as rate limit key
      const key = ctx.user?.id || ctx.identity?.tokenIdentifier || "anonymous";
      
      const rateLimit = await ctx.runMutation(api.securityService.checkRateLimit, {
        key,
        endpoint,
        maxRequests,
        windowSizeMs: windowMs,
        userId: ctx.user?._id,
      });
      
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`);
      }
      
      return handler(ctx, args);
    };
  };
};

/**
 * CSRF protection middleware
 */
export const withCSRFProtection = (handler: any) => {
  return async (ctx: any, args: any) => {
    const { csrfToken, ...otherArgs } = args;
    
    if (!csrfToken) {
      throw new Error("CSRF token required");
    }
    
    if (!ctx.user) {
      throw new Error("Authentication required for CSRF validation");
    }
    
    const sessionId = ctx.identity?.sessionId || "unknown";
    
    const validation = await ctx.runMutation(api.securityService.validateCSRFToken, {
      token: csrfToken,
      userId: ctx.user._id,
      sessionId,
      markAsUsed: true,
    });
    
    if (!validation.valid) {
      throw new Error(`CSRF validation failed: ${validation.error}`);
    }
    
    return handler(ctx, otherArgs);
  };
};

/**
 * Data encryption/decryption utilities
 */
export const encryptSensitiveData = action({
  args: {
    organizationId: v.id("organizations"),
    data: v.string(),
    keyType: v.optional(v.union(
      v.literal("data_encryption"),
      v.literal("backup_encryption")
    )),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, you would use a proper encryption library
      // and retrieve the actual encryption key from a secure key management service
      
      const keyType = args.keyType || "data_encryption";
      
      // Get active encryption key for organization
      const encryptionKey = await ctx.db
        .query("encryptionKeys")
        .withIndex("by_org_type", (q) => 
          q.eq("organizationId", args.organizationId)
           .eq("keyType", keyType)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      
      if (!encryptionKey) {
        throw new Error("No active encryption key found");
      }
      
      // Simulate encryption (replace with actual encryption library)
      const encryptedData = Buffer.from(args.data).toString('base64');
      
      // Update key usage count
      await ctx.db.patch(encryptionKey._id, {
        usageCount: encryptionKey.usageCount + 1,
      });
      
      return {
        encryptedData,
        keyId: encryptionKey.keyId,
        algorithm: encryptionKey.algorithm,
        encryptedAt: Date.now(),
      };
      
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  },
});

/**
 * Input validation and sanitization utilities
 */
export const validateAndSanitizeInput = {
  email: (email: string): { valid: boolean; sanitized?: string; error?: string } => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmed = email.trim().toLowerCase();
    
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: "Invalid email format" };
    }
    
    if (trimmed.length > 254) {
      return { valid: false, error: "Email too long" };
    }
    
    return { valid: true, sanitized: trimmed };
  },
  
  phoneNumber: (phone: string): { valid: boolean; sanitized?: string; error?: string } => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const sanitized = phone.replace(/[^\d+]/g, '');
    
    if (!phoneRegex.test(sanitized)) {
      return { valid: false, error: "Invalid phone number format" };
    }
    
    return { valid: true, sanitized };
  },
  
  transactionDescription: (description: string): { valid: boolean; sanitized?: string; error?: string } => {
    const trimmed = description.trim();
    
    if (trimmed.length === 0) {
      return { valid: false, error: "Description cannot be empty" };
    }
    
    if (trimmed.length > 500) {
      return { valid: false, error: "Description too long (max 500 characters)" };
    }
    
    // Remove potentially dangerous characters
    const sanitized = trimmed.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    return { valid: true, sanitized };
  },
  
  amount: (amount: number): { valid: boolean; sanitized?: number; error?: string } => {
    if (isNaN(amount) || !isFinite(amount)) {
      return { valid: false, error: "Invalid amount" };
    }
    
    if (amount < -999999999 || amount > 999999999) {
      return { valid: false, error: "Amount out of range" };
    }
    
    // Round to 2 decimal places
    const sanitized = Math.round(amount * 100) / 100;
    
    return { valid: true, sanitized };
  },
};

/**
 * Security event logging helper
 */
export const logSecurityEvent = async (
  ctx: any,
  eventType: string,
  severity: "info" | "warning" | "high" | "critical",
  details: any = {},
  userId?: any,
  organizationId?: any
) => {
  try {
    await ctx.runMutation(api.securityService.logSecurityEvent, {
      eventType,
      severity,
      userId: userId || ctx.user?._id,
      organizationId: organizationId || ctx.organization?._id,
      details,
      ipAddress: ctx.request?.ip,
      userAgent: ctx.request?.headers?.["user-agent"],
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
};

/**
 * Audit trail helper for data changes
 */
export const auditDataChange = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    resourceType: v.string(),
    resourceId: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("read"),
      v.literal("update"),
      v.literal("delete")
    ),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    metadata: v.optional(v.object({})),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      userId: args.userId,
      action: `${args.action}_${args.resourceType}`,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      details: {
        before: args.before,
        after: args.after,
        metadata: args.metadata,
      },
      timestamp: now,
    });
    
    return true;
  },
});

/**
 * Permission checking utilities
 */
export const checkPermission = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    permission: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user's organization membership
    const membership = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    if (!membership) {
      return { allowed: false, reason: "No organization membership" };
    }
    
    // Check if user has the required permission
    const hasPermission = membership.permissions.includes(args.permission);
    
    if (!hasPermission) {
      return { allowed: false, reason: "Insufficient permissions" };
    }
    
    // Additional resource-specific checks could go here
    
    return { 
      allowed: true, 
      role: membership.role,
      permissions: membership.permissions 
    };
  },
});

/**
 * Session security helpers
 */
export const validateSession = query({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (!session) {
      return { valid: false, reason: "Session not found" };
    }
    
    const now = Date.now();
    
    // Check expiration
    if (session.expiresAt < now) {
      return { valid: false, reason: "Session expired" };
    }
    
    // Check user match
    if (session.userId !== args.userId) {
      return { valid: false, reason: "Session user mismatch" };
    }
    
    // Check if session is active
    if (!session.isActive) {
      return { valid: false, reason: "Session inactive" };
    }
    
    // Optional IP validation
    if (args.ipAddress && session.ipAddress !== args.ipAddress) {
      // Log potential session hijacking
      await logSecurityEvent(
        ctx,
        "session_ip_mismatch",
        "warning",
        { 
          sessionId: args.sessionId, 
          originalIp: session.ipAddress,
          currentIp: args.ipAddress 
        },
        args.userId
      );
      
      return { valid: false, reason: "IP address mismatch" };
    }
    
    // Update last accessed time
    await ctx.db.patch(session._id, {
      lastAccessedAt: now,
    });
    
    return { 
      valid: true, 
      session: {
        ...session,
        lastAccessedAt: now,
      }
    };
  },
});

/**
 * Webhook signature validation helper
 */
export const validateWebhookSignature = action({
  args: {
    payload: v.string(),
    signature: v.string(),
    secret: v.string(),
    timestamp: v.optional(v.number()),
    tolerance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(api.securityService.validateQuickBooksWebhook, {
      payload: args.payload,
      signature: args.signature,
      webhookSecret: args.secret,
      timestamp: args.timestamp,
    });
  },
});

export default {
  withAuth,
  withRateLimit,
  withCSRFProtection,
  validateAndSanitizeInput,
  logSecurityEvent,
  encryptSensitiveData,
  auditDataChange,
  checkPermission,
  validateSession,
  validateWebhookSignature,
};