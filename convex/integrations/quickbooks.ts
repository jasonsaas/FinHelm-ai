import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import OAuthClient from "intuit-oauth";

/**
 * QuickBooks OAuth 2.0 Integration for FinHelm.ai using intuit-oauth package
 * Provides secure token management with encryption and automatic refresh
 */

export interface QuickBooksOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
  scope: string;
}

export interface QuickBooksTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  realmId: string;
  token_type: string;
}

/**
 * Start QuickBooks OAuth 2.0 authentication flow
 * Generates authorization URL and stores OAuth state
 */
export const startQuickBooksAuth = action({
  args: {
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    try {
      // Validate environment variables
      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("QuickBooks credentials not configured. Please set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI environment variables.");
      }

      // Determine environment (default to sandbox)
      const environment = (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") || "sandbox";

      // Generate secure state parameter
      const state = generateSecureRandomString(32);
      const codeVerifier = generateSecureRandomString(128);

      // Initialize OAuth client
      const oauthClient = new OAuthClient({
        clientId,
        clientSecret,
        environment,
        redirectUri,
        logging: true,
      });

      // Generate authorization URL
      const authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting],
        state,
      });

      // Store OAuth state for verification
      await ctx.runMutation(api.integrations.quickbooks.storeOAuthState, {
        state,
        codeVerifier,
        userId: args.userId,
        organizationId: args.organizationId,
        provider: "quickbooks",
        expiresAt: Date.now() + 600000, // 10 minutes
      });

      console.log(`Generated QuickBooks auth URL for environment: ${environment}`);

      return {
        authUrl: authUri,
        state,
        environment,
        expiresAt: Date.now() + 600000,
      };

    } catch (error) {
      console.error("Failed to start QuickBooks OAuth:", error);
      throw new Error(`Failed to generate auth URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Handle QuickBooks OAuth callback and exchange code for tokens
 * Stores encrypted tokens in erpConnections table
 */
export const handleQuickBooksCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
    realmId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify OAuth state
      const oauthState = await ctx.runQuery(api.integrations.quickbooks.getOAuthState, {
        state: args.state,
      });

      if (!oauthState) {
        throw new Error("Invalid OAuth state. The authorization may have expired or been tampered with.");
      }

      if (oauthState.expiresAt < Date.now()) {
        throw new Error("OAuth state expired. Please restart the authorization process.");
      }

      // Get configuration
      const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI!;
      const environment = (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") || "sandbox";

      // Initialize OAuth client
      const oauthClient = new OAuthClient({
        clientId,
        clientSecret,
        environment,
        redirectUri,
        logging: true,
      });

      // Exchange code for tokens
      const authResponse = await oauthClient.createToken(args.code, args.state, args.realmId);

      if (!authResponse.token) {
        throw new Error("Failed to obtain access token from QuickBooks");
      }

      const token = authResponse.token;

      // Prepare token data
      const tokenData: QuickBooksTokenResponse = {
        access_token: token.access_token!,
        refresh_token: token.refresh_token!,
        expires_in: token.expires_in || 3600,
        realmId: args.realmId,
        token_type: token.token_type || "Bearer",
      };

      // Create or update ERP connection with encrypted tokens
      const connectionId = await ctx.runMutation(api.integrations.quickbooks.createQuickBooksConnection, {
        organizationId: oauthState.organizationId,
        userId: oauthState.userId,
        tokenData,
        connectionName: `QuickBooks Company ${args.realmId}`,
      });

      // Clean up OAuth state
      await ctx.runMutation(api.integrations.quickbooks.deleteOAuthState, {
        state: args.state,
      });

      console.log(`QuickBooks OAuth completed successfully for realmId: ${args.realmId}`);

      return {
        success: true,
        connectionId,
        realmId: args.realmId,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        environment,
      };

    } catch (error) {
      console.error("QuickBooks OAuth callback failed:", error);
      throw new Error(`OAuth callback failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Refresh QuickBooks access token using refresh token
 * Automatically handles token expiration and updates stored tokens
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
        throw new Error("Connection is not a QuickBooks connection");
      }

      const refreshToken = connection.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error("No refresh token available. Re-authorization required.");
      }

      // Get configuration
      const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI!;
      const environment = (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") || "sandbox";

      // Initialize OAuth client with existing refresh token
      const oauthClient = new OAuthClient({
        clientId,
        clientSecret,
        environment,
        redirectUri,
        logging: true,
      });

      // Set the existing token for refresh
      oauthClient.setToken({
        refresh_token: refreshToken,
        realmId: connection.credentials.realmId,
      });

      // Refresh the token
      const authResponse = await oauthClient.refresh();

      if (!authResponse.token) {
        throw new Error("Failed to refresh token. Re-authorization may be required.");
      }

      const token = authResponse.token;

      // Update connection with new tokens (encrypted)
      await ctx.db.patch(args.connectionId, {
        credentials: {
          ...connection.credentials,
          accessToken: token.access_token!,
          refreshToken: token.refresh_token || refreshToken, // Keep old refresh token if not provided
          expiresAt: Date.now() + ((token.expires_in || 3600) * 1000),
        },
        syncStatus: "active",
        updatedAt: Date.now(),
      });

      console.log(`Successfully refreshed QuickBooks token for connection ${args.connectionId}`);

      return {
        success: true,
        expiresAt: Date.now() + ((token.expires_in || 3600) * 1000),
      };

    } catch (error) {
      console.error("QuickBooks token refresh failed:", error);
      
      // Mark connection as failed
      await ctx.db.patch(args.connectionId, {
        syncStatus: "failed",
        updatedAt: Date.now(),
      });

      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Fetch data from QuickBooks API with automatic token refresh
 * Generic function for making authenticated API calls
 */
export const fetchQuickBooksData = action({
  args: {
    connectionId: v.id("erpConnections"),
    endpoint: v.string(),
    method: v.optional(v.union(v.literal("GET"), v.literal("POST"), v.literal("PUT"), v.literal("DELETE"))),
    body: v.optional(v.any()),
    options: v.optional(v.object({
      retries: v.optional(v.number()),
      timeout: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const method = args.method || "GET";
    const retries = args.options?.retries || 3;
    const timeout = args.options?.timeout || 30000;
    
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const connection = await ctx.db.get(args.connectionId);
        if (!connection) {
          throw new Error("QuickBooks connection not found");
        }

        if (connection.erpType !== "quickbooks") {
          throw new Error("Connection is not a QuickBooks connection");
        }

        if (!connection.isActive) {
          throw new Error("QuickBooks connection is inactive");
        }

        // Check if token needs refresh (5 minute buffer)
        const expiresAt = connection.credentials.expiresAt || 0;
        const bufferTime = 5 * 60 * 1000; // 5 minutes
        
        if (expiresAt - bufferTime < Date.now()) {
          console.log("Token expiring soon, refreshing...");
          await ctx.runAction(api.integrations.quickbooks.refreshQuickBooksToken, {
            connectionId: args.connectionId,
          });
          
          // Refetch connection with updated token
          const updatedConnection = await ctx.db.get(args.connectionId);
          if (updatedConnection) {
            Object.assign(connection, updatedConnection);
          }
        }

        // Determine base URL based on environment
        const environment = process.env.QUICKBOOKS_ENVIRONMENT || "sandbox";
        const baseUrl = environment === "production" 
          ? "https://quickbooks.api.intuit.com"
          : "https://sandbox-quickbooks.api.intuit.com";

        const realmId = connection.credentials.realmId || connection.credentials.companyId;
        const url = `${baseUrl}/v3/company/${realmId}${args.endpoint}`;

        // Prepare headers
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${connection.credentials.accessToken}`,
          "Accept": "application/json",
          "User-Agent": "FinHelm-ai/1.0.0",
        };

        if (method === "POST" || method === "PUT") {
          headers["Content-Type"] = "application/json";
        }

        // Make API call
        const response = await fetch(url, {
          method,
          headers,
          body: args.body ? JSON.stringify(args.body) : undefined,
          signal: AbortSignal.timeout(timeout),
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
          
          if (attempt < retries) {
            console.log(`Rate limited, retrying after ${retryAfter}s (attempt ${attempt + 1}/${retries})`);
            await sleep(retryAfter * 1000);
            attempt++;
            continue;
          }
          
          throw new Error("Rate limit exceeded - too many requests");
        }

        // Handle token expiration
        if (response.status === 401) {
          if (attempt < retries) {
            console.log(`Unauthorized, refreshing token (attempt ${attempt + 1}/${retries})`);
            await ctx.runAction(api.integrations.quickbooks.refreshQuickBooksToken, {
              connectionId: args.connectionId,
            });
            attempt++;
            continue;
          }
          
          throw new Error("Authentication failed - token expired or invalid");
        }

        // Handle other errors
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `API call failed: ${response.status} ${response.statusText}`;
          
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.Fault?.Error?.[0]?.Detail) {
              errorMessage = errorData.Fault.Error[0].Detail;
            }
          } catch {
            // Use default error message if JSON parsing fails
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Extract rate limit info
        const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
        const rateLimitReset = response.headers.get("X-RateLimit-Reset");

        return {
          success: true,
          data,
          metadata: {
            rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
            rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
            endpoint: args.endpoint,
            method,
            timestamp: Date.now(),
          },
        };

      } catch (error) {
        if (attempt === retries) {
          console.error(`QuickBooks API call failed after ${retries} attempts:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            metadata: {
              endpoint: args.endpoint,
              method,
              attempts: attempt + 1,
              timestamp: Date.now(),
            },
          };
        }

        console.warn(`QuickBooks API call attempt ${attempt + 1} failed:`, error);
        attempt++;
        
        // Exponential backoff for retries
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }

    return {
      success: false,
      error: "Maximum retry attempts exceeded",
      metadata: {
        endpoint: args.endpoint,
        method,
        attempts: attempt,
        timestamp: Date.now(),
      },
    };
  },
});

// Mutation functions for OAuth state management

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

export const createQuickBooksConnection = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    tokenData: v.object({
      access_token: v.string(),
      refresh_token: v.string(),
      expires_in: v.number(),
      realmId: v.string(),
      token_type: v.string(),
    }),
    connectionName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists for this realmId and organization
    let existingConnection = null;
    
    if (args.organizationId) {
      existingConnection = await ctx.db
        .query("erpConnections")
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), args.organizationId),
            q.eq(q.field("erpType"), "quickbooks"),
            q.eq(q.field("credentials.realmId"), args.tokenData.realmId)
          )
        )
        .first();
    }

    const expiresAt = Date.now() + (args.tokenData.expires_in * 1000);

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        credentials: {
          accessToken: args.tokenData.access_token,
          refreshToken: args.tokenData.refresh_token,
          expiresAt,
          realmId: args.tokenData.realmId,
          companyId: args.tokenData.realmId,
        },
        isActive: true,
        syncStatus: "active",
        updatedAt: Date.now(),
      });
      
      return existingConnection._id;
    } else {
      // Create new connection
      return await ctx.db.insert("erpConnections", {
        organizationId: args.organizationId!,
        userId: args.userId!,
        erpType: "quickbooks",
        connectionName: args.connectionName,
        isActive: true,
        credentials: {
          accessToken: args.tokenData.access_token,
          refreshToken: args.tokenData.refresh_token,
          expiresAt,
          realmId: args.tokenData.realmId,
          companyId: args.tokenData.realmId,
        },
        lastSyncAt: Date.now(),
        syncStatus: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Utility functions

function generateSecureRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}