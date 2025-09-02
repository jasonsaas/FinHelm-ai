/**
 * Test functions for QuickBooks OAuth implementation
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Test OAuth URL generation without requiring a company
 */
export const testGenerateAuthUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Check for required environment variables
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
    const environment = process.env.QUICKBOOKS_ENVIRONMENT || "sandbox";

    if (!clientId || !redirectUri) {
      return {
        success: false,
        error: "Missing QuickBooks OAuth configuration",
        config: {
          hasClientId: !!clientId,
          hasRedirectUri: !!redirectUri,
          environment,
        },
      };
    }

    // Generate test PKCE challenge
    const randomBytes = new Uint8Array(64);
    crypto.getRandomValues(randomBytes);
    
    const codeVerifier = btoa(String.fromCharCode(...randomBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 128);

    const hashArray = new Uint8Array(32);
    crypto.getRandomValues(hashArray);
    
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = btoa(String.fromCharCode(...stateBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Build authorization URL
    const baseUrl = environment === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const authUrl = new URL(`${baseUrl}/oauth2/v1/authorize`);
    
    const scopes = [
      "com.intuit.quickbooks.accounting",
      "com.intuit.quickbooks.payment",
      "openid",
      "profile",
      "email",
    ];

    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("scope", scopes.join(" "));
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    return {
      success: true,
      authUrl: authUrl.toString(),
      state,
      environment,
      message: "OAuth URL generated successfully. Open this URL in a browser to authorize.",
    };
  },
});

/**
 * Test environment configuration
 */
export const testEnvironment = query({
  args: {},
  handler: async () => {
    const required = [
      "QUICKBOOKS_CLIENT_ID",
      "QUICKBOOKS_CLIENT_SECRET", 
      "QUICKBOOKS_REDIRECT_URI",
      "QUICKBOOKS_TOKEN_ENCRYPTION_KEY",
    ];

    const config = {
      hasClientId: !!process.env.QUICKBOOKS_CLIENT_ID,
      hasClientSecret: !!process.env.QUICKBOOKS_CLIENT_SECRET,
      hasRedirectUri: !!process.env.QUICKBOOKS_REDIRECT_URI,
      hasEncryptionKey: !!process.env.QUICKBOOKS_TOKEN_ENCRYPTION_KEY,
      environment: process.env.QUICKBOOKS_ENVIRONMENT || "not set",
    };

    const missing = required.filter(key => !process.env[key]);

    return {
      isConfigured: missing.length === 0,
      config,
      missing,
      message: missing.length === 0 
        ? "All required environment variables are configured" 
        : `Missing environment variables: ${missing.join(", ")}`,
    };
  },
});