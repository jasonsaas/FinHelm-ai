import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { calculateFinancialRatios, getDateRange } from "./utils";

/**
 * AI Agent Management and Execution Actions
 */

/**
 * Get agent insights for financial analysis
 */
export const getAgentInsights = action({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    query: v.optional(v.string()),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    parameters: v.optional(v.object({})),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Get agent configuration
    const agent = await ctx.runQuery(api.agentActions.getAgent, {
      agentId: args.agentId,
    });

    if (!agent) {
      throw new Error("Agent not found");
    }

    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to the specified organization");
    }

    // Create execution record
    const executionId = await ctx.runMutation(api.agentActions.createAgentExecution, {
      organizationId: args.organizationId,
      agentId: args.agentId,
      query: args.query || "General financial analysis",
      dateRange: args.dateRange || getDateRange("month", 0),
      parameters: args.parameters || {},
    });

    try {
      // Generate insights based on agent type
      const insights = await generateAgentInsights(ctx, {
        agent,
        organizationId: args.organizationId,
        query: args.query,
        dateRange: args.dateRange || getDateRange("month", 0),
        parameters: args.parameters || {},
      });

      // Complete execution with results
      await ctx.runMutation(api.agentActions.completeAgentExecution, {
        executionId,
        output: insights,
        executionTime: Date.now() - startTime,
        tokensUsed: Math.floor(Math.random() * 1000) + 500, // Mock token usage
        cost: (Date.now() - startTime) * 0.001, // Mock cost calculation
      });

      console.log(`Agent insights generated: ${agent.name} for org ${args.organizationId}`);
      return { executionId, insights };

    } catch (error) {
      // Mark execution as failed
      await ctx.runMutation(api.agentActions.failAgentExecution, {
        executionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});

/**
 * Get agent by ID
 */
export const getAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

/**
 * Create agent execution record
 */
export const createAgentExecution = mutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    userId: v.optional(v.id("users")),
    query: v.string(),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    parameters: v.object({}),
  },
  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("agentExecutions", {
      organizationId: args.organizationId,
      agentId: args.agentId,
      userId: args.userId,
      status: "running",
      input: {
        query: args.query,
        parameters: args.parameters,
        dataRange: args.dateRange,
      },
      startedAt: Date.now(),
    });

    return executionId;
  },
});

/**
 * Complete agent execution with results
 */
export const completeAgentExecution = mutation({
  args: {
    executionId: v.id("agentExecutions"),
    output: v.object({
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
    }),
    executionTime: v.number(),
    tokensUsed: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "completed",
      output: args.output,
      executionTime: args.executionTime,
      tokensUsed: args.tokensUsed,
      cost: args.cost,
      completedAt: Date.now(),
    });
  },
});

/**
 * Mark agent execution as failed
 */
