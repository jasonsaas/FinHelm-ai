/**
 * ERP Authentication Action - OAuth2 Integration for Sage Intacct and QuickBooks
 * Implements secure OAuth2 flow with role-based authorization and token management
 * 
 * Features:
 * - Sage Intacct OAuth2 integration (primary)
 * - QuickBooks OAuth2 fallback
 * - Role-based access control for compliance agents
 * - Secure token storage and refresh
 * - Data sync health check authorization
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import OAuthClient from "intuit-oauth";
import { ConvexError } from "convex/values";

/**
 * OAuth Provider Configuration
 */
const OAUTH_CONFIGS = {
  sage_intacct: {
    discoveryDocument: process.env.SAGE_INTACCT_DISCOVERY_URL || "https://api.intacct.com/oauth2/.well-known/openid_configuration",
    clientId: process.env.SAGE_INTACCT_CLIENT_ID,
    clientSecret: process.env.SAGE_INTACCT_CLIENT_SECRET,
    redirectUri: process.env.SAGE_INTACCT_REDIRECT_URI,
    scope: "openid profile company",
    sandbox: process.env.NODE_ENV !== "production",
  },
  quickbooks: {
    discoveryDocument: OAuthClient.discovery_urls.sandbox_base_url,
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
    scope: "com.intuit.quickbooks.accounting",
    sandbox: process.env.NODE_ENV !== "production",
  },
};

/**
 * Role-based permissions for compliance and data sync operations
 */
const ROLE_PERMISSIONS = {
  admin: ["oauth:authorize", "oauth:token", "oauth:refresh", "data:sync", "compliance:audit"],
  compliance_agent: ["oauth:token", "oauth:refresh", "data:sync", "compliance:audit"],
  data_sync_agent: ["oauth:token", "oauth:refresh", "data:sync"],
  user: ["oauth:authorize"],
  viewer: [],
};

/**
 * Validate user permissions for OAuth operations
 */
function validateUserPermission(userRole: string, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
  return permissions.includes(requiredPermission);
}

/**
 * Create OAuth client for specified provider
 */
function createOAuthClient(provider: "sage_intacct" | "quickbooks"): OAuthClient {
  const config = OAUTH_CONFIGS[provider];
  
  if (!config.clientId || !config.clientSecret) {
    throw new ConvexError(`Missing OAuth credentials for ${provider}`);
  }

  // For Sage Intacct, we need to configure custom endpoints
  if (provider === "sage_intacct") {
    return new OAuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      environment: config.sandbox ? "sandbox" : "production",
      redirectUri: config.redirectUri,
      logging: process.env.NODE_ENV === "development",
      // Custom configuration for Sage Intacct
      token_url: process.env.SAGE_INTACCT_TOKEN_URL || "https://api.intacct.com/oauth2/token",
      revoke_url: process.env.SAGE_INTACCT_REVOKE_URL || "https://api.intacct.com/oauth2/revoke",
    });
  }

  // Standard QuickBooks OAuth client
  return new OAuthClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    environment: config.sandbox ? "sandbox" : "production",
    redirectUri: config.redirectUri,
    logging: process.env.NODE_ENV === "development",
  });
}

/**
 * Initiate OAuth2 authorization flow
 * Supports both Sage Intacct and QuickBooks providers
 */
