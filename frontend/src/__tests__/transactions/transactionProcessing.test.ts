/**
 * Transaction Processing Unit Tests
 * 
 * Comprehensive tests for transaction management functionality including:
 * - Transaction creation and validation
 * - Transaction querying and filtering  
 * - Status updates and reconciliation
 * - Bulk operations
 * - Summary statistics
 * - Error handling and edge cases
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  ConvexError,
  errorLogger,
} from '../../utils/errorHandling';

// Mock transaction interfaces
interface Transaction {
  _id: string;
  organizationId: string;
  erpConnectionId: string;
  externalId: string;
  type: 'journal_entry' | 'invoice' | 'bill' | 'payment' | 'deposit' | 'transfer' | 'adjustment';
  accountId: string;
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
  locationId?: string;
  tags: string[];
  status: 'draft' | 'pending' | 'posted' | 'void' | 'reconciled';
  reconciliationStatus: 'unreconciled' | 'reconciled' | 'pending';
  lastSyncAt: number;
  createdAt: number;
  updatedAt: number;
}

interface Account {
  _id: string;
  organizationId: string;
  code: string;
  name: string;
  type: string;
}

interface CreateTransactionRequest {
  organizationId: string;
  erpConnectionId: string;
  externalId?: string;
  type: Transaction['type'];
  accountId: string;
  referenceNumber?: string;
  description: string;
  amount: number;
  debitAmount?: number;
  creditAmount?: number;
  currency?: string;
  exchangeRate?: number;
  transactionDate: number;
  postingDate?: number;
  dueDate?: number;
  customerId?: string;
  vendorId?: string;
  projectId?: string;
  departmentId?: string;
  locationId?: string;
  tags?: string[];
  status?: Transaction['status'];
}

interface TransactionQueryRequest {
  organizationId: string;
  accountId?: string;
  accountCode?: string;
  startDate?: number;
  endDate?: number;
  type?: Transaction['type'];
  status?: Transaction['status'];
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byType: Record<string, { count: number; amount: number }>;
  byAccount: Record<string, { count: number; amount: number }>;
  dateRange: {
    start: number;
    end: number;
  };
}

/**
 * Transaction Service Mock Implementation
 * This simulates the actual transaction processing service
 */
class TransactionService {
  private transactions: Map<string, Transaction> = new Map();
  private accounts: Map<string, Account> = new Map();
  private nextId = 1;

  constructor() {
    // Setup test accounts
    this.setupTestAccounts();
  }

  private setupTestAccounts(): void {
    const testAccounts: Account[] = [
      {
        _id: 'acc-1001',
        organizationId: 'org-123',
        code: '1001',
        name: 'Cash',
        type: 'asset',
      },
      {
        _id: 'acc-4001',
        organizationId: 'org-123',
        code: '4001',
        name: 'Revenue',
        type: 'revenue',
      },
      {
        _id: 'acc-5001',
        organizationId: 'org-123',
        code: '5001',
        name: 'Expenses',
        type: 'expense',
      },
    ];

    testAccounts.forEach(account => {
      this.accounts.set(account._id, account);
    });
  }