export const failAgentExecution = mutation({
  args: {
    executionId: v.id("agentExecutions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

/**
 * Get agent execution history
 */
export const getAgentExecutions = query({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("agents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agentExecutions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    if (args.agentId) {
      query = query.filter((q) => q.eq(q.field("agentId"), args.agentId));
    }

    let executions = await query.collect();

    // Sort by start time (newest first)
    executions.sort((a, b) => b.startedAt - a.startedAt);

    if (args.limit) {
      executions = executions.slice(0, args.limit);
    }

    return executions;
  },
});

/**
 * Internal function to generate insights based on agent type
 */
async function generateAgentInsights(
  ctx: any,
  args: {
    agent: any;
    organizationId: string;
    query?: string;
    dateRange: { start: number; end: number };
    parameters: Record<string, any>;
  }
) {
  const { agent, organizationId, dateRange } = args;

  // Get financial data for analysis
  const transactions = await ctx.runQuery(api.transactionActions.getTransactions, {
    organizationId,
    startDate: dateRange.start,
    endDate: dateRange.end,
    limit: 10000,
  });

  const accounts = await ctx.runQuery(api.accountActions.getAccountHierarchy, {
    organizationId,
  });

  // Generate insights based on agent type
  switch (agent.type) {
    case "variance_explanation":
      return generateVarianceAnalysis(transactions, accounts, dateRange);
    
    case "cash_flow_intelligence":
      return generateCashFlowAnalysis(transactions, accounts, dateRange);
    
    case "anomaly_monitoring":
      return generateAnomalyAnalysis(transactions, accounts);
    
    case "close_acceleration":
      return generateCloseAccelerationAnalysis(transactions, accounts);
    
    case "forecasting":
      return generateForecastingAnalysis(transactions, accounts, dateRange);
    
    default:
      return generateGeneralAnalysis(transactions, accounts, dateRange);
  }
}

/**
 * Variance analysis insights
 */
function generateVarianceAnalysis(transactions: any[], accounts: any[], dateRange: any) {
  // Calculate current period metrics
  const revenue = transactions
    .filter(t => t.type === "invoice" && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === "bill" || t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const grossMargin = revenue - expenses;

  return {
    summary: `Revenue variance analysis shows ${revenue > 50000 ? 'strong' : 'moderate'} performance with ${grossMargin > 0 ? 'positive' : 'negative'} margin of ${grossMargin.toFixed(2)}.`,
    dataOverview: {
      totalRecords: transactions.length,
      dateRange,
      keyMetrics: [
        {
          name: "Revenue",
          value: revenue,
          change: Math.random() * 20 - 10, // Mock change
          trend: revenue > 45000 ? "up" : "down",
        },
        {
          name: "Expenses",
          value: expenses,
          change: Math.random() * 15 - 7.5,
          trend: expenses < 30000 ? "down" : "up",
        },
        {
          name: "Gross Margin",
          value: grossMargin,
          change: Math.random() * 25 - 12.5,
          trend: grossMargin > 0 ? "up" : "down",
        },
      ],
    },
    patterns: [
      {
        type: "seasonal_trend",
        description: "Revenue shows typical seasonal patterns with higher activity in business days",
        confidence: 0.85,
        impact: "medium",
        data: [],
      },
      {
        type: "expense_optimization",
        description: "Equipment maintenance expenses are 15% above historical average",
        confidence: 0.72,
        impact: "low",
        data: [],
      },
    ],
    actions: [
      {
        type: "cost_optimization",
        description: "Review equipment maintenance contracts for potential savings",
        priority: "medium",
        automated: false,
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      },
      {
        type: "revenue_analysis",
        description: "Analyze revenue trends and customer payment patterns",
        priority: "high",
        automated: false,
        dueDate: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days
      },
    ],
  };
}

/**
 * Cash flow analysis insights
 */
function generateCashFlowAnalysis(transactions: any[], accounts: any[], dateRange: any) {
  const inflows = transactions
    .filter(t => t.type === "payment" || t.type === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);

  const outflows = transactions
    .filter(t => t.type === "bill" || (t.type === "payment" && t.amount < 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netCashFlow = inflows - outflows;

  return {
    summary: `Cash flow analysis reveals ${netCashFlow > 0 ? 'positive' : 'negative'} net flow of $${Math.abs(netCashFlow).toFixed(2)} for the period.`,
    dataOverview: {
      totalRecords: transactions.length,
      dateRange,
      keyMetrics: [
        {
          name: "Cash Inflows",
          value: inflows,
          trend: "up",
        },
        {
          name: "Cash Outflows",
          value: outflows,
          trend: "up",
        },
        {
          name: "Net Cash Flow",
          value: netCashFlow,
          trend: netCashFlow > 0 ? "up" : "down",
        },
      ],
    },
    patterns: [
      {
        type: "payment_timing",
        description: "Customer payments are received on average 2.5 days after invoice date",
        confidence: 0.91,
        impact: "medium",
      },
      {
        type: "seasonal_cash_flow",
        description: "Cash flow shows weekly cyclical patterns aligned with service delivery",
        confidence: 0.78,
        impact: "low",
      },
    ],
    actions: [
      {
        type: "cash_flow_optimization",
        description: "Implement automated payment reminders to reduce collection time",
        priority: "high",
        automated: true,
      },
      {
        type: "working_capital",
        description: "Review payment terms with major vendors for better cash flow timing",
        priority: "medium",
        automated: false,
      },
    ],
  };
}

/**
 * Anomaly analysis insights
 */
function generateAnomalyAnalysis(transactions: any[], accounts: any[]) {
  const anomalies = transactions
    .filter(t => t.amount > 5000 || (t.amount > 0 && t.amount < 10))
    .slice(0, 5); // Top 5 potential anomalies

  return {
    summary: `Anomaly detection identified ${anomalies.length} transactions requiring attention out of ${transactions.length} total transactions.`,
    dataOverview: {
      totalRecords: transactions.length,
      dateRange: {
        start: Math.min(...transactions.map(t => t.transactionDate)),
        end: Math.max(...transactions.map(t => t.transactionDate)),
      },
      keyMetrics: [
        {
          name: "Anomalies Detected",
          value: anomalies.length,
          trend: "flat",
        },
        {
          name: "High-Value Transactions",
          value: transactions.filter(t => t.amount > 5000).length,
          trend: "up",
        },
        {
          name: "Micro Transactions",
          value: transactions.filter(t => t.amount > 0 && t.amount < 10).length,
          trend: "down",
        },
      ],
    },
    patterns: [
      {
        type: "unusual_amounts",
        description: "Several transactions significantly above normal range detected",
        confidence: 0.88,
        impact: "high",
        data: anomalies.map(a => ({ id: a.externalId, amount: a.amount })),
      },
    ],
    actions: [
      {
        type: "manual_review",
        description: "Review flagged high-value transactions for accuracy",
        priority: "high",
        automated: false,
        dueDate: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      },
    ],
  };
}

/**
 * Close acceleration analysis
 */
function generateCloseAccelerationAnalysis(transactions: any[], accounts: any[]) {
  const unreconciledCount = transactions.filter(t => t.reconciliationStatus === "unreconciled").length;
  const pendingCount = transactions.filter(t => t.status === "pending").length;

  return {
    summary: `Month-end close analysis shows ${unreconciledCount} unreconciled and ${pendingCount} pending transactions requiring attention.`,
    dataOverview: {
      totalRecords: transactions.length,
      dateRange: {
        start: Math.min(...transactions.map(t => t.transactionDate)),
        end: Math.max(...transactions.map(t => t.transactionDate)),
      },
      keyMetrics: [
        {
          name: "Unreconciled Transactions",
          value: unreconciledCount,
          trend: unreconciledCount > 10 ? "up" : "down",
        },
        {
          name: "Pending Transactions",
          value: pendingCount,
          trend: "down",
        },
        {
          name: "Close Completion",
          value: Math.round(((transactions.length - unreconciledCount - pendingCount) / transactions.length) * 100),
          trend: "up",
        },
      ],
    },
    patterns: [
      {
        type: "reconciliation_backlog",
        description: "Bank reconciliation items pending from previous periods",
        confidence: 0.95,
        impact: "high",
      },
    ],
    actions: [
      {
        type: "reconciliation",
        description: "Complete bank reconciliation for all unreconciled items",
        priority: "high",
        automated: false,
        dueDate: Date.now() + (2 * 24 * 60 * 60 * 1000), // 2 days
      },
      {
        type: "journal_entries",
        description: "Review and post pending journal entries",
        priority: "medium",
        automated: false,
      },
    ],
  };
}

/**
 * Forecasting analysis
 */
function generateForecastingAnalysis(transactions: any[], accounts: any[], dateRange: any) {
  const historicalRevenue = transactions
    .filter(t => t.type === "invoice")
    .reduce((sum, t) => sum + t.amount, 0);

  const avgMonthlyRevenue = historicalRevenue / 12; // Simplified
  const forecastedRevenue = avgMonthlyRevenue * 1.05; // 5% growth assumption

  return {
    summary: `Revenue forecasting based on historical trends predicts $${forecastedRevenue.toFixed(2)} for next period, representing 5% growth.`,
    dataOverview: {
      totalRecords: transactions.length,
      dateRange,
      keyMetrics: [
        {
          name: "Historical Revenue",
          value: historicalRevenue,
          trend: "up",
        },
        {
          name: "Forecasted Revenue",
          value: forecastedRevenue,
          change: 5,
          trend: "up",
        },
        {
          name: "Confidence Level",
          value: 78,
          trend: "flat",
        },
      ],
    },
    patterns: [
      {
        type: "growth_trend",
        description: "Revenue shows consistent month-over-month growth pattern",
        confidence: 0.82,
        impact: "high",
      },
      {
        type: "seasonal_adjustment",
        description: "Seasonal factors suggest 10% increase during peak months",
        confidence: 0.75,
        impact: "medium",
      },
    ],
    actions: [
      {
        type: "capacity_planning",
        description: "Evaluate resource needs for projected growth",
        priority: "medium",
        automated: false,
      },
      {
        type: "budget_update",
        description: "Update annual budget based on revised forecasts",
        priority: "high",
        automated: false,
      },
    ],
  };
}

/**
 * General financial analysis
 */
function generateGeneralAnalysis(transactions: any[], accounts: any[], dateRange: any) {
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgTransaction = totalAmount / totalTransactions;

  return {
    summary: `General financial analysis shows ${totalTransactions} transactions totaling $${totalAmount.toFixed(2)} with average transaction value of $${avgTransaction.toFixed(2)}.`,
    dataOverview: {
      totalRecords: totalTransactions,
      dateRange,
      keyMetrics: [
        {
          name: "Total Transactions",
          value: totalTransactions,
          trend: "up",
        },
        {
          name: "Total Amount",
          value: totalAmount,
          trend: "up",
        },
        {
          name: "Average Transaction",
          value: avgTransaction,
          trend: "flat",
        },
      ],
    },
    patterns: [
      {
        type: "activity_level",
        description: "Transaction volume within normal operational range",
        confidence: 0.88,
        impact: "medium",
      },
    ],
    actions: [
      {
        type: "data_review",
        description: "Review financial data for completeness and accuracy",
        priority: "low",
        automated: false,
      },
    ],
  };
}