/**
 * FinHelm.ai Convex Database Schema - Refactored for PRD v2.1
 * Comprehensive ERP data structure with nested accounts, anomaly detection, and AI insights
 * Aligned with QuickBooks/Sage Intacct data models and sample CSV structures
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users - Core user management
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    isVerified: v.boolean(),
    isActive: v.boolean(),
    timezone: v.optional(v.string()),
    preferences: v.optional(v.object({
      currency: v.string(),
      dateFormat: v.string(),
      notifications: v.object({
        email: v.boolean(),
        anomalies: v.boolean(),
        reports: v.boolean(),
      }),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_active", ["isActive"])
    .index("by_verified", ["isVerified"])
    .index("by_created_at", ["createdAt"]),

  // 2. Companies/Organizations - ERP system connections
  companies: defineTable({
    userId: v.string(),
    name: v.string(),
    erpSystem: v.union(v.literal("quickbooks"), v.literal("sage_intacct"), v.literal("grok")),
    erpCompanyId: v.string(),
    erpCompanyName: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiry: v.optional(v.number()),
    realmId: v.optional(v.string()), // QuickBooks specific
    baseUrl: v.optional(v.string()), // API base URL
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    syncStatus: v.union(v.literal("connected"), v.literal("syncing"), v.literal("error"), v.literal("disconnected")),
    metadata: v.optional(v.object({
      fiscalYearStart: v.optional(v.string()),
      baseCurrency: v.optional(v.string()),
      countryCode: v.optional(v.string()),
      industry: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_erp_company_id", ["erpCompanyId"])
    .index("by_erp_system", ["erpSystem"])
    .index("by_active", ["isActive"])
    .index("by_sync_status", ["syncStatus"]),

  // 3. Chart of Accounts - Enhanced with proper nesting and hierarchy
  accounts: defineTable({
    companyId: v.id("companies"),
    erpAccountId: v.string(),
    name: v.string(),
    fullyQualifiedName: v.optional(v.string()), // Full hierarchical name
    accountType: v.string(), // Bank, Accounts Receivable, Other Current Asset, etc.
    accountSubType: v.optional(v.string()),
    classification: v.union(
      v.literal("Asset"), 
      v.literal("Liability"), 
      v.literal("Equity"), 
      v.literal("Revenue"), 
      v.literal("Expense")
    ),
    // Proper nesting structure for parent-child relationships
    parentAccountId: v.optional(v.id("accounts")), // Reference to parent account
    parentErpAccountId: v.optional(v.string()), // ERP system parent ID
    level: v.number(), // Hierarchy level (0 = root, 1 = child, etc.)
    path: v.string(), // Hierarchical path like "1000/1100/1110"
    isActive: v.boolean(),
    isSubAccount: v.boolean(),
    // Financial data
    currentBalance: v.optional(v.number()),
    currentBalanceWithSubAccounts: v.optional(v.number()),
    balanceDate: v.optional(v.number()),
    currency: v.optional(v.string()),
    // Account configuration
    taxCodeRef: v.optional(v.string()),
    description: v.optional(v.string()),
    // Metadata for enhanced functionality
    metadata: v.optional(v.object({
      bankAccountNumber: v.optional(v.string()),
      routingNumber: v.optional(v.string()),
      openingBalance: v.optional(v.number()),
      openingBalanceDate: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_erp_account_id", ["erpAccountId"])
    .index("by_classification", ["classification"])
    .index("by_account_type", ["accountType"])
    .index("by_parent", ["parentAccountId"])
    .index("by_parent_erp_id", ["parentErpAccountId"])
    .index("by_level", ["level"])
    .index("by_active", ["isActive"])
    .index("by_path", ["path"]),

  // 4. Enhanced Transactions with anomaly detection fields
  transactions: defineTable({
    companyId: v.id("companies"),
    erpTransactionId: v.string(),
    transactionType: v.string(), // Invoice, Bill, Payment, JournalEntry, etc.
    amount: v.number(),
    currency: v.string(),
    exchangeRate: v.optional(v.number()),
    date: v.number(),
    dueDate: v.optional(v.number()),
    description: v.optional(v.string()),
    memo: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    // Account relationships
    accountId: v.id("accounts"),
    accountName: v.string(), // Denormalized for performance
    // Entity relationships
    customerId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    vendorId: v.optional(v.string()),
    vendorName: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    // Transaction status and classification
    status: v.union(v.literal("pending"), v.literal("cleared"), v.literal("reconciled"), v.literal("voided")),
    isReconciled: v.boolean(),
    reconciledDate: v.optional(v.number()),
    // Anomaly detection fields
    anomalyScore: v.optional(v.number()), // 0-1 score for anomaly likelihood
    anomalyFlags: v.optional(v.array(v.string())), // ["unusual_amount", "weekend_transaction", etc.]
    isAnomaly: v.boolean(),
    anomalyReviewed: v.boolean(),
    anomalyReviewedBy: v.optional(v.string()),
    anomalyReviewedAt: v.optional(v.number()),
    // Line items for detailed transactions
    lineItems: v.optional(v.array(v.object({
      accountId: v.string(),
      accountName: v.string(),
      amount: v.number(),
      description: v.optional(v.string()),
      taxCodeRef: v.optional(v.string()),
      taxAmount: v.optional(v.number()),
    }))),
    // Metadata
    metadata: v.optional(v.object({
      source: v.optional(v.string()), // "api", "manual", "import"
      batchId: v.optional(v.string()),
      originalAmount: v.optional(v.number()),
      fees: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_account", ["accountId"])
    .index("by_date", ["date"])
    .index("by_type", ["transactionType"])
    .index("by_erp_transaction_id", ["erpTransactionId"])
    .index("by_customer", ["customerId"])
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"])
    .index("by_anomaly", ["isAnomaly"])
    .index("by_anomaly_score", ["anomalyScore"])
    .index("by_reconciled", ["isReconciled"]),

  // 5. Customers - Enhanced customer management
  customers: defineTable({
    companyId: v.id("companies"),
    erpCustomerId: v.string(),
    name: v.string(),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    balance: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    taxExempt: v.boolean(),
    // Address information
    billingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    })),
    shippingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    })),
    metadata: v.optional(v.object({
      industry: v.optional(v.string()),
      website: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_erp_customer_id", ["erpCustomerId"])
    .index("by_name", ["name"])
    .index("by_active", ["isActive"])
    .index("by_email", ["email"]),

  // 6. Vendors - Enhanced vendor management
  vendors: defineTable({
    companyId: v.id("companies"),
    erpVendorId: v.string(),
    name: v.string(),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    balance: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    taxId: v.optional(v.string()),
    is1099Vendor: v.boolean(),
    // Address information
    address: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    })),
    metadata: v.optional(v.object({
      website: v.optional(v.string()),
      notes: v.optional(v.string()),
      preferredPaymentMethod: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_erp_vendor_id", ["erpVendorId"])
    .index("by_name", ["name"])
    .index("by_active", ["isActive"])
    .index("by_email", ["email"]),

  // 7. AI Insights and Analysis - Enhanced with more detailed structure
  insights: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    type: v.union(
      v.literal("cash_flow"), 
      v.literal("profitability"), 
      v.literal("expense_analysis"),
      v.literal("anomaly_detection"),
      v.literal("trend_analysis"),
      v.literal("budget_variance"),
      v.literal("tax_optimization"),
      v.literal("working_capital")
    ),
    title: v.string(),
    description: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical"), v.literal("opportunity")),
    // Structured data for insights
    data: v.object({
      metrics: v.optional(v.any()), // Key performance indicators
      charts: v.optional(v.any()), // Chart data for visualization
      tables: v.optional(v.any()), // Tabular data
      comparisons: v.optional(v.any()), // Period-over-period comparisons
    }),
    recommendations: v.array(v.object({
      title: v.string(),
      description: v.string(),
      priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
      actionItems: v.optional(v.array(v.string())),
      estimatedImpact: v.optional(v.string()),
    })),
    // Insight metadata
    isRead: v.boolean(),
    isBookmarked: v.boolean(),
    validUntil: v.optional(v.number()),
    confidence: v.optional(v.number()), // AI confidence score 0-1
    dataRange: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    tags: v.optional(v.array(v.string())),
    relatedAccountIds: v.optional(v.array(v.id("accounts"))),
    relatedTransactionIds: v.optional(v.array(v.id("transactions"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_severity", ["severity"])
    .index("by_read_status", ["isRead"])
    .index("by_bookmarked", ["isBookmarked"])
    .index("by_created_at", ["createdAt"])
    .index("by_valid_until", ["validUntil"]),

  // 8. Reports - Enhanced report management
  reports: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    name: v.string(),
    reportType: v.union(
      v.literal("profit_loss"),
      v.literal("balance_sheet"),
      v.literal("cash_flow"),
      v.literal("trial_balance"),
      v.literal("transaction_list"),
      v.literal("category_summary"),
      v.literal("custom")
    ),
    parameters: v.object({
      dateRange: v.object({
        startDate: v.number(),
        endDate: v.number(),
      }),
      accounts: v.optional(v.array(v.id("accounts"))),
      customers: v.optional(v.array(v.string())),
      vendors: v.optional(v.array(v.string())),
      filters: v.optional(v.any()),
    }),
    format: v.union(v.literal("csv"), v.literal("pdf"), v.literal("json")),
    status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
    fileUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    recordCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    isScheduled: v.boolean(),
    scheduleConfig: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      dayOfWeek: v.optional(v.number()),
      dayOfMonth: v.optional(v.number()),
      time: v.string(),
    })),
    generatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_type", ["reportType"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["isScheduled"])
    .index("by_generated_at", ["generatedAt"]),

  // 9. API Keys - Enhanced API key management
  apiKeys: defineTable({
    userId: v.id("users"),
    companyId: v.optional(v.id("companies")),
    name: v.string(),
    keyHash: v.string(), // Hashed version of the key
    keyPrefix: v.string(), // First few characters for identification
    permissions: v.array(v.string()), // ["read:transactions", "write:reports", etc.]
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    usageCount: v.number(),
    rateLimit: v.optional(v.object({
      requestsPerMinute: v.number(),
      requestsPerHour: v.number(),
      requestsPerDay: v.number(),
    })),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_key_hash", ["keyHash"])
    .index("by_active", ["isActive"])
    .index("by_expires_at", ["expiresAt"]),

  // 10. AI Queries - Enhanced query logging and caching
  aiQueries: defineTable({
    userId: v.id("users"),
    companyId: v.id("companies"),
    queryText: v.string(),
    queryType: v.union(
      v.literal("insight_request"),
      v.literal("data_analysis"),
      v.literal("anomaly_investigation"),
      v.literal("forecast_request"),
      v.literal("recommendation_request")
    ),
    response: v.object({
      content: v.string(),
      data: v.optional(v.any()),
      confidence: v.optional(v.number()),
      sources: v.optional(v.array(v.string())),
    }),
    processingTime: v.number(), // milliseconds
    tokenUsage: v.optional(v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    })),
    model: v.string(), // AI model used
    isBookmarked: v.boolean(),
    isCached: v.boolean(),
    cacheHit: v.boolean(),
    relatedInsightIds: v.optional(v.array(v.id("insights"))),
    feedback: v.optional(v.object({
      rating: v.number(), // 1-5 stars
      comment: v.optional(v.string()),
      isHelpful: v.boolean(),
    })),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_type", ["queryType"])
    .index("by_bookmarked", ["isBookmarked"])
    .index("by_cached", ["isCached"])
    .index("by_created_at", ["createdAt"]),

  // 11. Sync Logs - Enhanced synchronization tracking
  syncLogs: defineTable({
    companyId: v.id("companies"),
    syncType: v.union(
      v.literal("accounts"),
      v.literal("transactions"),
      v.literal("customers"),
      v.literal("vendors"),
      v.literal("items"),
      v.literal("full_sync")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("cancelled")
    ),
    recordsProcessed: v.number(),
    recordsTotal: v.optional(v.number()),
    recordsCreated: v.number(),
    recordsUpdated: v.number(),
    recordsSkipped: v.number(),
    recordsErrored: v.number(),
    errorMessage: v.optional(v.string()),
    errorDetails: v.optional(v.array(v.object({
      recordId: v.string(),
      error: v.string(),
      timestamp: v.number(),
    }))),
    syncConfig: v.optional(v.object({
      incremental: v.boolean(),
      lastSyncDate: v.optional(v.number()),
      batchSize: v.number(),
      retryCount: v.number(),
    })),
    performance: v.optional(v.object({
      apiCallsCount: v.number(),
      averageResponseTime: v.number(),
      rateLimitHits: v.number(),
    })),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()), // milliseconds
    triggeredBy: v.union(v.literal("manual"), v.literal("scheduled"), v.literal("webhook"), v.literal("api")),
    triggeredByUser: v.optional(v.string()),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"])
    .index("by_sync_type", ["syncType"])
    .index("by_started_at", ["startedAt"])
    .index("by_triggered_by", ["triggeredBy"])
    .index("by_completed_at", ["completedAt"]),

  // 12. OAuth Auth Sessions - Temporary storage for OAuth state
  authSessions: defineTable({
    state: v.string(),
    codeVerifier: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_expires", ["expiresAt"]),

  // 13. Invoices - QuickBooks integration
  invoices: defineTable({
    userId: v.string(),
    invoiceId: v.string(),
    invoiceNumber: v.optional(v.string()),
    customerId: v.string(),
    customerName: v.string(),
    txnDate: v.string(),
    dueDate: v.string(),
    totalAmt: v.number(),
    balance: v.number(),
    status: v.string(),
    lineItems: v.optional(v.array(v.object({
      description: v.optional(v.string()),
      amount: v.number(),
      quantity: v.optional(v.number()),
      unitPrice: v.optional(v.number()),
    }))),
    createdAt: v.number(),
    lastSyncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_invoice_id", ["invoiceId"])
    .index("by_customer", ["customerId"])
    .index("by_status", ["status"]),

  // 14. Bills - QuickBooks integration
  bills: defineTable({
    userId: v.string(),
    billId: v.string(),
    vendorId: v.string(),
    vendorName: v.string(),
    txnDate: v.string(),
    dueDate: v.string(),
    totalAmt: v.number(),
    balance: v.number(),
    status: v.string(),
    createdAt: v.number(),
    lastSyncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_bill_id", ["billId"])
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"]),

  // 15. AI Agents - 25 specialized financial agents
  aiAgents: defineTable({
    agentId: v.string(),
    name: v.string(),
    category: v.union(
      v.literal("financial_analysis"),
      v.literal("forecasting"),
      v.literal("compliance"),
      v.literal("optimization"),
      v.literal("reporting")
    ),
    description: v.string(),
    capabilities: v.array(v.string()),
    promptTemplate: v.string(),
    contextRequirements: v.array(v.string()), // What data this agent needs
    outputFormat: v.union(v.literal("text"), v.literal("chart"), v.literal("table"), v.literal("mixed")),
    model: v.string(), // gpt-4, claude-3, etc
    maxTokens: v.number(),
    temperature: v.number(),
    isActive: v.boolean(),
    icon: v.string(),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent_id", ["agentId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // 16. Agent Executions - Track all agent interactions
  agentExecutions: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    agentId: v.string(),
    sessionId: v.optional(v.string()),
    query: v.string(),
    context: v.object({
      timeRange: v.optional(v.object({
        startDate: v.number(),
        endDate: v.number(),
      })),
      accountIds: v.optional(v.array(v.id("accounts"))),
      metrics: v.optional(v.any()),
      transactions: v.optional(v.array(v.any())),
    }),
    response: v.object({
      content: v.string(),
      charts: v.optional(v.array(v.any())),
      tables: v.optional(v.array(v.any())),
      insights: v.optional(v.array(v.string())),
      recommendations: v.optional(v.array(v.string())),
      confidence: v.number(),
    }),
    model: v.string(),
    promptUsed: v.string(),
    tokenUsage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
      cost: v.number(),
    }),
    executionTime: v.number(), // milliseconds
    status: v.union(v.literal("success"), v.literal("error"), v.literal("cached")),
    error: v.optional(v.string()),
    feedback: v.optional(v.object({
      rating: v.number(),
      comment: v.optional(v.string()),
      helpful: v.boolean(),
    })),
    cacheKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_cache_key", ["cacheKey"]),

  // 17. Agent Sessions - Track conversation threads
  agentSessions: defineTable({
    sessionId: v.string(),
    companyId: v.id("companies"),
    userId: v.id("users"),
    title: v.string(),
    summary: v.optional(v.string()),
    messageCount: v.number(),
    totalTokens: v.number(),
    totalCost: v.number(),
    startedAt: v.number(),
    lastActivityAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("deleted")),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_last_activity", ["lastActivityAt"]),

  // 18. Payments - QuickBooks/n8n integration
  payments: defineTable({
    companyId: v.optional(v.id("companies")),
    erpPaymentId: v.string(),
    paymentDate: v.number(),
    customerId: v.string(),
    customerName: v.optional(v.string()),
    amount: v.number(),
    currency: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    status: v.optional(v.string()),
    depositAccountId: v.optional(v.string()),
    // Related invoice data
    invoiceId: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    appliedAmount: v.optional(v.number()),
    unappliedAmount: v.optional(v.number()),
    // Metadata
    memo: v.optional(v.string()),
    syncSource: v.optional(v.string()),
    metadata: v.optional(v.object({
      transactionId: v.optional(v.string()),
      checkNumber: v.optional(v.string()),
      bankReference: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_payment_id", ["erpPaymentId"])
    .index("by_customer", ["customerId"])
    .index("by_payment_date", ["paymentDate"])
    .index("by_status", ["status"])
    .index("by_invoice", ["invoiceId"]),

  // 19. Budget Settings - Budget targets and configuration
  budgetSettings: defineTable({
    companyId: v.id("companies"),
    fiscalYear: v.number(),
    period: v.string(), // monthly, quarterly, yearly
    targets: v.optional(v.any()), // Account-specific budget targets
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_fiscal_year", ["fiscalYear"]),
});