  /**
   * Create a new transaction with comprehensive validation
   * @param request - Transaction creation request
   * @returns Created transaction ID
   * @throws ValidationError for invalid input
   * @throws ConvexError for database constraints
   */
  async createTransaction(request: CreateTransactionRequest): Promise<string> {
    // Input validation
    this.validateTransactionRequest(request);

    // Check if account exists and belongs to organization
    const account = this.accounts.get(request.accountId);
    if (!account) {
      throw new ValidationError('Account not found', 'accountId');
    }

    if (account.organizationId !== request.organizationId) {
      throw new ValidationError('Account does not belong to the specified organization', 'accountId');
    }

    // Generate external ID if not provided
    const externalId = request.externalId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check for duplicate transactions
    const existingTransaction = Array.from(this.transactions.values()).find(
      txn => txn.organizationId === request.organizationId && txn.externalId === externalId
    );

    if (existingTransaction) {
      throw new ConvexError(`Transaction with external ID ${externalId} already exists`);
    }

    // Create transaction
    const now = Date.now();
    const transactionId = `txn-${this.nextId++}`;
    
    const transaction: Transaction = {
      _id: transactionId,
      organizationId: request.organizationId,
      erpConnectionId: request.erpConnectionId,
      externalId,
      type: request.type,
      accountId: request.accountId,
      referenceNumber: request.referenceNumber,
      description: request.description,
      amount: Math.abs(request.amount),
      debitAmount: request.debitAmount,
      creditAmount: request.creditAmount,
      currency: request.currency || 'USD',
      exchangeRate: request.exchangeRate,
      transactionDate: request.transactionDate,
      postingDate: request.postingDate,
      dueDate: request.dueDate,
      customerId: request.customerId,
      vendorId: request.vendorId,
      projectId: request.projectId,
      departmentId: request.departmentId,
      locationId: request.locationId,
      tags: request.tags || [],
      status: request.status || 'posted',
      reconciliationStatus: 'unreconciled',
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * Query transactions with filtering and pagination
   * @param request - Query parameters
   * @returns Filtered and paginated transactions
   */
  async getTransactions(request: TransactionQueryRequest): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values()).filter(
      txn => txn.organizationId === request.organizationId
    );

    // Apply filters
    if (request.accountId) {
      transactions = transactions.filter(txn => txn.accountId === request.accountId);
    }

    if (request.accountCode) {
      const account = Array.from(this.accounts.values()).find(
        acc => acc.code === request.accountCode && acc.organizationId === request.organizationId
      );
      if (account) {
        transactions = transactions.filter(txn => txn.accountId === account._id);
      } else {
        return [];
      }
    }

    if (request.type) {
      transactions = transactions.filter(txn => txn.type === request.type);
    }

    if (request.status) {
      transactions = transactions.filter(txn => txn.status === request.status);
    }

    if (request.startDate || request.endDate) {
      transactions = transactions.filter(txn => {
        if (request.startDate && txn.transactionDate < request.startDate) return false;
        if (request.endDate && txn.transactionDate > request.endDate) return false;
        return true;
      });
    }

    if (request.minAmount || request.maxAmount) {
      transactions = transactions.filter(txn => {
        if (request.minAmount && txn.amount < request.minAmount) return false;
        if (request.maxAmount && txn.amount > request.maxAmount) return false;
        return true;
      });
    }

    // Sort by transaction date (newest first)
    transactions.sort((a, b) => b.transactionDate - a.transactionDate);

    // Apply pagination
    const offset = request.offset || 0;
    const limit = request.limit || 100;

    return transactions.slice(offset, offset + limit);
  }

  /**
   * Update transaction status
   * @param transactionId - Transaction to update
   * @param status - New status
   * @param reconciliationStatus - New reconciliation status
   * @returns Success indicator
   * @throws ValidationError if transaction not found
   */
  async updateTransactionStatus(
    transactionId: string,
    status?: Transaction['status'],
    reconciliationStatus?: Transaction['reconciliationStatus']
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new ValidationError('Transaction not found', 'transactionId');
    }

    const updates: Partial<Transaction> = {
      updatedAt: Date.now(),
    };

    if (status !== undefined) {
      updates.status = status;
    }

    if (reconciliationStatus !== undefined) {
      updates.reconciliationStatus = reconciliationStatus;
    }

