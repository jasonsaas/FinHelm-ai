/**
 * n8n Webhook Handler for QuickBooks Data
 * Receives and processes data from n8n workflows
 */

import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";

// Define the expected data structure from n8n
interface N8nWebhookPayload {
  dataType: 'customers' | 'invoices' | 'accounts' | 'payments';
  timestamp: string;
  syncSource: 'quickbooks';
  count: number;
  data: any[];
  summary: {
    totalRecords: number;
    processed: number;
    failed: number;
    [key: string]: any;
  };
}

export const n8nWebhook = httpAction(async (ctx, request: Request) => {
  try {
    // Log the incoming request
    console.log(`[n8n Webhook] Received ${request.method} request`);
    
    // Verify content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('[n8n Webhook] Invalid content type:', contentType);
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
    let payload: N8nWebhookPayload;
    try {
      const body = await request.text();
      console.log('[n8n Webhook] Request body size:', body.length);
      payload = JSON.parse(body);
    } catch (error) {
      console.error('[n8n Webhook] Failed to parse JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate payload structure
    if (!payload.dataType || !payload.data || !Array.isArray(payload.data)) {
      console.error('[n8n Webhook] Invalid payload structure:', {
        hasDataType: !!payload.dataType,
        hasData: !!payload.data,
        isArray: Array.isArray(payload.data)
      });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload structure',
          required: ['dataType', 'data (array)']
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[n8n Webhook] Processing ${payload.dataType} data:`, {
      count: payload.data.length,
      timestamp: payload.timestamp,
      syncSource: payload.syncSource
    });

    // Process data based on type
    let result;
    const processingStart = Date.now();
    
    try {
      switch (payload.dataType) {
        case 'customers':
          result = await ctx.runMutation(api.quickbooks.n8nMutations.storeCustomers, {
            customers: payload.data,
            timestamp: payload.timestamp || new Date().toISOString(),
            syncSource: payload.syncSource || 'quickbooks'
          });
          break;
          
        case 'invoices':
          result = await ctx.runMutation(api.quickbooks.n8nMutations.storeInvoices, {
            invoices: payload.data,
            timestamp: payload.timestamp || new Date().toISOString(),
            syncSource: payload.syncSource || 'quickbooks'
          });
          break;
          
        case 'accounts':
          result = await ctx.runMutation(api.quickbooks.n8nMutations.storeAccounts, {
            accounts: payload.data,
            timestamp: payload.timestamp || new Date().toISOString(),
            syncSource: payload.syncSource || 'quickbooks'
          });
          break;
          
        case 'payments':
          result = await ctx.runMutation(api.quickbooks.n8nMutations.storePayments, {
            payments: payload.data,
            timestamp: payload.timestamp || new Date().toISOString(),
            syncSource: payload.syncSource || 'quickbooks'
          });
          break;
          
        default:
          console.error('[n8n Webhook] Unknown data type:', payload.dataType);
          return new Response(
            JSON.stringify({ 
              error: `Unknown data type: ${payload.dataType}`,
              validTypes: ['customers', 'invoices', 'accounts', 'payments']
            }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          );
      }
      
      const processingTime = Date.now() - processingStart;
      console.log(`[n8n Webhook] Successfully processed ${payload.dataType}:`, {
        processingTime: `${processingTime}ms`,
        result
      });

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          dataType: payload.dataType,
          recordsReceived: payload.data.length,
          recordsProcessed: result?.processed || payload.data.length,
          recordsFailed: result?.failed || 0,
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          summary: {
            ...payload.summary,
            ...result
          }
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    } catch (mutationError) {
      console.error('[n8n Webhook] Mutation error:', mutationError);
      
      // Check if it's a rate limit error
      const errorMessage = mutationError instanceof Error ? mutationError.message : String(mutationError);
      if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Please slow down the request rate',
            retryAfter: 60 // seconds
          }),
          { 
            status: 429,
            headers: { 
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
      
      // Return generic error
      return new Response(
        JSON.stringify({
          error: 'Failed to process data',
          message: errorMessage,
          dataType: payload.dataType
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('[n8n Webhook] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});