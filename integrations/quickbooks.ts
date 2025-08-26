import OAuthClient from 'intuit-oauth';
import axios, { AxiosResponse } from 'axios';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

/**
 * QuickBooks OAuth Integration for FinHelm.ai
 * Handles authentication, data sync, and API calls with rate limiting
 */

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
  baseUrl?: string;
}

export interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  realmId: string;
  expires_in: number;
  token_type: string;
}

export interface ChartOfAccountsItem {
  Id: string;
  Name: string;
  FullyQualifiedName: string;
  AccountType: string;
  AccountSubType: string;
  Classification: string;
  CurrentBalance: number;
  Active: boolean;
  ParentRef?: {
    value: string;
    name: string;
  };
  Description?: string;
  CurrencyRef?: {
    value: string;
    name: string;
  };
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksTransaction {
  Id: string;
  TxnDate: string;
  Line: Array<{
    Id: string;
    Amount: number;
    DetailType: string;
    AccountBasedExpenseLineDetail?: {
      AccountRef: {
        value: string;
        name: string;
      };
    };
    JournalEntryLineDetail?: {
      PostingType: 'Debit' | 'Credit';
      AccountRef: {
        value: string;
        name: string;
      };
    };
  }>;
  DocNumber?: string;
  PrivateNote?: string;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export class QuickBooksIntegration {
  private oauthClient: OAuthClient;
  private config: QuickBooksConfig;
  private convexClient: ConvexHttpClient;
  private rateLimitDelay: number = 1000; // Base delay in ms
  private maxRetries: number = 3;

  constructor(config: QuickBooksConfig, convexUrl: string) {
    this.config = config;
    this.convexClient = new ConvexHttpClient(convexUrl);
    
    this.oauthClient = new OAuthClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      scope: config.scope,
      redirectUri: config.redirectUri,
      environment: config.environment,
    });
  }

