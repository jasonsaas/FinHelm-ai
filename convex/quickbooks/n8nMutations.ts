/**
 * n8n Mutation Functions for QuickBooks Data
 * Handles storing data received from n8n webhooks
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Store customers from n8n
export const storeCustomers = mutation({
  args: {
    customers: v.array(v.any()),
    timestamp: v.string(),
    syncSource: v.string(),
  },
  handler: async (ctx, args) => {
    const { customers, timestamp, syncSource } = args;
    
    let processed = 0;
    let failed = 0;
    let updated = 0;
    let created = 0;
    const errors: Array<{ customerId: string; error: string }> = [];
    
    console.log(`[storeCustomers] Processing ${customers.length} customers`);
    
    for (const customer of customers) {
      try {
        // Extract customer data with fallbacks
        const customerId = customer.Id || customer.id || customer.customerId;
        if (!customerId) {
          console.warn('[storeCustomers] Skipping customer without ID:', customer);
          failed++;
          continue;
        }
        
        // Check if customer exists
        const existing = await ctx.db
          .query("customers")
          .withIndex("by_erp_customer_id", q => q.eq("erpCustomerId", String(customerId)))
          .first();
        
        // Prepare customer data
        const customerData = {
          companyId: customer.companyId as Id<"companies"> | undefined,
          erpCustomerId: String(customerId),
          name: customer.DisplayName || customer.displayName || customer.CompanyName || customer.name || 'Unknown',
          companyName: customer.CompanyName || customer.companyName || undefined,
          email: customer.PrimaryEmailAddr?.Address || customer.email || undefined,
          phone: customer.PrimaryPhone?.FreeFormNumber || customer.phone || undefined,
          isActive: customer.Active !== false,
          balance: parseFloat(customer.Balance || customer.balance || '0'),
          creditLimit: customer.CreditLimit ? parseFloat(customer.CreditLimit) : undefined,
          paymentTerms: customer.SalesTermRef?.name || customer.paymentTerms || undefined,
          taxExempt: customer.Taxable === false,
          billingAddress: customer.BillAddr ? {
            line1: customer.BillAddr.Line1 || '',
            line2: customer.BillAddr.Line2 || undefined,
            city: customer.BillAddr.City || '',
            state: customer.BillAddr.CountrySubDivisionCode || '',
            postalCode: customer.BillAddr.PostalCode || '',
            country: customer.BillAddr.Country || 'US',
          } : undefined,
          shippingAddress: customer.ShipAddr ? {
            line1: customer.ShipAddr.Line1 || '',
            line2: customer.ShipAddr.Line2 || undefined,
            city: customer.ShipAddr.City || '',
            state: customer.ShipAddr.CountrySubDivisionCode || '',
            postalCode: customer.ShipAddr.PostalCode || '',
            country: customer.ShipAddr.Country || 'US',
          } : undefined,
          metadata: {
            industry: customer.Industry || undefined,
            website: customer.WebAddr?.URI || customer.website || undefined,
            notes: customer.Notes || undefined,
          },
          updatedAt: Date.now(),
        };
        
        if (existing) {
          // Update existing customer
          await ctx.db.patch(existing._id, customerData);
          updated++;
        } else {
          // Create new customer
          await ctx.db.insert("customers", {
            ...customerData,
            createdAt: Date.now(),
          });
          created++;
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
    
    console.log(`[storeCustomers] Completed:`, {
      processed,
      created,
      updated,
      failed,
      total: customers.length
    });
    
    return {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10), // Return first 10 errors
    };
  },
});

// Store invoices from n8n  
export const storeInvoices = mutation({
  args: {
    invoices: v.array(v.any()),
    timestamp: v.string(),
    syncSource: v.string(),
  },
  handler: async (ctx, args) => {
    const { invoices, timestamp, syncSource } = args;
    
    let processed = 0;
    let failed = 0;
    let updated = 0;
    let created = 0;
    const errors: Array<{ invoiceId: string; error: string }> = [];
    
    console.log(`[storeInvoices] Processing ${invoices.length} invoices`);
    
    // Get a default user for invoices (temporary - should be passed from n8n)
    const defaultUser = await ctx.db.query("users").first();
    const userId = defaultUser?._id || 'system';
    
    for (const invoice of invoices) {
      try {
        const invoiceId = invoice.Id || invoice.id || invoice.invoiceId;
        if (!invoiceId) {
          console.warn('[storeInvoices] Skipping invoice without ID:', invoice);
          failed++;
          continue;
        }
        
        // Check if invoice exists
        const existing = await ctx.db
          .query("invoices")
          .withIndex("by_invoice_id", q => q.eq("invoiceId", String(invoiceId)))
          .first();
        
        // Prepare line items
        const lineItems = invoice.Line?.filter((line: any) => line.DetailType === 'SalesItemLineDetail')
          .map((line: any) => ({
            description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || undefined,
            amount: parseFloat(line.Amount || '0'),
            quantity: line.SalesItemLineDetail?.Qty || undefined,
            unitPrice: line.SalesItemLineDetail?.UnitPrice || undefined,
          })) || [];
        
        // Prepare invoice data
        const invoiceData = {
          userId: String(userId),
          invoiceId: String(invoiceId),
          invoiceNumber: invoice.DocNumber || undefined,
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
        } else {
          // Create new invoice
          await ctx.db.insert("invoices", {
            ...invoiceData,
            createdAt: Date.now(),
          });
          created++;
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
    
    console.log(`[storeInvoices] Completed:`, {
      processed,
      created,
      updated,
      failed,
      total: invoices.length
    });
    
    return {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10),
    };
  },
});

// Store accounts from n8n
export const storeAccounts = mutation({
  args: {
    accounts: v.array(v.any()),
    timestamp: v.string(),
    syncSource: v.string(),
  },
  handler: async (ctx, args) => {
    const { accounts, timestamp, syncSource } = args;
    
    let processed = 0;
    let failed = 0;
    let updated = 0;
    let created = 0;
    const errors: Array<{ accountId: string; error: string }> = [];
    
    console.log(`[storeAccounts] Processing ${accounts.length} accounts`);
    
    // Get a default company (temporary - should be passed from n8n)
    const defaultCompany = await ctx.db.query("companies").first();
    if (!defaultCompany) {
      throw new Error('No company found. Please set up a company first.');
    }
    
    for (const account of accounts) {
      try {
        const accountId = account.Id || account.id || account.accountId;
        if (!accountId) {
          console.warn('[storeAccounts] Skipping account without ID:', account);
          failed++;
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
        let parentAccountId: Id<"accounts"> | undefined;
        if (account.ParentRef?.value) {
          const parentAccount = await ctx.db
            .query("accounts")
            .withIndex("by_erp_account_id", q => q.eq("erpAccountId", String(account.ParentRef.value)))
            .first();
          parentAccountId = parentAccount?._id;
        }
        
        // Prepare account data
        const accountData = {
          companyId: defaultCompany._id,
          erpAccountId: String(accountId),
          name: account.Name || account.name || 'Unknown Account',
          fullyQualifiedName: account.FullyQualifiedName || undefined,
          accountType: account.AccountType || account.accountType || 'Other',
          accountSubType: account.AccountSubType || account.accountSubType || undefined,
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
          taxCodeRef: account.TaxCodeRef?.value || undefined,
          description: account.Description || undefined,
          metadata: {
            bankAccountNumber: account.BankAccountNumber || undefined,
            routingNumber: account.RoutingNumber || undefined,
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
        } else {
          // Create new account
          await ctx.db.insert("accounts", {
            ...accountData,
            createdAt: Date.now(),
          });
          created++;
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
    
    console.log(`[storeAccounts] Completed:`, {
      processed,
      created,
      updated,
      failed,
      total: accounts.length
    });
    
    return {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10),
    };
  },
});

// Store payments from n8n
export const storePayments = mutation({
  args: {
    payments: v.array(v.any()),
    timestamp: v.string(),
    syncSource: v.string(),
  },
  handler: async (ctx, args) => {
    const { payments, timestamp, syncSource } = args;
    
    let processed = 0;
    let failed = 0;
    let updated = 0;
    let created = 0;
    const errors: Array<{ paymentId: string; error: string }> = [];
    
    console.log(`[storePayments] Processing ${payments.length} payments`);
    
    // Get a default company (temporary - should be passed from n8n)
    const defaultCompany = await ctx.db.query("companies").first();
    
    for (const payment of payments) {
      try {
        const paymentId = payment.Id || payment.id || payment.paymentId;
        if (!paymentId) {
          console.warn('[storePayments] Skipping payment without ID:', payment);
          failed++;
          continue;
        }
        
        // Check if payment exists
        const existing = await ctx.db
          .query("payments")
          .withIndex("by_payment_id", q => q.eq("erpPaymentId", String(paymentId)))
          .first();
        
        // Extract payment date
        const paymentDate = payment.TxnDate || payment.paymentDate || new Date().toISOString();
        const paymentTimestamp = new Date(paymentDate).getTime();
        
        // Prepare payment data
        const paymentData = {
          companyId: defaultCompany?._id,
          erpPaymentId: String(paymentId),
          paymentDate: paymentTimestamp,
          customerId: String(payment.CustomerRef?.value || payment.customerId || ''),
          customerName: payment.CustomerRef?.name || payment.customerName || undefined,
          amount: parseFloat(payment.TotalAmt || payment.amount || '0'),
          currency: payment.CurrencyRef?.value || payment.currency || 'USD',
          paymentMethod: payment.PaymentMethodRef?.name || payment.paymentMethod || undefined,
          referenceNumber: payment.PaymentRefNum || payment.referenceNumber || undefined,
          status: payment.status || 'completed',
          depositAccountId: payment.DepositToAccountRef?.value || undefined,
          // Handle invoice references if present
          invoiceId: payment.Line?.[0]?.LinkedTxn?.[0]?.TxnId || payment.invoiceId || undefined,
          invoiceNumber: payment.Line?.[0]?.LinkedTxn?.[0]?.TxnType || payment.invoiceNumber || undefined,
          appliedAmount: payment.Line?.[0]?.Amount ? parseFloat(payment.Line[0].Amount) : undefined,
          unappliedAmount: payment.UnappliedAmt ? parseFloat(payment.UnappliedAmt) : undefined,
          memo: payment.PrivateNote || payment.memo || undefined,
          syncSource: syncSource || 'quickbooks',
          metadata: {
            transactionId: payment.TransactionId || undefined,
            checkNumber: payment.CheckNumber || undefined,
            bankReference: payment.BankReference || undefined,
          },
          updatedAt: Date.now(),
        };
        
        if (existing) {
          // Update existing payment
          await ctx.db.patch(existing._id, paymentData);
          updated++;
        } else {
          // Create new payment
          await ctx.db.insert("payments", {
            ...paymentData,
            createdAt: Date.now(),
          });
          created++;
        }
        
        processed++;
      } catch (error) {
        console.error('[storePayments] Error processing payment:', error);
        failed++;
        errors.push({
          paymentId: payment.Id || payment.id || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    console.log(`[storePayments] Completed:`, {
      processed,
      created,
      updated,
      failed,
      total: payments.length
    });
    
    return {
      processed,
      created,
      updated,
      failed,
      errors: errors.slice(0, 10),
    };
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