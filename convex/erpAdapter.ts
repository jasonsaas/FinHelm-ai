import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * ERP Abstraction Layer for FinHelm.ai
 * Provides unified interface for different ERP systems
 * Supports QuickBooks, Sage Intacct, NetSuite, and Xero
 */

// Types and Interfaces
export interface ERPConnection {
  id: string;
  erpType: 'quickbooks' | 'intacct' | 'netsuite' | 'xero';
  organizationId: string;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    companyId?: string;
    realmId?: string;
    expiresAt?: number;
    baseUrl?: string;
    sessionId?: string;
    userId?: string;
    companyDb?: string;
  };
  isActive: boolean;
}

export interface ERPAccount {
  id: string;
  code: string;
  name: string;
  fullName: string;
  type: string;
  category?: string;
  subType?: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  balance?: number;
  currency: string;
  description?: string;
  taxCode?: string;
  lastSyncAt: number;
}

export interface ERPTransaction {
  id: string;
  type: 'journal_entry' | 'invoice' | 'bill' | 'payment' | 'deposit' | 'transfer' | 'adjustment';
  accountId: string;
  accountCode: string;
  referenceNumber?: string;
  description: string;
  amount: number;
  debitAmount?: number;
  creditAmount?: number;
  currency: string;
  exchangeRate?: number;
  transactionDate: number;
  postingDate?: number;
  dueDate?: number;
  customerId?: string;
  vendorId?: string;
  projectId?: string;
  departmentId?: string;
  locationId?: string; // Multi-location support
  tags?: string[];
  status: 'draft' | 'pending' | 'posted' | 'void' | 'reconciled';
  reconciliationStatus?: 'unreconciled' | 'reconciled' | 'pending';
  lastSyncAt: number;
}

export interface ERPMetrics {
  totalAccounts: number;
  totalTransactions: number;
  lastSyncDate: number;
  dataHealthScore: number;
  syncStatus: 'active' | 'failed' | 'pending' | 'disabled';
  connectionHealth: {
    apiResponseTime: number;
    errorRate: number;
    lastSuccessfulSync: number;
  };
}

// Main ERP Adapter Interface
export abstract class ERPAdapter {
  protected connection: ERPConnection;

  constructor(connection: ERPConnection) {
    this.connection = connection;
  }

  // Core methods that all adapters must implement
  abstract connect(): Promise<boolean>;
  abstract testConnection(): Promise<boolean>;
  abstract refreshToken(): Promise<string>;
  abstract syncAccounts(): Promise<ERPAccount[]>;
  abstract syncTransactions(dateRange?: { start: number; end: number }): Promise<ERPTransaction[]>;
  abstract getMetrics(): Promise<ERPMetrics>;

  // Optional methods with default implementations
  async syncCustomers(): Promise<any[]> {
    return [];
  }

  async syncVendors(): Promise<any[]> {
    return [];
  }

  async syncProjects(): Promise<any[]> {
    return [];
  }

  // Utility methods
  protected formatDate(timestamp: number): string {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  protected parseDate(dateString: string): number {
    return new Date(dateString).getTime();
  }
}

/**
 * QuickBooks Online Adapter
 */
export class QuickBooksAdapter extends ERPAdapter {
  private baseUrl: string;
  private companyId: string;

  constructor(connection: ERPConnection) {
    super(connection);
    this.baseUrl = connection.credentials.baseUrl || 'https://sandbox-quickbooks.api.intuit.com';
    this.companyId = connection.credentials.companyId || connection.credentials.realmId || '';
  }

