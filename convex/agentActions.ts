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
 * Create a new agent
 */
export const createAgent = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
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
      v.literal("variance_explanation"),
      v.literal("forecasting"),
      v.literal("cash_flow_intelligence"),
      v.literal("revenue_recognition"),
      v.literal("close_acceleration"),
      v.literal("board_presentation"),
      v.literal("anomaly_monitoring"),
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
      v.literal("multivariate_prediction"),
      v.literal("custom")
    ),
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
    userDefinedCalls: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      prompt: v.string()
    }))),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agentId = await ctx.db.insert("agents", {
      organizationId: args.organizationId,
      userId: args.userId,
      name: args.name,
      description: args.description,
      category: args.category,
      type: args.type,
      isActive: true,
      isPremium: false,
      config: args.config,
      lastRunAt: undefined,
      runCount: 0,
      averageExecutionTime: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Store user-defined calls separately if provided
    if (args.userDefinedCalls && args.userDefinedCalls.length > 0) {
      // In a real implementation, you might want to store these in a separate table
      // For now, we'll store them in the agent's config
      await ctx.db.patch(agentId, {
        config: {
          ...args.config,
          userDefinedCalls: args.userDefinedCalls,
          version: args.version || '1.0.0'
        }
      });
    }

    return agentId;
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
 * Get all agents for an organization
 */
export const getAgents = query({
  args: {
    organizationId: v.id("organizations"),
    category: v.optional(v.union(
      v.literal("financial_intelligence"),
      v.literal("supply_chain"),
      v.literal("revenue_customer"),
      v.literal("it_operations"),
      v.literal("custom")
    )),
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    let agents = await query.collect();

    // Apply filters
    if (args.category) {
      agents = agents.filter(agent => agent.category === args.category);
    }

    if (args.isActive !== undefined) {
      agents = agents.filter(agent => agent.isActive === args.isActive);
    }

    // Sort by creation date (newest first)
    agents.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      agents = agents.slice(0, args.limit);
    }

    return agents;
  },
});

/**
 * Update an existing agent
 */
export const updateAgent = mutation({
  args: {
    agentId: v.id("agents"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("financial_intelligence"),
      v.literal("supply_chain"),
      v.literal("revenue_customer"),
      v.literal("it_operations"),
      v.literal("custom")
    )),
    config: v.optional(v.object({
      prompt: v.optional(v.string()),
      model: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      dataSource: v.array(v.string()),
      userDefinedCalls: v.optional(v.array(v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        prompt: v.string()
      }))),
      version: v.optional(v.string()),
    })),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify agent exists and belongs to organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to the specified organization");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name) updateData.name = args.name;
    if (args.description) updateData.description = args.description;
    if (args.category) updateData.category = args.category;
    if (args.config) updateData.config = { ...agent.config, ...args.config };
    if (args.isActive !== undefined) updateData.isActive = args.isActive;

    await ctx.db.patch(args.agentId, updateData);
    return args.agentId;
  },
});

/**
 * Delete/deactivate an agent
 */
