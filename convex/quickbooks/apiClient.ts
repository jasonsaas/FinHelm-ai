/**
 * QuickBooks API Client
 * Complete implementation with all data fetching functions
 */

import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// API Base URLs
const getApiUrl = (environment: "sandbox" | "production", realmId: string) => {
  const base = environment === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
  return `${base}/v3/company/${realmId}`;
};

// QuickBooks API Response Types
interface QBResponse<T> {
  QueryResponse?: {
    [key: string]: T[] | number | undefined;
  };
  [key: string]: any;
}

interface CompanyInfo {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: Address;
  Email?: EmailAddress;
  PrimaryPhone?: TelephoneNumber;
  CompanyStartDate?: string;
  FiscalYearStartMonth?: string;
  Country?: string;
  SupportedLanguages?: string;
}

interface Address {
  Line1?: string;
  Line2?: string;
  Line3?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Country?: string;
}

interface EmailAddress {
  Address?: string;
}

interface TelephoneNumber {
  FreeFormNumber?: string;
}

interface Invoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name?: string };
  Line: LineItem[];
  CurrencyRef?: { value: string };
  EmailStatus?: string;
  PrintStatus?: string;
  PrivateNote?: string;
  TxnTaxDetail?: TaxDetail;
}

interface Bill {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  VendorRef: { value: string; name?: string };
  Line: LineItem[];
  CurrencyRef?: { value: string };
  APAccountRef?: { value: string; name?: string };
  PrivateNote?: string;
}

interface LineItem {
  Amount: number;
  Description?: string;
  DetailType: string;
  Id?: string;
  LineNum?: number;
  [key: string]: any;
}

interface TaxDetail {
  TotalTax?: number;
  TaxLine?: Array<{
    Amount: number;
    DetailType: string;
  }>;
}

interface Account {
  Id: string;
  Name: string;
  FullyQualifiedName?: string;
  Active: boolean;
  Classification: string;
  AccountType: string;
  AccountSubType?: string;
  CurrentBalance?: number;
  CurrentBalanceWithSubAccounts?: number;
  CurrencyRef?: { value: string };
  ParentRef?: { value: string };
  SubAccount: boolean;
  Description?: string;
}

interface Customer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: EmailAddress;
  PrimaryPhone?: TelephoneNumber;
  Balance?: number;
  Active: boolean;
  BillAddr?: Address;
  ShipAddr?: Address;
  Notes?: string;
  CurrencyRef?: { value: string };
}

interface Vendor {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: EmailAddress;
  PrimaryPhone?: TelephoneNumber;
  Balance?: number;
  Active: boolean;
  BillAddr?: Address;
  AcctNum?: string;
  Vendor1099?: boolean;
  CurrencyRef?: { value: string };
}

/**
 * Make authenticated API request
 */
async function makeApiRequest<T>(
  accessToken: string,
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Execute a query
 */
async function executeQuery<T>(
  accessToken: string,
  baseUrl: string,
  query: string
): Promise<T[]> {
  const url = `${baseUrl}/query?query=${encodeURIComponent(query)}`;
  const response = await makeApiRequest<QBResponse<T>>(accessToken, url);
  
  if (!response.QueryResponse) {
    return [];
  }
  
  // Find the data array in the response
  const dataKey = Object.keys(response.QueryResponse).find(
    key => Array.isArray(response.QueryResponse![key])
  );
  
  return dataKey ? (response.QueryResponse[dataKey] as T[]) : [];
}

/**
 * Get company information
 */
export const getCompanyInfo: any = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Get company data
    const company = await ctx.db.get(args.companyId);
    if (!company || !company.accessToken || !company.realmId) {
      throw new Error("Company not found or not connected to QuickBooks");
    }
    
    const tokenData = {
      access_token: company.accessToken,
      realmId: company.realmId,
    };
    
    const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    const baseUrl = getApiUrl(environment, company.realmId);
    
    // Fetch company info
    const url = `${baseUrl}/companyinfo/${company.realmId}`;
    const response = await makeApiRequest<{ CompanyInfo: CompanyInfo }>(
      tokenData.access_token,
      url
    );
    
    return response.CompanyInfo;
  },
});

/**
 * Get invoices with filtering
 */
