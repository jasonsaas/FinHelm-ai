import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * QuickBooks OAuth Authentication and API Integration
 * Handles OAuth 2.0 flow, token management, and API calls with retry logic
 */

// Types and Interfaces
export interface QuickBooksAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  baseUrl: string; // sandbox or production
}

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  realmId: string;
  tokenType: string;
}

export interface QuickBooksApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

// Constants
const QB_DISCOVERY_DOCUMENT_URL = 'https://developer.api.intuit.com/openid_connect/discovery';
const QB_SANDBOX_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';
const QB_PRODUCTION_BASE_URL = 'https://quickbooks.api.intuit.com';

/**
 * Generate OAuth URL for QuickBooks authorization
 */
export const generateQuickBooksAuthUrl = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    environment: v.optional(v.union(v.literal("sandbox"), v.literal("production"))),
  },
  handler: async (ctx, args) => {
    try {
      // Generate state parameter for security
      const state = generateSecureRandomString(32);
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store OAuth state
      const oauthStateId = await ctx.runMutation(api.quickbooksAuth.storeOAuthState, {
        state,
        codeVerifier,
        userId: args.userId,
        organizationId: args.organizationId,
        provider: "quickbooks",
        expiresAt: Date.now() + 600000, // 10 minutes
      });

      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      if (!clientId) {
        throw new Error("QuickBooks Client ID not configured");
      }

      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 
        `${process.env.SITE_URL || 'http://localhost:3000'}/auth/quickbooks/callback`;

      const scope = "com.intuit.quickbooks.accounting";
      
      // Build authorization URL
      const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('state', state);

      console.log(`Generated QuickBooks auth URL for org ${args.organizationId}`);

      return {
        authUrl: authUrl.toString(),
        state,
        oauthStateId,
        expiresAt: Date.now() + 600000,
      };

    } catch (error) {
      console.error('Failed to generate QuickBooks auth URL:', error);
      throw new Error(`Failed to generate auth URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Exchange authorization code for access tokens
 */
export const exchangeQuickBooksAuthCode = action({
  args: {
    code: v.string(),
    state: v.string(),
    realmId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    try {
      // Verify OAuth state
      const oauthState = await ctx.runQuery(api.quickbooksAuth.getOAuthState, {
        state: args.state,
      });

      if (!oauthState) {
        throw new Error("Invalid OAuth state");
      }

      if (oauthState.expiresAt < Date.now()) {
        throw new Error("OAuth state expired");
      }

      if (oauthState.organizationId !== args.organizationId) {
        throw new Error("Organization mismatch");
      }

      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 
        `${process.env.SITE_URL || 'http://localhost:3000'}/auth/quickbooks/callback`;

      if (!clientId || !clientSecret) {
        throw new Error("QuickBooks credentials not configured");
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: args.code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }

      const tokenData = await tokenResponse.json();

      const tokens: QuickBooksTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        realmId: args.realmId,
        tokenType: tokenData.token_type || 'Bearer',
      };

      // Create or update ERP connection
      const connectionId = await ctx.runMutation(api.quickbooksAuth.createQuickBooksConnection, {
        organizationId: args.organizationId,
        userId: oauthState.userId!,
        tokens,
        connectionName: `QuickBooks Company ${args.realmId}`,
      });

      // Clean up OAuth state
      await ctx.runMutation(api.quickbooksAuth.deleteOAuthState, {
        state: args.state,
      });

      console.log(`QuickBooks OAuth completed for org ${args.organizationId}`);

      return {
        success: true,
        connectionId,
        realmId: args.realmId,
        expiresAt: tokens.expiresAt,
      };

    } catch (error) {
      console.error('QuickBooks OAuth exchange failed:', error);
      throw new Error(`OAuth exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Refresh QuickBooks access token
 */
export const refreshQuickBooksToken = action({
  args: {
    connectionId: v.id("erpConnections"),
  },
  handler: async (ctx, args) => {
    try {
      const connection = await ctx.db.get(args.connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      if (connection.erpType !== "quickbooks") {
        throw new Error("Connection is not QuickBooks");
      }

      const refreshToken = connection.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("QuickBooks credentials not configured");
      }

      const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
      }

      const tokenData = await response.json();

      // Update connection with new tokens
      await ctx.db.patch(args.connectionId, {
        credentials: {
          ...connection.credentials,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken, // Keep old refresh token if not provided
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
        },
        updatedAt: Date.now(),
      });

      console.log(`Refreshed QuickBooks token for connection ${args.connectionId}`);

      return {
        success: true,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
      };

    } catch (error) {
      console.error('QuickBooks token refresh failed:', error);
      
      // Mark connection as failed
      await ctx.db.patch(args.connectionId, {
        syncStatus: "failed",
        updatedAt: Date.now(),
      });

      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

/**
 * Make authenticated API call to QuickBooks with retry logic
 */
export const makeQuickBooksApiCall = action({
  args: {
    connectionId: v.id("erpConnections"),
    method: v.union(v.literal("GET"), v.literal("POST"), v.literal("PUT"), v.literal("DELETE")),
    endpoint: v.string(),
    body: v.optional(v.any()),
    retries: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<QuickBooksApiResponse> => {
    const maxRetries = args.retries || 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const connection = await ctx.db.get(args.connectionId);
        if (!connection) {
          throw new Error("Connection not found");
        }

        // Check if token needs refresh
        const expiresAt = connection.credentials.expiresAt || 0;
        const now = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (expiresAt - bufferTime < now) {
          console.log("Token expiring soon, refreshing...");
          await ctx.runAction(api.quickbooksAuth.refreshQuickBooksToken, {
            connectionId: args.connectionId,
          });
          // Refetch connection with new token
          const updatedConnection = await ctx.db.get(args.connectionId);
          if (updatedConnection) {
            connection.credentials = updatedConnection.credentials;
          }
        }

        const baseUrl = process.env.QUICKBOOKS_ENVIRONMENT === 'production' ? 
          QB_PRODUCTION_BASE_URL : QB_SANDBOX_BASE_URL;
        
        const url = `${baseUrl}/v3/company/${connection.credentials.realmId}${args.endpoint}`;

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${connection.credentials.accessToken}`,
          'Accept': 'application/json',
        };

        if (args.method === 'POST' || args.method === 'PUT') {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
          method: args.method,
          headers,
          body: args.body ? JSON.stringify(args.body) : undefined,
        });

        // Handle rate limiting
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          if (attempt < maxRetries) {
            console.log(`Rate limited, retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
            await sleep(retryAfter * 1000);
            attempt++;
            continue;
          }
          throw new Error('Rate limit exceeded');
        }

        // Handle authorization errors
        if (response.status === 401) {
          if (attempt < maxRetries) {
            console.log(`Unauthorized, refreshing token (attempt ${attempt + 1}/${maxRetries})`);
            await ctx.runAction(api.quickbooksAuth.refreshQuickBooksToken, {
              connectionId: args.connectionId,
            });
            attempt++;
            continue;
          }
          throw new Error('Authentication failed');
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API call failed: ${errorData.Fault?.Error?.[0]?.Detail || response.statusText}`);
        }

        const data = await response.json();

        return {
          success: true,
          data,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
          rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
        };

      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`QuickBooks API call failed after ${maxRetries} attempts:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
        
        console.warn(`QuickBooks API call attempt ${attempt + 1} failed:`, error);
        attempt++;
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }

    return {
      success: false,
      error: 'Maximum retry attempts exceeded',
    };
  },
});

/**
 * Test QuickBooks connection
 */
export const testQuickBooksConnection = action({
  args: {
    connectionId: v.id("erpConnections"),
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.quickbooksAuth.makeQuickBooksApiCall, {
        connectionId: args.connectionId,
        method: "GET",
        endpoint: "/companyinfo/1",
      });

      if (!result.success) {
        throw new Error(result.error || "API call failed");
      }

      const companyInfo = result.data?.QueryResponse?.CompanyInfo?.[0];
      if (!companyInfo) {
        throw new Error("No company info returned");
      }

      // Update connection status
      await ctx.db.patch(args.connectionId, {
        syncStatus: "active",
        updatedAt: Date.now(),
      });

      return {
        success: true,
        companyInfo: {
          name: companyInfo.CompanyName,
          country: companyInfo.Country,
          fiscalYearStart: companyInfo.FiscalYearStartMonth,
          taxForm: companyInfo.TaxForm,
        },
        rateLimitRemaining: result.rateLimitRemaining,
      };

    } catch (error) {
      console.error('QuickBooks connection test failed:', error);
      
      // Update connection status
      await ctx.db.patch(args.connectionId, {
        syncStatus: "failed",
        updatedAt: Date.now(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Mutation: Store OAuth state
 */
export const storeOAuthState = mutation({
  args: {
    state: v.string(),
    codeVerifier: v.string(),
    userId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    provider: v.union(v.literal("quickbooks"), v.literal("sage_intacct")),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("oauthStates", {
      state: args.state,
      codeVerifier: args.codeVerifier,
      userId: args.userId,
      organizationId: args.organizationId,
      provider: args.provider,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

/**
 * Query: Get OAuth state
 */
export const getOAuthState = query({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthStates")
      .filter((q) => q.eq(q.field("state"), args.state))
      .first();
  },
});

/**
 * Mutation: Delete OAuth state
 */
export const deleteOAuthState = mutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const oauthState = await ctx.db
      .query("oauthStates")
      .filter((q) => q.eq(q.field("state"), args.state))
      .first();

    if (oauthState) {
      await ctx.db.delete(oauthState._id);
    }
  },
});

/**
 * Mutation: Create QuickBooks connection
 */
export const createQuickBooksConnection = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    tokens: v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
      realmId: v.string(),
      tokenType: v.string(),
    }),
    connectionName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists for this realmId
    const existingConnection = await ctx.db
      .query("erpConnections")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("erpType"), "quickbooks"),
          q.eq(q.field("credentials.realmId"), args.tokens.realmId)
        )
      )
      .first();

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        credentials: {
          accessToken: args.tokens.accessToken,
          refreshToken: args.tokens.refreshToken,
          expiresAt: args.tokens.expiresAt,
          realmId: args.tokens.realmId,
        },
        isActive: true,
        syncStatus: "active",
        updatedAt: Date.now(),
      });
      
      return existingConnection._id;
    } else {
      // Create new connection
      return await ctx.db.insert("erpConnections", {
        organizationId: args.organizationId,
        userId: args.userId,
        erpType: "quickbooks",
        connectionName: args.connectionName,
        isActive: true,
        credentials: {
          accessToken: args.tokens.accessToken,
          refreshToken: args.tokens.refreshToken,
          companyId: args.tokens.realmId,
          realmId: args.tokens.realmId,
          expiresAt: args.tokens.expiresAt,
        },
        lastSyncAt: Date.now(),
        syncStatus: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Query: Get QuickBooks connections for organization
 */
export const getQuickBooksConnections = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("erpConnections")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("erpType"), "quickbooks")
        )
      )
      .order("desc")
      .collect();
  },
});

/**
 * Mutation: Disconnect QuickBooks connection
 */
export const disconnectQuickBooksConnection = mutation({
  args: {
    connectionId: v.id("erpConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Mark as inactive instead of deleting to preserve history
    await ctx.db.patch(args.connectionId, {
      isActive: false,
      syncStatus: "disabled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Utility functions
function generateSecureRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateCodeVerifier(): string {
  return generateSecureRandomString(128);
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // In a browser environment, you'd use crypto.subtle.digest
  // For Node.js/Convex, we'll use a simpler approach
  return codeVerifier; // Simplified - in production use proper PKCE
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scheduled function to clean up expired OAuth states
 */
export const cleanupExpiredOAuthStates = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredStates = await ctx.db
      .query("oauthStates")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const state of expiredStates) {
      await ctx.db.delete(state._id);
    }

    console.log(`Cleaned up ${expiredStates.length} expired OAuth states`);
    return { cleanedUp: expiredStates.length };
  },
});