    Object.assign(transaction, updates);
    return true;
  }

  /**
   * Get transaction summary statistics
   * @param request - Summary query parameters
   * @returns Summary statistics
   */
  async getTransactionSummary(request: Omit<TransactionQueryRequest, 'limit' | 'offset'>): Promise<TransactionSummary> {
    const transactions = await this.getTransactions({ ...request, limit: 10000 });

    const summary: TransactionSummary = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      averageAmount: 0,
      byStatus: {},
      byType: {},
      byAccount: {},
      dateRange: {
        start: request.startDate || Math.min(...transactions.map(t => t.transactionDate), Date.now()),
        end: request.endDate || Math.max(...transactions.map(t => t.transactionDate), Date.now()),
      },
    };

    transactions.forEach(txn => {
      summary.totalAmount += txn.amount;

      // By status
      if (!summary.byStatus[txn.status]) {
        summary.byStatus[txn.status] = { count: 0, amount: 0 };
      }
      summary.byStatus[txn.status].count++;
      summary.byStatus[txn.status].amount += txn.amount;

      // By type
      if (!summary.byType[txn.type]) {
        summary.byType[txn.type] = { count: 0, amount: 0 };
      }
      summary.byType[txn.type].count++;
      summary.byType[txn.type].amount += txn.amount;

      // By account
      if (!summary.byAccount[txn.accountId]) {
        summary.byAccount[txn.accountId] = { count: 0, amount: 0 };
      }
      summary.byAccount[txn.accountId].count++;
      summary.byAccount[txn.accountId].amount += txn.amount;
    });

    summary.averageAmount = summary.totalTransactions > 0 ? 
      summary.totalAmount / summary.totalTransactions : 0;

    return summary;
  }

  /**
   * Bulk reconcile transactions
   * @param organizationId - Organization ID
   * @param transactionIds - Transaction IDs to reconcile
   * @param reconciliationStatus - New reconciliation status
   * @returns Number of transactions updated
   */
  async bulkReconcileTransactions(
    organizationId: string,
    transactionIds: string[],
    reconciliationStatus: Transaction['reconciliationStatus']
  ): Promise<number> {
    let updatedCount = 0;

    for (const transactionId of transactionIds) {
      const transaction = this.transactions.get(transactionId);
      if (transaction && transaction.organizationId === organizationId) {
        transaction.reconciliationStatus = reconciliationStatus;
        transaction.updatedAt = Date.now();
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Get unreconciled transactions
   * @param organizationId - Organization ID
   * @param accountId - Optional account filter
   * @param olderThanDays - Only transactions older than specified days
   * @param limit - Maximum results
   * @returns Unreconciled transactions
   */
  async getUnreconciledTransactions(
    organizationId: string,
    accountId?: string,
    olderThanDays?: number,
    limit?: number
  ): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values()).filter(
      txn => txn.organizationId === organizationId && txn.reconciliationStatus === 'unreconciled'
    );

    if (accountId) {
      transactions = transactions.filter(txn => txn.accountId === accountId);
    }

    if (olderThanDays) {
      const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      transactions = transactions.filter(txn => txn.transactionDate <= cutoffDate);
    }

    // Sort by transaction date (oldest first for reconciliation priority)
    transactions.sort((a, b) => a.transactionDate - b.transactionDate);

    if (limit) {
      transactions = transactions.slice(0, limit);
    }

    return transactions;
  }

  private validateTransactionRequest(request: CreateTransactionRequest): void {
    if (!request.organizationId) {
      throw new ValidationError('Organization ID is required', 'organizationId');
    }

    if (!request.erpConnectionId) {
      throw new ValidationError('ERP Connection ID is required', 'erpConnectionId');
    }

    if (!request.accountId) {
      throw new ValidationError('Account ID is required', 'accountId');
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new ValidationError('Transaction description is required', 'description');
    }

    if (request.amount === 0) {
      throw new ValidationError('Transaction amount cannot be zero', 'amount');
    }

    if (!request.transactionDate) {
      throw new ValidationError('Transaction date is required', 'transactionDate');
    }

    // Validate transaction date is not in the future
    if (request.transactionDate > Date.now() + (24 * 60 * 60 * 1000)) {
      throw new ValidationError('Transaction date cannot be more than 1 day in the future', 'transactionDate');
    }

    // Validate currency format
    if (request.currency && !/^[A-Z]{3}$/.test(request.currency)) {
      throw new ValidationError('Currency must be a 3-letter ISO code', 'currency');
    }

    // Validate exchange rate
    if (request.exchangeRate && request.exchangeRate <= 0) {
      throw new ValidationError('Exchange rate must be positive', 'exchangeRate');
    }

    // Validate reference number format (if provided)
    if (request.referenceNumber && request.referenceNumber.length > 50) {
      throw new ValidationError('Reference number cannot exceed 50 characters', 'referenceNumber');
    }
  }
}

