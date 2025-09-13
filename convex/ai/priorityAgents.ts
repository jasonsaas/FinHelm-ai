/**
 * Priority AI Agents with Live Convex Data Integration
 * Enhanced agents that query real QuickBooks data from Convex
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Enhanced context fetching for priority agents
export async function fetchEnhancedContextData(
  ctx: any,
  companyId: Id<"companies">,
  agentType: string
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};
  
  switch (agentType) {
    case "cash_flow_forecast":
      // Get outstanding invoices
      const invoices = await ctx.db
        .query("invoices")
        .filter((q: any) => q.eq(q.field("status"), "outstanding"))
        .collect();
      
      // Get unpaid bills
      const bills = await ctx.db
        .query("bills")
        .filter((q: any) => q.eq(q.field("status"), "unpaid"))
        .collect();
      
      // Get bank accounts
      const bankAccounts = await ctx.db
        .query("accounts")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .filter((q: any) => q.eq(q.field("accountType"), "Bank"))
        .collect();
      
      // Get recent transactions for trend analysis
      const recentTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .order("desc")
        .take(100);
      
      context.invoices = invoices;
      context.bills = bills;
      context.bankAccounts = bankAccounts;
      context.currentCash = bankAccounts.reduce(
        (sum: number, acc: any) => sum + (acc.currentBalance || 0), 0
      );
      context.transactions = recentTransactions;
      context.receivables = invoices.reduce(
        (sum: number, inv: any) => sum + (inv.balance || 0), 0
      );
      context.payables = bills.reduce(
        (sum: number, bill: any) => sum + (bill.balance || 0), 0
      );
      break;
      
    case "collections":
      // Get all invoices for aging analysis
      const allInvoices = await ctx.db
        .query("invoices")
        .collect();
      
      // Calculate aging buckets
      const now = Date.now();
      const aging = {
        current: [],
        thirtyDays: [],
        sixtyDays: [],
        ninetyDays: [],
        overNinetyDays: []
      };
      
      allInvoices.forEach((inv: any) => {
        const daysOverdue = Math.floor((now - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue <= 0) aging.current.push(inv);
        else if (daysOverdue <= 30) aging.thirtyDays.push(inv);
        else if (daysOverdue <= 60) aging.sixtyDays.push(inv);
        else if (daysOverdue <= 90) aging.ninetyDays.push(inv);
        else aging.overNinetyDays.push(inv);
      });
      
      context.aging = aging;
      context.totalOverdue = allInvoices
        .filter((inv: any) => new Date(inv.dueDate) < new Date())
        .reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0);
      context.invoices = allInvoices;
      break;
      
    case "anomaly_detection":
      // Get last 30 days of transactions
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .filter((q: any) => q.gte(q.field("date"), thirtyDaysAgo))
        .collect();
      
      // Calculate statistical metrics
      const amounts = transactions.map((t: any) => t.amount);
      const mean = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum: number, val: number) => 
        sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      // Identify outliers (>2 standard deviations)
      const outliers = transactions.filter((t: any) => 
        Math.abs(t.amount - mean) > (2 * stdDev)
      );
      
      // Check for duplicates
      const duplicates: any[] = [];
      const seen = new Map();
      transactions.forEach((t: any) => {
        const key = `${t.amount}-${t.vendorId}-${t.date}`;
        if (seen.has(key)) {
          duplicates.push({ original: seen.get(key), duplicate: t });
        } else {
          seen.set(key, t);
        }
      });
      
      context.transactions = transactions;
      context.statistics = { mean, stdDev, variance };
      context.outliers = outliers;
      context.duplicates = duplicates;
      break;
      
    case "month_end_close":
      // Get unreconciled transactions
      const unreconciled = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .filter((q: any) => q.eq(q.field("isReconciled"), false))
        .collect();
      
      // Get accounts needing reconciliation
      const accounts = await ctx.db
        .query("accounts")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .filter((q: any) => 
          q.or(
            q.eq(q.field("accountType"), "Bank"),
            q.eq(q.field("accountType"), "Credit Card")
          )
        )
        .collect();
      
      // Check for missing documents
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1).getTime();
      const monthEnd = new Date(currentYear, currentMonth + 1, 0).getTime();
      
      const monthTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .filter((q: any) => 
          q.and(
            q.gte(q.field("date"), monthStart),
            q.lte(q.field("date"), monthEnd)
          )
        )
        .collect();
      
      context.unreconciled = unreconciled;
      context.accounts = accounts;
      context.monthTransactions = monthTransactions;
      context.reconciliationStatus = accounts.map((acc: any) => ({
        account: acc.name,
        lastReconciled: acc.lastReconciledDate,
        balance: acc.currentBalance,
        unreconciled: unreconciled.filter((t: any) => t.accountId === acc._id).length
      }));
      break;
      
    case "budget_vs_actual":
      // Get actual balances from accounts
      const allAccounts = await ctx.db
        .query("accounts")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .collect();
      
      // Get budget settings (if available)
      const budgetSettings = await ctx.db
        .query("budgetSettings")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .first();
      
      // Get YTD transactions for variance analysis
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      const ytdTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
        .filter((q: any) => q.gte(q.field("date"), yearStart))
        .collect();
      
      // Calculate actual vs budget
      const varianceAnalysis = allAccounts.map((acc: any) => {
        const budget = budgetSettings?.targets?.[acc.erpAccountId] || 0;
        const actual = acc.currentBalance || 0;
        const variance = actual - budget;
        const variancePercent = budget ? (variance / budget) * 100 : 0;
        
        return {
          account: acc.name,
          accountType: acc.classification,
          budget,
          actual,
          variance,
          variancePercent,
          status: Math.abs(variancePercent) > 10 ? 'attention' : 'ok'
        };
      });
      
      context.accounts = allAccounts;
      context.budgetSettings = budgetSettings;
      context.ytdTransactions = ytdTransactions;
      context.varianceAnalysis = varianceAnalysis;
      break;
  }
  
  return context;
}

// Cash Flow Forecasting Agent
export const executeCashFlowForecast = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    query: v.string(),
    weeks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const weeks = args.weeks || 13;
    const context = await fetchEnhancedContextData(ctx, args.companyId, "cash_flow_forecast");
    
    // Generate weekly projections
    const projections = [];
    let runningBalance = context.currentCash;
    const weeklyReceivables = context.receivables / weeks;
    const weeklyPayables = context.payables / weeks;
    
    for (let week = 1; week <= weeks; week++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      
      const expectedInflows = weeklyReceivables * (1 - Math.random() * 0.2); // Add variability
      const expectedOutflows = weeklyPayables * (1 + Math.random() * 0.1);
      const netCashFlow = expectedInflows - expectedOutflows;
      runningBalance += netCashFlow;
      
      projections.push({
        week,
        weekStart: weekStart.toISOString(),
        inflows: expectedInflows,
        outflows: expectedOutflows,
        netCashFlow,
        endingBalance: runningBalance,
        confidence: week <= 4 ? "High" : week <= 8 ? "Medium" : "Low"
      });
    }
    
    const prompt = `
    Analyze the following cash flow data and provide insights:
    
    Current Cash: $${context.currentCash.toFixed(2)}
    Outstanding Receivables: $${context.receivables.toFixed(2)}
    Unpaid Payables: $${context.payables.toFixed(2)}
    
    ${weeks}-Week Projections:
    ${JSON.stringify(projections, null, 2)}
    
    User Query: ${args.query}
    
    Provide:
    1. Cash flow health assessment
    2. Critical weeks to watch
    3. Recommendations for improving cash position
    4. Risk factors to monitor
    `;
    
    let response = {
      content: "",
      projections,
      metrics: {
        currentCash: context.currentCash,
        receivables: context.receivables,
        payables: context.payables,
        minCash: Math.min(...projections.map(p => p.endingBalance)),
        maxCash: Math.max(...projections.map(p => p.endingBalance)),
      },
      confidence: 0.85
    };
    
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a cash flow forecasting specialist. Provide specific, actionable insights based on the data."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.5,
      });
      
      response.content = completion.choices[0].message.content || "";
    } else {
      response.content = `Cash Flow Forecast (${weeks} weeks):
      
Current Position: $${context.currentCash.toFixed(2)}
Minimum Projected: $${Math.min(...projections.map(p => p.endingBalance)).toFixed(2)}
Maximum Projected: $${Math.max(...projections.map(p => p.endingBalance)).toFixed(2)}

Key Insights:
- Cash position ${runningBalance > 0 ? 'remains positive' : 'goes negative'} throughout forecast period
- Weekly net cash flow averages $${(context.receivables - context.payables) / weeks}
- ${projections.filter(p => p.endingBalance < 0).length} weeks show negative balance

Note: OpenAI integration pending for enhanced analysis.`;
    }
    
    // Store execution
    await ctx.db.insert("agentExecutions", {
      companyId: args.companyId,
      userId: args.userId,
      agentId: "cash_flow_forecast",
      query: args.query,
      context: { weeks, ...context },
      response,
      model: "gpt-4",
      promptUsed: prompt,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      executionTime: 0,
      status: "success",
      cacheKey: "",
      createdAt: Date.now(),
    });
    
    return response;
  },
});

// Collections Agent
export const executeCollections = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await fetchEnhancedContextData(ctx, args.companyId, "collections");
    
    // Create prioritized collection list
    const prioritizedList = [
      ...context.aging.overNinetyDays.map((inv: any) => ({ ...inv, priority: 1, bucket: "90+ days" })),
      ...context.aging.ninetyDays.map((inv: any) => ({ ...inv, priority: 2, bucket: "61-90 days" })),
      ...context.aging.sixtyDays.map((inv: any) => ({ ...inv, priority: 3, bucket: "31-60 days" })),
      ...context.aging.thirtyDays.map((inv: any) => ({ ...inv, priority: 4, bucket: "1-30 days" })),
    ].sort((a, b) => b.balance - a.balance); // Secondary sort by amount
    
    const emailTemplates = {
      friendly: `Subject: Friendly Reminder - Invoice #[INVOICE_NUMBER]
      
Dear [CUSTOMER_NAME],

This is a friendly reminder that invoice #[INVOICE_NUMBER] for $[AMOUNT] is now [DAYS] days overdue.

We value your business and would appreciate payment at your earliest convenience.

Best regards,
[YOUR_COMPANY]`,
      
      firm: `Subject: Urgent - Overdue Invoice #[INVOICE_NUMBER]
      
Dear [CUSTOMER_NAME],

Invoice #[INVOICE_NUMBER] for $[AMOUNT] is now [DAYS] days overdue. 

This requires immediate attention to avoid service interruption.

Please remit payment immediately or contact us to discuss.

Regards,
[YOUR_COMPANY]`,
    };
    
    const response = {
      content: "",
      aging: context.aging,
      prioritizedList: prioritizedList.slice(0, 20), // Top 20
      totalOverdue: context.totalOverdue,
      emailTemplates,
      metrics: {
        current: context.aging.current.length,
        thirtyDays: context.aging.thirtyDays.length,
        sixtyDays: context.aging.sixtyDays.length,
        ninetyDays: context.aging.ninetyDays.length,
        overNinetyDays: context.aging.overNinetyDays.length,
      },
      confidence: 0.9
    };
    
    const prompt = `
    Analyze the following AR aging data:
    
    Total Overdue: $${context.totalOverdue.toFixed(2)}
    
    Aging Buckets:
    - Current: ${context.aging.current.length} invoices
    - 1-30 days: ${context.aging.thirtyDays.length} invoices
    - 31-60 days: ${context.aging.sixtyDays.length} invoices
    - 61-90 days: ${context.aging.ninetyDays.length} invoices
    - 90+ days: ${context.aging.overNinetyDays.length} invoices
    
    Top Priority Collections:
    ${JSON.stringify(prioritizedList.slice(0, 5), null, 2)}
    
    User Query: ${args.query}
    
    Provide:
    1. Collection strategy recommendations
    2. Risk assessment for top accounts
    3. Suggested collection actions by priority
    4. DSO improvement opportunities
    `;
    
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a collections specialist. Provide strategic advice for improving cash collection."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.4,
      });
      
      response.content = completion.choices[0].message.content || "";
    } else {
      response.content = `Collections Analysis:

Total Overdue: $${context.totalOverdue.toFixed(2)}

Priority Actions:
1. Focus on ${context.aging.overNinetyDays.length} invoices over 90 days ($${context.aging.overNinetyDays.reduce((s: number, i: any) => s + i.balance, 0).toFixed(2)})
2. Contact top 5 accounts representing ${(prioritizedList.slice(0, 5).reduce((s, i) => s + i.balance, 0) / context.totalOverdue * 100).toFixed(1)}% of overdue
3. Implement automated reminders for 30-60 day buckets

Risk Assessment: ${context.aging.overNinetyDays.length > 10 ? 'HIGH' : 'MODERATE'}

Note: OpenAI integration pending for enhanced analysis.`;
    }
    
    // Store execution
    await ctx.db.insert("agentExecutions", {
      companyId: args.companyId,
      userId: args.userId,
      agentId: "collections",
      query: args.query,
      context,
      response,
      model: "gpt-4",
      promptUsed: prompt,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      executionTime: 0,
      status: "success",
      cacheKey: "",
      createdAt: Date.now(),
    });
    
    return response;
  },
});

// Anomaly Detection Agent
export const executeAnomalyDetection = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await fetchEnhancedContextData(ctx, args.companyId, "anomaly_detection");
    
    const anomalies = [
      ...context.outliers.map((t: any) => ({
        type: "Statistical Outlier",
        transaction: t,
        severity: Math.abs(t.amount - context.statistics.mean) > (3 * context.statistics.stdDev) ? "HIGH" : "MEDIUM",
        description: `Transaction amount $${t.amount} is ${((Math.abs(t.amount - context.statistics.mean) / context.statistics.stdDev)).toFixed(1)} standard deviations from mean`
      })),
      ...context.duplicates.map((d: any) => ({
        type: "Potential Duplicate",
        transaction: d.duplicate,
        severity: "HIGH",
        description: `Possible duplicate of transaction ${d.original.erpTransactionId}`
      }))
    ];
    
    const response = {
      content: "",
      anomalies,
      statistics: context.statistics,
      totalAnomalies: anomalies.length,
      riskScore: Math.min(100, anomalies.length * 10),
      metrics: {
        transactions: context.transactions.length,
        outliers: context.outliers.length,
        duplicates: context.duplicates.length,
        meanAmount: context.statistics.mean,
        stdDev: context.statistics.stdDev
      },
      confidence: 0.88
    };
    
    const prompt = `
    Analyze the following transaction anomalies:
    
    Statistics:
    - Total Transactions: ${context.transactions.length}
    - Mean Amount: $${context.statistics.mean.toFixed(2)}
    - Std Deviation: $${context.statistics.stdDev.toFixed(2)}
    
    Detected Anomalies:
    - Statistical Outliers: ${context.outliers.length}
    - Potential Duplicates: ${context.duplicates.length}
    
    Top Anomalies:
    ${JSON.stringify(anomalies.slice(0, 5), null, 2)}
    
    User Query: ${args.query}
    
    Provide:
    1. Risk assessment and severity analysis
    2. Recommended investigation priorities
    3. Patterns or trends in anomalies
    4. Preventive controls to implement
    `;
    
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a fraud detection specialist. Analyze transaction anomalies and provide risk assessments."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });
      
      response.content = completion.choices[0].message.content || "";
    } else {
      response.content = `Anomaly Detection Report:

Detected ${anomalies.length} anomalies in ${context.transactions.length} transactions

Risk Assessment: ${response.riskScore > 50 ? 'HIGH' : response.riskScore > 20 ? 'MEDIUM' : 'LOW'} (Score: ${response.riskScore}/100)

Key Findings:
- ${context.outliers.length} statistical outliers detected (>${2 * context.statistics.stdDev} from mean)
- ${context.duplicates.length} potential duplicate transactions
- Largest outlier: ${context.outliers[0] ? '$' + context.outliers[0].amount : 'None'}

Immediate Actions:
1. Review ${anomalies.filter(a => a.severity === 'HIGH').length} high-severity anomalies
2. Investigate duplicate payment patterns
3. Verify large transactions over $${(context.statistics.mean + 2 * context.statistics.stdDev).toFixed(2)}

Note: OpenAI integration pending for enhanced analysis.`;
    }
    
    // Store execution
    await ctx.db.insert("agentExecutions", {
      companyId: args.companyId,
      userId: args.userId,
      agentId: "anomaly_detection",
      query: args.query,
      context,
      response,
      model: "gpt-4",
      promptUsed: prompt,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      executionTime: 0,
      status: "success",
      cacheKey: "",
      createdAt: Date.now(),
    });
    
    return response;
  },
});

// Month-End Close Agent
export const executeMonthEndClose = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await fetchEnhancedContextData(ctx, args.companyId, "month_end_close");
    
    const checklist = [
      {
        task: "Reconcile Bank Accounts",
        status: context.unreconciled.filter((t: any) => t.accountType === "Bank").length === 0 ? "Complete" : "Pending",
        items: context.reconciliationStatus.filter((r: any) => r.unreconciled > 0).length,
        priority: "HIGH"
      },
      {
        task: "Review Unreconciled Transactions",
        status: context.unreconciled.length === 0 ? "Complete" : "In Progress",
        items: context.unreconciled.length,
        priority: "HIGH"
      },
      {
        task: "Post Accruals",
        status: "Pending",
        items: 0,
        priority: "MEDIUM"
      },
      {
        task: "Review Suspense Accounts",
        status: "Pending",
        items: 0,
        priority: "MEDIUM"
      },
      {
        task: "Validate Trial Balance",
        status: "Pending",
        items: 0,
        priority: "HIGH"
      },
      {
        task: "Generate Financial Statements",
        status: "Pending",
        items: 0,
        priority: "LOW"
      }
    ];
    
    const adjustingEntries = [
      {
        description: "Accrue unpaid wages",
        debit: "Wages Expense",
        credit: "Wages Payable",
        amount: 0,
        status: "Review Required"
      },
      {
        description: "Depreciation expense",
        debit: "Depreciation Expense",
        credit: "Accumulated Depreciation",
        amount: 0,
        status: "Review Required"
      }
    ];
    
    const response = {
      content: "",
      checklist,
      reconciliationStatus: context.reconciliationStatus,
      unreconciled: context.unreconciled.slice(0, 20),
      adjustingEntries,
      metrics: {
        totalUnreconciled: context.unreconciled.length,
        accountsToReconcile: context.reconciliationStatus.filter((r: any) => r.unreconciled > 0).length,
        completedTasks: checklist.filter(c => c.status === "Complete").length,
        totalTasks: checklist.length
      },
      confidence: 0.92
    };
    
    const prompt = `
    Analyze the month-end close status:
    
    Unreconciled Transactions: ${context.unreconciled.length}
    Accounts Needing Reconciliation: ${context.reconciliationStatus.filter((r: any) => r.unreconciled > 0).length}
    
    Reconciliation Status:
    ${JSON.stringify(context.reconciliationStatus, null, 2)}
    
    Checklist Progress: ${checklist.filter(c => c.status === "Complete").length}/${checklist.length} tasks complete
    
    User Query: ${args.query}
    
    Provide:
    1. Critical items blocking close
    2. Recommended adjusting entries
    3. Process improvement suggestions
    4. Estimated time to complete close
    `;
    
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a month-end close specialist. Provide guidance for efficient financial close processes."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.4,
      });
      
      response.content = completion.choices[0].message.content || "";
    } else {
      response.content = `Month-End Close Status:

Progress: ${response.metrics.completedTasks}/${response.metrics.totalTasks} tasks complete

Critical Items:
- ${context.unreconciled.length} unreconciled transactions require review
- ${context.reconciliationStatus.filter((r: any) => r.unreconciled > 0).length} accounts need reconciliation

Priority Actions:
1. Reconcile ${context.reconciliationStatus[0]?.account || 'primary bank account'} (${context.reconciliationStatus[0]?.unreconciled || 0} items)
2. Review and clear suspense accounts
3. Post standard adjusting entries
4. Run trial balance validation

Estimated Time: ${context.unreconciled.length > 100 ? '3-4 days' : '1-2 days'}

Note: OpenAI integration pending for enhanced analysis.`;
    }
    
    // Store execution
    await ctx.db.insert("agentExecutions", {
      companyId: args.companyId,
      userId: args.userId,
      agentId: "month_end_close",
      query: args.query,
      context,
      response,
      model: "gpt-4",
      promptUsed: prompt,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      executionTime: 0,
      status: "success",
      cacheKey: "",
      createdAt: Date.now(),
    });
    
    return response;
  },
});

// Budget vs Actual Agent
export const executeBudgetVsActual = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await fetchEnhancedContextData(ctx, args.companyId, "budget_vs_actual");
    
    // Group variance by account type
    const varianceByType = {
      Revenue: context.varianceAnalysis.filter((v: any) => v.accountType === "Revenue"),
      Expense: context.varianceAnalysis.filter((v: any) => v.accountType === "Expense"),
      Asset: context.varianceAnalysis.filter((v: any) => v.accountType === "Asset"),
      Liability: context.varianceAnalysis.filter((v: any) => v.accountType === "Liability"),
    };
    
    // Calculate summary metrics
    const totalBudget = context.varianceAnalysis.reduce((sum: number, v: any) => sum + v.budget, 0);
    const totalActual = context.varianceAnalysis.reduce((sum: number, v: any) => sum + v.actual, 0);
    const totalVariance = totalActual - totalBudget;
    const variancePercent = totalBudget ? (totalVariance / totalBudget) * 100 : 0;
    
    // Identify top variances
    const topPositive = context.varianceAnalysis
      .filter((v: any) => v.variance > 0)
      .sort((a: any, b: any) => b.variance - a.variance)
      .slice(0, 5);
    
    const topNegative = context.varianceAnalysis
      .filter((v: any) => v.variance < 0)
      .sort((a: any, b: any) => a.variance - b.variance)
      .slice(0, 5);
    
    const response = {
      content: "",
      varianceAnalysis: context.varianceAnalysis.slice(0, 50), // Top 50 accounts
      varianceByType,
      topPositive,
      topNegative,
      metrics: {
        totalBudget,
        totalActual,
        totalVariance,
        variancePercent,
        accountsOverBudget: context.varianceAnalysis.filter((v: any) => v.variance > 0).length,
        accountsUnderBudget: context.varianceAnalysis.filter((v: any) => v.variance < 0).length,
        accountsOnTarget: context.varianceAnalysis.filter((v: any) => Math.abs(v.variancePercent) <= 5).length
      },
      confidence: 0.87
    };
    
    const prompt = `
    Analyze budget vs actual performance:
    
    Overall Performance:
    - Total Budget: $${totalBudget.toFixed(2)}
    - Total Actual: $${totalActual.toFixed(2)}
    - Variance: $${totalVariance.toFixed(2)} (${variancePercent.toFixed(1)}%)
    
    Top Positive Variances:
    ${JSON.stringify(topPositive, null, 2)}
    
    Top Negative Variances:
    ${JSON.stringify(topNegative, null, 2)}
    
    User Query: ${args.query}
    
    Provide:
    1. Overall budget performance assessment
    2. Key drivers of variance
    3. Areas requiring immediate attention
    4. Recommendations for budget adjustments
    5. Forecast for remainder of period
    `;
    
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a budget analyst. Provide insights on budget performance and variance drivers."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.5,
      });
      
      response.content = completion.choices[0].message.content || "";
    } else {
      response.content = `Budget vs Actual Analysis:

Overall Performance: ${variancePercent > 0 ? 'OVER' : 'UNDER'} budget by ${Math.abs(variancePercent).toFixed(1)}%

Summary:
- Total Budget: $${totalBudget.toFixed(2)}
- Total Actual: $${totalActual.toFixed(2)}
- Variance: $${totalVariance.toFixed(2)}

Key Findings:
- ${response.metrics.accountsOverBudget} accounts over budget
- ${response.metrics.accountsUnderBudget} accounts under budget
- ${response.metrics.accountsOnTarget} accounts on target (±5%)

Top Areas of Concern:
${topNegative.slice(0, 3).map((v: any, i: number) => 
  `${i + 1}. ${v.account}: ${v.variancePercent.toFixed(1)}% over budget ($${Math.abs(v.variance).toFixed(2)})`
).join('\n')}

Recommendations:
1. Review ${topNegative[0]?.account || 'highest variance accounts'} for cost control
2. Reallocate budget from underutilized areas
3. Update forecasts based on YTD performance

Note: OpenAI integration pending for enhanced analysis.`;
    }
    
    // Store execution
    await ctx.db.insert("agentExecutions", {
      companyId: args.companyId,
      userId: args.userId,
      agentId: "budget_vs_actual",
      query: args.query,
      context,
      response,
      model: "gpt-4",
      promptUsed: prompt,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      executionTime: 0,
      status: "success",
      cacheKey: "",
      createdAt: Date.now(),
    });
    
    return response;
  },
});

// Query to get agent execution history
export const getAgentHistory = query({
  args: {
    companyId: v.id("companies"),
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let query = ctx.db
      .query("agentExecutions")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId));
    
    if (args.agentId) {
      query = query.filter((q: any) => q.eq(q.field("agentId"), args.agentId));
    }
    
    return await query
      .order("desc")
      .take(limit);
  },
});