# Convex Queries and Mutations API Documentation

## Overview

This document provides comprehensive documentation for all available Convex queries, mutations, and actions in the FinHelm AI platform. All operations support real-time subscriptions and optimistic updates for enhanced user experience.

## Table of Contents

1. [Authentication and Organization Management](#authentication-and-organization-management)
2. [Account Management](#account-management)
3. [Transaction Operations](#transaction-operations)
4. [AI Agent System](#ai-agent-system)
5. [Data Synchronization](#data-synchronization)
6. [Real-time Subscriptions](#real-time-subscriptions)
7. [Cache Management](#cache-management)
8. [Error Handling](#error-handling)

## Authentication and Organization Management

### User Management

#### Get User Profile
```typescript
// Query: Get current user profile
const user = await convex.query(api.userActions.getCurrentUser);

// TypeScript Interface
interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  profileImage?: string;
  role: "admin" | "user" | "viewer";
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  preferences?: UserPreferences;
}

interface UserPreferences {
  timezone: string;
  language: string;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}
```

#### Update User Profile
```typescript
// Mutation: Update user profile
const result = await convex.mutation(api.userActions.updateUserProfile, {
  name: "John Smith",
  preferences: {
    timezone: "America/New_York",
    language: "en",
    notifications: {
      email: true,
      sms: false,
      inApp: true,
    },
  },
});
```

### Organization Management

#### Get User Organizations
```typescript
// Query: Get all organizations for current user
const organizations = await convex.query(api.userActions.getUserOrganizations);

// TypeScript Interface
interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  erpType: "quickbooks" | "sage_intacct" | "netsuite" | "xero";
  vertical?: "franchise" | "retail" | "family_office" | "healthcare" | "manufacturing" | "professional_services" | "non_profit" | "construction" | "hospitality" | "general";
  erpSettings: {
    companyId?: string;
    baseUrl?: string;
    apiVersion?: string;
    features: string[];
    multiLocationEnabled?: boolean;
    consolidationLevel?: "entity" | "location" | "department";
  };
  isActive: boolean;
  subscriptionTier: "free" | "basic" | "premium" | "enterprise";
  userRole: "owner" | "admin" | "member" | "viewer";
  permissions: string[];
}
```

#### Create Organization
```typescript
// Mutation: Create new organization
const organizationId = await convex.mutation(api.userActions.createOrganization, {
  name: "Acme Corporation",
  slug: "acme-corp",
  erpType: "quickbooks",
  vertical: "manufacturing",
  subscriptionTier: "premium",
});
```

## Account Management

### Chart of Accounts Queries

#### Get Account Hierarchy
```typescript
// Query: Get hierarchical chart of accounts
const accountHierarchy = await convex.query(api.accountActions.getAccountHierarchy, {
  organizationId: "org_123",
  includeInactive: false,
  maxDepth: 5,
});

// TypeScript Interface
interface AccountHierarchy {
  _id: Id<"accounts">;
  code: string;
  name: string;
  fullName: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense" | "other_current_asset" | "other_current_liability" | "accounts_payable" | "accounts_receivable" | "bank" | "cost_of_goods_sold" | "fixed_asset" | "income" | "long_term_liability";
  category?: string;
  subType?: string;
  level: number;
  path: string[];
  isActive: boolean;
  balance?: number;
  currency: string;
  children: AccountHierarchy[];
  lastSyncAt: number;
}
```

#### Get Account Details
```typescript
// Query: Get specific account details
const account = await convex.query(api.accountActions.getAccount, {
  organizationId: "org_123",
  accountCode: "1000",
});

// With real-time subscription
const account = useQuery(api.accountActions.getAccount, {
  organizationId: "org_123",
  accountCode: "1000",
});
```

#### Search Accounts
```typescript
// Query: Search accounts by name or code
const searchResults = await convex.query(api.accountActions.searchAccounts, {
  organizationId: "org_123",
  query: "cash",
  accountTypes: ["bank", "asset"],
  limit: 20,
});
```

### Account Mutations

#### Create/Update Account
```typescript
// Mutation: Upsert account with optimistic update
const accountId = await convex.mutation(api.accountActions.upsertAccount, {
  organizationId: "org_123",
  erpConnectionId: "conn_456",
  externalId: "QB_1000",
  code: "1000",
  name: "Cash - Operating",
  type: "bank",
  category: "Current Asset",
  parentCode: "1000",
  description: "Primary operating cash account",
  balance: 25000.00,
  currency: "USD",
  isActive: true,
});

// Optimistic update pattern (React)
const optimisticUpdate = useMutation(api.accountActions.upsertAccount);

const handleUpdateAccount = async (accountData: AccountUpdate) => {
  // Optimistic UI update
  setLocalAccount(prevAccount => ({ ...prevAccount, ...accountData }));
  
  try {
    await optimisticUpdate(accountData);
  } catch (error) {
    // Revert optimistic update on error
    setLocalAccount(originalAccount);
    throw error;
  }
};
```

## Transaction Operations

### Transaction Queries

#### Get Transactions
```typescript
// Query: Get transactions with filtering
const transactions = await convex.query(api.transactionActions.getTransactions, {
  organizationId: "org_123",
  accountId: "acc_789",
  dateRange: {
    start: 1704067200000, // 2024-01-01
    end: 1706745599000,   // 2024-01-31
  },
  transactionTypes: ["invoice", "bill", "payment"],
  status: ["posted", "reconciled"],
  limit: 100,
  offset: 0,
});

// TypeScript Interface
interface Transaction {
  _id: Id<"transactions">;
  organizationId: Id<"organizations">;
  erpConnectionId: Id<"erpConnections">;
  externalId: string;
  type: "journal_entry" | "invoice" | "bill" | "payment" | "deposit" | "transfer" | "adjustment";
  accountId: Id<"accounts">;
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
  status: "draft" | "pending" | "posted" | "void" | "reconciled";
  reconciliationStatus?: "unreconciled" | "reconciled" | "pending";
  lastSyncAt: number;
}
```

#### Get Cash Flow Data
```typescript
// Query: Get cash flow analysis
const cashFlow = await convex.query(api.transactionActions.getCashFlow, {
  organizationId: "org_123",
  dateRange: {
    start: 1704067200000,
    end: 1706745599000,
  },
  granularity: "weekly", // "daily" | "weekly" | "monthly"
  includeForecasting: true,
});

// TypeScript Interface
interface CashFlowData {
  period: {
    start: number;
    end: number;
    label: string;
  };
  inflows: {
    amount: number;
    transactions: number;
    sources: {
      accountType: string;
      amount: number;
      percentage: number;
    }[];
  };
  outflows: {
    amount: number;
    transactions: number;
    categories: {
      accountType: string;
      amount: number;
      percentage: number;
    }[];
  };
  netCashFlow: number;
  runningBalance: number;
  forecast?: {
    projectedInflows: number;
    projectedOutflows: number;
    confidence: number;
  };
}
```

#### Get 13-Week Cash Flow Forecast
```typescript
// Query: Get 13-week cash flow forecast with AI predictions
const forecast = await convex.query(api.transactionActions.getThirteenWeekForecast, {
  organizationId: "org_123",
  includeScenarios: true,
  confidenceLevel: 0.8,
});

// TypeScript Interface
interface WeeklyForecast {
  week: number;
  startDate: number;
  endDate: number;
  projectedInflows: number;
  projectedOutflows: number;
  netCashFlow: number;
  runningBalance: number;
  confidence: number;
  scenarios: {
    optimistic: number;
    pessimistic: number;
    mostLikely: number;
  };
  factors: {
    seasonal: number;
    trend: number;
    external: number;
  };
}
```

### DSO/DPO Metrics

#### Get DSO Metrics
```typescript
// Query: Days Sales Outstanding analysis
const dsoMetrics = await convex.query(api.transactionActions.getDSOMetrics, {
  organizationId: "org_123",
  period: "current_month",
  includeHistorical: true,
});

// TypeScript Interface
interface DSOMetrics {
  current: {
    dso: number;
    target: number;
    variance: number;
    trend: "improving" | "worsening" | "stable";
  };
  historical: {
    period: string;
    dso: number;
    salesVolume: number;
  }[];
  breakdown: {
    bucket: string; // "0-30", "31-60", "61-90", "90+"
    amount: number;
    percentage: number;
    customerCount: number;
  }[];
  topDelinquents: {
    customerId: string;
    customerName: string;
    amount: number;
    daysOverdue: number;
  }[];
}
```

#### Get DPO Metrics
```typescript
// Query: Days Payable Outstanding analysis
const dpoMetrics = await convex.query(api.transactionActions.getDPOMetrics, {
  organizationId: "org_123",
  period: "current_month",
});

// TypeScript Interface
interface DPOMetrics {
  current: {
    dpo: number;
    target: number;
    variance: number;
    trend: "improving" | "worsening" | "stable";
  };
  payablesAging: {
    bucket: string;
    amount: number;
    percentage: number;
    vendorCount: number;
  }[];
  cashFlowImpact: {
    earlyPaymentDiscount: number;
    lateFees: number;
    optimizedCashFlow: number;
  };
}
```

## AI Agent System

### Agent Management

#### Get Available Agents
```typescript
// Query: Get all available AI agents
const agents = await convex.query(api.agentActions.getAvailableAgents, {
  organizationId: "org_123",
  category: "financial_intelligence",
  includeCustom: true,
});

// TypeScript Interface
interface Agent {
  _id: Id<"agents">;
  name: string;
  description: string;
  category: "financial_intelligence" | "supply_chain" | "revenue_customer" | "it_operations" | "custom";
  type: "variance_explanation" | "cash_flow_intelligence" | "anomaly_monitoring" | "close_acceleration" | "forecasting" | "multivariate_prediction" | "working_capital_optimization" | "budget_variance_tracker" | "expense_categorization" | "revenue_recognition_assistant" | "custom";
  isActive: boolean;
  isPremium: boolean;
  config: AgentConfig;
  averageExecutionTime?: number;
  runCount: number;
  lastRunAt?: number;
}

interface AgentConfig {
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  dataSource: string[];
  filters?: {
    accounts?: Id<"accounts">[];
    dateRange?: {
      start: number;
      end: number;
    };
    minAmount?: number;
    maxAmount?: number;
  };
  schedule?: {
    frequency: "manual" | "daily" | "weekly" | "monthly";
    time?: string;
    timezone?: string;
  };
}
```

#### Execute Agent
```typescript
// Action: Execute AI agent
const execution = await convex.action(api.agentActions.executeAgent, {
  agentId: "agent_123",
  input: {
    query: "Analyze variance in Q4 operating expenses",
    parameters: {
      quarters: ["Q3_2023", "Q4_2023"],
      threshold: 0.15,
    },
    dateRange: {
      start: 1696118400000,
      end: 1704067199000,
    },
  },
});

// TypeScript Interface
interface AgentExecution {
  _id: Id<"agentExecutions">;
  agentId: Id<"agents">;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  input: {
    query?: string;
    parameters?: Record<string, any>;
    dataRange?: {
      start: number;
      end: number;
    };
  };
  output?: {
    summary: string;
    dataOverview: {
      totalRecords: number;
      dateRange: {
        start: number;
        end: number;
      };
      keyMetrics: {
        name: string;
        value: any;
        change?: number;
        trend?: "up" | "down" | "flat";
      }[];
    };
    patterns: {
      type: string;
      description: string;
      confidence: number;
      impact: "high" | "medium" | "low";
      data?: any[];
    }[];
    actions: {
      type: string;
      description: string;
      priority: "high" | "medium" | "low";
      automated: boolean;
      dueDate?: number;
      assignee?: Id<"users">;
    }[];
  };
  executionTime?: number;
  tokensUsed?: number;
  cost?: number;
}
```

### Agent Results

#### Get Execution Results
```typescript
// Query: Get agent execution results
const results = await convex.query(api.agentActions.getExecutionResults, {
  organizationId: "org_123",
  agentId: "agent_123",
  limit: 10,
  includeRunning: true,
});

// Subscription to real-time execution updates
const liveResults = useQuery(api.agentActions.getExecutionResults, {
  organizationId: "org_123",
  agentId: "agent_123",
  limit: 10,
});
```

## Data Synchronization

### Sync Operations

#### Sync ERP Data
```typescript
// Action: Sync data from ERP system
const syncResult = await convex.action(api.syncActions.syncERPData, {
  organizationId: "org_123",
  erpConnectionId: "conn_456",
  dataType: "full", // "accounts" | "transactions" | "full"
  dateRange: {
    start: 1704067200000,
    end: 1706745599000,
  },
  reconciliationOptions: {
    fuzzyMatchThreshold: 0.85,
    autoApplyHighConfidenceMatches: true,
    skipDuplicates: true,
  },
});

// TypeScript Interface
interface SyncResult {
  syncJobId: Id<"syncJobs">;
  results: {
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  metrics?: {
    accountsCount: number;
    transactionsCount: number;
    dataQualityScore: number;
  };
  erpType: string;
  sourceDataCounts: {
    accounts: number;
    transactions: number;
  };
}
```

#### Get Sync Status
```typescript
// Query: Get sync job status with real-time updates
const syncStatus = await convex.query(api.syncActions.getSyncJobStatus, {
  syncJobId: "sync_123",
});

// Real-time subscription for sync progress
const liveSyncStatus = useQuery(api.syncActions.getSyncJobStatus, {
  syncJobId: "sync_123",
});

// TypeScript Interface
interface SyncJob {
  _id: Id<"syncJobs">;
  organizationId: Id<"organizations">;
  erpConnectionId: Id<"erpConnections">;
  type: "full_sync" | "incremental_sync" | "accounts_sync" | "transactions_sync" | "reconciliation";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  estimatedCompletion?: number;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: {
    type: string;
    message: string;
    recordId?: string;
    timestamp: number;
  }[];
  startedAt: number;
  completedAt?: number;
}
```

## Real-time Subscriptions

### Subscription Patterns

#### Dashboard Subscriptions
```typescript
// React Hook for Dashboard Data
function useDashboardData(organizationId: string) {
  const cashPosition = useQuery(api.transactionActions.getCashPosition, {
    organizationId,
  });
  
  const forecast = useQuery(api.transactionActions.getThirteenWeekForecast, {
    organizationId,
    includeScenarios: true,
  });
  
  const dsoMetrics = useQuery(api.transactionActions.getDSOMetrics, {
    organizationId,
    period: "current_month",
  });
  
  const recentTransactions = useQuery(api.transactionActions.getRecentTransactions, {
    organizationId,
    limit: 10,
  });
  
  const aiInsights = useQuery(api.agentActions.getLatestInsights, {
    organizationId,
    limit: 5,
  });
  
  return {
    cashPosition,
    forecast,
    dsoMetrics,
    recentTransactions,
    aiInsights,
    isLoading: [cashPosition, forecast, dsoMetrics, recentTransactions, aiInsights]
      .some(query => query === undefined),
  };
}
```

#### Transaction Stream Subscription
```typescript
// Real-time transaction updates
function useTransactionStream(organizationId: string, accountId?: string) {
  const transactions = useQuery(api.transactionActions.getTransactionStream, {
    organizationId,
    accountId,
    includeRealTime: true,
  });
  
  // Handle new transactions
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const latestTransaction = transactions[0];
      // Trigger notification or update UI
      notifyNewTransaction(latestTransaction);
    }
  }, [transactions]);
  
  return transactions;
}
```

### Optimistic Updates

#### Transaction Creation with Optimistic Update
```typescript
// Optimistic transaction creation
function useCreateTransaction() {
  const createTransaction = useMutation(api.transactionActions.createTransaction);
  const [optimisticTransactions, setOptimisticTransactions] = useState<Transaction[]>([]);
  
  const createWithOptimisticUpdate = useCallback(async (transactionData: CreateTransactionInput) => {
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticTransaction: Transaction = {
      _id: optimisticId as Id<"transactions">,
      ...transactionData,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Add optimistic transaction to local state
    setOptimisticTransactions(prev => [optimisticTransaction, ...prev]);
    
    try {
      const realTransaction = await createTransaction(transactionData);
      
      // Remove optimistic transaction and rely on subscription for real data
      setOptimisticTransactions(prev => 
        prev.filter(t => t._id !== optimisticId)
      );
      
      return realTransaction;
    } catch (error) {
      // Remove failed optimistic transaction
      setOptimisticTransactions(prev => 
        prev.filter(t => t._id !== optimisticId)
      );
      
      throw error;
    }
  }, [createTransaction]);
  
  return { createWithOptimisticUpdate, optimisticTransactions };
}
```

## Cache Management

### Cache Strategies

#### Account Hierarchy Caching
```typescript
// Query with caching strategy
const getAccountHierarchyWithCache = (organizationId: string) => {
  return useQuery(
    api.accountActions.getAccountHierarchy,
    { organizationId },
    {
      // Cache for 5 minutes since account hierarchy changes infrequently
      cacheTime: 5 * 60 * 1000,
      // Keep in background for 2 minutes after component unmounts
      staleTime: 2 * 60 * 1000,
    }
  );
};
```

#### Transaction Caching with Pagination
```typescript
// Paginated query with cache management
function useTransactionPages(organizationId: string, pageSize = 50) {
  const [pages, setPages] = useState<{ [key: number]: Transaction[] }>({});
  const [currentPage, setCurrentPage] = useState(0);
  
  const currentPageData = useQuery(
    api.transactionActions.getTransactions,
    {
      organizationId,
      limit: pageSize,
      offset: currentPage * pageSize,
    }
  );
  
  useEffect(() => {
    if (currentPageData) {
      setPages(prev => ({
        ...prev,
        [currentPage]: currentPageData,
      }));
    }
  }, [currentPageData, currentPage]);
  
  const loadNextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);
  
  const loadPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);
  
  return {
    currentPageData: pages[currentPage],
    allLoadedPages: pages,
    currentPage,
    loadNextPage,
    loadPreviousPage,
    hasNextPage: currentPageData?.length === pageSize,
    hasPreviousPage: currentPage > 0,
  };
}
```

## Error Handling

### Query Error Handling

#### Robust Error Handling Pattern
```typescript
// Error boundary for Convex queries
function ConvexQueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="error-state">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{error.message}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Refresh page
          </button>
        </div>
      )}
      onError={(error) => {
        console.error('Convex query error:', error);
        // Report to error tracking service
        trackError(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Query with error handling
function useQueryWithErrorHandling<T>(
  query: any,
  args: any,
  options?: {
    onError?: (error: Error) => void;
    retry?: number;
    fallbackValue?: T;
  }
) {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const result = useQuery(query, args);
  
  useEffect(() => {
    if (result instanceof Error) {
      setError(result);
      options?.onError?.(result);
      
      // Implement retry logic
      if (options?.retry && retryCount < options.retry) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      }
    } else if (result !== undefined) {
      setError(null);
      setRetryCount(0);
    }
  }, [result, retryCount, options]);
  
  if (error && options?.fallbackValue) {
    return options.fallbackValue;
  }
  
  return result;
}
```

### Mutation Error Handling

```typescript
// Mutation with comprehensive error handling
function useMutationWithErrorHandling<Args, Return>(
  mutation: any,
  options?: {
    onSuccess?: (result: Return) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const mutate = useCallback(async (args: Args): Promise<Return> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await mutation(args);
      options?.onSuccess?.(result);
      
      if (options?.showToast) {
        toast.success('Operation completed successfully');
      }
      
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options?.onError?.(error);
      
      if (options?.showToast) {
        toast.error(`Operation failed: ${error.message}`);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mutation, options]);
  
  return {
    mutate,
    isLoading,
    error,
    reset: () => {
      setError(null);
      setIsLoading(false);
    },
  };
}
```

### TypeScript Type Safety

```typescript
// Utility types for enhanced type safety
type ConvexQuery<Args, Return> = (args: Args) => Promise<Return>;
type ConvexMutation<Args, Return> = (args: Args) => Promise<Return>;
type ConvexAction<Args, Return> = (args: Args) => Promise<Return>;

// Type-safe query hook
function useTypedQuery<Args, Return>(
  query: ConvexQuery<Args, Return>,
  args: Args
): Return | undefined {
  return useQuery(query, args);
}

// Type-safe mutation hook  
function useTypedMutation<Args, Return>(
  mutation: ConvexMutation<Args, Return>
): (args: Args) => Promise<Return> {
  return useMutation(mutation);
}

// Example usage with full type safety
const transactions = useTypedQuery(api.transactionActions.getTransactions, {
  organizationId: "org_123" as Id<"organizations">,
  limit: 50,
});

const createTransaction = useTypedMutation(api.transactionActions.createTransaction);
```

This documentation provides comprehensive coverage of the Convex API, including all available queries, mutations, real-time subscription patterns, optimistic update strategies, and robust error handling approaches for the FinHelm AI platform.