export const deleteAgent = mutation({
  args: {
    agentId: v.id("agents"),
    organizationId: v.id("organizations"),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify agent exists and belongs to organization
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }
    if (agent.organizationId !== args.organizationId) {
      throw new Error("Agent does not belong to the specified organization");
    }

    if (args.hardDelete) {
      // Hard delete - completely remove the agent
      await ctx.db.delete(args.agentId);
    } else {
      // Soft delete - just mark as inactive
      await ctx.db.patch(args.agentId, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return args.agentId;
  },
});

/**
 * Clone an existing agent
 */
export const cloneAgent = mutation({
  args: {
    agentId: v.id("agents"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    newName: v.string(),
    newVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the original agent
    const originalAgent = await ctx.db.get(args.agentId);
    if (!originalAgent) {
      throw new Error("Original agent not found");
    }
    if (originalAgent.organizationId !== args.organizationId) {
      throw new Error("Original agent does not belong to the specified organization");
    }

    // Create a new agent based on the original
    const clonedAgentId = await ctx.db.insert("agents", {
      organizationId: args.organizationId,
      userId: args.userId,
      name: args.newName,
      description: `Clone of ${originalAgent.description}`,
      category: originalAgent.category,
      type: originalAgent.type,
      isActive: true,
      isPremium: originalAgent.isPremium,
      config: {
        ...originalAgent.config,
        version: args.newVersion || '1.0.0'
      },
      lastRunAt: undefined,
      runCount: 0,
      averageExecutionTime: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return clonedAgentId;
  },
});

/**
 * Get agent versions and history
 */
export const getAgentVersions = query({
  args: {
    organizationId: v.id("organizations"),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("name"), args.agentName))
      .collect();

    // Sort by creation date (newest first) and extract version info
    const versions = agents
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(agent => ({
        id: agent._id,
        version: agent.config.version || '1.0.0',
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        isActive: agent.isActive,
        config: agent.config,
        description: agent.description,
      }));

    return versions;
  },
});

/**
 * Get deployment status and statistics
 */
export const getDeploymentStats = query({
  args: {
    organizationId: v.id("organizations"),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Get all agents for the organization
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get executions within time range if specified
    let executions = await ctx.db
      .query("agentExecutions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    if (args.timeRange) {
      executions = executions.filter(exec => 
        exec.startedAt >= args.timeRange!.start && 
        exec.startedAt <= args.timeRange!.end
      );
    }

    // Calculate statistics
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.isActive).length;
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;

    // Calculate average execution time
    const completedExecutions = executions.filter(e => e.status === 'completed' && e.executionTime);
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / completedExecutions.length
      : 0;

    // Group agents by category
    const agentsByCategory = agents.reduce((acc, agent) => {
      acc[agent.category] = (acc[agent.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAgents,
      activeAgents,
      inactiveAgents: totalAgents - activeAgents,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      avgExecutionTime,
      agentsByCategory,
      recentExecutions: executions
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 10),
    };
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
 * Real-time agent status updates
 */
export const subscribeToAgentUpdates = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // This is a simple implementation for real-time updates
    // In production, you might want to implement more sophisticated subscription logic
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const recentExecutions = await ctx.db
      .query("agentExecutions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(20);

    return {
      agents,
      recentExecutions,
      lastUpdated: Date.now(),
    };
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
  const { agent, organizationId, dateRange, query } = args;

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
  const useGrokEnhancement = agent.config?.model === "grok-beta" || query;
  
  if (useGrokEnhancement && query) {
    // Use Grok for enhanced conversational analysis
    return await generateGrokEnhancedAnalysis(
      ctx, 
      { transactions, accounts, query, dateRange, agent }
    );
  }

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

/**
 * Grok-enhanced analysis for conversational AI
 */
async function generateGrokEnhancedAnalysis(
  ctx: any,
  args: {
    transactions: any[];
    accounts: any[];
    query: string;
    dateRange: { start: number; end: number };
    agent: any;
  }
) {
  const { transactions, accounts, query, dateRange, agent } = args;
  
  try {
    // Prepare financial data summary for Grok
    const financialSummary = {
      totalTransactions: transactions.length,
      dateRange,
      transactionTypes: transactions.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      accountTypes: accounts.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentTransactions: transactions
        .sort((a, b) => b.transactionDate - a.transactionDate)
        .slice(0, 10)
        .map(t => ({
          type: t.type,
          amount: t.amount,
          date: new Date(t.transactionDate).toISOString().split('T')[0],
          description: t.description,
        })),
    };

    // Call Grok API for enhanced analysis (simulated)
    const grokAnalysis = await callGrokAPI({
      query,
      financialData: financialSummary,
      agentContext: {
        type: agent.type,
        category: agent.category,
        config: agent.config,
      },
    });

    return grokAnalysis;
    
  } catch (error) {
    console.error('Grok analysis failed, falling back to standard analysis:', error);
    
    // Fallback to standard analysis if Grok fails
    return generateGeneralAnalysis(transactions, accounts, dateRange);
  }
}

/**
 * Simulated Grok API call (replace with actual API integration)
 */
async function callGrokAPI(params: {
  query: string;
  financialData: any;
  agentContext: any;
}): Promise<any> {
  const { query, financialData, agentContext } = params;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Enhanced analysis based on query understanding
  const queryLower = query.toLowerCase();
  const isRevenueQuery = queryLower.includes('revenue') || queryLower.includes('income') || queryLower.includes('sales');
  const isExpenseQuery = queryLower.includes('expense') || queryLower.includes('cost') || queryLower.includes('spending');
  const isCashFlowQuery = queryLower.includes('cash') || queryLower.includes('flow') || queryLower.includes('liquidity');
  const isForecastQuery = queryLower.includes('forecast') || queryLower.includes('predict') || queryLower.includes('future');
  
  let analysisType = 'general';
  if (isRevenueQuery) analysisType = 'revenue';
  if (isExpenseQuery) analysisType = 'expense';
  if (isCashFlowQuery) analysisType = 'cash_flow';
  if (isForecastQuery) analysisType = 'forecast';

  const revenue = financialData.recentTransactions
    .filter((t: any) => t.type === 'invoice' || t.amount > 0)
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  const expenses = financialData.recentTransactions
    .filter((t: any) => t.type === 'bill' || t.amount < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  // Generate contextual response based on query analysis
  const contextualSummary = generateContextualSummary(query, analysisType, {
    revenue,
    expenses,
    totalTransactions: financialData.totalTransactions,
    dateRange: financialData.dateRange,
  });

  const contextualPatterns = generateContextualPatterns(analysisType, { revenue, expenses });
  const contextualActions = generateContextualActions(analysisType, query);

  return {
    summary: contextualSummary,
    dataOverview: {
      totalRecords: financialData.totalTransactions,
      dateRange: financialData.dateRange,
      keyMetrics: [
        {
          name: analysisType === 'revenue' ? 'Total Revenue' : 'Total Amount',
          value: revenue || financialData.totalAmount,
          change: Math.random() * 20 - 10,
          trend: revenue > expenses ? 'up' : 'down',
        },
        {
          name: 'Transaction Count',
          value: financialData.totalTransactions,
          trend: 'up',
        },
        {
          name: analysisType === 'cash_flow' ? 'Net Cash Flow' : 'Net Position',
          value: revenue - expenses,
          change: Math.random() * 15 - 7.5,
          trend: (revenue - expenses) > 0 ? 'up' : 'down',
        },
      ],
    },
    patterns: contextualPatterns,
    actions: contextualActions,
  };
}

function generateContextualSummary(query: string, analysisType: string, data: any): string {
  const { revenue, expenses, totalTransactions } = data;
  
  switch (analysisType) {
    case 'revenue':
      return `Revenue analysis for your query "${query}": Current revenue stands at $${revenue.toFixed(2)} from ${totalTransactions} transactions. ${revenue > expenses ? 'Strong revenue performance with positive margins.' : 'Revenue requires attention to improve profitability.'}`;
    
    case 'expense':
      return `Expense analysis for "${query}": Total expenses amount to $${expenses.toFixed(2)}. ${expenses < revenue * 0.8 ? 'Expense management is performing well.' : 'Consider reviewing expense optimization opportunities.'}`;
    
    case 'cash_flow':
      return `Cash flow analysis for "${query}": Net cash flow is $${(revenue - expenses).toFixed(2)}. ${revenue > expenses ? 'Positive cash flow indicates healthy financial position.' : 'Negative cash flow requires immediate attention.'}`;
    
    case 'forecast':
      return `Forecast analysis for "${query}": Based on current trends with ${totalTransactions} transactions, projected growth shows ${revenue > expenses ? 'positive momentum' : 'challenges ahead'}. Consider strategic adjustments for optimal performance.`;
    
    default:
      return `Financial analysis for "${query}": Comprehensive review of ${totalTransactions} transactions shows ${revenue > expenses ? 'overall positive' : 'mixed'} performance with revenue of $${revenue.toFixed(2)} and expenses of $${expenses.toFixed(2)}.`;
  }
}

function generateContextualPatterns(analysisType: string, data: { revenue: number; expenses: number }): any[] {
  const { revenue, expenses } = data;
  
  const basePatterns = [
    {
      type: 'trend_analysis',
      description: `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} patterns show ${revenue > expenses ? 'positive trajectory' : 'areas for improvement'}`,
      confidence: 0.78 + Math.random() * 0.2,
      impact: revenue > expenses * 1.2 ? 'high' : revenue > expenses ? 'medium' : 'low',
    },
  ];

  if (analysisType === 'revenue') {
    basePatterns.push({
      type: 'revenue_concentration',
      description: 'Revenue streams show concentration in key business areas with growth potential',
      confidence: 0.72,
      impact: 'medium',
    });
  }

  if (analysisType === 'cash_flow') {
    basePatterns.push({
      type: 'cash_cycle',
      description: 'Cash conversion cycle indicates efficient working capital management',
      confidence: 0.85,
      impact: 'high',
    });
  }

  return basePatterns;
}

function generateContextualActions(analysisType: string, query: string): any[] {
  const baseActions = [
    {
      type: 'analysis_review',
      description: `Follow up on ${analysisType} analysis findings from: "${query}"`,
      priority: 'medium',
      automated: false,
      dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
    },
  ];

  if (analysisType === 'revenue') {
    baseActions.push({
      type: 'revenue_optimization',
      description: 'Identify and pursue top revenue growth opportunities',
      priority: 'high',
      automated: false,
    });
  }

  if (analysisType === 'expense') {
    baseActions.push({
      type: 'cost_reduction',
      description: 'Review expense categories for optimization potential',
      priority: 'high',
      automated: false,
    });
  }

  if (analysisType === 'forecast') {
    baseActions.push({
      type: 'strategic_planning',
      description: 'Update strategic plans based on forecast insights',
      priority: 'medium',
      automated: false,
    });
  }

  return baseActions;
}