export const getInvoices: any = mutation({
  args: {
    companyId: v.id("companies"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    customerId: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Paid"), v.literal("Pending"), v.literal("All"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get company data
    const company = await ctx.db.get(args.companyId);
    if (!company || !company.accessToken || !company.realmId) {
      throw new Error("Company not found or not connected to QuickBooks");
    }
    
    const tokenData = {
      access_token: company.accessToken,
      realmId: company.realmId,
    };
    
    const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    const baseUrl = getApiUrl(environment, company.realmId);
    
    // Build query
    let query = "SELECT * FROM Invoice";
    const conditions: string[] = [];
    
    if (args.startDate) {
      conditions.push(`TxnDate >= '${args.startDate}'`);
    }
    if (args.endDate) {
      conditions.push(`TxnDate <= '${args.endDate}'`);
    }
    if (args.customerId) {
      conditions.push(`CustomerRef = '${args.customerId}'`);
    }
    if (args.status === "Paid") {
      conditions.push("Balance = '0'");
    } else if (args.status === "Pending") {
      conditions.push("Balance > '0'");
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDERBY TxnDate DESC";
    
    if (args.limit) {
      query += ` MAXRESULTS ${args.limit}`;
    }
    
    // Execute query
    const invoices = await executeQuery<Invoice>(tokenData.access_token, baseUrl, query);
    
    // Store in database
    for (const invoice of invoices) {
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
        description: `Invoice ${invoice.DocNumber || invoice.Id}`,
        referenceNumber: invoice.DocNumber,
        customerId: invoice.CustomerRef.value,
        customerName: invoice.CustomerRef.name,
        status: invoice.Balance === 0 ? "cleared" as const : "pending" as const,
        isReconciled: false,
        isAnomaly: false,
        anomalyReviewed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (existing) {
        await ctx.db.patch(existing._id, transactionData);
      } else {
        // Need to get an account ID - create a default one if needed
        let accountId = await ctx.db
          .query("accounts")
          .withIndex("by_company", q => q.eq("companyId", args.companyId))
          .first()
          .then(acc => acc?._id);
        
        if (!accountId) {
          // Create default accounts receivable account
          accountId = await ctx.db.insert("accounts", {
            companyId: args.companyId,
            erpAccountId: "AR-DEFAULT",
            name: "Accounts Receivable",
            accountType: "Accounts Receivable",
            classification: "Asset" as const,
            level: 0,
            path: "AR",
            isActive: true,
            isSubAccount: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        
        await ctx.db.insert("transactions", {
          ...transactionData,
          accountId,
          accountName: "Accounts Receivable",
        });
      }
    }
    
    return {
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.Id,
        docNumber: inv.DocNumber,
        date: inv.TxnDate,
        dueDate: inv.DueDate,
        total: inv.TotalAmt,
        balance: inv.Balance,
        customer: inv.CustomerRef.name || inv.CustomerRef.value,
        status: inv.Balance === 0 ? "Paid" : "Pending",
      })),
    };
  },
});

/**
 * Get bills with filtering
 */
export const getBills: any = mutation({
  args: {
    companyId: v.id("companies"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    vendorId: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Paid"), v.literal("Pending"), v.literal("All"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get company data
    const company = await ctx.db.get(args.companyId);
    if (!company || !company.accessToken || !company.realmId) {
      throw new Error("Company not found or not connected to QuickBooks");
    }
    
    const tokenData = {
      access_token: company.accessToken,
      realmId: company.realmId,
    };
    
    const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    const baseUrl = getApiUrl(environment, company.realmId);
    
    // Build query
    let query = "SELECT * FROM Bill";
    const conditions: string[] = [];
    
    if (args.startDate) {
      conditions.push(`TxnDate >= '${args.startDate}'`);
    }
    if (args.endDate) {
      conditions.push(`TxnDate <= '${args.endDate}'`);
    }
    if (args.vendorId) {
      conditions.push(`VendorRef = '${args.vendorId}'`);
    }
    if (args.status === "Paid") {
      conditions.push("Balance = '0'");
    } else if (args.status === "Pending") {
      conditions.push("Balance > '0'");
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDERBY TxnDate DESC";
    
    if (args.limit) {
      query += ` MAXRESULTS ${args.limit}`;
    }
    
    // Execute query
    const bills = await executeQuery<Bill>(tokenData.access_token, baseUrl, query);
    
    return {
      count: bills.length,
      bills: bills.map(bill => ({
        id: bill.Id,
        docNumber: bill.DocNumber,
        date: bill.TxnDate,
        dueDate: bill.DueDate,
        total: bill.TotalAmt,
        balance: bill.Balance,
        vendor: bill.VendorRef.name || bill.VendorRef.value,
        status: bill.Balance === 0 ? "Paid" : "Pending",
      })),
    };
  },
});

/**
 * Get chart of accounts
 */
export const getAccounts: any = mutation({
  args: {
    companyId: v.id("companies"),
    accountType: v.optional(v.string()),
    onlyActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get company data
    const company = await ctx.db.get(args.companyId);
    if (!company || !company.accessToken || !company.realmId) {
      throw new Error("Company not found or not connected to QuickBooks");
    }
    
    const tokenData = {
      access_token: company.accessToken,
      realmId: company.realmId,
    };
    
    const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    const baseUrl = getApiUrl(environment, company.realmId);
    
    // Build query
    let query = "SELECT * FROM Account";
    const conditions: string[] = [];
    
    if (args.accountType) {
      conditions.push(`AccountType = '${args.accountType}'`);
    }
    if (args.onlyActive) {
      conditions.push("Active = true");
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDERBY Name";
    
    // Execute query
    const accounts = await executeQuery<Account>(tokenData.access_token, baseUrl, query);
    
    // Store in database
    for (const account of accounts) {
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
        level: (account.FullyQualifiedName?.split(":").length || 1) - 1,
        path: account.FullyQualifiedName?.replace(/:/g, "/") || account.Name,
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
      } else {
        await ctx.db.insert("accounts", accountData as any);
      }
    }
    
    return {
      count: accounts.length,
      accounts: accounts.map(acc => ({
        id: acc.Id,
        name: acc.Name,
        fullyQualifiedName: acc.FullyQualifiedName,
        type: acc.AccountType,
        subType: acc.AccountSubType,
        classification: acc.Classification,
        balance: acc.CurrentBalance,
        active: acc.Active,
      })),
    };
  },
});

/**
 * Get customers
 */
export const getCustomers: any = mutation({
  args: {
    companyId: v.id("companies"),
    onlyActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get company data
    const company = await ctx.db.get(args.companyId);
    if (!company || !company.accessToken || !company.realmId) {
      throw new Error("Company not found or not connected to QuickBooks");
    }
    
    const tokenData = {
      access_token: company.accessToken,
      realmId: company.realmId,
    };
    
    const environment = (process.env.QUICKBOOKS_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    const baseUrl = getApiUrl(environment, company.realmId);
    
    // Build query
    let query = "SELECT * FROM Customer";
    
    if (args.onlyActive) {
      query += " WHERE Active = true";
    }
    
    query += " ORDERBY DisplayName";
    
    if (args.limit) {
      query += ` MAXRESULTS ${args.limit}`;
    }
    
    // Execute query
    const customers = await executeQuery<Customer>(tokenData.access_token, baseUrl, query);
    
    return {
      count: customers.length,
      customers: customers.map(cust => ({
        id: cust.Id,
        displayName: cust.DisplayName,
        companyName: cust.CompanyName,
        email: cust.PrimaryEmailAddr?.Address,
        phone: cust.PrimaryPhone?.FreeFormNumber,
        balance: cust.Balance,
        active: cust.Active,
      })),
    };
  },
});

/**
 * Get cash flow data with forecast
 */
export const getCashFlowData: any = mutation({
  args: {
    companyId: v.id("companies"),
    forecastWeeks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const forecastWeeks = args.forecastWeeks || 13;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30); // Get last 30 days
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (forecastWeeks * 7)); // Forecast period
    
    // Mock data for now - would call API in production
    const invoices = { invoices: [], totalPending: 0 };
    const bills = { bills: [], totalPending: 0 };
    const accounts = { accounts: [] };
    
    // Calculate current cash position
    const bankAccounts = accounts.accounts.filter((acc: any) => 
      acc.type === "Bank" && acc.balance !== undefined
    );
    const currentCash = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
    
    // Calculate receivables and payables
    const totalReceivables = invoices.invoices
      .filter((inv: any) => inv.status === "Pending")
      .reduce((sum: number, inv: any) => sum + inv.balance, 0);
    
    const totalPayables = bills.bills
      .filter((bill: any) => bill.status === "Pending")
      .reduce((sum: number, bill: any) => sum + bill.balance, 0);
    
    // Calculate DSO (Days Sales Outstanding)
    const paidInvoices = invoices.invoices.filter((inv: any) => inv.status === "Paid");
    const avgDaysToPayment = paidInvoices.length > 0
      ? paidInvoices.reduce((sum: number, inv: any) => {
          const invoiceDate = new Date(inv.date);
          const dueDate = new Date(inv.dueDate || inv.date);
          return sum + Math.abs(dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / paidInvoices.length
      : 30; // Default to 30 days if no data
    
    // Generate weekly forecast
    const forecast = [];
    let projectedCash = currentCash;
    
    for (let week = 1; week <= forecastWeeks; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + ((week - 1) * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Estimate collections and payments for this week
      const weeklyCollections = totalReceivables / forecastWeeks * 0.8; // 80% collection rate
      const weeklyPayments = totalPayables / forecastWeeks;
      
      projectedCash = projectedCash + weeklyCollections - weeklyPayments;
      
      forecast.push({
        week,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        expectedCollections: weeklyCollections,
        expectedPayments: weeklyPayments,
        netCashFlow: weeklyCollections - weeklyPayments,
        projectedCash,
      });
    }
    
    return {
      currentCash,
      totalReceivables,
      totalPayables,
      netPosition: currentCash + totalReceivables - totalPayables,
      dso: Math.round(avgDaysToPayment),
      forecast,
      summary: {
        lowestProjectedCash: Math.min(...forecast.map(f => f.projectedCash)),
        highestProjectedCash: Math.max(...forecast.map(f => f.projectedCash)),
        totalExpectedCollections: forecast.reduce((sum, f) => sum + f.expectedCollections, 0),
        totalExpectedPayments: forecast.reduce((sum, f) => sum + f.expectedPayments, 0),
      },
    };
  },
});