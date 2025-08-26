/**
 * FinHelm.ai ERP OAuth2 Authentication Actions
 * Comprehensive Sage Intacct OAuth2 implementation with QuickBooks fallback
 * Supports role-based authentication for compliance agents per PRD v2.1
 * 
 * Features:
 * - Sage Intacct OAuth2 (primary)
 * - QuickBooks OAuth2 (fallback)
 * - Role-based access control
 * - Secure token management
 * - Sandbox testing support
 * - Comprehensive error handling
 */

import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Environment configuration with secure defaults
const ERP_CONFIG = {
  sageIntacct: {
    clientId: process.env.SAGE_INTACCT_CLIENT_ID || '',
    clientSecret: process.env.SAGE_INTACCT_CLIENT_SECRET || '',
    redirectUri: process.env.SAGE_INTACCT_REDIRECT_URI || 'https://app.finhelm.ai/oauth/sage/callback',
    baseUrl: process.env.SAGE_INTACCT_BASE_URL || 'https://api.intacct.com/ia/acct/api.phtml',
    sandboxUrl: process.env.SAGE_INTACCT_SANDBOX_URL || 'https://api-sandbox.intacct.com/ia/acct/api.phtml',
    scopes: ['read', 'write', 'offline_access'],
    tokenEndpoint: '/oauth2/token',
    authorizeEndpoint: '/oauth2/authorize',
  },
  quickBooks: {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'https://app.finhelm.ai/oauth/qb/callback',
    baseUrl: 'https://appcenter.intuit.com/connect/oauth2',
    sandboxBaseUrl: 'https://sandbox-appcenter.intuit.com/connect/oauth2',
    scope: 'com.intuit.quickbooks.accounting',
    discoveryDocument: 'https://appcenter.intuit.com/connect/oauth2',
  },
};

// OAuth state management
interface OAuthState {
  userId: string;
  organizationId?: string;
  erpType: 'sage_intacct' | 'quickbooks';
  state: string;
  nonce: string;
  codeVerifier?: string; // For PKCE
  userRole: string;
  permissions: string[];
  createdAt: number;
  expiresAt: number;
}

// Token response interfaces
interface SageIntacctTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  company_id?: string;
}

interface QuickBooksTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  realmId: string;
}

// Role-based permissions for compliance agents
const ROLE_PERMISSIONS = {
  'owner': ['read', 'write', 'admin', 'oauth', 'compliance'],
  'admin': ['read', 'write', 'oauth', 'compliance'],
  'compliance_agent': ['read', 'oauth', 'audit', 'compliance'],
  'financial_analyst': ['read', 'oauth'],
  'member': ['read'],
  'viewer': ['read'],
} as const;

/**
 * Utility: Generate secure random string
 */
function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility: Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = generateSecureRandom(64);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return { codeVerifier, codeChallenge };
  });
}

/**
 * Utility: Check user permissions for OAuth operations
 */
function hasOAuthPermission(userRole: string, requiredPermission: string = 'oauth'): boolean {
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  return permissions?.includes(requiredPermission as any) || false;
}

/**
 * Query: Check user's OAuth permissions
 */
export const checkOAuthPermissions = query({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Get user details
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Get user-organization relationship if specified
    let userRole = user.role;
    let permissions: string[] = [];

    if (args.organizationId) {
      const userOrg = await ctx.db
        .query("userOrganizations")
        .withIndex("by_user_org", q => q.eq("userId", args.userId).eq("organizationId", args.organizationId))
        .first();

      if (userOrg) {
        userRole = userOrg.role;
        permissions = userOrg.permissions;
      }
    }

    const hasOAuthAccess = hasOAuthPermission(userRole);
    const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];

    return {
      hasOAuthAccess,
      userRole,
      permissions: [...rolePermissions, ...permissions],
      canInitiateOAuth: hasOAuthAccess,
      canManageConnections: rolePermissions.includes('admin') || rolePermissions.includes('compliance'),
    };
  },
});

