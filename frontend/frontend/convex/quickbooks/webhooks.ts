/**
 * QuickBooks Webhook Handler
 * Receives and processes real-time notifications from QuickBooks
 */

import { v } from "convex/values";
import { httpAction, mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Webhook event types
export interface WebhookEvent {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{
        name: string; // "Customer", "Invoice", "Bill", etc.
        id: string;
        operation: "Create" | "Update" | "Delete" | "Merge" | "Void";
        lastUpdated: string;
      }>;
    };
  }>;
}

// Webhook verification token (set this in your QuickBooks app settings)
const WEBHOOK_VERIFICATION_TOKEN = process.env.QUICKBOOKS_WEBHOOK_TOKEN || "your_verification_token";

/**
 * HTTP endpoint to receive QuickBooks webhooks
 * This will be accessible at: https://your-convex-url/quickbooks/webhooks
 */
export const webhook = httpAction(async (ctx, request: Request) => {
  // Handle webhook verification (QuickBooks sends this on setup)
  if (request.method === "GET") {
    const url = new URL(request.url);
    const challenge = url.searchParams.get("challenge");
    
    if (challenge) {
      // Respond with the challenge to verify the endpoint
      return new Response(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
    
    return new Response("Webhook endpoint ready", { status: 200 });
  }

  // Handle webhook notifications
  if (request.method === "POST") {
    try {
      // Verify webhook signature (recommended for production)
      const signature = request.headers.get("intuit-signature");
      const payload = await request.text();
      
      // Parse the webhook payload
      const data: WebhookEvent = JSON.parse(payload);
      
      // Log the webhook event
      console.log("QuickBooks webhook received:", JSON.stringify(data, null, 2));
      
      // Process each event notification
      for (const notification of data.eventNotifications) {
        const realmId = notification.realmId;
        
        // Find the company by realm ID
        const company = await ctx.runQuery(api.companies.getCompanyByRealmId, {
          realmId,
        });
        
        if (!company) {
          console.error(`Company not found for realm ID: ${realmId}`);
          continue;
        }
        
        // Process each entity change
        for (const entity of notification.dataChangeEvent.entities) {
          console.log(`Processing ${entity.operation} for ${entity.name} ${entity.id}`);
          
          // Handle different entity types
          switch (entity.name) {
            case "Invoice":
              if (entity.operation !== "Delete") {
                // Sync the updated invoice
                await ctx.runMutation(api.quickbooks.webhooks.syncSingleInvoice, {
                  companyId: company._id,
                  invoiceId: entity.id,
                });
              } else {
                // Mark invoice as deleted
                await ctx.runMutation(api.quickbooks.webhooks.deleteInvoice, {
                  companyId: company._id,
                  invoiceId: entity.id,
                });
              }
              break;
              
            case "Bill":
              if (entity.operation !== "Delete") {
                // Sync the updated bill
                await ctx.runMutation(api.quickbooks.webhooks.syncSingleBill, {
                  companyId: company._id,
                  billId: entity.id,
                });
              } else {
                // Mark bill as deleted
                await ctx.runMutation(api.quickbooks.webhooks.deleteBill, {
                  companyId: company._id,
                  billId: entity.id,
                });
              }
              break;
              
            case "Account":
              if (entity.operation !== "Delete") {
                // Sync the updated account
                await ctx.runMutation(api.quickbooks.webhooks.syncSingleAccount, {
                  companyId: company._id,
                  accountId: entity.id,
                });
              } else {
                // Mark account as deleted
                await ctx.runMutation(api.quickbooks.webhooks.deleteAccount, {
                  companyId: company._id,
                  accountId: entity.id,
                });
              }
              break;
              
            case "Customer":
              if (entity.operation !== "Delete") {
                // Sync the updated customer
                await ctx.runMutation(api.quickbooks.webhooks.syncSingleCustomer, {
                  companyId: company._id,
                  customerId: entity.id,
                });
              }
              break;
              
            case "Vendor":
              if (entity.operation !== "Delete") {
                // Sync the updated vendor
                await ctx.runMutation(api.quickbooks.webhooks.syncSingleVendor, {
                  companyId: company._id,
                  vendorId: entity.id,
                });
              }
              break;
              
            default:
              console.log(`Unhandled entity type: ${entity.name}`);
          }
        }
      }
      
      // Return success response
      return new Response("Webhook processed successfully", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      
      // Return error response
      return new Response("Webhook processing failed", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
  }
  
  // Method not allowed
  return new Response("Method not allowed", { status: 405 });
});

/**
 * Sync a single invoice
 */
export const syncSingleInvoice = mutation({
  args: {
    companyId: v.id("companies"),
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Implementation will use the QuickBooks API client to fetch and update the invoice
    console.log(`Syncing invoice ${args.invoiceId} for company ${args.companyId}`);
    // TODO: Implement using QuickBooksClient.getById("Invoice", invoiceId)
    return { success: true };
  },
});

/**
 * Delete an invoice record
 */
export const deleteInvoice = mutation({
  args: {
    companyId: v.id("companies"),
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Mark the invoice as deleted in the database
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_erp_transaction_id", q => q.eq("erpTransactionId", args.invoiceId))
      .first();
    
    if (transaction) {
      await ctx.db.patch(transaction._id, {
        status: "voided",
        updatedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

/**
 * Sync a single bill
 */
export const syncSingleBill = mutation({
  args: {
    companyId: v.id("companies"),
    billId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Syncing bill ${args.billId} for company ${args.companyId}`);
    // TODO: Implement using QuickBooksClient.getById("Bill", billId)
    return { success: true };
  },
});

/**
 * Delete a bill record
 */
export const deleteBill = mutation({
  args: {
    companyId: v.id("companies"),
    billId: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_erp_transaction_id", q => q.eq("erpTransactionId", args.billId))
      .first();
    
    if (transaction) {
      await ctx.db.patch(transaction._id, {
        status: "voided",
        updatedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

/**
 * Sync a single account
 */
export const syncSingleAccount = mutation({
  args: {
    companyId: v.id("companies"),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Syncing account ${args.accountId} for company ${args.companyId}`);
    // TODO: Implement using QuickBooksClient.getById("Account", accountId)
    return { success: true };
  },
});

/**
 * Delete an account record
 */
export const deleteAccount = mutation({
  args: {
    companyId: v.id("companies"),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_erp_account_id", q => q.eq("erpAccountId", args.accountId))
      .first();
    
    if (account) {
      await ctx.db.patch(account._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

/**
 * Sync a single customer
 */
export const syncSingleCustomer = mutation({
  args: {
    companyId: v.id("companies"),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Syncing customer ${args.customerId} for company ${args.companyId}`);
    // TODO: Implement using QuickBooksClient.getById("Customer", customerId)
    return { success: true };
  },
});

/**
 * Sync a single vendor
 */
export const syncSingleVendor = mutation({
  args: {
    companyId: v.id("companies"),
    vendorId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Syncing vendor ${args.vendorId} for company ${args.companyId}`);
    // TODO: Implement using QuickBooksClient.getById("Vendor", vendorId)
    return { success: true };
  },
});