  async connect(): Promise<boolean> {
    try {
      return await this.testConnection();
    } catch (error) {
      console.error('QuickBooks connection failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeAPICall('GET', '/v3/companyinfo/1');
      return response && response.status === 200;
    } catch (error) {
      console.error('QuickBooks test connection failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    if (!this.connection.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // Implementation would depend on QuickBooks OAuth flow
      // This is a simplified version
      const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64'),
        },
        body: new URLSearchParams({
          'grant_type': 'refresh_token',
          'refresh_token': this.connection.credentials.refreshToken,
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        // Update connection credentials
        this.connection.credentials.accessToken = data.access_token;
        this.connection.credentials.refreshToken = data.refresh_token;
        this.connection.credentials.expiresAt = Date.now() + (data.expires_in * 1000);
        return data.access_token;
      }

      throw new Error('Failed to refresh QuickBooks token');
    } catch (error) {
      console.error('QuickBooks token refresh failed:', error);
      throw error;
    }
  }

  async syncAccounts(): Promise<ERPAccount[]> {
    try {
      const response = await this.makeAPICall('GET', '/v3/accounts');
      const accounts: ERPAccount[] = [];

      if (response.data && response.data.QueryResponse && response.data.QueryResponse.Account) {
        const qbAccounts = response.data.QueryResponse.Account;

        for (const qbAccount of qbAccounts) {
          accounts.push({
            id: qbAccount.Id,
            code: qbAccount.AcctNum || qbAccount.Id,
            name: qbAccount.Name,
            fullName: qbAccount.FullyQualifiedName || qbAccount.Name,
            type: this.mapAccountType(qbAccount.AccountType),
            category: qbAccount.Classification,
            subType: qbAccount.AccountSubType,
            parentId: qbAccount.ParentRef?.value,
            level: this.calculateAccountLevel(qbAccount),
            isActive: qbAccount.Active !== false,
            balance: qbAccount.CurrentBalance,
            currency: qbAccount.CurrencyRef?.value || 'USD',
            description: qbAccount.Description,
            lastSyncAt: Date.now(),
          });
        }
      }

      return accounts;
    } catch (error) {
      console.error('QuickBooks account sync failed:', error);
      throw error;
    }
  }

  async syncTransactions(dateRange?: { start: number; end: number }): Promise<ERPTransaction[]> {
    try {
      const transactions: ERPTransaction[] = [];
      
      // Sync different transaction types
      const transactionTypes = ['Invoice', 'Bill', 'Payment', 'JournalEntry', 'Deposit'];
      
      for (const txnType of transactionTypes) {
        const response = await this.makeAPICall('GET', `/v3/${txnType.toLowerCase()}s`, {
          query: dateRange ? this.buildDateQuery(dateRange, txnType) : undefined
        });

        if (response.data && response.data.QueryResponse && response.data.QueryResponse[txnType]) {
          const qbTransactions = response.data.QueryResponse[txnType];

          for (const qbTxn of qbTransactions) {
            // Handle different transaction structures
            if (txnType === 'JournalEntry') {
              transactions.push(...this.mapJournalEntry(qbTxn));
            } else {
              transactions.push(this.mapTransaction(qbTxn, txnType));
            }
          }
        }
      }

      return transactions;
    } catch (error) {
      console.error('QuickBooks transaction sync failed:', error);
      throw error;
    }
  }

  async getMetrics(): Promise<ERPMetrics> {
    try {
      const [accountsResponse, transactionsCount] = await Promise.all([
        this.makeAPICall('GET', '/v3/accounts'),
        this.getTransactionCount()
      ]);

      const accounts = accountsResponse.data?.QueryResponse?.Account || [];
      
      return {
        totalAccounts: accounts.length,
        totalTransactions: transactionsCount,
        lastSyncDate: Date.now(),
        dataHealthScore: this.calculateHealthScore(accounts.length, transactionsCount),
        syncStatus: 'active',
        connectionHealth: {
          apiResponseTime: 250, // Mock response time
          errorRate: 0.02,
          lastSuccessfulSync: Date.now(),
        }
      };
    } catch (error) {
      console.error('QuickBooks metrics failed:', error);
      return {
        totalAccounts: 0,
        totalTransactions: 0,
        lastSyncDate: 0,
        dataHealthScore: 0,
        syncStatus: 'failed',
        connectionHealth: {
          apiResponseTime: 0,
          errorRate: 1.0,
          lastSuccessfulSync: 0,
        }
      };
    }
  }

  // Private helper methods
  private async makeAPICall(method: string, endpoint: string, options?: { query?: string; body?: any }): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.connection.credentials.accessToken}`,
      'Accept': 'application/json',
    };

    if (method === 'POST' || method === 'PUT') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    return {
      status: response.status,
      data: await response.json(),
    };
  }

  private mapAccountType(qbAccountType: string): string {
    const typeMap: Record<string, string> = {
      'Bank': 'bank',
      'Accounts Receivable': 'accounts_receivable',
      'Other Current Asset': 'other_current_asset',
      'Fixed Asset': 'fixed_asset',
      'Accounts Payable': 'accounts_payable',
      'Other Current Liability': 'other_current_liability',
      'Long Term Liability': 'long_term_liability',
      'Equity': 'equity',
      'Income': 'revenue',
      'Cost of Goods Sold': 'cost_of_goods_sold',
      'Expense': 'expense',
    };
    
    return typeMap[qbAccountType] || 'expense';
  }

  private calculateAccountLevel(account: any): number {
    // Simple level calculation - could be enhanced
    return account.ParentRef ? 1 : 0;
  }

  private buildDateQuery(dateRange: { start: number; end: number }, txnType: string): string {
    const startDate = this.formatDate(dateRange.start);
    const endDate = this.formatDate(dateRange.end);
    
    const dateField = txnType === 'JournalEntry' ? 'TxnDate' : 'TxnDate';
    return `${dateField} >= '${startDate}' AND ${dateField} <= '${endDate}'`;
  }

  private mapJournalEntry(qbJournalEntry: any): ERPTransaction[] {
    const transactions: ERPTransaction[] = [];
    
    if (qbJournalEntry.Line) {
      for (const line of qbJournalEntry.Line) {
        if (line.JournalEntryLineDetail) {
          transactions.push({
            id: `${qbJournalEntry.Id}-${line.Id}`,
            type: 'journal_entry',
            accountId: line.JournalEntryLineDetail.AccountRef.value,
            accountCode: line.JournalEntryLineDetail.AccountRef.name,
            description: qbJournalEntry.PrivateNote || line.Description || 'Journal Entry',
            amount: Math.abs(line.Amount || 0),
            debitAmount: line.JournalEntryLineDetail.PostingType === 'Debit' ? line.Amount : 0,
            creditAmount: line.JournalEntryLineDetail.PostingType === 'Credit' ? line.Amount : 0,
            currency: qbJournalEntry.CurrencyRef?.value || 'USD',
            transactionDate: this.parseDate(qbJournalEntry.TxnDate),
            status: 'posted',
            reconciliationStatus: 'unreconciled',
            lastSyncAt: Date.now(),
          });
        }
      }
    }
    
    return transactions;
  }

  private mapTransaction(qbTxn: any, txnType: string): ERPTransaction {
    return {
      id: qbTxn.Id,
      type: this.mapTransactionType(txnType),
      accountId: this.getAccountIdFromTransaction(qbTxn, txnType),
      accountCode: this.getAccountCodeFromTransaction(qbTxn, txnType),
      referenceNumber: qbTxn.DocNumber,
      description: qbTxn.PrivateNote || `${txnType} - ${qbTxn.DocNumber}`,
      amount: Math.abs(qbTxn.TotalAmt || 0),
      currency: qbTxn.CurrencyRef?.value || 'USD',
      transactionDate: this.parseDate(qbTxn.TxnDate),
      dueDate: qbTxn.DueDate ? this.parseDate(qbTxn.DueDate) : undefined,
      customerId: qbTxn.CustomerRef?.value,
      vendorId: qbTxn.VendorRef?.value,
      status: 'posted',
      reconciliationStatus: 'unreconciled',
      lastSyncAt: Date.now(),
    };
  }

  private mapTransactionType(qbType: string): string {
    const typeMap: Record<string, string> = {
      'Invoice': 'invoice',
      'Bill': 'bill',
      'Payment': 'payment',
      'Deposit': 'deposit',
      'JournalEntry': 'journal_entry',
    };
    
    return typeMap[qbType] || 'journal_entry';
  }

  private getAccountIdFromTransaction(qbTxn: any, txnType: string): string {
    // Logic varies by transaction type
    if (txnType === 'Invoice') {
      return qbTxn.Line?.[0]?.SalesItemLineDetail?.AccountRef?.value || '';
    }
    if (txnType === 'Bill') {
      return qbTxn.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.value || '';
    }
    return qbTxn.AccountRef?.value || '';
  }

  private getAccountCodeFromTransaction(qbTxn: any, txnType: string): string {
    // Logic varies by transaction type
    if (txnType === 'Invoice') {
      return qbTxn.Line?.[0]?.SalesItemLineDetail?.AccountRef?.name || '';
    }
    if (txnType === 'Bill') {
      return qbTxn.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || '';
    }
    return qbTxn.AccountRef?.name || '';
  }

  private async getTransactionCount(): Promise<number> {
    // Simplified count - in reality would need to count across all transaction types
    return 1000; // Mock value
  }

  private calculateHealthScore(accountCount: number, transactionCount: number): number {
    // Simple health score calculation
    const accountScore = Math.min(accountCount / 100, 1) * 40;
    const transactionScore = Math.min(transactionCount / 1000, 1) * 60;
    return Math.round(accountScore + transactionScore);
  }
}

/**
 * Sage Intacct Adapter (Stub Implementation)
 */
export class IntacctAdapter extends ERPAdapter {
  async connect(): Promise<boolean> {
    console.log('Intacct adapter - connect method (stub implementation)');
    return true; // Stub - always returns true for now
  }

  async testConnection(): Promise<boolean> {
    console.log('Intacct adapter - testConnection method (stub implementation)');
    return true; // Stub
  }

  async refreshToken(): Promise<string> {
    console.log('Intacct adapter - refreshToken method (stub implementation)');
    return 'stub-token'; // Stub
  }

  async syncAccounts(): Promise<ERPAccount[]> {
    console.log('Intacct adapter - syncAccounts method (stub implementation)');
    // Return empty array for now - will be implemented later
    return [];
  }

  async syncTransactions(dateRange?: { start: number; end: number }): Promise<ERPTransaction[]> {
    console.log('Intacct adapter - syncTransactions method (stub implementation)', dateRange);
    // Return empty array for now - will be implemented later
    return [];
  }

  async getMetrics(): Promise<ERPMetrics> {
    console.log('Intacct adapter - getMetrics method (stub implementation)');
    return {
      totalAccounts: 0,
      totalTransactions: 0,
      lastSyncDate: Date.now(),
      dataHealthScore: 0,
      syncStatus: 'pending',
      connectionHealth: {
        apiResponseTime: 0,
        errorRate: 0,
        lastSuccessfulSync: Date.now(),
      }
    };
  }
}

/**
 * NetSuite Adapter (Stub Implementation)
 */
export class NetSuiteAdapter extends ERPAdapter {
  async connect(): Promise<boolean> {
    console.log('NetSuite adapter - connect method (stub implementation)');
    return true;
  }

  async testConnection(): Promise<boolean> {
    console.log('NetSuite adapter - testConnection method (stub implementation)');
    return true;
  }

  async refreshToken(): Promise<string> {
    console.log('NetSuite adapter - refreshToken method (stub implementation)');
    return 'stub-token';
  }

  async syncAccounts(): Promise<ERPAccount[]> {
    console.log('NetSuite adapter - syncAccounts method (stub implementation)');
    return [];
  }

  async syncTransactions(dateRange?: { start: number; end: number }): Promise<ERPTransaction[]> {
    console.log('NetSuite adapter - syncTransactions method (stub implementation)', dateRange);
    return [];
  }

  async getMetrics(): Promise<ERPMetrics> {
    console.log('NetSuite adapter - getMetrics method (stub implementation)');
    return {
      totalAccounts: 0,
      totalTransactions: 0,
      lastSyncDate: Date.now(),
      dataHealthScore: 0,
      syncStatus: 'pending',
      connectionHealth: {
        apiResponseTime: 0,
        errorRate: 0,
        lastSuccessfulSync: Date.now(),
      }
    };
  }
}

/**
 * Xero Adapter (Stub Implementation)
 */
export class XeroAdapter extends ERPAdapter {
  async connect(): Promise<boolean> {
    console.log('Xero adapter - connect method (stub implementation)');
    return true;
  }

  async testConnection(): Promise<boolean> {
    console.log('Xero adapter - testConnection method (stub implementation)');
    return true;
  }

  async refreshToken(): Promise<string> {
    console.log('Xero adapter - refreshToken method (stub implementation)');
    return 'stub-token';
  }

  async syncAccounts(): Promise<ERPAccount[]> {
    console.log('Xero adapter - syncAccounts method (stub implementation)');
    return [];
  }

  async syncTransactions(dateRange?: { start: number; end: number }): Promise<ERPTransaction[]> {
    console.log('Xero adapter - syncTransactions method (stub implementation)', dateRange);
    return [];
  }

  async getMetrics(): Promise<ERPMetrics> {
    console.log('Xero adapter - getMetrics method (stub implementation)');
    return {
      totalAccounts: 0,
      totalTransactions: 0,
      lastSyncDate: Date.now(),
      dataHealthScore: 0,
      syncStatus: 'pending',
      connectionHealth: {
        apiResponseTime: 0,
        errorRate: 0,
        lastSuccessfulSync: Date.now(),
      }
    };
  }
}

/**
 * Factory Pattern for ERP Adapter Creation
 */
export function getERPAdapter(erpType: 'quickbooks' | 'intacct' | 'netsuite' | 'xero', connection: ERPConnection): ERPAdapter {
  switch (erpType) {
    case 'quickbooks':
      return new QuickBooksAdapter(connection);
    case 'intacct':
      return new IntacctAdapter(connection);
    case 'netsuite':
      return new NetSuiteAdapter(connection);
    case 'xero':
      return new XeroAdapter(connection);
    default:
      throw new Error(`Unsupported ERP type: ${erpType}`);
  }
}

/**
 * Convex Action to test ERP connection using adapter pattern
 */
export const testERPConnection = action({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
  },
  handler: async (ctx, args) => {
    // This would typically fetch the connection from the database
    // For now, we'll create a mock connection
    const mockConnection: ERPConnection = {
      id: args.erpConnectionId,
      erpType: 'quickbooks',
      organizationId: args.organizationId,
      credentials: {
        accessToken: 'mock-access-token',
        companyId: 'mock-company-id',
      },
      isActive: true,
    };

    const adapter = getERPAdapter(mockConnection.erpType, mockConnection);
    const isConnected = await adapter.testConnection();
    
    return {
      success: isConnected,
      erpType: mockConnection.erpType,
      connectionId: args.erpConnectionId,
    };
  },
});

/**
 * Convex Action to sync ERP data using adapter pattern
 */
export const syncERPDataWithAdapter = action({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    erpType: v.union(v.literal("quickbooks"), v.literal("intacct"), v.literal("netsuite"), v.literal("xero")),
    dataType: v.union(v.literal("accounts"), v.literal("transactions"), v.literal("full")),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    console.log(`Starting ERP sync for ${args.erpType} - ${args.dataType}`);

    // Create mock connection - in real implementation, would fetch from database
    const connection: ERPConnection = {
      id: args.erpConnectionId,
      erpType: args.erpType,
      organizationId: args.organizationId,
      credentials: {
        accessToken: process.env[`${args.erpType.toUpperCase()}_ACCESS_TOKEN`] || 'mock-token',
        companyId: process.env[`${args.erpType.toUpperCase()}_COMPANY_ID`] || 'mock-company',
      },
      isActive: true,
    };

    const adapter = getERPAdapter(args.erpType, connection);

    // Test connection first
    const isConnected = await adapter.connect();
    if (!isConnected) {
      throw new Error(`Failed to connect to ${args.erpType}`);
    }

    const results: any = {
      accounts: [],
      transactions: [],
      metrics: null,
    };

    // Sync accounts if requested
    if (args.dataType === 'accounts' || args.dataType === 'full') {
      results.accounts = await adapter.syncAccounts();
      console.log(`Synced ${results.accounts.length} accounts from ${args.erpType}`);
    }

    // Sync transactions if requested
    if (args.dataType === 'transactions' || args.dataType === 'full') {
      results.transactions = await adapter.syncTransactions(args.dateRange);
      console.log(`Synced ${results.transactions.length} transactions from ${args.erpType}`);
    }

    // Get metrics
    results.metrics = await adapter.getMetrics();

    return {
      success: true,
      erpType: args.erpType,
      dataType: args.dataType,
      results,
    };
  },
});