/**
 * Mutation: Store OAuth state securely
 */
export const storeOAuthState = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    erpType: v.union(v.literal("sage_intacct"), v.literal("quickbooks")),
    state: v.string(),
    nonce: v.string(),
    codeVerifier: v.optional(v.string()),
    userRole: v.string(),
    permissions: v.array(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Clean up expired states first
    const expiredStates = await ctx.db
      .query("oauthStates")
      .filter(q => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const expiredState of expiredStates) {
      await ctx.db.delete(expiredState._id);
    }

    // Store new OAuth state
    return await ctx.db.insert("oauthStates", {
      userId: args.userId,
      organizationId: args.organizationId,
      erpType: args.erpType,
      state: args.state,
      nonce: args.nonce,
      codeVerifier: args.codeVerifier,
      userRole: args.userRole,
      permissions: args.permissions,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Query: Retrieve OAuth state
 */
export const getOAuthState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const oauthState = await ctx.db
      .query("oauthStates")
      .filter(q => q.eq(q.field("state"), args.state))
      .first();

    if (!oauthState || oauthState.expiresAt < Date.now()) {
      return null;
    }

    return oauthState;
  },
});

/**
 * Mutation: Clean up OAuth state after use
 */
export const cleanupOAuthState = mutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const oauthState = await ctx.db
      .query("oauthStates")
      .filter(q => q.eq(q.field("state"), args.state))
      .first();

    if (oauthState) {
      await ctx.db.delete(oauthState._id);
    }
  },
});

/**
 * Action: Initiate Sage Intacct OAuth2 Flow
 */
export const initiateSageIntacctOAuth = action({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    useSandbox: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Check user permissions
      const permissions = await ctx.runQuery(api.erpAuth.checkOAuthPermissions, {
        userId: args.userId,
        organizationId: args.organizationId,
      });

      if (!permissions.canInitiateOAuth) {
        throw new Error("Insufficient permissions to initiate OAuth");
      }

      // Generate secure state and PKCE parameters
      const state = generateSecureRandom(32);
      const nonce = generateSecureRandom(16);
      const { codeVerifier, codeChallenge } = await generatePKCE();

      // Store OAuth state
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
      await ctx.runMutation(api.erpAuth.storeOAuthState, {
        userId: args.userId,
        organizationId: args.organizationId,
        erpType: "sage_intacct",
        state,
        nonce,
        codeVerifier,
        userRole: permissions.userRole,
        permissions: permissions.permissions,
        expiresAt,
      });

      // Build authorization URL
      const config = ERP_CONFIG.sageIntacct;
      const baseUrl = args.useSandbox ? config.sandboxUrl : config.baseUrl;
      
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authorizationUrl = `${baseUrl}${config.authorizeEndpoint}?${authParams.toString()}`;

      // Log audit event
      await ctx.runMutation(api.auditLogs.create, {
        organizationId: args.organizationId,
        userId: args.userId,
        action: "oauth_initiate",
        resourceType: "erp_connection",
        details: {
          metadata: {
            erpType: "sage_intacct",
            sandbox: args.useSandbox || false,
            permissions: permissions.permissions,
          },
        },
        ipAddress: ctx.metadata?.ipAddress,
        userAgent: ctx.metadata?.userAgent,
      });

      return {
        success: true,
        authorizationUrl,
        state,
        expiresAt,
        erpType: "sage_intacct" as const,
        message: "Sage Intacct OAuth flow initiated successfully"
      };

    } catch (error: any) {
      console.error("Sage Intacct OAuth initiation failed:", error);
      return {
        success: false,
        error: "Failed to initiate Sage Intacct OAuth flow",
        details: error.message
      };
    }
  },
});

/**
 * Action: Initiate QuickBooks OAuth2 Flow (Fallback)
 */
