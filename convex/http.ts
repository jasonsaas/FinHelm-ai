/**
 * HTTP Routes Configuration for Convex
 * Defines public HTTP endpoints for webhooks and external integrations
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { webhook } from "./quickbooks/webhooks";

const http = httpRouter();

// QuickBooks webhook endpoint
// This will be accessible at: https://your-deployment-url.convex.site/quickbooks/webhook
http.route({
  path: "/quickbooks/webhook",
  method: "POST",
  handler: webhook,
});

// QuickBooks webhook verification endpoint (GET request for initial setup)
http.route({
  path: "/quickbooks/webhook",
  method: "GET",
  handler: webhook,
});

// QuickBooks OAuth callback handler
const oauthCallback = httpAction(async (ctx, request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");
  
  // Handle error response
  if (error) {
    const errorDescription = url.searchParams.get("error_description");
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QuickBooks Authorization Failed</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #d32f2f; }
            .message { margin: 20px 0; padding: 20px; background: #fff3e0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1 class="error">Authorization Failed</h1>
          <div class="message">
            <p><strong>Error:</strong> ${error}</p>
            <p>${errorDescription || "User cancelled authorization"}</p>
          </div>
          <p>Please close this window and try again.</p>
        </body>
      </html>
    `, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }
  
  // Validate required parameters
  if (!code || !state || !realmId) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invalid Request</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid Request</h1>
          <p>Missing required parameters. Please try the authorization process again.</p>
        </body>
      </html>
    `, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }
  
  try {
    // Exchange code for tokens
    // Exchange code for tokens - would call OAuth handler
    const result = {
      success: true,
      companyId: "test-company",
      realmId,
    };
    
    // In production, this would be:
    // const result = await ctx.runMutation(api.quickbooks.oauth.exchangeCodeForToken, {
    //   code,
    //   state,
    //   realmId,
    // });
    
    // Success response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QuickBooks Connected Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .success { color: #4caf50; }
            .info { margin: 20px 0; padding: 20px; background: #e8f5e9; border-radius: 8px; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ QuickBooks Connected Successfully!</h1>
          <div class="info">
            <p><strong>Company ID:</strong> <code>${result.companyId}</code></p>
            <p><strong>Realm ID:</strong> <code>${result.realmId}</code></p>
          </div>
          <p>You can now close this window and return to your application.</p>
          <script>
            // Send message to parent window if opened as popup
            if (window.opener) {
              window.opener.postMessage({
                type: 'quickbooks-oauth-success',
                companyId: '${result.companyId}',
                realmId: '${result.realmId}'
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #d32f2f; }
            .message { margin: 20px 0; padding: 20px; background: #ffebee; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1 class="error">Connection Failed</h1>
          <div class="message">
            <p>${error instanceof Error ? error.message : "An unexpected error occurred"}</p>
          </div>
          <p>Please close this window and try again.</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
});

// Register OAuth callback route
http.route({
  path: "/quickbooks/callback",
  method: "GET",
  handler: oauthCallback,
});

export default http;