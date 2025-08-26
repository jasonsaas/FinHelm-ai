import axios, { AxiosResponse } from 'axios';
import * as xml2js from 'xml2js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

/**
 * Sage Intacct Integration for FinHelm.ai
 * Supports both REST API v1 and XML Gateway authentication
 * Handles multi-entity data synchronization with rate limiting
 */

export interface SageIntacctConfig {
  clientId: string;
  clientSecret: string;
  companyId: string;
  userId: string;
  userPassword: string;
  environment: 'sandbox' | 'production';
  baseUrl?: string;
  gatewayUrl?: string;
  preferredMethod: 'rest' | 'xml';
}

export interface SageIntacctTokens {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  sessionId?: string; // For XML Gateway
  endpoint?: string;
}

export interface SageIntacctAccount {
  RECORDNO: string;
  ACCOUNTNO: string;
  TITLE: string;
  ACCOUNTTYPE: string;
  NORMALBALANCE: string;
  CLOSINGTYPE: string;
  STATUS: string;
  CATEGORYNAME?: string;
  DEPT?: string;
  LOCATION?: string;
  REQUIREDEPT?: boolean;
  REQUIRELOCATION?: boolean;
  REQUIREPROJECT?: boolean;
  REQUIRECUSTOMER?: boolean;
  REQUIREVENDOR?: boolean;
  REQUIREEMPLOYEE?: boolean;
  REQUIREITEM?: boolean;
  REQUIRECLASS?: boolean;
  BALANCE?: number;
  WHENMODIFIED: string;
  WHENCREATED: string;
}

export interface SageIntacctTransaction {
  RECORDNO: string;
  BATCHKEY: string;
  JOURNAL: string;
  BATCH_DATE: string;
  BATCH_TITLE: string;
  STATE: string;
  ENTRIES: Array<{
    ENTRY_DATE: string;
    TR_TYPE: string;
    ACCOUNTNO: string;
    GLACCOUNTTITLE: string;
    TRX_AMOUNT: number;
    CURRENCY: string;
    DESCRIPTION: string;
    DEPARTMENT?: string;
    LOCATION?: string;
    PROJECT?: string;
    CUSTOMER?: string;
    VENDOR?: string;
    EMPLOYEE?: string;
    ITEM?: string;
    CLASS?: string;
  }>;
  WHENMODIFIED: string;
  WHENCREATED: string;
}

export class SageIntacctIntegration {
  private config: SageIntacctConfig;
  private convexClient: ConvexHttpClient;
  private rateLimitDelay: number = 500; // Base delay in ms
  private maxRetries: number = 3;
  private sessionId?: string;
  private xmlParser: xml2js.Parser;
  private xmlBuilder: xml2js.Builder;

