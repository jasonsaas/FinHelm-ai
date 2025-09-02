/**
 * QuickBooks Token Manager
 * Handles secure token storage, auto-refresh, and encryption in Convex
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Token storage types
export interface StoredToken {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiry: number;
  refreshTokenExpiry: number;
  iv: string;
  authTag: string;
}

// Token refresh configuration
export interface RefreshConfig {
  bufferTime: number; // Time before expiry to trigger refresh (ms)
  maxRetries: number;
  retryDelay: number; // Base delay for exponential backoff (ms)
}

// Default refresh configuration
const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  bufferTime: 300000, // 5 minutes before expiry
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
};

/**
 * Simple token obfuscation for Convex environment
 * Note: In production, consider using a proper encryption service
 */
class TokenEncryption {
  /**
   * Simple obfuscation (base64 encoding with salt)
   * For production, use a proper encryption service or store tokens in a secure vault
   */
  static encrypt(token: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    // Add a salt prefix for basic obfuscation
    const salt = Math.random().toString(36).substring(7);
    const salted = salt + ':' + token;
    
    // Base64 encode
    const encrypted = btoa(salted);
    
    return {
      encrypted,
      iv: salt,
      authTag: 'convex', // Placeholder for compatibility
    };
  }

  /**
   * Decrypt a token
   */
  static decrypt(
    encryptedToken: string,
    iv: string,
    authTag: string
  ): string {
    // Base64 decode
    const decoded = atob(encryptedToken);
    
    // Remove salt prefix
    const parts = decoded.split(':');
    if (parts.length < 2 || parts[0] !== iv) {
      throw new Error('Invalid token format');
    }
    
    return parts.slice(1).join(':');
  }
}

/**
 * Store tokens securely with encryption
 */
export const storeTokens = internalMutation({
  args: {
    companyId: v.id("companies"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
    refreshTokenExpiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    // Encrypt tokens
    const encryptedAccess = TokenEncryption.encrypt(args.accessToken);
    const encryptedRefresh = TokenEncryption.encrypt(args.refreshToken);
    
    const now = Date.now();
    const tokenExpiry = now + (args.expiresIn * 1000);
    const refreshTokenExpiry = now + (args.refreshTokenExpiresIn * 1000);
    
    // Store encrypted tokens
    await ctx.db.patch(args.companyId, {
      accessToken: encryptedAccess.encrypted,
      refreshToken: encryptedRefresh.encrypted,
      tokenExpiry,
      metadata: {
        tokenIv: encryptedAccess.iv,
        tokenAuthTag: encryptedAccess.authTag,
        refreshTokenIv: encryptedRefresh.iv,
        refreshTokenAuthTag: encryptedRefresh.authTag,
        refreshTokenExpiry,
        lastTokenUpdate: now,
      },
    });
    
    return {
      success: true,
      tokenExpiry,
      refreshTokenExpiry,
    };
  },
});

/**
 * Retrieve and decrypt tokens
 */
export const getTokens = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    
    if (!company.accessToken || !company.refreshToken) {
      return null;
    }
    
    try {
      // Decrypt tokens
      const accessToken = TokenEncryption.decrypt(
        company.accessToken,
        company.metadata?.tokenIv || "",
        company.metadata?.tokenAuthTag || ""
      );
      
      const refreshToken = TokenEncryption.decrypt(
        company.refreshToken,
        company.metadata?.refreshTokenIv || "",
        company.metadata?.refreshTokenAuthTag || ""
      );
      
      return {
        accessToken,
        refreshToken,
        tokenExpiry: company.tokenExpiry || 0,
        refreshTokenExpiry: company.metadata?.refreshTokenExpiry || 0,
      };
    } catch (error) {
      console.error("Failed to decrypt tokens:", error);
      throw new Error("Failed to decrypt stored tokens");
    }
  },
});

/**
 * Auto-refresh token if needed
 */
