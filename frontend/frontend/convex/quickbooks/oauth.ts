/**
 * QuickBooks OAuth 2.0 Implementation
 * Complete OAuth flow with PKCE, token management, and auto-refresh
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";

// OAuth configuration
const OAUTH_CONFIG = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || "http://localhost:3000/callback",
  environment: (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production",
};

// OAuth URLs
const getOAuthUrls = (environment: "sandbox" | "production") => {
  const base = environment === "sandbox" 
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
  
  return {
    authorize: `${base}/oauth2/v1/authorize`,
    token: `${base}/oauth2/v1/tokens/bearer`,
    revoke: `${base}/oauth2/v1/tokens/revoke`,
    userInfo: `${base}/oauth2/v1/openid_connect/userinfo`,
  };
};

// PKCE utilities
const generateRandomString = (length: number): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const generatePKCEChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate OAuth authorization URL with PKCE
 */
export const generateAuthUrl = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const urls = getOAuthUrls(OAUTH_CONFIG.environment);
    
    // Generate PKCE parameters
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generatePKCEChallenge(codeVerifier);
    
    // Store PKCE parameters for later verification
    if (args.companyId) {
      await ctx.db.patch(args.companyId, {
        metadata: {
          oauthState: state,
          codeVerifier,
          oauthInitiated: Date.now(),
        },
      });
    } else {
      // Store in a temporary auth sessions table if no company exists yet
      await ctx.db.insert("authSessions", {
        state,
        codeVerifier,
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000, // 10 minutes
      });
    }
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.clientId,
      scope: "com.intuit.quickbooks.accounting openid profile email phone address",
      redirect_uri: OAUTH_CONFIG.redirectUri,
      response_type: "code",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    
    const authUrl = `${urls.authorize}?${params.toString()}`;
    
    return {
      authUrl,
      state,
      environment: OAUTH_CONFIG.environment,
    };
  },
});

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForToken = mutation({
  args: {
    code: v.string(),
    state: v.string(),
    realmId: v.string(),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const urls = getOAuthUrls(OAUTH_CONFIG.environment);
    
    // Verify state and get code verifier
    let codeVerifier: string | undefined;
    
    if (args.companyId) {
      const company = await ctx.db.get(args.companyId);
      if (!company || company.metadata?.oauthState !== args.state) {
        throw new Error("Invalid state parameter - possible CSRF attack");
      }
      codeVerifier = company.metadata?.codeVerifier;
    } else {
      // Look up in auth sessions
      const sessions = await ctx.db
        .query("authSessions")
        .filter((q) => q.eq(q.field("state"), args.state))
        .collect();
      
      const session = sessions[0];
      if (!session || session.expiresAt < Date.now()) {
        throw new Error("Invalid or expired state parameter");
      }
      codeVerifier = session.codeVerifier;
      
      // Clean up session
      await ctx.db.delete(session._id);
    }
    
    if (!codeVerifier) {
      throw new Error("Code verifier not found");
    }
    
    // Exchange code for tokens
    const authHeader = btoa(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret}`);
    
    const response = await fetch(urls.token, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    const tokenData = await response.json();
    
    // Create or update company
    let companyId = args.companyId;
    
    if (!companyId) {
      // Create new company
      companyId = await ctx.db.insert("companies", {
        name: `QuickBooks Company ${args.realmId}`,
        erpSystem: "quickbooks",
        erpCompanyId: args.realmId,
        realmId: args.realmId,
        isActive: true,
        syncStatus: "connected",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // Store tokens
    await ctx.runMutation(internal.quickbooks.tokenManagerV2.storeTokens, {
      companyId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      refreshTokenExpiresIn: tokenData.x_refresh_token_expires_in,
      idToken: tokenData.id_token,
    });
    
    // Update company with realm ID and connection status
    await ctx.db.patch(companyId, {
      realmId: args.realmId,
      syncStatus: "connected",
      lastSyncAt: Date.now(),
      metadata: {
        oauthState: undefined,
        codeVerifier: undefined,
        oauthInitiated: undefined,
        connectedAt: Date.now(),
      },
    });
    
    return {
      success: true,
      companyId,
      realmId: args.realmId,
    };
  },
});

/**
 * Refresh access token
 */
export const refreshAccessToken = internalMutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const urls = getOAuthUrls(OAUTH_CONFIG.environment);
    
    // Get current refresh token
    const tokens = await ctx.runQuery(internal.quickbooks.tokenManagerV2.getTokens, {
      companyId: args.companyId,
    });
    
    if (!tokens || !tokens.refreshToken) {
      throw new Error("No refresh token available");
    }
    
    // Check if refresh token is expired
    if (tokens.refreshTokenExpiry && tokens.refreshTokenExpiry < Date.now()) {
      await ctx.db.patch(args.companyId, {
        syncStatus: "disconnected",
      });
      throw new Error("Refresh token expired - reauthorization required");
    }
    
    // Refresh the token
    const authHeader = btoa(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret}`);
    
    const response = await fetch(urls.token, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }).toString(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      
      if (response.status === 400 || response.status === 401) {
        await ctx.db.patch(args.companyId, {
          syncStatus: "disconnected",
        });
      }
      
      throw new Error(`Token refresh failed: ${error}`);
    }
    
    const tokenData = await response.json();
    
    // Store new tokens
    await ctx.runMutation(internal.quickbooks.tokenManagerV2.storeTokens, {
      companyId: args.companyId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      refreshTokenExpiresIn: tokenData.x_refresh_token_expires_in,
      idToken: tokenData.id_token,
    });
    
    return {
      success: true,
      expiresIn: tokenData.expires_in,
    };
  },
});

/**
 * Revoke tokens and disconnect
 */
export const revokeTokens = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const urls = getOAuthUrls(OAUTH_CONFIG.environment);
    
    // Get current tokens
    const tokens = await ctx.runQuery(internal.quickbooks.tokenManagerV2.getTokens, {
      companyId: args.companyId,
    });
    
    if (!tokens || !tokens.refreshToken) {
      return { success: true, message: "Already disconnected" };
    }
    
    // Revoke the refresh token
    const authHeader = btoa(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret}`);
    
    try {
      await fetch(urls.revoke, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token: tokens.refreshToken,
        }).toString(),
      });
    } catch (error) {
      console.error("Error revoking tokens:", error);
    }
    
    // Clear tokens from database
    await ctx.runMutation(internal.quickbooks.tokenManagerV2.clearTokens, {
      companyId: args.companyId,
    });
    
    // Update company status
    await ctx.db.patch(args.companyId, {
      syncStatus: "disconnected",
      realmId: undefined,
    });
    
    return {
      success: true,
      message: "Successfully disconnected from QuickBooks",
    };
  },
});

/**
 * Check connection status
 */
export const checkConnectionStatus = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      return {
        connected: false,
        reason: "Company not found",
      };
    }
    
    const tokenStatus = await ctx.runQuery(internal.quickbooks.tokenManagerV2.getTokenStatus, {
      companyId: args.companyId,
    });
    
    return {
      connected: company.syncStatus === "connected" && tokenStatus.hasValidToken,
      realmId: company.realmId,
      tokenStatus,
      lastSyncAt: company.lastSyncAt,
    };
  },
});

// Add auth sessions table if it doesn't exist
export const authSessions = {
  state: v.string(),
  codeVerifier: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
};