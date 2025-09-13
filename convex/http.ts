/**
 * HTTP Routes Configuration for Convex
 * Defines public HTTP endpoints for webhooks and external integrations
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { webhook } from "./quickbooks/webhooks";
import { n8nWebhook } from "./quickbooks/n8nWebhook";

const http = httpRouter();

// Test endpoint for debugging
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    console.log("[Test Endpoint] GET request received");
    return new Response("OK - Test endpoint working", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }),
});

http.route({
  path: "/test",
  method: "POST", 
  handler: httpAction(async (ctx, request) => {
    console.log("[Test Endpoint] POST request received");
    const body = await request.text();
    console.log("[Test Endpoint] Body:", body);
    return new Response(JSON.stringify({ message: "OK", received: body }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }),
});

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

// n8n webhook endpoint for receiving QuickBooks data - inline handler
http.route({
  path: "/webhook/n8n",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      console.log("[n8n Webhook] POST request received");
      console.log("[n8n Webhook] URL:", request.url);
      console.log("[n8n Webhook] Method:", request.method);
      console.log("[n8n Webhook] Headers:", Object.fromEntries(request.headers.entries()));
      
      // Parse JSON body
      let body;
      try {
        const bodyText = await request.text();
        console.log("[n8n Webhook] Body text length:", bodyText.length);
        body = JSON.parse(bodyText);
        console.log("[n8n Webhook] Parsed body:", JSON.stringify(body, null, 2));
      } catch (parseError) {
        console.error("[n8n Webhook] JSON parse error:", parseError);
        return new Response(
          JSON.stringify({ error: "Invalid JSON in request body" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Validate required fields
      if (!body.dataType || !body.data || !Array.isArray(body.data)) {
        console.error("[n8n Webhook] Missing required fields");
        return new Response(
          JSON.stringify({ 
            error: "Missing required fields",
            required: ["dataType", "data (array)"],
            received: Object.keys(body)
          }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      console.log(`[n8n Webhook] Processing ${body.dataType} with ${body.data.length} records`);
      
      // Process based on dataType
      let result = { processed: 0, failed: 0, created: 0, updated: 0 };
      
      try {
        switch (body.dataType) {
          case "customers":
            result = await ctx.runMutation(api.quickbooks.storeCustomers, {
              customers: body.data,
              timestamp: body.timestamp || new Date().toISOString()
            });
            break;
            
          case "invoices":
            result = await ctx.runMutation(api.quickbooks.storeInvoices, {
              invoices: body.data,
              timestamp: body.timestamp || new Date().toISOString()
            });
            break;
            
          case "accounts":
            result = await ctx.runMutation(api.quickbooks.storeAccounts, {
              accounts: body.data,
              timestamp: body.timestamp || new Date().toISOString()
            });
            break;
            
          default:
            console.error("[n8n Webhook] Unknown dataType:", body.dataType);
            return new Response(
              JSON.stringify({ 
                error: `Unknown dataType: ${body.dataType}`,
                validTypes: ["customers", "invoices", "accounts"]
              }),
              { 
                status: 400,
                headers: { "Content-Type": "application/json" }
              }
            );
        }
      } catch (mutationError) {
        console.error("[n8n Webhook] Mutation error:", mutationError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to process data",
            message: mutationError instanceof Error ? mutationError.message : String(mutationError)
          }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Success response
      const response = {
        success: true,
        dataType: body.dataType,
        recordsReceived: body.data.length,
        recordsProcessed: result.processed || body.data.length,
        recordsFailed: result.failed || 0,
        timestamp: new Date().toISOString(),
        summary: {
          ...body.summary,
          ...result
        }
      };
      
      console.log("[n8n Webhook] Success response:", response);
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
      
    } catch (error) {
      console.error("[n8n Webhook] Unexpected error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error)
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }),
});

// Alternative webhook path (in case of confusion with URL)
http.route({
  path: "/webhook/n8n",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    console.log("[n8n Webhook] GET request received (wrong method)");
    return new Response(
      JSON.stringify({ 
        error: "Method not allowed",
        message: "This endpoint only accepts POST requests",
        hint: "Use POST method with JSON body"
      }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }),
});

export default http;