describe('Transaction Processing Service', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    transactionService = new TransactionService();
    errorLogger.clearLogs();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createTransaction', () => {
    const baseTransactionRequest: CreateTransactionRequest = {
      organizationId: 'org-123',
      erpConnectionId: 'erp-conn-1',
      type: 'journal_entry',
      accountId: 'acc-1001',
      description: 'Test transaction',
      amount: 100.00,
      transactionDate: Date.now(),
    };

    test('should create transaction with valid data', async () => {
      const transactionId = await transactionService.createTransaction(baseTransactionRequest);

      expect(transactionId).toBeTruthy();
      expect(transactionId).toMatch(/^txn-\d+$/);

      // Verify transaction was created
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0]._id).toBe(transactionId);
      expect(transactions[0].amount).toBe(100.00);
      expect(transactions[0].currency).toBe('USD'); // Default
      expect(transactions[0].status).toBe('posted'); // Default
    });

    test('should generate external ID if not provided', async () => {
      const transactionId = await transactionService.createTransaction(baseTransactionRequest);

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const transaction = transactions.find(t => t._id === transactionId);
      expect(transaction?.externalId).toMatch(/^TXN-\d+-[a-z0-9]{9}$/);
    });

    test('should use provided external ID', async () => {
      const customExternalId = 'CUSTOM-TXN-001';
      const transactionId = await transactionService.createTransaction({
        ...baseTransactionRequest,
        externalId: customExternalId,
      });

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const transaction = transactions.find(t => t._id === transactionId);
      expect(transaction?.externalId).toBe(customExternalId);
    });

    test('should reject transaction with invalid account', async () => {
      const invalidRequest = {
        ...baseTransactionRequest,
        accountId: 'nonexistent-account',
      };

      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow('Account not found');
    });

    test('should reject transaction with account from different organization', async () => {
      const invalidRequest = {
        ...baseTransactionRequest,
        organizationId: 'different-org',
      };

      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow('Account does not belong');
    });

    test('should reject duplicate external ID', async () => {
      const externalId = 'DUPLICATE-TXN';
      
      await transactionService.createTransaction({
        ...baseTransactionRequest,
        externalId,
      });

      await expect(transactionService.createTransaction({
        ...baseTransactionRequest,
        externalId,
      })).rejects.toThrow(ConvexError);
      await expect(transactionService.createTransaction({
        ...baseTransactionRequest,
        externalId,
      })).rejects.toThrow('already exists');
    });

    test('should validate required fields', async () => {
      const requiredFields = ['organizationId', 'erpConnectionId', 'accountId', 'description'];

      for (const field of requiredFields) {
        const invalidRequest = { ...baseTransactionRequest };
        delete invalidRequest[field as keyof CreateTransactionRequest];

        await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow(ValidationError);
      }
    });

    test('should reject zero amount', async () => {
      const invalidRequest = {
        ...baseTransactionRequest,
        amount: 0,
      };

      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow('amount cannot be zero');
    });

    test('should validate currency format', async () => {
      const invalidRequest = {
        ...baseTransactionRequest,
        currency: 'US', // Should be 3 letters
      };

      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow('3-letter ISO code');
    });

    test('should validate future date restrictions', async () => {
      const invalidRequest = {
        ...baseTransactionRequest,
        transactionDate: Date.now() + (2 * 24 * 60 * 60 * 1000), // 2 days in future
      };

      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(transactionService.createTransaction(invalidRequest)).rejects.toThrow('cannot be more than 1 day in the future');
    });
  });

  describe('getTransactions', () => {
    beforeEach(async () => {
      // Create test transactions
      const transactions = [
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'invoice' as const,
          accountId: 'acc-4001',
          description: 'Sales invoice',
          amount: 500,
          transactionDate: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
          status: 'posted' as const,
        },
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'payment' as const,
          accountId: 'acc-1001',
          description: 'Cash payment',
          amount: 250,
          transactionDate: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
          status: 'reconciled' as const,
        },
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'bill' as const,
          accountId: 'acc-5001',
          description: 'Office supplies',
          amount: 150,
          transactionDate: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
          status: 'pending' as const,
        },
      ];

      for (const txn of transactions) {
        await transactionService.createTransaction(txn);
      }
    });

    test('should retrieve all transactions for organization', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      expect(transactions).toHaveLength(3);
      expect(transactions[0].transactionDate).toBeGreaterThan(transactions[1].transactionDate); // Sorted newest first
    });

    test('should filter by account ID', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        accountId: 'acc-4001',
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].accountId).toBe('acc-4001');
      expect(transactions[0].type).toBe('invoice');
    });

    test('should filter by account code', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        accountCode: '1001',
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].accountId).toBe('acc-1001');
      expect(transactions[0].type).toBe('payment');
    });

    test('should filter by transaction type', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        type: 'bill',
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('bill');
      expect(transactions[0].amount).toBe(150);
    });

    test('should filter by status', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        status: 'reconciled',
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe('reconciled');
    });

    test('should filter by date range', async () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      const oneDayAgo = Date.now() - (1 * 24 * 60 * 60 * 1000);

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        startDate: twoDaysAgo,
        endDate: oneDayAgo,
      });

      expect(transactions).toHaveLength(2); // Should include transactions from 2 days ago and 1 day ago
    });

    test('should filter by amount range', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        minAmount: 200,
        maxAmount: 600,
      });

      expect(transactions).toHaveLength(2); // 500 and 250
      expect(transactions.every(t => t.amount >= 200 && t.amount <= 600)).toBe(true);
    });

    test('should apply pagination', async () => {
      const page1 = await transactionService.getTransactions({
        organizationId: 'org-123',
        limit: 2,
        offset: 0,
      });

      const page2 = await transactionService.getTransactions({
        organizationId: 'org-123',
        limit: 2,
        offset: 2,
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0]._id).not.toBe(page2[0]._id);
    });

    test('should handle non-existent account code', async () => {
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
        accountCode: 'NONEXISTENT',
      });

      expect(transactions).toHaveLength(0);
    });
  });

  describe('updateTransactionStatus', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await transactionService.createTransaction({
        organizationId: 'org-123',
        erpConnectionId: 'erp-conn-1',
        type: 'journal_entry',
        accountId: 'acc-1001',
        description: 'Test transaction',
        amount: 100,
        transactionDate: Date.now(),
      });
    });

    test('should update transaction status', async () => {
      const result = await transactionService.updateTransactionStatus(
        transactionId,
        'reconciled'
      );

      expect(result).toBe(true);

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const transaction = transactions.find(t => t._id === transactionId);
      expect(transaction?.status).toBe('reconciled');
    });

    test('should update reconciliation status', async () => {
      const result = await transactionService.updateTransactionStatus(
        transactionId,
        undefined,
        'reconciled'
      );

      expect(result).toBe(true);

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const transaction = transactions.find(t => t._id === transactionId);
      expect(transaction?.reconciliationStatus).toBe('reconciled');
    });

    test('should reject non-existent transaction', async () => {
      await expect(transactionService.updateTransactionStatus(
        'nonexistent-txn',
        'void'
      )).rejects.toThrow(ValidationError);
      await expect(transactionService.updateTransactionStatus(
        'nonexistent-txn',
        'void'
      )).rejects.toThrow('Transaction not found');
    });
  });

  describe('getTransactionSummary', () => {
    beforeEach(async () => {
      // Create diverse test transactions for summary testing
      const transactions = [
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'invoice' as const,
          accountId: 'acc-4001',
          description: 'Sales 1',
          amount: 1000,
          transactionDate: Date.now(),
          status: 'posted' as const,
        },
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'invoice' as const,
          accountId: 'acc-4001',
          description: 'Sales 2',
          amount: 2000,
          transactionDate: Date.now(),
          status: 'posted' as const,
        },
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'payment' as const,
          accountId: 'acc-1001',
          description: 'Cash received',
          amount: 1500,
          transactionDate: Date.now(),
          status: 'reconciled' as const,
        },
      ];

      for (const txn of transactions) {
        await transactionService.createTransaction(txn);
      }
    });

    test('should calculate summary statistics', async () => {
      const summary = await transactionService.getTransactionSummary({
        organizationId: 'org-123',
      });

      expect(summary.totalTransactions).toBe(3);
      expect(summary.totalAmount).toBe(4500);
      expect(summary.averageAmount).toBe(1500);
    });

    test('should group by status', async () => {
      const summary = await transactionService.getTransactionSummary({
        organizationId: 'org-123',
      });

      expect(summary.byStatus['posted']).toEqual({
        count: 2,
        amount: 3000,
      });

      expect(summary.byStatus['reconciled']).toEqual({
        count: 1,
        amount: 1500,
      });
    });

    test('should group by type', async () => {
      const summary = await transactionService.getTransactionSummary({
        organizationId: 'org-123',
      });

      expect(summary.byType['invoice']).toEqual({
        count: 2,
        amount: 3000,
      });

      expect(summary.byType['payment']).toEqual({
        count: 1,
        amount: 1500,
      });
    });

    test('should group by account', async () => {
      const summary = await transactionService.getTransactionSummary({
        organizationId: 'org-123',
      });

      expect(summary.byAccount['acc-4001']).toEqual({
        count: 2,
        amount: 3000,
      });

      expect(summary.byAccount['acc-1001']).toEqual({
        count: 1,
        amount: 1500,
      });
    });
  });

  describe('bulkReconcileTransactions', () => {
    let transactionIds: string[];

    beforeEach(async () => {
      transactionIds = [];
      
      for (let i = 0; i < 5; i++) {
        const txnId = await transactionService.createTransaction({
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'journal_entry',
          accountId: 'acc-1001',
          description: `Test transaction ${i + 1}`,
          amount: 100 * (i + 1),
          transactionDate: Date.now(),
        });
        transactionIds.push(txnId);
      }
    });

    test('should bulk reconcile transactions', async () => {
      const updateCount = await transactionService.bulkReconcileTransactions(
        'org-123',
        transactionIds.slice(0, 3),
        'reconciled'
      );

      expect(updateCount).toBe(3);

      // Verify reconciliation status was updated
      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const reconciledTransactions = transactions.filter(t => t.reconciliationStatus === 'reconciled');
      expect(reconciledTransactions).toHaveLength(3);
    });

    test('should handle mixed valid/invalid transaction IDs', async () => {
      const mixedIds = [...transactionIds.slice(0, 2), 'nonexistent-1', 'nonexistent-2'];
      
      const updateCount = await transactionService.bulkReconcileTransactions(
        'org-123',
        mixedIds,
        'reconciled'
      );

      expect(updateCount).toBe(2); // Only valid transactions updated
    });

    test('should respect organization boundaries', async () => {
      const updateCount = await transactionService.bulkReconcileTransactions(
        'different-org',
        transactionIds,
        'reconciled'
      );

      expect(updateCount).toBe(0); // No transactions from different org
    });
  });

  describe('getUnreconciledTransactions', () => {
    beforeEach(async () => {
      const now = Date.now();
      
      // Create transactions with different ages and reconciliation status
      const transactions = [
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'journal_entry' as const,
          accountId: 'acc-1001',
          description: 'Old unreconciled',
          amount: 100,
          transactionDate: now - (10 * 24 * 60 * 60 * 1000), // 10 days ago
        },
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'journal_entry' as const,
          accountId: 'acc-4001',
          description: 'Recent unreconciled',
          amount: 200,
          transactionDate: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'journal_entry' as const,
          accountId: 'acc-1001',
          description: 'Already reconciled',
          amount: 300,
          transactionDate: now - (5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      ];

      for (const txn of transactions) {
        await transactionService.createTransaction(txn);
      }

      // Manually reconcile one transaction
      const allTransactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });
      
      const reconciledTxn = allTransactions.find(t => t.description === 'Already reconciled');
      if (reconciledTxn) {
        await transactionService.updateTransactionStatus(
          reconciledTxn._id,
          undefined,
          'reconciled'
        );
      }
    });

    test('should get all unreconciled transactions', async () => {
      const unreconciled = await transactionService.getUnreconciledTransactions('org-123');

      expect(unreconciled).toHaveLength(2);
      expect(unreconciled.every(t => t.reconciliationStatus === 'unreconciled')).toBe(true);
      
      // Should be sorted oldest first
      expect(unreconciled[0].transactionDate).toBeLessThan(unreconciled[1].transactionDate);
    });

    test('should filter by account', async () => {
      const unreconciled = await transactionService.getUnreconciledTransactions(
        'org-123',
        'acc-1001'
      );

      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].accountId).toBe('acc-1001');
      expect(unreconciled[0].description).toBe('Old unreconciled');
    });

    test('should filter by age', async () => {
      const unreconciled = await transactionService.getUnreconciledTransactions(
        'org-123',
        undefined,
        7 // older than 7 days
      );

      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].description).toBe('Old unreconciled');
    });

    test('should apply limit', async () => {
      const unreconciled = await transactionService.getUnreconciledTransactions(
        'org-123',
        undefined,
        undefined,
        1
      );

      expect(unreconciled).toHaveLength(1);
      // Should return the oldest one first
      expect(unreconciled[0].description).toBe('Old unreconciled');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle concurrent transaction creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        transactionService.createTransaction({
          organizationId: 'org-123',
          erpConnectionId: 'erp-conn-1',
          type: 'journal_entry',
          accountId: 'acc-1001',
          description: `Concurrent transaction ${i}`,
          amount: 100,
          transactionDate: Date.now(),
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBe(10);
    });

    test('should handle large transaction amounts', async () => {
      const largeAmount = 999999999.99;
      
      const transactionId = await transactionService.createTransaction({
        organizationId: 'org-123',
        erpConnectionId: 'erp-conn-1',
        type: 'journal_entry',
        accountId: 'acc-1001',
        description: 'Large transaction',
        amount: largeAmount,
        transactionDate: Date.now(),
      });

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const transaction = transactions.find(t => t._id === transactionId);
      expect(transaction?.amount).toBe(largeAmount);
    });

    test('should handle special characters in descriptions', async () => {
      const specialDescription = 'Transaction with éspecial çharacters & symbols! @#$%^&*()';
      
      const transactionId = await transactionService.createTransaction({
        organizationId: 'org-123',
        erpConnectionId: 'erp-conn-1',
        type: 'journal_entry',
        accountId: 'acc-1001',
        description: specialDescription,
        amount: 100,
        transactionDate: Date.now(),
      });

      const transactions = await transactionService.getTransactions({
        organizationId: 'org-123',
      });

      const transaction = transactions.find(t => t._id === transactionId);
      expect(transaction?.description).toBe(specialDescription);
    });
  });
});