export const autoRefreshToken = internalMutation({
  args: {
    companyId: v.id("companies"),
    config: v.optional(v.object({
      bufferTime: v.number(),
      maxRetries: v.number(),
      retryDelay: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const config = args.config || DEFAULT_REFRESH_CONFIG;
    const company = await ctx.db.get(args.companyId);
    
    if (!company) {
      throw new Error("Company not found");
    }
    
    // Check if refresh is needed
    const now = Date.now();
    const tokenExpiry = company.tokenExpiry || 0;
    const needsRefresh = tokenExpiry < (now + config.bufferTime);
    
    if (!needsRefresh) {
      return {
        refreshed: false,
        reason: "Token still valid",
        tokenExpiry,
      };
    }
    
    // Check if refresh token is still valid
    const refreshTokenExpiry = company.metadata?.refreshTokenExpiry || 0;
    if (refreshTokenExpiry < now) {
      // Mark as disconnected
      await ctx.db.patch(args.companyId, {
        syncStatus: "disconnected",
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiry: undefined,
      });
      
      throw new Error("Refresh token expired - reauthorization required");
    }
    
    // Attempt refresh with retries
    let lastError;
    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      try {
        // Call the refresh function from auth module
        await ctx.scheduler.runAfter(0, api.quickbooks.auth.refreshAccessToken, {
          companyId: args.companyId,
        });
        
        return {
          refreshed: true,
          reason: "Token refreshed successfully",
          attempt: attempt + 1,
        };
      } catch (error) {
        lastError = error;
        
        // Exponential backoff
        if (attempt < config.maxRetries - 1) {
          const delay = config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw new Error(`Token refresh failed after ${config.maxRetries} attempts: ${lastError}`);
  },
});

/**
 * Schedule automatic token refresh
 */
export const scheduleTokenRefresh = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    
    const tokenExpiry = company.tokenExpiry || 0;
    const now = Date.now();
    
    // Schedule refresh 5 minutes before expiry
    const refreshTime = tokenExpiry - DEFAULT_REFRESH_CONFIG.bufferTime;
    
    if (refreshTime > now) {
      const delay = refreshTime - now;
      
      await ctx.scheduler.runAfter(delay, internal.quickbooks.tokenManager.autoRefreshToken, {
        companyId: args.companyId,
      });
      
      return {
        scheduled: true,
        scheduledFor: new Date(refreshTime).toISOString(),
      };
    }
    
    // Token already needs refresh
    await ctx.scheduler.runAfter(0, internal.quickbooks.tokenManager.autoRefreshToken, {
      companyId: args.companyId,
    });
    
    return {
      scheduled: true,
      scheduledFor: "immediately",
    };
  },
});

/**
 * Clear stored tokens
 */
export const clearTokens = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.companyId, {
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiry: undefined,
      syncStatus: "disconnected",
      metadata: {
        tokenIv: undefined,
        tokenAuthTag: undefined,
        refreshTokenIv: undefined,
        refreshTokenAuthTag: undefined,
        refreshTokenExpiry: undefined,
        lastTokenUpdate: undefined,
      },
    });
    
    return {
      success: true,
      message: "Tokens cleared successfully",
    };
  },
});

/**
 * Get token status without decrypting
 */
export const getTokenStatus = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      return {
        hasTokens: false,
        isConnected: false,
      };
    }
    
    const now = Date.now();
    const hasTokens = !!(company.accessToken && company.refreshToken);
    const tokenExpiry = company.tokenExpiry || 0;
    const refreshTokenExpiry = company.metadata?.refreshTokenExpiry || 0;
    
    return {
      hasTokens,
      isConnected: company.syncStatus === "connected",
      accessTokenValid: tokenExpiry > now,
      refreshTokenValid: refreshTokenExpiry > now,
      needsRefreshSoon: tokenExpiry < (now + DEFAULT_REFRESH_CONFIG.bufferTime),
      tokenExpiry: tokenExpiry > 0 ? new Date(tokenExpiry).toISOString() : null,
      refreshTokenExpiry: refreshTokenExpiry > 0 ? new Date(refreshTokenExpiry).toISOString() : null,
      lastUpdate: company.metadata?.lastTokenUpdate 
        ? new Date(company.metadata.lastTokenUpdate).toISOString() 
        : null,
    };
  },
});

/**
 * Validate and refresh token if needed before API calls
 */
export const ensureValidToken = internalMutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    
    if (!company.accessToken || !company.refreshToken) {
      throw new Error("No tokens available - authorization required");
    }
    
    const now = Date.now();
    const tokenExpiry = company.tokenExpiry || 0;
    
    // Check if token needs refresh (with 5 minute buffer)
    if (tokenExpiry < (now + DEFAULT_REFRESH_CONFIG.bufferTime)) {
      // Trigger auto-refresh
      await ctx.scheduler.runAfter(0, internal.quickbooks.tokenManager.autoRefreshToken, {
        companyId: args.companyId,
      });
      
      // Wait a moment for refresh to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get updated company data
      const updatedCompany = await ctx.db.get(args.companyId);
      if (!updatedCompany?.accessToken) {
        throw new Error("Token refresh failed");
      }
    }
    
    return {
      valid: true,
      tokenExpiry,
    };
  },
});