export const authorize = action({
  args: {
    provider: v.union(v.literal("sage_intacct"), v.literal("quickbooks")),
    organizationId: v.id("organizations"),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user identity and validate permissions
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Get user from database to check role
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate user has permission to authorize OAuth
    if (!validateUserPermission(user.role, "oauth:authorize")) {
      throw new ConvexError("Insufficient permissions for OAuth authorization");
    }

    // Verify organization exists and user has access
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .first();

    if (!userOrg || !userOrg.isActive) {
      throw new ConvexError("Organization access denied");
    }

    try {
      const oauthClient = createOAuthClient(args.provider);
      
      // Generate authorization URL with state parameter
      const authUri = oauthClient.authorizeUri({
        scope: OAUTH_CONFIGS[args.provider].scope,
        state: args.state || `${args.organizationId}_${user._id}_${Date.now()}`,
      });

      // Log authorization attempt for audit trail
      await ctx.db.insert("auditLogs", {
        organizationId: args.organizationId,
        userId: user._id,
        action: "oauth_authorize_initiated",
        resourceType: "erp_connection",
        resourceId: args.provider,
        details: {
          metadata: {
            provider: args.provider,
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      return {
        authorizationUrl: authUri,
        provider: args.provider,
        state: args.state || `${args.organizationId}_${user._id}_${Date.now()}`,
      };
    } catch (error) {
      console.error(`OAuth authorization error for ${args.provider}:`, error);
      throw new ConvexError(`Failed to create authorization URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Exchange authorization code for access token
 * Handles token storage and connection setup
 */
export const getToken = action({
  args: {
    provider: v.union(v.literal("sage_intacct"), v.literal("quickbooks")),
    code: v.string(),
    state: v.string(),
    realmId: v.optional(v.string()), // QuickBooks company ID
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Parse state parameter to get organization and user info
    const stateParts = args.state.split("_");
    if (stateParts.length < 3) {
      throw new ConvexError("Invalid state parameter");
    }

    const organizationId = stateParts[0] as any; // Will be validated by the database query
    const userId = stateParts[1] as any;

    // Get user and validate permissions
    const user = await ctx.db.get(userId);
    if (!user || user.email !== identity.email) {
      throw new ConvexError("User verification failed");
    }

    // Check if user is compliance agent or has appropriate permissions
    if (!validateUserPermission(user.role, "oauth:token")) {
      throw new ConvexError("Insufficient permissions for token exchange");
    }

    try {
      const oauthClient = createOAuthClient(args.provider);
      
      // Exchange code for token
      const authResponse = await oauthClient.createToken(args.code);
      
      if (!authResponse || !authResponse.token) {
        throw new ConvexError("Failed to obtain access token");
      }

      const token = authResponse.token;
      
      // Calculate token expiration
      const expiresAt = token.expires_in 
        ? Date.now() + (token.expires_in * 1000)
        : Date.now() + (3600 * 1000); // 1 hour default

      // Check for existing connection
      const existingConnection = await ctx.db
        .query("erpConnections")
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .filter((q) => q.eq(q.field("erpType"), args.provider))
        .first();

      if (existingConnection) {
        // Update existing connection
        await ctx.db.patch(existingConnection._id, {
          credentials: {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            companyId: args.realmId || token.realmId,
            realmId: args.realmId || token.realmId,
            expiresAt,
          },
          syncStatus: "active",
          updatedAt: Date.now(),
        });
      } else {
        // Create new connection
        await ctx.db.insert("erpConnections", {
          organizationId,
          userId: user._id,
          erpType: args.provider,
          connectionName: `${args.provider} Connection`,
          isActive: true,
          credentials: {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            companyId: args.realmId || token.realmId,
            realmId: args.realmId || token.realmId,
            expiresAt,
          },
          syncStatus: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Log successful token exchange
      await ctx.db.insert("auditLogs", {
        organizationId,
        userId: user._id,
        action: "oauth_token_exchanged",
        resourceType: "erp_connection",
        resourceId: args.provider,
        details: {
          metadata: {
            provider: args.provider,
            realmId: args.realmId,
            expiresAt,
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        provider: args.provider,
        companyId: args.realmId || token.realmId,
        expiresAt,
      };
    } catch (error) {
      console.error(`Token exchange error for ${args.provider}:`, error);
      
      // Log failed attempt
      await ctx.db.insert("auditLogs", {
        organizationId,
        userId: user._id,
        action: "oauth_token_exchange_failed",
        resourceType: "erp_connection",
        resourceId: args.provider,
        details: {
          metadata: {
            provider: args.provider,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      throw new ConvexError(`Token exchange failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Refresh OAuth2 access token
 * Critical for maintaining data sync operations
 */
export const refreshToken = action({
  args: {
    connectionId: v.id("erpConnections"),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Get connection details
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || !connection.isActive) {
      throw new ConvexError("Connection not found or inactive");
    }

    // Get user and validate permissions
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user is compliance agent or data sync agent
    if (!validateUserPermission(user.role, "oauth:refresh")) {
      throw new ConvexError("Insufficient permissions for token refresh");
    }

    // Verify user has access to the organization
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", user._id).eq("organizationId", connection.organizationId)
      )
      .first();

    if (!userOrg || !userOrg.isActive) {
      throw new ConvexError("Organization access denied");
    }

    if (!connection.credentials.refreshToken) {
      throw new ConvexError("No refresh token available");
    }

    try {
      const oauthClient = createOAuthClient(connection.erpType as "sage_intacct" | "quickbooks");
      
      // Set the current token for refresh
      oauthClient.token.setToken(connection.credentials);
      
      // Refresh the token
      const authResponse = await oauthClient.refresh();
      
      if (!authResponse || !authResponse.token) {
        throw new ConvexError("Failed to refresh token");
      }

      const token = authResponse.token;
      
      // Calculate new expiration
      const expiresAt = token.expires_in 
        ? Date.now() + (token.expires_in * 1000)
        : Date.now() + (3600 * 1000); // 1 hour default

      // Update connection with new token
      await ctx.db.patch(connection._id, {
        credentials: {
          ...connection.credentials,
          accessToken: token.access_token,
          refreshToken: token.refresh_token || connection.credentials.refreshToken,
          expiresAt,
        },
        syncStatus: "active",
        updatedAt: Date.now(),
      });

      // Log successful refresh
      await ctx.db.insert("auditLogs", {
        organizationId: connection.organizationId,
        userId: user._id,
        action: "oauth_token_refreshed",
        resourceType: "erp_connection",
        resourceId: connection._id,
        details: {
          metadata: {
            provider: connection.erpType,
            expiresAt,
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        provider: connection.erpType,
        expiresAt,
      };
    } catch (error) {
      console.error(`Token refresh error for ${connection.erpType}:`, error);
      
      // Mark connection as failed
      await ctx.db.patch(connection._id, {
        syncStatus: "failed",
        updatedAt: Date.now(),
      });

      // Log failed refresh
      await ctx.db.insert("auditLogs", {
        organizationId: connection.organizationId,
        userId: user._id,
        action: "oauth_token_refresh_failed",
        resourceType: "erp_connection",
        resourceId: connection._id,
        details: {
          metadata: {
            provider: connection.erpType,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      throw new ConvexError(`Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Test sandbox connection and validate OAuth setup
 * Used for compliance and data sync health checks
 */
export const testConnection = action({
  args: {
    connectionId: v.id("erpConnections"),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Get connection details
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || !connection.isActive) {
      throw new ConvexError("Connection not found or inactive");
    }

    // Get user and validate permissions
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user has data sync permissions
    if (!validateUserPermission(user.role, "data:sync")) {
      throw new ConvexError("Insufficient permissions for connection testing");
    }

    try {
      const oauthClient = createOAuthClient(connection.erpType as "sage_intacct" | "quickbooks");
      
      // Set the current token
      oauthClient.token.setToken(connection.credentials);
      
      // Test API call based on provider
      let testResult;
      if (connection.erpType === "sage_intacct") {
        // For Sage Intacct, test with a simple API call
        testResult = await fetch(`${process.env.SAGE_INTACCT_API_URL || "https://api.intacct.com"}/ia/xml/xmlgw.phtml`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${connection.credentials.accessToken}`,
            "Content-Type": "application/xml",
          },
          body: `<?xml version="1.0" encoding="UTF-8"?>
                 <request>
                   <control>
                     <senderid>${process.env.SAGE_INTACCT_SENDER_ID}</senderid>
                     <password>${process.env.SAGE_INTACCT_SENDER_PASSWORD}</password>
                     <controlid>test-${Date.now()}</controlid>
                     <uniqueid>false</uniqueid>
                     <dtdversion>3.0</dtdversion>
                   </control>
                   <operation>
                     <authentication>
                       <access_token>${connection.credentials.accessToken}</access_token>
                     </authentication>
                     <content>
                       <function controlid="test">
                         <getAPISession></getAPISession>
                       </function>
                     </content>
                   </operation>
                 </request>`,
        });
      } else {
        // For QuickBooks, test with company info endpoint
        testResult = await oauthClient.makeApiCall({
          url: `${oauthClient.environment === "sandbox" ? OAuthClient.environment.sandbox : OAuthClient.environment.production}v3/companyinfo/${connection.credentials.realmId}/companyinfo/1`,
          method: "GET",
        });
      }

      const isHealthy = connection.erpType === "sage_intacct" 
        ? testResult.ok 
        : testResult.response && testResult.response.QueryResponse;

      // Log test result
      await ctx.db.insert("auditLogs", {
        organizationId: connection.organizationId,
        userId: user._id,
        action: "connection_tested",
        resourceType: "erp_connection",
        resourceId: connection._id,
        details: {
          metadata: {
            provider: connection.erpType,
            healthy: isHealthy,
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        healthy: isHealthy,
        provider: connection.erpType,
        companyId: connection.credentials.companyId || connection.credentials.realmId,
        lastTested: Date.now(),
      };
    } catch (error) {
      console.error(`Connection test error for ${connection.erpType}:`, error);
      
      // Log failed test
      await ctx.db.insert("auditLogs", {
        organizationId: connection.organizationId,
        userId: user._id,
        action: "connection_test_failed",
        resourceType: "erp_connection",
        resourceId: connection._id,
        details: {
          metadata: {
            provider: connection.erpType,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });

      return {
        success: false,
        healthy: false,
        provider: connection.erpType,
        error: error instanceof Error ? error.message : "Unknown error",
        lastTested: Date.now(),
      };
    }
  },
});

/**
 * Get OAuth connection status for monitoring and compliance
 */
export const getConnectionStatus = action({
  args: {
    organizationId: v.id("organizations"),
    provider: v.optional(v.union(v.literal("sage_intacct"), v.literal("quickbooks"))),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify organization access
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .first();

    if (!userOrg || !userOrg.isActive) {
      throw new ConvexError("Organization access denied");
    }

    // Get connections
    let query = ctx.db
      .query("erpConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    if (args.provider) {
      query = query.filter((q) => q.eq(q.field("erpType"), args.provider));
    }

    const connections = await query.collect();

    const connectionStatus = connections.map(conn => ({
      id: conn._id,
      provider: conn.erpType,
      name: conn.connectionName,
      isActive: conn.isActive,
      syncStatus: conn.syncStatus,
      companyId: conn.credentials.companyId || conn.credentials.realmId,
      expiresAt: conn.credentials.expiresAt,
      isExpired: conn.credentials.expiresAt ? conn.credentials.expiresAt < Date.now() : true,
      lastSyncAt: conn.lastSyncAt,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    return {
      organizationId: args.organizationId,
      connections: connectionStatus,
      summary: {
        total: connections.length,
        active: connections.filter(c => c.isActive && c.syncStatus === "active").length,
        expired: connections.filter(c => c.credentials.expiresAt && c.credentials.expiresAt < Date.now()).length,
        failed: connections.filter(c => c.syncStatus === "failed").length,
      },
    };
  },
});