export const initiateQuickBooksOAuth = action({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    useSandbox: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Check user permissions
      const permissions = await ctx.runQuery(api.erpAuth.checkOAuthPermissions, {
        userId: args.userId,
        organizationId: args.organizationId,
      });

      if (!permissions.canInitiateOAuth) {
        throw new Error("Insufficient permissions to initiate OAuth");
      }

      // Generate secure state
      const state = generateSecureRandom(32);
      const nonce = generateSecureRandom(16);

      // Store OAuth state
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
      await ctx.runMutation(api.erpAuth.storeOAuthState, {
        userId: args.userId,
        organizationId: args.organizationId,
        erpType: "quickbooks",
        state,
        nonce,
        userRole: permissions.userRole,
        permissions: permissions.permissions,
        expiresAt,
      });

      // Build authorization URL
      const config = ERP_CONFIG.quickBooks;
      const baseUrl = args.useSandbox ? config.sandboxBaseUrl : config.baseUrl;
      
      const authParams = new URLSearchParams({
        client_id: config.clientId,
        scope: config.scope,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        access_type: 'offline',
        state,
      });

      const authorizationUrl = `${baseUrl}?${authParams.toString()}`;

      // Log audit event
      await ctx.runMutation(api.auditLogs.create, {
        organizationId: args.organizationId,
        userId: args.userId,
        action: "oauth_initiate",
        resourceType: "erp_connection",
        details: {
          metadata: {
            erpType: "quickbooks",
            sandbox: args.useSandbox || false,
            permissions: permissions.permissions,
          },
        },
        ipAddress: ctx.metadata?.ipAddress,
        userAgent: ctx.metadata?.userAgent,
      });

      return {
        success: true,
        authorizationUrl,
        state,
        expiresAt,
        erpType: "quickbooks" as const,
        message: "QuickBooks OAuth flow initiated successfully"
      };

    } catch (error: any) {
      console.error("QuickBooks OAuth initiation failed:", error);
      return {
        success: false,
        error: "Failed to initiate QuickBooks OAuth flow",
        details: error.message
      };
    }
  },
});

/**
 * Action: Handle OAuth2 Callback for Sage Intacct
 */
export const handleSageIntacctCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
    companyId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Verify and retrieve OAuth state
      const storedState = await ctx.runQuery(api.erpAuth.getOAuthState, {
        state: args.state
      });

      if (!storedState || storedState.expiresAt < Date.now()) {
        throw new Error("Invalid or expired OAuth state");
      }

      // Exchange authorization code for tokens
      const config = ERP_CONFIG.sageIntacct;
      const tokenEndpoint = `${config.baseUrl}${config.tokenEndpoint}`;

      const tokenRequestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: args.code,
        redirect_uri: config.redirectUri,
        code_verifier: storedState.codeVerifier || '',
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: tokenRequestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
      }

      const tokenResponse: SageIntacctTokenResponse = await response.json();

      // Store ERP connection
      const connectionId = await ctx.runMutation(api.erpConnections.create, {
        organizationId: storedState.organizationId,
        userId: storedState.userId,
        erpType: "sage_intacct",
        connectionName: `Sage Intacct - ${args.companyId || 'Company'}`,
        isActive: true,
        credentials: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          companyId: tokenResponse.company_id || args.companyId,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        },
        syncStatus: "pending",
      });

      // Clean up OAuth state
      await ctx.runMutation(api.erpAuth.cleanupOAuthState, {
        state: args.state
      });

      // Test connection with sandbox API call
      const testResult = await testSageIntacctConnection(tokenResponse.access_token, args.companyId);

      // Log audit event
      await ctx.runMutation(api.auditLogs.create, {
        organizationId: storedState.organizationId,
        userId: storedState.userId,
        action: "oauth_callback_success",
        resourceType: "erp_connection",
        resourceId: connectionId,
        details: {
          after: {
            erpType: "sage_intacct",
            companyId: tokenResponse.company_id,
            testResult,
          },
          metadata: {
            tokenScope: tokenResponse.scope,
            permissions: storedState.permissions,
          },
        },
      });

      return {
        success: true,
        connectionId,
        erpType: "sage_intacct",
        companyId: tokenResponse.company_id || args.companyId,
        scope: tokenResponse.scope,
        testResult,
        message: "Sage Intacct OAuth completed and connection tested successfully"
      };

    } catch (error: any) {
      console.error("Sage Intacct OAuth callback failed:", error);
      
      // Log error
      if (args.state) {
        const storedState = await ctx.runQuery(api.erpAuth.getOAuthState, { state: args.state });
        if (storedState) {
          await ctx.runMutation(api.auditLogs.create, {
            organizationId: storedState.organizationId,
            userId: storedState.userId,
            action: "oauth_callback_failed",
            resourceType: "erp_connection",
            details: {
              metadata: {
                error: error.message,
                erpType: "sage_intacct",
              },
            },
          });
        }
      }

      return {
        success: false,
        error: "Failed to process Sage Intacct OAuth callback",
        details: error.message
      };
    }
  },
});

