import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * FinHelm.ai Convex Database Schema
 * Comprehensive schema for AI-powered ERP co-pilot system
 * Supports QuickBooks, Sage Intacct, and hierarchical chart of accounts
 */

export default defineSchema({
  // User Management
  users: defineTable({
    email: v.string(),
    name: v.string(),
    profileImage: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("viewer")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    preferences: v.optional(v.object({
      timezone: v.string(),
      language: v.string(),
      notifications: v.object({
        email: v.boolean(),
        sms: v.boolean(),
        inApp: v.boolean(),
      }),
    })),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"]),

  // Organization Management (Multi-entity support)
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    erpType: v.union(
      v.literal("quickbooks"),
      v.literal("sage_intacct"),
      v.literal("netsuite"),
      v.literal("xero")
    ),
    erpSettings: v.object({
      companyId: v.optional(v.string()),
      baseUrl: v.optional(v.string()),
      apiVersion: v.optional(v.string()),
      features: v.array(v.string()),
    }),
    isActive: v.boolean(),
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("premium"),
      v.literal("enterprise")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_erp_type", ["erpType"])
    .index("by_subscription", ["subscriptionTier"]),

  // User-Organization relationships
  userOrganizations: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
    permissions: v.array(v.string()),
    joinedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"]),

  // ERP Connections and Authentication
  erpConnections: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    erpType: v.union(
      v.literal("quickbooks"),
      v.literal("sage_intacct"),
      v.literal("netsuite"),
      v.literal("xero")
    ),
    connectionName: v.string(),
    isActive: v.boolean(),
    credentials: v.object({
      accessToken: v.optional(v.string()),
      refreshToken: v.optional(v.string()),
      companyId: v.optional(v.string()),
      realmId: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
    }),
    lastSyncAt: v.optional(v.number()),
    syncStatus: v.union(
      v.literal("active"),
      v.literal("failed"),
      v.literal("pending"),
      v.literal("disabled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_erp_type", ["erpType"])
    .index("by_sync_status", ["syncStatus"]),

  // Chart of Accounts (Hierarchical structure inspired by sample CSV)
  accounts: defineTable({
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    externalId: v.string(), // ID from ERP system
    code: v.string(), // Account code/number
    name: v.string(),
    fullName: v.string(), // Full hierarchical name
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense"),
      v.literal("other_current_asset"),
      v.literal("other_current_liability"),
      v.literal("accounts_payable"),
      v.literal("accounts_receivable"),
      v.literal("bank"),
      v.literal("cost_of_goods_sold"),
      v.literal("fixed_asset"),
      v.literal("income"),
      v.literal("long_term_liability")
    ),
    category: v.optional(v.string()),
    subType: v.optional(v.string()),
    parentId: v.optional(v.id("accounts")), // For nested hierarchy
    level: v.number(), // Depth in hierarchy (0 = root)
    path: v.array(v.string()), // Path to root for efficient queries
    isActive: v.boolean(),
    description: v.optional(v.string()),
    balance: v.optional(v.number()),
    currency: v.string(),
    taxCode: v.optional(v.string()),
    lastSyncAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["erpConnectionId"])
    .index("by_external_id", ["externalId"])
    .index("by_code", ["code"])
    .index("by_type", ["type"])
    .index("by_parent", ["parentId"])
    .index("by_level", ["level"])
    .index("by_active", ["isActive"]),

  // Financial Transactions
  transactions: defineTable({
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    externalId: v.string(),
    type: v.union(
      v.literal("journal_entry"),
      v.literal("invoice"),
      v.literal("bill"),
      v.literal("payment"),
      v.literal("deposit"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    accountId: v.id("accounts"),
    referenceNumber: v.optional(v.string()),
    description: v.string(),
    amount: v.number(),
    debitAmount: v.optional(v.number()),
    creditAmount: v.optional(v.number()),
    currency: v.string(),
    exchangeRate: v.optional(v.number()),
    transactionDate: v.number(),
    postingDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    customerId: v.optional(v.string()),
    vendorId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    locationId: v.optional(v.string()),
    tags: v.array(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("posted"),
      v.literal("void"),
      v.literal("reconciled")
    ),
    reconciliationStatus: v.optional(v.union(
      v.literal("unreconciled"),
      v.literal("reconciled"),
      v.literal("pending")
    )),
    lastSyncAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_account", ["accountId"])
    .index("by_type", ["type"])
    .index("by_date", ["transactionDate"])
    .index("by_amount", ["amount"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .index("by_vendor", ["vendorId"])
    .index("by_reconciliation", ["reconciliationStatus"]),

  // AI Agents (Pre-built and Custom)
  agents: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"), // Creator
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("financial_intelligence"),
      v.literal("supply_chain"),
      v.literal("revenue_customer"),
      v.literal("it_operations"),
      v.literal("custom")
    ),
    type: v.union(
      // Core 10 MVP Agents for Financial Intelligence
      v.literal("variance_explanation"),            // 1. Automated Variance Explanation 
      v.literal("cash_flow_intelligence"),          // 2. Cash Flow Intelligence (13-week forecasting)
      v.literal("anomaly_monitoring"),              // 3. Anomaly Monitoring with subledger details
      v.literal("close_acceleration"),              // 4. Close Acceleration with auto-reconciliation
      v.literal("forecasting"),                     // 5. Forecasting with multivariate prediction
      v.literal("multivariate_prediction"),         // 6. Multivariate Prediction with external factors
      v.literal("working_capital_optimization"),    // 7. Working Capital Optimization
      v.literal("budget_variance_tracker"),         // 8. Budget Variance Tracker
      v.literal("expense_categorization"),          // 9. Expense Categorization
      v.literal("revenue_recognition_assistant"),   // 10. Revenue Recognition Assistant
      
      // Additional specialized agents
      v.literal("revenue_recognition"),
      v.literal("board_presentation"),
      v.literal("inventory_optimization"),
      v.literal("demand_forecasting"),
      v.literal("vendor_risk"),
      v.literal("cogs_attribution"),
      v.literal("fill_rate_analytics"),
      v.literal("supplier_integration"),
      v.literal("sales_mix_margin"),
      v.literal("churn_prediction"),
      v.literal("revenue_decomposition"),
      v.literal("sales_forecast"),
      v.literal("customer_profitability"),
      v.literal("upsell_expansion"),
      v.literal("data_sync_health"),
      v.literal("change_impact"),
      v.literal("workflow_automation"),
      v.literal("change_management_risk"),
      v.literal("access_review"),
      v.literal("custom")
    ),
    isActive: v.boolean(),
    isPremium: v.boolean(),
    config: v.object({
      prompt: v.optional(v.string()),
      model: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      dataSource: v.array(v.string()),
      filters: v.optional(v.object({
        accounts: v.optional(v.array(v.id("accounts"))),
        dateRange: v.optional(v.object({
          start: v.number(),
          end: v.number(),
        })),
        minAmount: v.optional(v.number()),
        maxAmount: v.optional(v.number()),
      })),
      schedule: v.optional(v.object({
        frequency: v.union(
          v.literal("manual"),
          v.literal("daily"),
          v.literal("weekly"),
          v.literal("monthly")
        ),
        time: v.optional(v.string()),
        timezone: v.optional(v.string()),
      })),
    }),
    lastRunAt: v.optional(v.number()),
    runCount: v.number(),
    averageExecutionTime: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"])
    .index("by_premium", ["isPremium"]),

  // Agent Execution Results and Insights
  agentExecutions: defineTable({
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    userId: v.optional(v.id("users")), // User who triggered manual execution
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    input: v.object({
      query: v.optional(v.string()),
      parameters: v.optional(v.object({})),
      dataRange: v.optional(v.object({
        start: v.number(),
        end: v.number(),
      })),
    }),
    output: v.optional(v.object({
      summary: v.string(),
      dataOverview: v.object({
        totalRecords: v.number(),
        dateRange: v.object({
          start: v.number(),
          end: v.number(),
        }),
        keyMetrics: v.array(v.object({
          name: v.string(),
          value: v.any(),
          change: v.optional(v.number()),
          trend: v.optional(v.union(
            v.literal("up"),
            v.literal("down"),
            v.literal("flat")
          )),
        })),
      }),
      patterns: v.array(v.object({
        type: v.string(),
        description: v.string(),
        confidence: v.number(),
        impact: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        data: v.optional(v.array(v.any())),
      })),
      actions: v.array(v.object({
        type: v.string(),
        description: v.string(),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        automated: v.boolean(),
        dueDate: v.optional(v.number()),
        assignee: v.optional(v.id("users")),
      })),
    })),
    error: v.optional(v.string()),
    executionTime: v.optional(v.number()),
    tokensUsed: v.optional(v.number()),
    cost: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_started_at", ["startedAt"]),

  // Data Sync Jobs and Reconciliation
  syncJobs: defineTable({
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    type: v.union(
      v.literal("full_sync"),
      v.literal("incremental_sync"),
      v.literal("accounts_sync"),
      v.literal("transactions_sync"),
      v.literal("reconciliation")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    recordsProcessed: v.number(),
    recordsInserted: v.number(),
    recordsUpdated: v.number(),
    recordsSkipped: v.number(),
    errors: v.array(v.object({
      type: v.string(),
      message: v.string(),
      recordId: v.optional(v.string()),
      timestamp: v.number(),
    })),
    progress: v.number(), // 0-100
    estimatedCompletion: v.optional(v.number()),
    lastActivityAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_connection", ["erpConnectionId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_started_at", ["startedAt"]),

  // Audit Log for Compliance and Debugging
  auditLogs: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      metadata: v.optional(v.object({})),
    }),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_resource", ["resourceType"])
    .index("by_timestamp", ["timestamp"]),

  // OAuth State Management
  oauthStates: defineTable({
    state: v.string(),
    codeVerifier: v.string(),
    userId: v.optional(v.id("users")),
    organizationId: v.optional(v.id("organizations")),
    provider: v.union(v.literal("sage_intacct"), v.literal("quickbooks")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_expires", ["expiresAt"])
    .index("by_provider", ["provider"]),

  // Data Reconciliation Jobs
  reconciliationJobs: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    progress: v.number(),
    sourceData: v.array(v.object({
      id: v.string(),
      code: v.string(),
      name: v.string(),
      type: v.string(),
      amount: v.number(),
      date: v.string(),
      reference: v.optional(v.string()),
    })),
    targetData: v.array(v.object({
      id: v.string(),
      code: v.string(),
      name: v.string(),
      type: v.string(),
      amount: v.number(),
      date: v.string(),
      reference: v.optional(v.string()),
    })),
    results: v.optional(v.object({
      totalMatches: v.number(),
      exactMatches: v.number(),
      fuzzyMatches: v.number(),
      unmatched: v.number(),
      confidence: v.number(),
      matches: v.array(v.object({
        sourceId: v.string(),
        targetId: v.string(),
        confidence: v.number(),
        type: v.union(v.literal("exact"), v.literal("fuzzy")),
        factors: v.object({
          amountScore: v.number(),
          descriptionScore: v.number(),
          dateScore: v.number(),
          referenceScore: v.number(),
          accountScore: v.number(),
        }),
      })),
    })),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
});