/**
 * QuickBooks API Client
 * Handles API requests with rate limiting, auto-retry, and error handling
 */

import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// API Response Types
export interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: {
    value: string;
    name: string;
  };
  Line: Array<{
    Amount: number;
    Description?: string;
    DetailType: string;
    SalesItemLineDetail?: {
      ItemRef?: {
        value: string;
        name: string;
      };
    };
  }>;
  CurrencyRef?: {
    value: string;
  };
  EmailStatus?: string;
  PrintStatus?: string;
  BillEmail?: {
    Address: string;
  };
}

export interface Bill {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  VendorRef: {
    value: string;
    name: string;
  };
  Line: Array<{
    Amount: number;
    Description?: string;
    DetailType: string;
    AccountBasedExpenseLineDetail?: {
      AccountRef?: {
        value: string;
        name: string;
      };
    };
  }>;
  CurrencyRef?: {
    value: string;
  };
  APAccountRef?: {
    value: string;
    name: string;
  };
}

export interface Account {
  Id: string;
  Name: string;
  FullyQualifiedName: string;
  Active: boolean;
  Classification: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance?: number;
  CurrentBalanceWithSubAccounts?: number;
  CurrencyRef?: {
    value: string;
  };
  ParentRef?: {
    value: string;
  };
  SubAccount: boolean;
  Description?: string;
}

export interface QueryResponse<T> {
  QueryResponse: {
    [key: string]: T[] | number | undefined;
  };
  time: string;
}

export interface ErrorResponse {
  Fault: {
    Error: Array<{
      Message: string;
      Detail: string;
      code: string;
    }>;
    type: string;
  };
  time: string;
}

// Rate limiting configuration
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  retryAfterRateLimit: boolean;
  maxRetries: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequestsPerMinute: 500,
  maxRequestsPerDay: 10000,
  retryAfterRateLimit: true,
  maxRetries: 3,
};

// Rate limiter class
class RateLimiter {
  private requestCounts: Map<string, { minute: number; day: number; lastReset: number }> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  async checkLimit(companyId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now();
    const key = companyId;
    
    let counts = this.requestCounts.get(key);
    
    if (!counts) {
      counts = { minute: 0, day: 0, lastReset: now };
      this.requestCounts.set(key, counts);
    }
    
    // Reset counters if needed
    const minuteElapsed = now - counts.lastReset > 60000;
    const dayElapsed = now - counts.lastReset > 86400000;
    
    if (dayElapsed) {
      counts.minute = 0;
      counts.day = 0;
      counts.lastReset = now;
    } else if (minuteElapsed) {
      counts.minute = 0;
      counts.lastReset = now;
    }
    
    // Check limits
    if (counts.minute >= this.config.maxRequestsPerMinute) {
      const retryAfter = 60000 - (now - counts.lastReset);
      return { allowed: false, retryAfter };
    }
    
    if (counts.day >= this.config.maxRequestsPerDay) {
      const retryAfter = 86400000 - (now - counts.lastReset);
      return { allowed: false, retryAfter };
    }
    
    // Increment counters
    counts.minute++;
    counts.day++;
    
    return { allowed: true };
  }
  