/**
 * Action: Handle OAuth2 Callback for QuickBooks
 */
export const handleQuickBooksCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
    realmId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify and retrieve OAuth state
      const storedState = await ctx.runQuery(api.erpAuth.getOAuthState, {
        state: args.state
      });

      if (!storedState || storedState.expiresAt < Date.now()) {
        throw new Error("Invalid or expired OAuth state");
      }

      // Exchange authorization code for tokens
      const config = ERP_CONFIG.quickBooks;
      const tokenEndpoint = `${config.baseUrl}`;

      const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: args.code,
          redirect_uri: config.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
      }

      const tokenResponse: QuickBooksTokenResponse = await response.json();

      // Store ERP connection
      const connectionId = await ctx.runMutation(api.erpConnections.create, {
        organizationId: storedState.organizationId,
        userId: storedState.userId,
        erpType: "quickbooks",
        connectionName: `QuickBooks - ${args.realmId}`,
        isActive: true,
        credentials: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          realmId: args.realmId,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        },
        syncStatus: "pending",
      });

      // Clean up OAuth state
      await ctx.runMutation(api.erpAuth.cleanupOAuthState, {
        state: args.state
      });

      // Test connection
      const testResult = await testQuickBooksConnection(tokenResponse.access_token, args.realmId);

      // Log audit event
      await ctx.runMutation(api.auditLogs.create, {
        organizationId: storedState.organizationId,
        userId: storedState.userId,
        action: "oauth_callback_success",
        resourceType: "erp_connection",
        resourceId: connectionId,
        details: {
          after: {
            erpType: "quickbooks",
            realmId: args.realmId,
            testResult,
          },
          metadata: {
            tokenScope: tokenResponse.scope,
            permissions: storedState.permissions,
          },
        },
      });

      return {
        success: true,
        connectionId,
        erpType: "quickbooks",
        realmId: args.realmId,
        scope: tokenResponse.scope,
        testResult,
        message: "QuickBooks OAuth completed and connection tested successfully"
      };

    } catch (error: any) {
      console.error("QuickBooks OAuth callback failed:", error);
      return {
        success: false,
        error: "Failed to process QuickBooks OAuth callback",
        details: error.message
      };
    }
  },
});

/**
 * Action: Refresh OAuth Tokens
 */
