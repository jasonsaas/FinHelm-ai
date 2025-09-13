/**
 * QuickBooks Data Storage Mutations
 * Handles storing data received from n8n webhooks
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Store customers from n8n webhook
export const storeCustomers = mutation({
  args: {
    customers: v.array(v.any()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const { customers, timestamp } = args;
    
    let processed = 0;
    let failed = 0;
    let created = 0;
    let updated = 0;
    const errors: any[] = [];
    
    console.log(`[storeCustomers] Processing ${customers.length} customers at ${timestamp}`);
    
    for (const customer of customers) {
      try {
        // Extract customer ID
        const customerId = customer.Id || customer.id || customer.customerId;
        if (!customerId) {
          console.warn('[storeCustomers] Skipping customer without ID:', customer);
          failed++;
          errors.push({ customer, error: "Missing customer ID" });
          continue;
        }
        
        // Check if customer exists
        const existing = await ctx.db
          .query("customers")
          .withIndex("by_erp_customer_id", q => q.eq("erpCustomerId", String(customerId)))
          .first();
        
        // Get a default company (you may want to pass this from n8n)
        const defaultCompany = await ctx.db.query("companies").first();
        
        // Prepare customer data
        const customerData = {
          companyId: defaultCompany?._id,
          erpCustomerId: String(customerId),
          name: customer.DisplayName || customer.displayName || customer.name || 'Unknown',
          companyName: customer.CompanyName || customer.companyName,
          email: customer.PrimaryEmailAddr?.Address || customer.email,
          phone: customer.PrimaryPhone?.FreeFormNumber || customer.phone,
          isActive: customer.Active !== false,
          balance: customer.Balance ? parseFloat(customer.Balance) : 0,
          creditLimit: customer.CreditLimit ? parseFloat(customer.CreditLimit) : undefined,
          paymentTerms: customer.SalesTermRef?.name || customer.paymentTerms,
          taxExempt: customer.Taxable === false,
          billingAddress: customer.BillAddr ? {
            line1: customer.BillAddr.Line1 || '',
            line2: customer.BillAddr.Line2,
            city: customer.BillAddr.City || '',
            state: customer.BillAddr.CountrySubDivisionCode || '',
            postalCode: customer.BillAddr.PostalCode || '',
            country: customer.BillAddr.Country || 'US',
          } : undefined,
          shippingAddress: customer.ShipAddr ? {
            line1: customer.ShipAddr.Line1 || '',
            line2: customer.ShipAddr.Line2,
            city: customer.ShipAddr.City || '',
            state: customer.ShipAddr.CountrySubDivisionCode || '',
            postalCode: customer.ShipAddr.PostalCode || '',
            country: customer.ShipAddr.Country || 'US',
          } : undefined,
          metadata: {
            industry: customer.Industry,
            website: customer.WebAddr?.URI || customer.website,
            notes: customer.Notes,
          },
          updatedAt: Date.now(),
        };
        
        if (existing) {
          // Update existing customer
          await ctx.db.patch(existing._id, customerData);
          updated++;
          console.log(`[storeCustomers] Updated customer ${customerId}`);
        } else {
          // Create new customer
          await ctx.db.insert("customers", {
            ...customerData,
            createdAt: Date.now(),
          });
          created++;
          console.log(`[storeCustomers] Created customer ${customerId}`);
        }
        
        processed++;
      } catch (error) {
        console.error('[storeCustomers] Error processing customer:', error);
        failed++;
        errors.push({
          customerId: customer.Id || customer.id || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const result = {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 5), // Return first 5 errors
    };
    
    console.log(`[storeCustomers] Completed:`, result);
    
    return result;
  },
});

// Store invoices from n8n webhook
export const storeInvoices = mutation({
  args: {
    invoices: v.array(v.any()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const { invoices, timestamp } = args;
    
    let processed = 0;
    let failed = 0;
    let created = 0;
    let updated = 0;
    const errors: any[] = [];
    
    console.log(`[storeInvoices] Processing ${invoices.length} invoices at ${timestamp}`);
    
    // Get a default user (you may want to pass this from n8n)
    const defaultUser = await ctx.db.query("users").first();
    const userId = defaultUser?._id || 'system';
    
    for (const invoice of invoices) {
      try {
        const invoiceId = invoice.Id || invoice.id || invoice.invoiceId;
        if (!invoiceId) {
          console.warn('[storeInvoices] Skipping invoice without ID:', invoice);
          failed++;
          errors.push({ invoice, error: "Missing invoice ID" });
          continue;
        }
        
        // Check if invoice exists
        const existing = await ctx.db
          .query("invoices")
          .withIndex("by_invoice_id", q => q.eq("invoiceId", String(invoiceId)))
          .first();
        
        // Prepare line items if present
        const lineItems = invoice.Line?.filter((line: any) => line.DetailType === 'SalesItemLineDetail')
          .map((line: any) => ({
            description: line.Description || line.SalesItemLineDetail?.ItemRef?.name,
            amount: parseFloat(line.Amount || '0'),
            quantity: line.SalesItemLineDetail?.Qty,
            unitPrice: line.SalesItemLineDetail?.UnitPrice,
          })) || [];
        
        // Prepare invoice data
        const invoiceData = {
          userId: String(userId),
          invoiceId: String(invoiceId),
          invoiceNumber: invoice.DocNumber,
          customerId: String(invoice.CustomerRef?.value || invoice.customerId || ''),
          customerName: invoice.CustomerRef?.name || invoice.customerName || 'Unknown',
          txnDate: invoice.TxnDate || invoice.txnDate || new Date().toISOString(),
          dueDate: invoice.DueDate || invoice.dueDate || new Date().toISOString(),
          totalAmt: parseFloat(invoice.TotalAmt || invoice.totalAmount || '0'),
          balance: parseFloat(invoice.Balance || invoice.balance || '0'),
          status: determineInvoiceStatus(invoice),
          lineItems: lineItems.length > 0 ? lineItems : undefined,
          lastSyncedAt: Date.now(),
        };
        
        if (existing) {
          // Update existing invoice
          await ctx.db.patch(existing._id, invoiceData);
          updated++;
          console.log(`[storeInvoices] Updated invoice ${invoiceId}`);
        } else {
          // Create new invoice
          await ctx.db.insert("invoices", {
            ...invoiceData,
            createdAt: Date.now(),
          });
          created++;
          console.log(`[storeInvoices] Created invoice ${invoiceId}`);
        }
        
        processed++;
      } catch (error) {
        console.error('[storeInvoices] Error processing invoice:', error);
        failed++;
        errors.push({
          invoiceId: invoice.Id || invoice.id || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const result = {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 5),
    };
    
    console.log(`[storeInvoices] Completed:`, result);
    
    return result;
  },
});

// Store accounts from n8n webhook
export const storeAccounts = mutation({
  args: {
    accounts: v.array(v.any()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const { accounts, timestamp } = args;
    
    let processed = 0;
    let failed = 0;
    let created = 0;
    let updated = 0;
    const errors: any[] = [];
    
    console.log(`[storeAccounts] Processing ${accounts.length} accounts at ${timestamp}`);
    
    // Get a default company
    const defaultCompany = await ctx.db.query("companies").first();
    if (!defaultCompany) {
      // Create a default company if none exists
      const companyId = await ctx.db.insert("companies", {
        userId: "system",
        name: "Default Company",
        erpSystem: "quickbooks",
        erpCompanyId: "default",
        isActive: true,
        syncStatus: "connected",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const newCompany = await ctx.db.get(companyId);
      if (!newCompany) {
        throw new Error("Failed to create default company");
      }
    }
    
    const company = defaultCompany || await ctx.db.query("companies").first();
    if (!company) {
      throw new Error("No company found");
    }
    
    for (const account of accounts) {
      try {
        const accountId = account.Id || account.id || account.accountId;
        if (!accountId) {
          console.warn('[storeAccounts] Skipping account without ID:', account);
          failed++;
          errors.push({ account, error: "Missing account ID" });
          continue;
        }
        
        // Check if account exists
        const existing = await ctx.db
          .query("accounts")
          .withIndex("by_erp_account_id", q => q.eq("erpAccountId", String(accountId)))
          .first();
        
        // Determine classification based on account type
        const classification = determineClassification(account.AccountType || account.accountType);
        
        // Handle parent account reference
        let parentAccountId = undefined;
        if (account.ParentRef?.value) {
          const parentAccount = await ctx.db
            .query("accounts")
            .withIndex("by_erp_account_id", q => q.eq("erpAccountId", String(account.ParentRef.value)))
            .first();
          parentAccountId = parentAccount?._id;
        }
        
        // Prepare account data
        const accountData = {
          companyId: company._id,
          erpAccountId: String(accountId),
          name: account.Name || account.name || 'Unknown Account',
          fullyQualifiedName: account.FullyQualifiedName,
          accountType: account.AccountType || account.accountType || 'Other',
          accountSubType: account.AccountSubType || account.accountSubType,
          classification,
          parentAccountId,
          parentErpAccountId: account.ParentRef?.value ? String(account.ParentRef.value) : undefined,
          level: account.SubAccount ? (account.level || 1) : 0,
          path: account.FullyQualifiedName?.replace(/:/g, '/') || String(accountId),
          isActive: account.Active !== false,
          isSubAccount: account.SubAccount === true,
          currentBalance: account.CurrentBalance ? parseFloat(account.CurrentBalance) : undefined,
          currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts ? 
            parseFloat(account.CurrentBalanceWithSubAccounts) : undefined,
          balanceDate: Date.now(),
          currency: account.CurrencyRef?.value || 'USD',
          taxCodeRef: account.TaxCodeRef?.value,
          description: account.Description,
          metadata: {
            bankAccountNumber: account.BankAccountNumber,
            routingNumber: account.RoutingNumber,
            openingBalance: account.OpeningBalance ? parseFloat(account.OpeningBalance) : undefined,
            openingBalanceDate: account.OpeningBalanceDate ? 
              new Date(account.OpeningBalanceDate).getTime() : undefined,
          },
          updatedAt: Date.now(),
        };
        
        if (existing) {
          // Update existing account
          await ctx.db.patch(existing._id, accountData);
          updated++;
          console.log(`[storeAccounts] Updated account ${accountId}`);
        } else {
          // Create new account
          await ctx.db.insert("accounts", {
            ...accountData,
            createdAt: Date.now(),
          });
          created++;
          console.log(`[storeAccounts] Created account ${accountId}`);
        }
        
        processed++;
      } catch (error) {
        console.error('[storeAccounts] Error processing account:', error);
        failed++;
        errors.push({
          accountId: account.Id || account.id || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const result = {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 5),
    };
    
    console.log(`[storeAccounts] Completed:`, result);
    
    return result;
  },
});

// Helper function to determine invoice status
function determineInvoiceStatus(invoice: any): string {
  if (invoice.status) return invoice.status;
  
  const balance = parseFloat(invoice.Balance || '0');
  const total = parseFloat(invoice.TotalAmt || '0');
  
  if (balance === 0) return 'paid';
  if (balance === total) return 'open';
  if (balance < total) return 'partial';
  
  return 'unknown';
}

// Helper function to determine account classification
function determineClassification(accountType: string): "Asset" | "Liability" | "Equity" | "Revenue" | "Expense" {
  const type = accountType?.toLowerCase() || '';
  
  if (type.includes('asset') || type.includes('bank') || type.includes('receivable')) {
    return 'Asset';
  } else if (type.includes('liability') || type.includes('payable') || type.includes('credit')) {
    return 'Liability';
  } else if (type.includes('equity') || type.includes('capital') || type.includes('retained')) {
    return 'Equity';
  } else if (type.includes('income') || type.includes('revenue') || type.includes('sales')) {
    return 'Revenue';
  } else if (type.includes('expense') || type.includes('cost')) {
    return 'Expense';
  }
  
  // Default based on common patterns
  return 'Asset';
}