  async waitForRateLimit(companyId: string): Promise<void> {
    const check = await this.checkLimit(companyId);
    
    if (!check.allowed && check.retryAfter && this.config.retryAfterRateLimit) {
      // Wait for rate limit to reset
      await new Promise(resolve => setTimeout(resolve, Math.min(check.retryAfter || 1000, 60000)));
    } else if (!check.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${check.retryAfter}ms`);
    }
  }
}

// QuickBooks API Client Class
export class QuickBooksClient {
  private baseUrl: string;
  private rateLimiter: RateLimiter;
  
  constructor(
    private companyId: Id<"companies">,
    private accessToken: string,
    private realmId: string,
    private environment: "sandbox" | "production" = "sandbox",
    rateLimitConfig?: Partial<RateLimitConfig>
  ) {
    this.baseUrl = environment === "sandbox"
      ? `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`
      : `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
    
    this.rateLimiter = new RateLimiter({
      ...DEFAULT_RATE_LIMIT,
      ...rateLimitConfig,
    });
  }
  
  /**
   * Make authenticated API request with rate limiting and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check rate limit
    await this.rateLimiter.waitForRateLimit(this.companyId);
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    };
    
    let lastError;
    for (let attempt = 0; attempt < DEFAULT_RATE_LIMIT.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });
        
        // Handle rate limiting response
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "60") * 1000;
          if (DEFAULT_RATE_LIMIT.retryAfterRateLimit) {
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            continue;
          }
          throw new Error(`Rate limited. Retry after ${retryAfter}ms`);
        }
        
        // Handle unauthorized (token expired)
        if (response.status === 401) {
          throw new Error("Access token expired or invalid");
        }
        
        // Handle other errors
        if (!response.ok) {
          const errorData: ErrorResponse = await response.json().catch(() => ({
            Fault: {
              Error: [{
                Message: response.statusText,
                Detail: `HTTP ${response.status}`,
                code: response.status.toString(),
              }],
              type: "SystemFault",
            },
            time: new Date().toISOString(),
          }));
          
          const error = errorData.Fault.Error[0];
          throw new Error(`QuickBooks API Error: ${error.Message} (${error.code})`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        
        // Exponential backoff for retries
        if (attempt < DEFAULT_RATE_LIMIT.maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error("Request failed after all retries");
  }
  
  /**
   * Execute a query against QuickBooks API
   */
  private async query<T>(query: string): Promise<T[]> {
    const endpoint = `/query?query=${encodeURIComponent(query)}`;
    const response = await this.makeRequest<QueryResponse<T>>(endpoint);
    
    // Extract the actual data from the response
    const dataKey = Object.keys(response.QueryResponse).find(key => key !== "startPosition" && key !== "maxResults" && key !== "totalCount");
    
    if (!dataKey) {
      return [];
    }
    
    return response.QueryResponse[dataKey] as T[];
  }
  
  /**
   * Get all invoices with optional filtering
   */
  async getInvoices(options?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    status?: "Paid" | "Pending" | "All";
    limit?: number;
  }): Promise<Invoice[]> {
    let query = "SELECT * FROM Invoice";
    const conditions: string[] = [];
    
    if (options?.startDate) {
      conditions.push(`TxnDate >= '${options.startDate}'`);
    }
    
    if (options?.endDate) {
      conditions.push(`TxnDate <= '${options.endDate}'`);
    }
    
    if (options?.customerId) {
      conditions.push(`CustomerRef = '${options.customerId}'`);
    }
    
    if (options?.status === "Paid") {
      conditions.push("Balance = '0'");
    } else if (options?.status === "Pending") {
      conditions.push("Balance > '0'");
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDERBY TxnDate DESC";
    
    if (options?.limit) {
      query += ` MAXRESULTS ${options.limit}`;
    }
    
    return this.query<Invoice>(query);
  }
  
  /**
   * Get all bills with optional filtering
   */
  async getBills(options?: {
    startDate?: string;
    endDate?: string;
    vendorId?: string;
    status?: "Paid" | "Pending" | "All";
    limit?: number;
  }): Promise<Bill[]> {
    let query = "SELECT * FROM Bill";
    const conditions: string[] = [];
    
    if (options?.startDate) {
      conditions.push(`TxnDate >= '${options.startDate}'`);
    }
    
    if (options?.endDate) {
      conditions.push(`TxnDate <= '${options.endDate}'`);
    }
    
    if (options?.vendorId) {
      conditions.push(`VendorRef = '${options.vendorId}'`);
    }
    
    if (options?.status === "Paid") {
      conditions.push("Balance = '0'");
    } else if (options?.status === "Pending") {
      conditions.push("Balance > '0'");
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDERBY TxnDate DESC";
    
    if (options?.limit) {
      query += ` MAXRESULTS ${options.limit}`;
    }
    
    return this.query<Bill>(query);
  }
  
  /**
   * Get all accounts with optional filtering
   */
  async getAccounts(options?: {
    accountType?: string;
    classification?: string;
    active?: boolean;
    subAccounts?: boolean;
  }): Promise<Account[]> {
    let query = "SELECT * FROM Account";
    const conditions: string[] = [];
    
    if (options?.accountType) {
      conditions.push(`AccountType = '${options.accountType}'`);
    }
    
    if (options?.classification) {
      conditions.push(`Classification = '${options.classification}'`);
    }
    
    if (options?.active !== undefined) {
      conditions.push(`Active = ${options.active}`);
    }
    
    if (options?.subAccounts !== undefined) {
      conditions.push(`SubAccount = ${options.subAccounts}`);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDERBY Name";
    
    return this.query<Account>(query);
  }
  
  /**
   * Get a single entity by ID
   */
  async getById<T>(entityType: string, id: string): Promise<T> {
    const endpoint = `/${entityType.toLowerCase()}/${id}`;
    const response = await this.makeRequest<{ [key: string]: T }>(endpoint);
    return response[entityType];
  }
  
  /**
   * Create a new entity
   */
  async create<T>(entityType: string, data: Partial<T>): Promise<T> {
    const endpoint = `/${entityType.toLowerCase()}`;
    const response = await this.makeRequest<{ [key: string]: T }>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response[entityType];
  }
  
  /**
   * Update an existing entity
   */
  async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
    const endpoint = `/${entityType.toLowerCase()}`;
    const response = await this.makeRequest<{ [key: string]: T }>(endpoint, {
      method: "POST",
      body: JSON.stringify({ ...data, Id: id }),
    });
    return response[entityType];
  }
  
  /**
   * Delete an entity
   */
  async delete(entityType: string, id: string, syncToken: string): Promise<void> {
    const endpoint = `/${entityType.toLowerCase()}?operation=delete`;
    await this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({
        Id: id,
        SyncToken: syncToken,
      }),
    });
  }
}