  /**
   * Generate OAuth authorization URI
   */
  public getAuthUri(state: string, codeVerifier?: string): string {
    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  public async handleCallback(
    authCode: string,
    realmId: string,
    state: string,
    codeVerifier?: string
  ): Promise<QuickBooksTokens> {
    try {
      const response = await this.oauthClient.createToken(
        authCode,
        state,
        realmId,
        codeVerifier
      );

      if (!response.token) {
        throw new Error('Failed to obtain access token');
      }

      const tokens: QuickBooksTokens = {
        access_token: response.token.access_token!,
        refresh_token: response.token.refresh_token!,
        realmId: response.token.realmId!,
        expires_in: response.token.expires_in || 3600,
        token_type: response.token.token_type || 'Bearer',
      };

      console.log('QuickBooks tokens obtained successfully');
      return tokens;
    } catch (error) {
      console.error('QuickBooks OAuth callback error:', error);
      throw new Error(`OAuth callback failed: ${error}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshTokens(refreshToken: string): Promise<QuickBooksTokens> {
    try {
      this.oauthClient.setToken({
        refresh_token: refreshToken,
      });

      const response = await this.oauthClient.refresh();

      if (!response.token) {
        throw new Error('Failed to refresh token');
      }

      const tokens: QuickBooksTokens = {
        access_token: response.token.access_token!,
        refresh_token: response.token.refresh_token!,
        realmId: response.token.realmId!,
        expires_in: response.token.expires_in || 3600,
        token_type: response.token.token_type || 'Bearer',
      };

      console.log('QuickBooks tokens refreshed successfully');
      return tokens;
    } catch (error) {
      console.error('QuickBooks token refresh error:', error);
      throw new Error(`Token refresh failed: ${error}`);
    }
  }

  /**
   * Make authenticated API request with rate limiting and retry logic
   */
  private async makeApiRequest<T>(
    endpoint: string,
    accessToken: string,
    realmId: string,
    retryCount: number = 0
  ): Promise<T> {
    const baseUrl = this.config.environment === 'sandbox' 
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

    try {
      // Apply rate limiting
      if (retryCount > 0) {
        const delay = this.rateLimitDelay * Math.pow(2, retryCount);
        console.log(`Rate limiting: waiting ${delay}ms before retry ${retryCount}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response: AxiosResponse<T> = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'FinHelm-ai/1.0.0',
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle rate limiting (HTTP 429) with exponential backoff
        if (error.response?.status === 429 && retryCount < this.maxRetries) {
          console.log(`Rate limited, retrying in ${this.rateLimitDelay * Math.pow(2, retryCount)}ms`);
          return this.makeApiRequest(endpoint, accessToken, realmId, retryCount + 1);
        }

        // Handle token expiration
        if (error.response?.status === 401) {
          throw new Error('Access token expired or invalid');
        }

        // Handle other API errors
        throw new Error(`QuickBooks API error: ${error.response?.status} - ${error.response?.data?.Fault?.Error?.[0]?.Detail || error.message}`);
      }

      throw error;
    }
  }

  /**
   * Fetch chart of accounts from QuickBooks
   */
  public async getChartOfAccounts(
    accessToken: string,
    realmId: string,
    pageSize: number = 100
  ): Promise<ChartOfAccountsItem[]> {
    try {
      console.log('Fetching QuickBooks chart of accounts...');
      
      const response = await this.makeApiRequest<{
        QueryResponse: {
          Account: ChartOfAccountsItem[];
          maxResults?: number;
          startPosition?: number;
        };
      }>(`accounts?fetchAll=true`, accessToken, realmId);

      const accounts = response.QueryResponse.Account || [];
      
      console.log(`Retrieved ${accounts.length} accounts from QuickBooks`);
      return accounts;
    } catch (error) {
      console.error('Error fetching QuickBooks chart of accounts:', error);
      throw error;
    }
  }

  /**
   * Fetch transactions from QuickBooks (Journal Entries, Bills, Invoices, etc.)
   */
  public async getTransactions(
    accessToken: string,
    realmId: string,
    startDate?: Date,
    endDate?: Date,
    pageSize: number = 100
  ): Promise<QuickBooksTransaction[]> {
    try {
      console.log('Fetching QuickBooks transactions...');
      
      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `WHERE TxnDate >= '${startDate.toISOString().split('T')[0]}' AND TxnDate <= '${endDate.toISOString().split('T')[0]}'`;
      }

      // Fetch different transaction types
      const transactionTypes = ['JournalEntry', 'Bill', 'Invoice', 'Payment'];
      const allTransactions: QuickBooksTransaction[] = [];

      for (const txnType of transactionTypes) {
        try {
          const query = dateFilter 
            ? `SELECT * FROM ${txnType} ${dateFilter} MAXRESULTS ${pageSize}`
            : `SELECT * FROM ${txnType} MAXRESULTS ${pageSize}`;

          const response = await this.makeApiRequest<{
            QueryResponse: {
              [key: string]: QuickBooksTransaction[];
              maxResults?: number;
              startPosition?: number;
            };
          }>(`query?query=${encodeURIComponent(query)}`, accessToken, realmId);

          const transactions = response.QueryResponse[txnType] || [];
          allTransactions.push(...transactions);
          
          console.log(`Retrieved ${transactions.length} ${txnType} transactions`);
          
          // Small delay between different transaction types to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.warn(`Failed to fetch ${txnType} transactions:`, error);
          // Continue with other transaction types
        }
      }

      console.log(`Total transactions retrieved: ${allTransactions.length}`);
      return allTransactions;
    } catch (error) {
      console.error('Error fetching QuickBooks transactions:', error);
      throw error;
    }
  }

