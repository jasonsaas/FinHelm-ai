# FinHelm.ai API Documentation

This document provides comprehensive API documentation for the FinHelm.ai backend foundation, including Convex functions, data schemas, and integration examples.

## Table of Contents

- [Authentication](#authentication)
- [Core Functions](#core-functions)
- [User Management](#user-management)
- [Account Management](#account-management)
- [Transaction Processing](#transaction-processing)
- [ERP Data Synchronization](#erp-data-synchronization)
- [AI Agent Insights](#ai-agent-insights)
- [Testing Functions](#testing-functions)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

FinHelm.ai uses Convex's built-in authentication system. All API calls require proper authentication tokens.

### Setup
```typescript
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.REACT_APP_CONVEX_URL);
```

## Core Functions

### Data Types

#### Common Types
```typescript
// User ID reference
type UserId = Id<"users">;

// Organization ID reference
type OrganizationId = Id<"organizations">;

// Account ID reference
type AccountId = Id<"accounts">;

// Agent execution status
type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

// Account types
type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense" | 
                   "other_current_asset" | "other_current_liability" | 
                   "accounts_payable" | "accounts_receivable" | "bank" | 
                   "cost_of_goods_sold" | "fixed_asset" | "income" | "long_term_liability";

// Transaction types
type TransactionType = "journal_entry" | "invoice" | "bill" | "payment" | 
                       "deposit" | "transfer" | "adjustment";
```

## User Management

### Create User
Creates a new user with organization association.

```typescript
const userId = await convex.mutation(api.userActions.createUser, {
  email: string;
  name: string;
  role?: "admin" | "user" | "viewer"; // defaults to "user"
  profileImage?: string;
  organizationId?: OrganizationId;
  organizationRole?: "owner" | "admin" | "member" | "viewer";
});
```

**Example:**
```typescript
const userId = await convex.mutation(api.userActions.createUser, {
  email: "john.doe@company.com",
  name: "John Doe",
  role: "user",
  organizationId: "org_12345",
  organizationRole: "member"
});
```

**Response:**
```typescript
// Returns the new user ID
type Response = Id<"users">;
```

### Get User Profile
Retrieves user information including organization memberships.

```typescript
const userProfile = await convex.query(api.userActions.getUserProfile, {
  userId?: UserId;
  email?: string; // Either userId or email required
});
```

**Example:**
```typescript
const profile = await convex.query(api.userActions.getUserProfile, {
  email: "john.doe@company.com"
});
```

**Response:**
```typescript
type UserProfile = {
  _id: Id<"users">;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  preferences?: {
    timezone: string;
    language: string;
    notifications: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
    };
  };
  organizations: Array<{
    _id: Id<"organizations">;
    name: string;
    userRole: "owner" | "admin" | "member" | "viewer";
    permissions: string[];
    joinedAt: number;
  }>;
};
```

### Update User Profile
Updates user profile information.

```typescript
const success = await convex.mutation(api.userActions.updateUserProfile, {
  userId: UserId;
  name?: string;
  profileImage?: string;
  preferences?: {
    timezone: string;
    language: string;
    notifications: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
    };
  };
});
```

## Account Management

### Get Account Hierarchy
Retrieves the complete chart of accounts with hierarchical structure.

```typescript
const accounts = await convex.query(api.accountActions.getAccountHierarchy, {
  organizationId: OrganizationId;
  includeInactive?: boolean; // defaults to false
});
```

**Example:**
```typescript
const hierarchy = await convex.query(api.accountActions.getAccountHierarchy, {
  organizationId: "org_12345",
  includeInactive: false
});
```

**Response:**
```typescript
type AccountHierarchy = Array<{
  id: Id<"accounts">;
  code: string;
  name: string;
  fullName: string;
  type: AccountType;
  level: number;
  balance: number;
  totalBalance: number; // includes children
  children: AccountHierarchy[];
  parent?: AccountHierarchy;
}>;
```

### Get Account by Code or ID
Retrieves a specific account.

```typescript
const account = await convex.query(api.accountActions.getAccount, {
  organizationId: OrganizationId;
  accountId?: AccountId;
  accountCode?: string; // Either accountId or accountCode required
});
```

**Example:**
```typescript
const account = await convex.query(api.accountActions.getAccount, {
  organizationId: "org_12345",
  accountCode: "1110"
});
```

### Create or Update Account
Creates a new account or updates existing one with hierarchy validation.

```typescript
const accountId = await convex.mutation(api.accountActions.upsertAccount, {
  organizationId: OrganizationId;
  erpConnectionId: Id<"erpConnections">;
  externalId: string;
  code: string;
  name: string;
  type: AccountType;
  category?: string;
  subType?: string;
  parentCode?: string; // For hierarchical structure
  description?: string;
  balance?: number;
  currency: string;
  taxCode?: string;
  isActive?: boolean; // defaults to true
});
```

### Search Accounts
Search accounts by name or code.

```typescript
const results = await convex.query(api.accountActions.searchAccounts, {
  organizationId: OrganizationId;
  searchTerm: string;
  limit?: number; // defaults to 50
});
```

**Example:**
```typescript
const accounts = await convex.query(api.accountActions.searchAccounts, {
  organizationId: "org_12345",
  searchTerm: "checking",
  limit: 10
});
```

## Transaction Processing

### Record Transaction
Creates a new financial transaction with validation.

```typescript
const transactionId = await convex.mutation(api.transactionActions.recordTransaction, {
  organizationId: OrganizationId;
  erpConnectionId: Id<"erpConnections">;
  externalId?: string; // Auto-generated if not provided
  type: TransactionType;
  accountId: AccountId;
  referenceNumber?: string;
  description: string;
  amount: number;
  debitAmount?: number;
  creditAmount?: number;
  currency?: string; // defaults to "USD"
  exchangeRate?: number;
  transactionDate: number; // Unix timestamp
  postingDate?: number;
  dueDate?: number;
  customerId?: string;
  vendorId?: string;
  projectId?: string;
  departmentId?: string;
  locationId?: string;
  tags?: string[];
  status?: "draft" | "pending" | "posted" | "void" | "reconciled"; // defaults to "posted"
});
```

**Example:**
```typescript
const txnId = await convex.mutation(api.transactionActions.recordTransaction, {
  organizationId: "org_12345",
  erpConnectionId: "conn_67890",
  type: "invoice",
  accountId: "acc_revenue_001",
  description: "Landscaping services - Johnson Residence",
  amount: 2500.00,
  transactionDate: Date.now(),
  customerId: "CUST-001",
  projectId: "PROJ-JR-001",
  status: "posted"
});
```

### Get Transactions
Retrieves transactions with filtering options.

```typescript
const transactions = await convex.query(api.transactionActions.getTransactions, {
  organizationId: OrganizationId;
  accountId?: AccountId;
  accountCode?: string;
  startDate?: number;
  endDate?: number;
  type?: TransactionType;
  status?: "draft" | "pending" | "posted" | "void" | "reconciled";
  minAmount?: number;
  maxAmount?: number;
  limit?: number; // defaults to 100
  offset?: number; // defaults to 0
});
```

**Example:**
```typescript
const transactions = await convex.query(api.transactionActions.getTransactions, {
  organizationId: "org_12345",
  startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
  endDate: Date.now(),
  type: "invoice",
  limit: 50
});
```

### Get Transaction Summary
Retrieves aggregated transaction statistics.

```typescript
const summary = await convex.query(api.transactionActions.getTransactionSummary, {
  organizationId: OrganizationId;
  accountId?: AccountId;
  startDate?: number;
  endDate?: number;
  groupBy?: "account" | "type" | "status" | "month" | "day";
});
```

**Response:**
```typescript
type TransactionSummary = {
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
};
```

## ERP Data Synchronization

### Sync ERP Data
Synchronizes data from ERP systems with intelligent reconciliation.

```typescript
const syncResult = await convex.action(api.syncActions.syncERPData, {
  organizationId: OrganizationId;
  erpConnectionId: Id<"erpConnections">;
  dataType: "accounts" | "transactions" | "full";
  sourceData: any[]; // ERP data to synchronize
  reconciliationOptions?: {
    fuzzyMatchThreshold?: number; // 0-1, defaults to 0.7
    autoApplyHighConfidenceMatches?: boolean; // defaults to false
    skipDuplicates?: boolean; // defaults to true
  };
});
```

**Example:**
```typescript
const result = await convex.action(api.syncActions.syncERPData, {
  organizationId: "org_12345",
  erpConnectionId: "conn_qb_001",
  dataType: "accounts",
  sourceData: quickBooksAccounts,
  reconciliationOptions: {
    fuzzyMatchThreshold: 0.8,
    autoApplyHighConfidenceMatches: true,
    skipDuplicates: true
  }
});
```

**Response:**
```typescript
type SyncResult = {
  syncJobId: Id<"syncJobs">;
  results: {
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
};
```

### Test Data Reconciliation
Test fuzzy matching capabilities with sample data.

```typescript
const reconciliationResults = await convex.action(api.syncActions.testDataReconciliation, {
  sourceData: Array<{
    code: string;
    name: string;
    type?: string;
  }>;
  targetData: Array<{
    code: string;
    name: string;
    type?: string;
  }>;
  matchThreshold?: number; // defaults to 0.7
});
```

**Response:**
```typescript
type ReconciliationResults = {
  totalSource: number;
  totalTarget: number;
  matchesFound: number;
  matchThreshold: number;
  highConfidenceMatches: number;
  mediumConfidenceMatches: number;
  unmatchedSource: number;
  matches: Array<{
    sourceAccount: { code: string; name: string };
    targetAccount: { code: string; name: string };
    confidenceScore: number;
    recommendedAction: "auto_merge" | "manual_review" | "create_new";
  }>;
};
```

## AI Agent Insights

### Get Agent Insights
Executes an AI agent to generate financial insights.

```typescript
const insights = await convex.action(api.agentActions.getAgentInsights, {
  organizationId: OrganizationId;
  agentId: Id<"agents">;
  query?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  parameters?: Record<string, any>;
});
```

**Example:**
```typescript
const insights = await convex.action(api.agentActions.getAgentInsights, {
  organizationId: "org_12345",
  agentId: "agent_variance_001",
  query: "Analyze Q3 revenue variance",
  dateRange: {
    start: new Date('2024-07-01').getTime(),
    end: new Date('2024-09-30').getTime()
  }
});
```

**Response:**
```typescript
type AgentInsights = {
  executionId: Id<"agentExecutions">;
  insights: {
    summary: string;
    dataOverview: {
      totalRecords: number;
      dateRange: { start: number; end: number };
      keyMetrics: Array<{
        name: string;
        value: any;
        change?: number;
        trend?: "up" | "down" | "flat";
      }>;
    };
    patterns: Array<{
      type: string;
      description: string;
      confidence: number;
      impact: "high" | "medium" | "low";
      data?: any[];
    }>;
    actions: Array<{
      type: string;
      description: string;
      priority: "high" | "medium" | "low";
      automated: boolean;
      dueDate?: number;
      assignee?: Id<"users">;
    }>;
  };
};
```

### Get Agent Execution History
Retrieves execution history for AI agents.

```typescript
const executions = await convex.query(api.agentActions.getAgentExecutions, {
  organizationId: OrganizationId;
  agentId?: Id<"agents">;
  limit?: number; // defaults to all
});
```

## Testing Functions

### FinHelm Test Function
Comprehensive test function for deployment validation.

```typescript
const testResult = await convex.action(api.finHelmTest.finHelmTest, {
  query?: string; // defaults to "FinHelm.ai test"
  testScenario?: "variance_analysis" | "account_hierarchy" | "data_reconciliation" | 
                 "anomaly_detection" | "cash_flow_analysis" | "full_demo"; // defaults to "full_demo"
  includeRawData?: boolean; // defaults to false
});
```

**Example:**
```typescript
const result = await convex.action(api.finHelmTest.finHelmTest, {
  query: "Test comprehensive functionality",
  testScenario: "full_demo",
  includeRawData: true
});
```

**Response:**
```typescript
type TestResult = {
  status: "success" | "error";
  query: string;
  scenario: string;
  executionTime: number;
  timestamp: number;
  summary: string;
  dataOverview: {
    totalRecords: number;
    dateRange: { start: number; end: number };
    keyMetrics: Array<{
      name: string;
      value: any;
      change?: number;
      trend?: "up" | "down" | "flat";
    }>;
  };
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    impact: "high" | "medium" | "low";
    data?: any[];
  }>;
  actions: Array<{
    type: string;
    description: string;
    priority: "high" | "medium" | "low";
    automated: boolean;
    dueDate?: number;
  }>;
  metadata: {
    finHelmVersion: string;
    testEnvironment: boolean;
    dataSource: string;
    processingTime: number;
    recordsProcessed: number;
    confidenceScore: number;
  };
  rawData?: any; // Only if includeRawData is true
};
```

### Get Sample Data
Retrieves mock data for testing purposes.

```typescript
const sampleData = await convex.query(api.finHelmTest.getSampleData, {
  dataType?: "accounts" | "transactions" | "variance" | "agent_configs";
});
```

## Error Handling

All API functions use consistent error handling patterns:

### Common Error Types
```typescript
type APIError = {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
};

// Common error codes:
// - "VALIDATION_ERROR": Invalid input parameters
// - "NOT_FOUND": Resource not found
// - "UNAUTHORIZED": Authentication required
// - "FORBIDDEN": Insufficient permissions
// - "RATE_LIMITED": Too many requests
// - "INTERNAL_ERROR": Server error
```

### Error Response Format
```typescript
// Errors are thrown as ConvexError objects
try {
  const result = await convex.mutation(api.userActions.createUser, {
    email: "invalid-email"
  });
} catch (error) {
  // Error format:
  {
    message: "Invalid email format",
    code: "VALIDATION_ERROR",
    timestamp: 1634567890123
  }
}
```

## Rate Limiting

API calls are subject to rate limiting:

- **Query Functions**: 1000 requests per minute per user
- **Mutation Functions**: 500 requests per minute per user  
- **Action Functions**: 100 requests per minute per user
- **Bulk Operations**: 50 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1634567890
```

## Best Practices

### Performance Optimization
1. **Use appropriate indexes**: Filter by indexed fields when possible
2. **Batch operations**: Combine multiple mutations when possible
3. **Pagination**: Use limit and offset for large result sets
4. **Caching**: Cache frequently accessed data on client side

### Security
1. **Validate inputs**: Always validate data before sending to API
2. **Use HTTPS**: All API calls should use encrypted connections
3. **Handle secrets**: Never expose API keys or sensitive data
4. **Rate limiting**: Implement client-side rate limiting

### Error Handling
1. **Retry logic**: Implement exponential backoff for transient errors
2. **User feedback**: Provide meaningful error messages to users
3. **Logging**: Log errors for debugging and monitoring
4. **Graceful degradation**: Handle API failures gracefully

### Data Consistency
1. **Transactions**: Use database transactions for related operations
2. **Validation**: Validate data integrity before mutations
3. **Reconciliation**: Regularly reconcile data between systems
4. **Audit trails**: Maintain audit logs for critical operations

## Examples

### Complete User Workflow
```typescript
// 1. Create user
const userId = await convex.mutation(api.userActions.createUser, {
  email: "john@landscaping.com",
  name: "John Smith",
  organizationId: "org_landscaping_123"
});

// 2. Get user profile
const profile = await convex.query(api.userActions.getUserProfile, {
  userId: userId
});

// 3. Get account hierarchy
const accounts = await convex.query(api.accountActions.getAccountHierarchy, {
  organizationId: profile.organizations[0]._id
});

// 4. Record a transaction
const transactionId = await convex.mutation(api.transactionActions.recordTransaction, {
  organizationId: profile.organizations[0]._id,
  erpConnectionId: "conn_qb_001",
  type: "invoice",
  accountId: accounts.find(a => a.code === "4100")?._id,
  description: "Landscaping services",
  amount: 2500.00,
  transactionDate: Date.now()
});

// 5. Get AI insights
const insights = await convex.action(api.agentActions.getAgentInsights, {
  organizationId: profile.organizations[0]._id,
  agentId: "agent_variance_001",
  query: "Analyze this month's performance"
});
```

### Data Synchronization Workflow
```typescript
// 1. Sync accounts from QuickBooks
const accountSync = await convex.action(api.syncActions.syncERPData, {
  organizationId: "org_123",
  erpConnectionId: "conn_qb_001",
  dataType: "accounts",
  sourceData: quickbooksAccounts,
  reconciliationOptions: {
    fuzzyMatchThreshold: 0.8,
    autoApplyHighConfidenceMatches: true
  }
});

// 2. Sync transactions
const transactionSync = await convex.action(api.syncActions.syncERPData, {
  organizationId: "org_123",
  erpConnectionId: "conn_qb_001", 
  dataType: "transactions",
  sourceData: quickbooksTransactions
});

// 3. Generate insights on synced data
const insights = await convex.action(api.agentActions.getAgentInsights, {
  organizationId: "org_123",
  agentId: "agent_anomaly_001",
  query: "Check for anomalies in synced data"
});
```

---

This API documentation covers the complete FinHelm.ai backend foundation. For additional support or questions, please refer to the main README.md or create an issue in the repository.