/**
 * Create QuickBooks client for a company
 */
export const createClient: any = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Get company data
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }
    
    if (!company.realmId) {
      throw new Error("QuickBooks realm ID not found");
    }
    
    // Get tokens from company record
    const tokens = company ? {
      accessToken: company.accessToken,
      refreshToken: company.refreshToken,
    } : null;
    
    if (!tokens) {
      throw new Error("No valid tokens available");
    }
    
    // Token validation would be handled by the QuickBooksClient constructor
    
    const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    
    return new QuickBooksClient(
      args.companyId,
      tokens.accessToken || "",
      company.realmId,
      environment
    );
  },
});

/**
 * Fetch and sync invoices
 */
export const syncInvoices: any = mutation({
  args: {
    companyId: v.id("companies"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create QuickBooks client
    // Create QuickBooks client directly
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    
    const client = new QuickBooksClient(
      args.companyId,
      company.accessToken || "",
      company.realmId || "",
      "sandbox"
    );
    
    // Fetch invoices
    const invoices = await client.getInvoices({
      startDate: args.startDate,
      endDate: args.endDate,
    });
    
    // Store invoices in database
    let created = 0;
    let updated = 0;
    
    for (const invoice of invoices) {
      // Check if transaction exists
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_erp_transaction_id", q => q.eq("erpTransactionId", invoice.Id))
        .first();
      
      const transactionData = {
        companyId: args.companyId,
        erpTransactionId: invoice.Id,
        transactionType: "Invoice",
        amount: invoice.TotalAmt,
        currency: invoice.CurrencyRef?.value || "USD",
        date: new Date(invoice.TxnDate).getTime(),
        dueDate: invoice.DueDate ? new Date(invoice.DueDate).getTime() : undefined,
        description: `Invoice ${invoice.DocNumber}`,
        referenceNumber: invoice.DocNumber,
        customerId: invoice.CustomerRef.value,
        customerName: invoice.CustomerRef.name,
        status: invoice.Balance === 0 ? "cleared" : "pending",
        isReconciled: false,
        isAnomaly: false,
        anomalyReviewed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (existing) {
        await ctx.db.patch(existing._id, transactionData as any);
        updated++;
      } else {
        await ctx.db.insert("transactions", transactionData as any);
        created++;
      }
    }
    
    return {
      success: true,
      invoicesProcessed: invoices.length,
      created,
      updated,
    };
  },
});

/**
 * Fetch and sync bills
 */
export const syncBills: any = mutation({
  args: {
    companyId: v.id("companies"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create QuickBooks client
    // Create QuickBooks client directly
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    
    const client = new QuickBooksClient(
      args.companyId,
      company.accessToken || "",
      company.realmId || "",
      "sandbox"
    );
    
    // Fetch bills
    const bills = await client.getBills({
      startDate: args.startDate,
      endDate: args.endDate,
    });
    
    // Store bills in database
    let created = 0;
    let updated = 0;
    
    for (const bill of bills) {
      // Check if transaction exists
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_erp_transaction_id", q => q.eq("erpTransactionId", bill.Id))
        .first();
      
      const transactionData = {
        companyId: args.companyId,
        erpTransactionId: bill.Id,
        transactionType: "Bill",
        amount: bill.TotalAmt,
        currency: bill.CurrencyRef?.value || "USD",
        date: new Date(bill.TxnDate).getTime(),
        dueDate: bill.DueDate ? new Date(bill.DueDate).getTime() : undefined,
        description: `Bill ${bill.DocNumber || bill.Id}`,
        referenceNumber: bill.DocNumber,
        vendorId: bill.VendorRef.value,
        vendorName: bill.VendorRef.name,
        status: bill.Balance === 0 ? "cleared" : "pending",
        isReconciled: false,
        isAnomaly: false,
        anomalyReviewed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (existing) {
        await ctx.db.patch(existing._id, transactionData as any);
        updated++;
      } else {
        await ctx.db.insert("transactions", transactionData as any);
        created++;
      }
    }
    
    return {
      success: true,
      billsProcessed: bills.length,
      created,
      updated,
    };
  },
});

/**
 * Fetch and sync accounts
 */
export const syncAccounts: any = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Create QuickBooks client
    // Create QuickBooks client directly
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    
    const client = new QuickBooksClient(
      args.companyId,
      company.accessToken || "",
      company.realmId || "",
      "sandbox"
    );
    
    // Fetch all accounts
    const accounts = await client.getAccounts();
    
    // Store accounts in database
    let created = 0;
    let updated = 0;
    
    for (const account of accounts) {
      // Check if account exists
      const existing = await ctx.db
        .query("accounts")
        .withIndex("by_erp_account_id", q => q.eq("erpAccountId", account.Id))
        .first();
      
      const accountData = {
        companyId: args.companyId,
        erpAccountId: account.Id,
        name: account.Name,
        fullyQualifiedName: account.FullyQualifiedName,
        accountType: account.AccountType,
        accountSubType: account.AccountSubType,
        classification: account.Classification as any,
        parentErpAccountId: account.ParentRef?.value,
        level: account.FullyQualifiedName.split(":").length - 1,
        path: account.FullyQualifiedName.replace(/:/g, "/"),
        isActive: account.Active,
        isSubAccount: account.SubAccount,
        currentBalance: account.CurrentBalance,
        currentBalanceWithSubAccounts: account.CurrentBalanceWithSubAccounts,
        balanceDate: Date.now(),
        currency: account.CurrencyRef?.value,
        description: account.Description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (existing) {
        await ctx.db.patch(existing._id, accountData);
        updated++;
      } else {
        await ctx.db.insert("accounts", accountData as any);
        created++;
      }
    }
    
    // Update parent account references
    for (const account of accounts) {
      if (account.ParentRef?.value) {
        const current = await ctx.db
          .query("accounts")
          .withIndex("by_erp_account_id", q => q.eq("erpAccountId", account.Id))
          .first();
        
        const parent = await ctx.db
          .query("accounts")
          .withIndex("by_erp_account_id", q => q.eq("erpAccountId", account.ParentRef?.value || ""))
          .first();
        
        if (current && parent) {
          await ctx.db.patch(current._id, {
            parentAccountId: parent._id,
          });
        }
      }
    }
    
    return {
      success: true,
      accountsProcessed: accounts.length,
      created,
      updated,
    };
  },
});