export const refreshOAuthTokens = action({
  args: {
    connectionId: v.id("erpConnections"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get connection details
      const connection = await ctx.db.get(args.connectionId);
      if (!connection) {
        throw new Error("ERP connection not found");
      }

      // Check user permissions
      const permissions = await ctx.runQuery(api.erpAuth.checkOAuthPermissions, {
        userId: args.userId,
        organizationId: connection.organizationId,
      });

      if (!permissions.canManageConnections && connection.userId !== args.userId) {
        throw new Error("Insufficient permissions to refresh tokens");
      }

      if (!connection.credentials.refreshToken) {
        throw new Error("No refresh token available");
      }

      let tokenResponse: any;
      let testResult: any;

      if (connection.erpType === "sage_intacct") {
        tokenResponse = await refreshSageIntacctToken(connection.credentials.refreshToken);
        testResult = await testSageIntacctConnection(tokenResponse.access_token, connection.credentials.companyId);
      } else if (connection.erpType === "quickbooks") {
        tokenResponse = await refreshQuickBooksToken(connection.credentials.refreshToken);
        testResult = await testQuickBooksConnection(tokenResponse.access_token, connection.credentials.realmId);
      } else {
        throw new Error(`Unsupported ERP type: ${connection.erpType}`);
      }

      // Update stored tokens
      await ctx.runMutation(api.erpConnections.updateCredentials, {
        connectionId: args.connectionId,
        credentials: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || connection.credentials.refreshToken,
          companyId: connection.credentials.companyId,
          realmId: connection.credentials.realmId,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        },
        lastSyncAt: Date.now(),
      });

      // Log audit event
      await ctx.runMutation(api.auditLogs.create, {
        organizationId: connection.organizationId,
        userId: args.userId,
        action: "oauth_token_refresh",
        resourceType: "erp_connection",
        resourceId: args.connectionId,
        details: {
          metadata: {
            erpType: connection.erpType,
            testResult,
            refreshedAt: Date.now(),
          },
        },
      });

      return {
        success: true,
        testResult,
        message: "OAuth tokens refreshed successfully"
      };

    } catch (error: any) {
      console.error("Token refresh failed:", error);
      return {
        success: false,
        error: "Failed to refresh OAuth tokens",
        details: error.message
      };
    }
  },
});

/**
 * Utility: Test Sage Intacct API connection
 */
async function testSageIntacctConnection(accessToken: string, companyId?: string): Promise<any> {
  try {
    const config = ERP_CONFIG.sageIntacct;
    const testEndpoint = `${config.baseUrl}/test/company`;

    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API test failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      companyInfo: data,
      responseTime: Date.now(),
      message: "Sage Intacct API connection test successful"
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Sage Intacct API connection test failed"
    };
  }
}

/**
 * Utility: Test QuickBooks API connection
 */
async function testQuickBooksConnection(accessToken: string, realmId: string): Promise<any> {
  try {
    const testEndpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`;

    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API test failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      companyInfo: data,
      responseTime: Date.now(),
      message: "QuickBooks API connection test successful"
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "QuickBooks API connection test failed"
    };
  }
}

/**
 * Utility: Refresh Sage Intacct token
 */
async function refreshSageIntacctToken(refreshToken: string): Promise<SageIntacctTokenResponse> {
  const config = ERP_CONFIG.sageIntacct;
  const tokenEndpoint = `${config.baseUrl}${config.tokenEndpoint}`;

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Utility: Refresh QuickBooks token
 */
async function refreshQuickBooksToken(refreshToken: string): Promise<QuickBooksTokenResponse> {
  const config = ERP_CONFIG.quickBooks;
  const tokenEndpoint = `${config.baseUrl}`;

  const authString = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${authString}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Query: Get active ERP connections for organization
 */
export const getActiveConnections = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check user permissions
    const permissions = await ctx.runQuery(api.erpAuth.checkOAuthPermissions, {
      userId: args.userId,
      organizationId: args.organizationId,
    });

    if (!permissions.hasOAuthAccess) {
      throw new Error("Insufficient permissions to view connections");
    }

    const connections = await ctx.db
      .query("erpConnections")
      .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    return connections.map(conn => ({
      id: conn._id,
      erpType: conn.erpType,
      connectionName: conn.connectionName,
      syncStatus: conn.syncStatus,
      lastSyncAt: conn.lastSyncAt,
      createdAt: conn.createdAt,
      isTokenExpired: conn.credentials.expiresAt ? conn.credentials.expiresAt < Date.now() : false,
    }));
  },
});

export default {
  checkOAuthPermissions,
  initiateSageIntacctOAuth,
  initiateQuickBooksOAuth,
  handleSageIntacctCallback,
  handleQuickBooksCallback,
  refreshOAuthTokens,
  getActiveConnections,
};