  constructor(config: SageIntacctConfig, convexUrl: string) {
    this.config = config;
    this.convexClient = new ConvexHttpClient(convexUrl);
    
    // Initialize XML parser and builder
    this.xmlParser = new xml2js.Parser({ 
      explicitArray: false,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: true,
      trim: true 
    });
    
    this.xmlBuilder = new xml2js.Builder({
      rootName: 'request',
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
  }

  /**
   * OAuth 2.0 authentication for REST API
   */
  public async authenticateOAuth(): Promise<SageIntacctTokens> {
    const baseUrl = this.config.environment === 'sandbox'
      ? 'https://api.sandbox.intacct.com'
      : 'https://api.intacct.com';

    const tokenUrl = `${baseUrl}/v1/oauth2/token`;

    try {
      const response: AxiosResponse = await axios.post(tokenUrl, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'accounting'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FinHelm-ai/1.0.0'
        }
      });

      const tokens: SageIntacctTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 3600,
        token_type: response.data.token_type || 'Bearer',
      };

      console.log('Sage Intacct OAuth tokens obtained successfully');
      return tokens;
    } catch (error) {
      console.error('Sage Intacct OAuth authentication failed:', error);
      throw new Error(`OAuth authentication failed: ${error}`);
    }
  }

  /**
   * XML Gateway authentication (fallback method)
   */
  public async authenticateXMLGateway(): Promise<SageIntacctTokens> {
    const gatewayUrl = this.config.gatewayUrl || 'https://api.intacct.com/ia/xml/xmlgw.phtml';

    const authXml = `
      <request>
        <control>
          <senderid>${this.config.clientId}</senderid>
          <password>${this.config.clientSecret}</password>
          <controlid>auth-test-${Date.now()}</controlid>
          <uniqueid>false</uniqueid>
          <dtdversion>3.0</dtdversion>
          <includewhitespace>false</includewhitespace>
        </control>
        <operation transaction="false">
          <authentication>
            <login>
              <userid>${this.config.userId}</userid>
              <companyid>${this.config.companyId}</companyid>
              <password>${this.config.userPassword}</password>
            </login>
          </authentication>
          <content>
            <function controlid="test-session">
              <getAPISession/>
            </function>
          </content>
        </operation>
      </request>`;

    try {
      const response = await axios.post(gatewayUrl, authXml, {
        headers: {
          'Content-Type': 'application/xml',
          'User-Agent': 'FinHelm-ai/1.0.0'
        }
      });

      const result = await this.xmlParser.parseStringPromise(response.data);
      
      if (result.response?.operation?.result?.status === 'success') {
        const sessionData = result.response.operation.result.data?.api;
        this.sessionId = sessionData?.sessionid;
        
        const tokens: SageIntacctTokens = {
          sessionId: this.sessionId,
          endpoint: sessionData?.endpoint
        };

        console.log('Sage Intacct XML Gateway authentication successful');
        return tokens;
      } else {
        throw new Error('XML Gateway authentication failed: ' + result.response?.operation?.result?.errormessage);
      }
    } catch (error) {
      console.error('Sage Intacct XML Gateway authentication failed:', error);
      throw new Error(`XML Gateway authentication failed: ${error}`);
    }
  }

  /**
   * Main authentication method with fallback
   */
  public async authenticate(): Promise<SageIntacctTokens> {
    if (this.config.preferredMethod === 'rest') {
      try {
        return await this.authenticateOAuth();
      } catch (error) {
        console.log('REST authentication failed, falling back to XML Gateway');
        return await this.authenticateXMLGateway();
      }
    } else {
      try {
        return await this.authenticateXMLGateway();
      } catch (error) {
        console.log('XML Gateway authentication failed, falling back to REST API');
        return await this.authenticateOAuth();
      }
    }
  }

  /**
   * Make REST API request with rate limiting
   */
  private async makeRestRequest<T>(
    endpoint: string,
    accessToken: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any,
    retryCount: number = 0
  ): Promise<T> {
    const baseUrl = this.config.baseUrl || (
      this.config.environment === 'sandbox'
        ? 'https://api.sandbox.intacct.com'
        : 'https://api.intacct.com'
    );

    const url = `${baseUrl}/v1/${endpoint}`;

    try {
      // Apply rate limiting
      if (retryCount > 0) {
        const delay = this.rateLimitDelay * Math.pow(2, retryCount);
        console.log(`Rate limiting: waiting ${delay}ms before retry ${retryCount}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const config = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FinHelm-ai/1.0.0'
        },
        timeout: 30000,
        ...(data && { data })
      };

      const response: AxiosResponse<T> = await axios(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle rate limiting
        if (error.response?.status === 429 && retryCount < this.maxRetries) {
          return this.makeRestRequest(endpoint, accessToken, method, data, retryCount + 1);
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          throw new Error('Access token expired or invalid');
        }

        throw new Error(`Sage Intacct REST API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Make XML Gateway request
   */
  private async makeXMLRequest(
    functions: string,
    controlId: string = `request-${Date.now()}`,
    retryCount: number = 0
  ): Promise<any> {
    const gatewayUrl = this.config.gatewayUrl || 'https://api.intacct.com/ia/xml/xmlgw.phtml';

    const requestXml = `
      <request>
        <control>
          <senderid>${this.config.clientId}</senderid>
          <password>${this.config.clientSecret}</password>
          <controlid>${controlId}</controlid>
          <uniqueid>false</uniqueid>
          <dtdversion>3.0</dtdversion>
          <includewhitespace>false</includewhitespace>
        </control>
        <operation transaction="false">
          <authentication>
            <sessionid>${this.sessionId}</sessionid>
          </authentication>
          <content>
            ${functions}
          </content>
        </operation>
      </request>`;

    try {
      // Apply rate limiting
      if (retryCount > 0) {
        const delay = this.rateLimitDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await axios.post(gatewayUrl, requestXml, {
        headers: {
          'Content-Type': 'application/xml',
          'User-Agent': 'FinHelm-ai/1.0.0'
        },
        timeout: 30000
      });

      const result = await this.xmlParser.parseStringPromise(response.data);
      
      if (result.response?.operation?.result?.status === 'failure') {
        const errorMsg = result.response.operation.result.errormessage;
        
        // Retry on rate limit or temporary errors
        if (retryCount < this.maxRetries && (errorMsg?.includes('rate') || errorMsg?.includes('temporary'))) {
          return this.makeXMLRequest(functions, controlId, retryCount + 1);
        }
        
        throw new Error(`Sage Intacct XML error: ${errorMsg}`);
      }

      return result.response?.operation?.result?.data;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        return this.makeXMLRequest(functions, controlId, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Get chart of accounts
   */
  public async getChartOfAccounts(tokens: SageIntacctTokens): Promise<SageIntacctAccount[]> {
    try {
      console.log('Fetching Sage Intacct chart of accounts...');

      if (tokens.access_token) {
        // Use REST API
        const response = await this.makeRestRequest<{
          accounts: SageIntacctAccount[]
        }>('objects/general-ledger/account', tokens.access_token);
        
        console.log(`Retrieved ${response.accounts.length} accounts via REST API`);
        return response.accounts;
      } else {
        // Use XML Gateway
        const functions = `
          <function controlid="get-accounts-${Date.now()}">
            <readByQuery>
              <object>GLACCOUNT</object>
              <query>STATUS = 'active'</query>
              <pagesize>1000</pagesize>
            </readByQuery>
          </function>`;

        const result = await this.makeXMLRequest(functions);
        const accounts = Array.isArray(result.glaccount) ? result.glaccount : [result.glaccount];
        
        console.log(`Retrieved ${accounts.length} accounts via XML Gateway`);
        return accounts;
      }
    } catch (error) {
      console.error('Error fetching Sage Intacct chart of accounts:', error);
      throw error;
    }
  }

  /**
   * Get general ledger transactions
   */
  public async getGeneralLedgerTransactions(
    tokens: SageIntacctTokens,
    startDate?: Date,
    endDate?: Date
  ): Promise<SageIntacctTransaction[]> {
    try {
      console.log('Fetching Sage Intacct GL transactions...');

      if (tokens.access_token) {
        // Use REST API
        let query = 'objects/general-ledger/journal-entry';
        if (startDate && endDate) {
          const start = startDate.toISOString().split('T')[0];
          const end = endDate.toISOString().split('T')[0];
          query += `?filter=BATCH_DATE >= '${start}' AND BATCH_DATE <= '${end}'`;
        }

        const response = await this.makeRestRequest<{
          'journal-entries': SageIntacctTransaction[]
        }>(query, tokens.access_token);
        
        console.log(`Retrieved ${response['journal-entries'].length} transactions via REST API`);
        return response['journal-entries'];
      } else {
        // Use XML Gateway
        let whereClause = '';
        if (startDate && endDate) {
          const start = startDate.toISOString().split('T')[0];
          const end = endDate.toISOString().split('T')[0];
          whereClause = `AND BATCH_DATE >= '${start}' AND BATCH_DATE <= '${end}'`;
        }

        const functions = `
          <function controlid="get-je-${Date.now()}">
            <readByQuery>
              <object>GLBATCH</object>
              <query>STATE = 'Posted' ${whereClause}</query>
              <pagesize>1000</pagesize>
            </readByQuery>
          </function>`;

        const result = await this.makeXMLRequest(functions);
        const transactions = Array.isArray(result.glbatch) ? result.glbatch : [result.glbatch];
        
        console.log(`Retrieved ${transactions.length} transactions via XML Gateway`);
        return transactions;
      }
    } catch (error) {
      console.error('Error fetching Sage Intacct GL transactions:', error);
      throw error;
    }
  }

  /**
   * Get accounts payable transactions
   */
  public async getAccountsPayableTransactions(
    tokens: SageIntacctTokens,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      console.log('Fetching Sage Intacct AP transactions...');

      const functions = `
        <function controlid="get-ap-${Date.now()}">
          <readByQuery>
            <object>APBILL</object>
            <query>STATE = 'Posted'${startDate && endDate ? 
              ` AND WHENPAID >= '${startDate.toISOString().split('T')[0]}' AND WHENPAID <= '${endDate.toISOString().split('T')[0]}'` : 
              ''}</query>
            <pagesize>500</pagesize>
          </readByQuery>
        </function>`;

      const result = await this.makeXMLRequest(functions);
      const apTransactions = Array.isArray(result.apbill) ? result.apbill : [result.apbill || []];
      
      console.log(`Retrieved ${apTransactions.length} AP transactions`);
      return apTransactions;
    } catch (error) {
      console.error('Error fetching Sage Intacct AP transactions:', error);
      throw error;
    }
  }

  /**
   * Get accounts receivable transactions  
   */
  public async getAccountsReceivableTransactions(
    tokens: SageIntacctTokens,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      console.log('Fetching Sage Intacct AR transactions...');

      const functions = `
        <function controlid="get-ar-${Date.now()}">
          <readByQuery>
            <object>ARINVOICE</object>
            <query>STATE = 'Posted'${startDate && endDate ? 
              ` AND WHENPAID >= '${startDate.toISOString().split('T')[0]}' AND WHENPAID <= '${endDate.toISOString().split('T')[0]}'` : 
              ''}</query>
            <pagesize>500</pagesize>
          </readByQuery>
        </function>`;

      const result = await this.makeXMLRequest(functions);
      const arTransactions = Array.isArray(result.arinvoice) ? result.arinvoice : [result.arinvoice || []];
      
      console.log(`Retrieved ${arTransactions.length} AR transactions`);
      return arTransactions;
    } catch (error) {
      console.error('Error fetching Sage Intacct AR transactions:', error);
      throw error;
    }
  }

  /**
   * Sync Sage Intacct data to Convex with multi-entity support
   */
  public async syncToConvex(
    organizationId: string,
    erpConnectionId: string,
    tokens: SageIntacctTokens,
    options: {
      syncAccounts?: boolean;
      syncTransactions?: boolean;
      syncAP?: boolean;
      syncAR?: boolean;
      fuzzyMatchThreshold?: number;
      autoApplyHighConfidenceMatches?: boolean;
      dateRange?: { start: Date; end: Date };
      entityFilter?: string[];
    } = {}
  ): Promise<{ syncJobId: string; results: any }> {
    const {
      syncAccounts = true,
      syncTransactions = true,
      syncAP = true,
      syncAR = true,
      fuzzyMatchThreshold = 0.9,
      autoApplyHighConfidenceMatches = true,
      dateRange,
      entityFilter = []
    } = options;

    try {
      console.log('Starting Sage Intacct to Convex sync with multi-entity support...');

      let sourceData: any[] = [];

      if (syncAccounts) {
        const accounts = await this.getChartOfAccounts(tokens);
        const mappedAccounts = this.mapAccountsForSync(accounts, entityFilter);
        sourceData = sourceData.concat(mappedAccounts);
      }

      if (syncTransactions) {
        const glTransactions = await this.getGeneralLedgerTransactions(tokens, dateRange?.start, dateRange?.end);
        const mappedTransactions = this.mapTransactionsForSync(glTransactions, 'GL', entityFilter);
        sourceData = sourceData.concat(mappedTransactions);
      }

      if (syncAP) {
        const apTransactions = await this.getAccountsPayableTransactions(tokens, dateRange?.start, dateRange?.end);
        const mappedAPTransactions = this.mapTransactionsForSync(apTransactions, 'AP', entityFilter);
        sourceData = sourceData.concat(mappedAPTransactions);
      }

      if (syncAR) {
        const arTransactions = await this.getAccountsReceivableTransactions(tokens, dateRange?.start, dateRange?.end);
        const mappedARTransactions = this.mapTransactionsForSync(arTransactions, 'AR', entityFilter);
        sourceData = sourceData.concat(mappedARTransactions);
      }

      // Apply fuzzy normalization for account codes (e.g., 'ACC-001' ↔ 'ACC001')
      sourceData = this.normalizeAccountCodes(sourceData);

      // Sync with Convex
      const syncResult = await this.convexClient.action(api.syncActions.syncERPData, {
        organizationId,
        erpConnectionId,
        dataType: 'full',
        sourceData,
        reconciliationOptions: {
          fuzzyMatchThreshold,
          autoApplyHighConfidenceMatches,
          skipDuplicates: true,
        },
      });

      console.log('Sage Intacct multi-entity sync completed successfully');
      return syncResult;
    } catch (error) {
      console.error('Sage Intacct sync to Convex failed:', error);
      throw error;
    }
  }

  /**
   * Map Sage Intacct accounts to Convex format
   */
  private mapAccountsForSync(accounts: SageIntacctAccount[], entityFilter: string[] = []) {
    return accounts
      .filter(account => !entityFilter.length || entityFilter.includes(account.DEPT || account.LOCATION || ''))
      .map(account => ({
        externalId: account.RECORDNO,
        code: account.ACCOUNTNO,
        name: account.TITLE,
        fullName: account.TITLE,
        type: this.mapAccountType(account.ACCOUNTTYPE),
        category: account.CATEGORYNAME,
        subType: account.NORMALBALANCE,
        balance: account.BALANCE || 0,
        currency: 'USD',
        isActive: account.STATUS === 'active',
        department: account.DEPT,
        location: account.LOCATION,
        lastModified: new Date(account.WHENMODIFIED).getTime(),
      }));
  }

  /**
   * Map transactions to Convex format with multi-entity support
   */
  private mapTransactionsForSync(transactions: any[], type: 'GL' | 'AP' | 'AR', entityFilter: string[] = []) {
    const mappedTransactions: any[] = [];

    transactions.forEach(txn => {
      // Skip if entity filter is applied and transaction doesn't match
      if (entityFilter.length > 0) {
        const entity = txn.DEPT || txn.LOCATION || txn.LOCATIONID || '';
        if (!entityFilter.includes(entity)) {
          return;
        }
      }

      if (type === 'GL' && txn.ENTRIES) {
        txn.ENTRIES.forEach((entry: any, index: number) => {
          mappedTransactions.push({
            id: `${txn.RECORDNO}-${index}`,
            externalId: `${txn.RECORDNO}-${index}`,
            accountCode: entry.ACCOUNTNO,
            type: this.mapTransactionType(type),
            amount: Math.abs(entry.TRX_AMOUNT),
            debitAmount: entry.TR_TYPE === 'debit' ? entry.TRX_AMOUNT : undefined,
            creditAmount: entry.TR_TYPE === 'credit' ? entry.TRX_AMOUNT : undefined,
            transactionDate: new Date(entry.ENTRY_DATE).getTime(),
            description: entry.DESCRIPTION || txn.BATCH_TITLE,
            currency: entry.CURRENCY || 'USD',
            status: 'posted',
            departmentId: entry.DEPARTMENT,
            locationId: entry.LOCATION,
            projectId: entry.PROJECT,
            customerId: entry.CUSTOMER,
            vendorId: entry.VENDOR,
            lastModified: new Date(txn.WHENMODIFIED).getTime(),
          });
        });
      } else {
        // Handle AP and AR transactions
        mappedTransactions.push({
          id: txn.RECORDNO,
          externalId: txn.RECORDNO,
          accountCode: txn.ACCOUNTNO || 'unknown',
          type: this.mapTransactionType(type),
          amount: Math.abs(txn.TOTALAMOUNT || txn.AMOUNT || 0),
          transactionDate: new Date(txn.WHENDUE || txn.WHENCREATED).getTime(),
          description: txn.DESCRIPTION || txn.DOCNO || 'Imported transaction',
          currency: txn.CURRENCY || 'USD',
          status: 'posted',
          customerId: type === 'AR' ? txn.CUSTOMERID : undefined,
          vendorId: type === 'AP' ? txn.VENDORID : undefined,
          lastModified: new Date(txn.WHENMODIFIED).getTime(),
        });
      }
    });

    return mappedTransactions;
  }

  /**
   * Normalize account codes for fuzzy matching
   */
  private normalizeAccountCodes(sourceData: any[]) {
    return sourceData.map(item => ({
      ...item,
      normalizedCode: item.code
        ?.toString()
        .toLowerCase()
        .replace(/[-_\s\.]/g, '')
        .replace(/^0+/, '') || item.code
    }));
  }

  /**
   * Map Sage Intacct account types
   */
  private mapAccountType(intacctAccountType: string): string {
    const typeMapping: Record<string, string> = {
      'balancesheet': 'asset',
      'incomestatement': 'revenue',
      'statistical': 'other_current_asset',
    };

    return typeMapping[intacctAccountType?.toLowerCase()] || 'expense';
  }

  /**
   * Map transaction types
   */
  private mapTransactionType(type: 'GL' | 'AP' | 'AR'): string {
    const typeMapping = {
      'GL': 'journal_entry',
      'AP': 'bill',
      'AR': 'invoice'
    };

    return typeMapping[type] || 'journal_entry';
  }

  /**
   * Test connection
   */
  public async testConnection(tokens: SageIntacctTokens): Promise<boolean> {
    try {
      if (tokens.access_token) {
        await this.makeRestRequest('company-info', tokens.access_token);
      } else {
        const functions = `<function controlid="test-connection"><get_list object="user" maxitems="1"/></function>`;
        await this.makeXMLRequest(functions);
      }
      
      console.log('Sage Intacct connection test successful');
      return true;
    } catch (error) {
      console.error('Sage Intacct connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create Sage Intacct integration instance
 */
export function createSageIntacctIntegration(
  config: SageIntacctConfig,
  convexUrl: string
): SageIntacctIntegration {
  return new SageIntacctIntegration(config, convexUrl);
}