  /**
   * Sync QuickBooks data to Convex with fuzzy matching
   */
  public async syncToConvex(
    organizationId: string,
    erpConnectionId: string,
    accessToken: string,
    realmId: string,
    options: {
      syncAccounts?: boolean;
      syncTransactions?: boolean;
      fuzzyMatchThreshold?: number;
      autoApplyHighConfidenceMatches?: boolean;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<{ syncJobId: string; results: any }> {
    const {
      syncAccounts = true,
      syncTransactions = true,
      fuzzyMatchThreshold = 0.9,
      autoApplyHighConfidenceMatches = true,
      dateRange,
    } = options;

    try {
      console.log('Starting QuickBooks to Convex sync...');

      let sourceData: any[] = [];

      if (syncAccounts) {
        const accounts = await this.getChartOfAccounts(accessToken, realmId);
        sourceData = sourceData.concat(this.mapAccountsForSync(accounts));
      }

      if (syncTransactions) {
        const transactions = await this.getTransactions(
          accessToken,
          realmId,
          dateRange?.start,
          dateRange?.end
        );
        sourceData = sourceData.concat(this.mapTransactionsForSync(transactions));
      }

      // Sync with Convex using the existing syncActions
      const syncResult = await this.convexClient.action(api.syncActions.syncERPData, {
        organizationId,
        erpConnectionId,
        dataType: syncAccounts && syncTransactions ? 'full' : syncAccounts ? 'accounts' : 'transactions',
        sourceData,
        reconciliationOptions: {
          fuzzyMatchThreshold,
          autoApplyHighConfidenceMatches,
          skipDuplicates: true,
        },
      });

      console.log('QuickBooks sync completed successfully');
      return syncResult;
    } catch (error) {
      console.error('QuickBooks sync to Convex failed:', error);
      throw error;
    }
  }

  /**
   * Map QuickBooks accounts to Convex format
   */
  private mapAccountsForSync(accounts: ChartOfAccountsItem[]) {
    return accounts.map(account => ({
      externalId: account.Id,
      code: account.Id, // QuickBooks uses ID as code
      name: account.Name,
      fullName: account.FullyQualifiedName,
      type: this.mapAccountType(account.AccountType),
      category: account.Classification,
      subType: account.AccountSubType,
      parentCode: account.ParentRef?.value,
      description: account.Description,
      balance: account.CurrentBalance,
      currency: account.CurrencyRef?.value || 'USD',
      isActive: account.Active,
      lastModified: new Date(account.MetaData.LastUpdatedTime).getTime(),
    }));
  }

  /**
   * Map QuickBooks transactions to Convex format
   */
  private mapTransactionsForSync(transactions: QuickBooksTransaction[]) {
    const mappedTransactions: any[] = [];

    transactions.forEach(txn => {
      txn.Line.forEach(line => {
        mappedTransactions.push({
          id: `${txn.Id}-${line.Id}`,
          externalId: `${txn.Id}-${line.Id}`,
          accountCode: this.extractAccountCode(line),
          type: this.mapTransactionType(line.DetailType),
          amount: line.Amount,
          debitAmount: line.JournalEntryLineDetail?.PostingType === 'Debit' ? line.Amount : undefined,
          creditAmount: line.JournalEntryLineDetail?.PostingType === 'Credit' ? line.Amount : undefined,
          transactionDate: new Date(txn.TxnDate).getTime(),
          referenceNumber: txn.DocNumber,
          description: txn.PrivateNote || `${line.DetailType} transaction`,
          currency: 'USD',
          status: 'posted',
          lastModified: new Date(txn.MetaData.LastUpdatedTime).getTime(),
        });
      });
    });

    return mappedTransactions;
  }

  /**
   * Map QuickBooks account types to Convex account types
   */
  private mapAccountType(qbAccountType: string): string {
    const typeMapping: Record<string, string> = {
      'Bank': 'bank',
      'Accounts Receivable': 'accounts_receivable',
      'Other Current Asset': 'other_current_asset',
      'Fixed Asset': 'fixed_asset',
      'Accounts Payable': 'accounts_payable',
      'Credit Card': 'other_current_liability',
      'Other Current Liability': 'other_current_liability',
      'Long Term Liability': 'long_term_liability',
      'Equity': 'equity',
      'Income': 'revenue',
      'Cost of Goods Sold': 'cost_of_goods_sold',
      'Expense': 'expense',
      'Other Income': 'income',
      'Other Expense': 'expense',
    };

    return typeMapping[qbAccountType] || 'expense';
  }

  /**
   * Map QuickBooks transaction types to Convex transaction types
   */
  private mapTransactionType(detailType: string): string {
    const typeMapping: Record<string, string> = {
      'JournalEntryLineDetail': 'journal_entry',
      'AccountBasedExpenseLineDetail': 'bill',
      'SalesItemLineDetail': 'invoice',
      'PaymentLineDetail': 'payment',
      'DepositLineDetail': 'deposit',
    };

    return typeMapping[detailType] || 'journal_entry';
  }

  /**
   * Extract account code from transaction line
   */
  private extractAccountCode(line: any): string {
    if (line.AccountBasedExpenseLineDetail?.AccountRef?.value) {
      return line.AccountBasedExpenseLineDetail.AccountRef.value;
    }
    if (line.JournalEntryLineDetail?.AccountRef?.value) {
      return line.JournalEntryLineDetail.AccountRef.value;
    }
    return 'unknown';
  }

  /**
   * Test connection and validate credentials
   */
  public async testConnection(accessToken: string, realmId: string): Promise<boolean> {
    try {
      const response = await this.makeApiRequest<any>('companyinfo/' + realmId, accessToken, realmId);
      console.log('QuickBooks connection test successful');
      return true;
    } catch (error) {
      console.error('QuickBooks connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create QuickBooks integration instance
 */
export function createQuickBooksIntegration(
  config: QuickBooksConfig,
  convexUrl: string
): QuickBooksIntegration {
  return new QuickBooksIntegration(config, convexUrl);
}

/**
 * Helper function to parse CSV hierarchical account names
 * Example: "Job Expenses:Job Materials:Decks and Patios" -> parsed hierarchy
 */
export function parseHierarchicalAccountName(fullName: string): {
  levels: string[];
  parentPath?: string;
  depth: number;
} {
  const levels = fullName.split(':').map(level => level.trim());
  const depth = levels.length;
  const parentPath = depth > 1 ? levels.slice(0, -1).join(':') : undefined;

  return {
    levels,
    parentPath,
    depth,
  };
}