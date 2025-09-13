/**
 * AI Agent Executor System
 * Unified system for executing 25 specialized financial AI agents
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import OpenAI from "openai";
import { Doc, Id } from "../_generated/dataModel";

// Initialize OpenAI client (only if API key is available)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Agent type definitions
export type AgentType = 
  | "cfo_copilot"
  | "cash_flow_forecast"
  | "anomaly_detection"
  | "expense_analyzer"
  | "revenue_optimizer"
  | "budget_variance"
  | "accounts_receivable"
  | "accounts_payable"
  | "profitability_analysis"
  | "working_capital"
  | "tax_optimizer"
  | "compliance_monitor"
  | "vendor_analysis"
  | "customer_insights"
  | "inventory_optimizer"
  | "risk_assessment"
  | "investment_analyzer"
  | "debt_management"
  | "pricing_strategy"
  | "cost_reduction"
  | "forecast_accuracy"
  | "benchmark_analysis"
  | "scenario_planner"
  | "merger_acquisition"
  | "sustainability_metrics";

// Agent configurations
export const AGENT_CONFIGS: Record<AgentType, {
  name: string;
  category: "financial_analysis" | "forecasting" | "compliance" | "optimization" | "reporting";
  description: string;
  capabilities: string[];
  promptTemplate: string;
  contextRequirements: string[];
  model: string;
  maxTokens: number;
  temperature: number;
  icon: string;
  color: string;
}> = {
  cfo_copilot: {
    name: "CFO Copilot",
    category: "financial_analysis",
    description: "Your AI CFO providing strategic financial insights and recommendations",
    capabilities: [
      "Executive financial summary",
      "Strategic recommendations",
      "KPI analysis",
      "Board report preparation",
      "Financial health assessment"
    ],
    promptTemplate: `You are an experienced CFO analyzing {company}'s financial data.

Current Financial Metrics:
{metrics}

Recent Transactions:
{transactions}

Account Balances:
{accounts}

User Question: {query}

Provide strategic financial insights with:
1. Current situation analysis
2. Key findings and concerns
3. Actionable recommendations
4. Risk assessment
5. Strategic next steps

Format your response for executive-level decision making.`,
    contextRequirements: ["metrics", "transactions", "accounts"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.7,
    icon: "💼",
    color: "#1E40AF"
  },

  cash_flow_forecast: {
    name: "Cash Flow Forecast",
    category: "forecasting",
    description: "13-week rolling cash flow predictions with scenario modeling",
    capabilities: [
      "13-week cash flow projection",
      "Scenario modeling",
      "Cash runway analysis",
      "Liquidity planning",
      "Working capital optimization"
    ],
    promptTemplate: `Analyze the cash flow data and create a 13-week forecast.

Historical Cash Flow Data:
{transactions}

Current Cash Position: {currentCash}
Receivables: {receivables}
Payables: {payables}

Question: {query}

Provide:
1. Weekly cash flow projections for 13 weeks
2. Key assumptions used
3. Confidence levels (High/Medium/Low)
4. Risk factors that could impact projections
5. Recommendations for improving cash position

Include specific numbers and dates.`,
    contextRequirements: ["transactions", "currentCash", "receivables", "payables"],
    model: "gpt-4",
    maxTokens: 2000,
    temperature: 0.5,
    icon: "📊",
    color: "#059669"
  },

  anomaly_detection: {
    name: "Anomaly Detection",
    category: "compliance",
    description: "AI-powered detection of unusual transactions and patterns",
    capabilities: [
      "Transaction anomaly detection",
      "Pattern recognition",
      "Fraud risk assessment",
      "Duplicate detection",
      "Statistical outlier analysis"
    ],
    promptTemplate: `Analyze transactions for anomalies and suspicious patterns.

Recent Transactions:
{transactions}

Historical Patterns:
{historicalData}

Question: {query}

Identify:
1. Unusual transactions (amount, timing, frequency)
2. Statistical outliers (>2 standard deviations)
3. Suspicious patterns or behaviors
4. Potential duplicate transactions
5. Risk level for each anomaly (High/Medium/Low)

Use statistical analysis and pattern recognition.`,
    contextRequirements: ["transactions", "historicalData"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.3,
    icon: "🔍",
    color: "#DC2626"
  },

  expense_analyzer: {
    name: "Expense Analyzer",
    category: "optimization",
    description: "Deep dive into expense categories with cost reduction opportunities",
    capabilities: [
      "Expense categorization",
      "Trend analysis",
      "Cost reduction identification",
      "Budget comparison",
      "Vendor spend analysis"
    ],
    promptTemplate: `Analyze expense data for optimization opportunities.

Expense Data:
{expenses}

Budget Information:
{budget}

Question: {query}

Provide:
1. Expense breakdown by category
2. Month-over-month trends
3. Top 5 cost reduction opportunities
4. Budget variance analysis
5. Specific action items with estimated savings

Focus on actionable insights.`,
    contextRequirements: ["expenses", "budget"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "💰",
    color: "#7C3AED"
  },

  revenue_optimizer: {
    name: "Revenue Optimizer",
    category: "optimization",
    description: "Maximize revenue through pricing, upsell, and growth strategies",
    capabilities: [
      "Revenue trend analysis",
      "Customer segmentation",
      "Pricing optimization",
      "Upsell opportunities",
      "Churn analysis"
    ],
    promptTemplate: `Analyze revenue data for growth opportunities.

Revenue Data:
{revenue}

Customer Data:
{customers}

Question: {query}

Identify:
1. Revenue trends and patterns
2. Top performing segments/products
3. Pricing optimization opportunities
4. Upsell/cross-sell potential
5. Growth strategies with expected impact

Provide specific, data-driven recommendations.`,
    contextRequirements: ["revenue", "customers"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.6,
    icon: "📈",
    color: "#10B981"
  },

  budget_variance: {
    name: "Budget Variance Analyst",
    category: "reporting",
    description: "Analyze budget vs actual performance with variance explanations",
    capabilities: [
      "Variance calculation",
      "Root cause analysis",
      "Trend identification",
      "Forecast adjustments",
      "Department comparisons"
    ],
    promptTemplate: `Analyze budget variance and explain deviations.

Budget Data:
{budget}

Actual Data:
{actuals}

Period: {period}

Question: {query}

Provide:
1. Variance summary (amount and percentage)
2. Top 5 positive and negative variances
3. Root cause analysis for major variances
4. Trend analysis
5. Recommendations for budget adjustments

Include specific numbers and percentages.`,
    contextRequirements: ["budget", "actuals", "period"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.4,
    icon: "📋",
    color: "#F59E0B"
  },

  accounts_receivable: {
    name: "AR Specialist",
    category: "financial_analysis",
    description: "Optimize collections and reduce DSO",
    capabilities: [
      "Aging analysis",
      "Collection prioritization",
      "DSO calculation",
      "Credit risk assessment",
      "Payment prediction"
    ],
    promptTemplate: `Analyze accounts receivable for collection optimization.

AR Data:
{receivables}

Customer Payment History:
{paymentHistory}

Question: {query}

Provide:
1. AR aging summary
2. DSO calculation and trend
3. High-risk accounts
4. Collection priorities
5. Strategies to improve cash collection

Focus on actionable collection strategies.`,
    contextRequirements: ["receivables", "paymentHistory"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "📬",
    color: "#0891B2"
  },

  accounts_payable: {
    name: "AP Optimizer",
    category: "financial_analysis",
    description: "Optimize payment timing and vendor relationships",
    capabilities: [
      "Payment scheduling",
      "Cash flow optimization",
      "Discount capture",
      "Vendor analysis",
      "DPO optimization"
    ],
    promptTemplate: `Analyze accounts payable for payment optimization.

AP Data:
{payables}

Cash Position:
{cashPosition}

Vendor Terms:
{vendorTerms}

Question: {query}

Provide:
1. Payment priority schedule
2. Early payment discount opportunities
3. Cash flow impact analysis
4. Vendor relationship insights
5. DPO optimization strategies

Balance cash flow with vendor relationships.`,
    contextRequirements: ["payables", "cashPosition", "vendorTerms"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "📤",
    color: "#EA580C"
  },

  profitability_analysis: {
    name: "Profit Analyst",
    category: "financial_analysis",
    description: "Deep profitability analysis by product, customer, and segment",
    capabilities: [
      "Gross margin analysis",
      "Product profitability",
      "Customer profitability",
      "Segment analysis",
      "Break-even analysis"
    ],
    promptTemplate: `Analyze profitability across dimensions.

Revenue Data:
{revenue}

Cost Data:
{costs}

Segment Data:
{segments}

Question: {query}

Provide:
1. Overall profitability metrics
2. Profitability by product/service
3. Profitability by customer segment
4. Margin trends
5. Improvement recommendations

Include specific margins and percentages.`,
    contextRequirements: ["revenue", "costs", "segments"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.5,
    icon: "💎",
    color: "#9333EA"
  },

  working_capital: {
    name: "Working Capital Manager",
    category: "optimization",
    description: "Optimize working capital and improve cash conversion cycle",
    capabilities: [
      "Cash conversion cycle",
      "Working capital trends",
      "Inventory optimization",
      "Payment term analysis",
      "Capital efficiency"
    ],
    promptTemplate: `Analyze working capital for optimization.

Working Capital Components:
{workingCapital}

Operational Metrics:
{operations}

Question: {query}

Calculate and analyze:
1. Cash conversion cycle
2. Working capital trends
3. Component optimization opportunities
4. Industry benchmarks
5. Improvement strategies with impact

Provide specific metrics and recommendations.`,
    contextRequirements: ["workingCapital", "operations"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "🔄",
    color: "#0EA5E9"
  },

  tax_optimizer: {
    name: "Tax Strategist",
    category: "compliance",
    description: "Tax optimization strategies and compliance monitoring",
    capabilities: [
      "Tax liability estimation",
      "Deduction identification",
      "Tax planning strategies",
      "Compliance monitoring",
      "Quarter-end preparation"
    ],
    promptTemplate: `Analyze financial data for tax optimization.

Financial Data:
{financials}

Tax Information:
{taxInfo}

Question: {query}

Provide:
1. Estimated tax liability
2. Available deductions and credits
3. Tax optimization strategies
4. Compliance status
5. Quarter/year-end preparation items

Note: This is general guidance, not tax advice.`,
    contextRequirements: ["financials", "taxInfo"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.3,
    icon: "🏛️",
    color: "#6366F1"
  },

  compliance_monitor: {
    name: "Compliance Guardian",
    category: "compliance",
    description: "Monitor regulatory compliance and identify risks",
    capabilities: [
      "Compliance checking",
      "Risk identification",
      "Audit preparation",
      "Policy monitoring",
      "Regulatory updates"
    ],
    promptTemplate: `Monitor compliance and identify risks.

Transaction Data:
{transactions}

Compliance Rules:
{rules}

Question: {query}

Identify:
1. Compliance status summary
2. Potential violations or risks
3. Audit readiness assessment
4. Required documentation
5. Remediation recommendations

Focus on risk mitigation.`,
    contextRequirements: ["transactions", "rules"],
    model: "gpt-4",
    maxTokens: 1200,
    temperature: 0.2,
    icon: "⚖️",
    color: "#991B1B"
  },

  vendor_analysis: {
    name: "Vendor Analyst",
    category: "optimization",
    description: "Analyze vendor spend and identify consolidation opportunities",
    capabilities: [
      "Vendor spend analysis",
      "Price comparison",
      "Consolidation opportunities",
      "Contract optimization",
      "Performance metrics"
    ],
    promptTemplate: `Analyze vendor relationships and spending.

Vendor Data:
{vendors}

Spending History:
{spending}

Question: {query}

Provide:
1. Top vendors by spend
2. Spending trends by vendor
3. Consolidation opportunities
4. Price optimization potential
5. Vendor performance insights

Include specific savings opportunities.`,
    contextRequirements: ["vendors", "spending"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "🤝",
    color: "#65A30D"
  },

  customer_insights: {
    name: "Customer Intelligence",
    category: "reporting",
    description: "Deep customer analytics for retention and growth",
    capabilities: [
      "Customer segmentation",
      "Lifetime value analysis",
      "Churn prediction",
      "Behavior patterns",
      "Growth opportunities"
    ],
    promptTemplate: `Analyze customer data for insights.

Customer Data:
{customers}

Transaction History:
{transactions}

Question: {query}

Provide:
1. Customer segmentation analysis
2. Top customers by value
3. Churn risk assessment
4. Growth opportunities
5. Retention strategies

Focus on actionable customer insights.`,
    contextRequirements: ["customers", "transactions"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.6,
    icon: "👥",
    color: "#EC4899"
  },

  inventory_optimizer: {
    name: "Inventory Optimizer",
    category: "optimization",
    description: "Optimize inventory levels and reduce carrying costs",
    capabilities: [
      "Inventory turnover",
      "Reorder optimization",
      "Dead stock identification",
      "Carrying cost analysis",
      "Demand forecasting"
    ],
    promptTemplate: `Analyze inventory for optimization.

Inventory Data:
{inventory}

Sales Data:
{sales}

Question: {query}

Provide:
1. Inventory turnover analysis
2. Optimal reorder points
3. Dead/slow-moving stock
4. Carrying cost impact
5. Optimization recommendations

Include specific metrics and actions.`,
    contextRequirements: ["inventory", "sales"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "📦",
    color: "#84CC16"
  },

  risk_assessment: {
    name: "Risk Assessor",
    category: "compliance",
    description: "Identify and quantify financial and operational risks",
    capabilities: [
      "Risk identification",
      "Risk scoring",
      "Mitigation strategies",
      "Scenario analysis",
      "Risk monitoring"
    ],
    promptTemplate: `Assess financial and operational risks.

Financial Data:
{financials}

Operational Data:
{operations}

Question: {query}

Identify:
1. Top 5 financial risks
2. Risk scores (High/Medium/Low)
3. Potential impact assessment
4. Mitigation strategies
5. Monitoring recommendations

Provide quantified risk analysis.`,
    contextRequirements: ["financials", "operations"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.4,
    icon: "⚠️",
    color: "#F97316"
  },

  investment_analyzer: {
    name: "Investment Analyst",
    category: "financial_analysis",
    description: "Analyze investment opportunities and ROI",
    capabilities: [
      "ROI calculation",
      "NPV analysis",
      "Payback period",
      "Risk assessment",
      "Portfolio analysis"
    ],
    promptTemplate: `Analyze investment opportunities.

Investment Options:
{investments}

Financial Metrics:
{metrics}

Question: {query}

Calculate and analyze:
1. ROI for each option
2. NPV and IRR
3. Payback periods
4. Risk assessment
5. Recommendations with rationale

Use financial modeling best practices.`,
    contextRequirements: ["investments", "metrics"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.5,
    icon: "📊",
    color: "#14B8A6"
  },

  debt_management: {
    name: "Debt Manager",
    category: "optimization",
    description: "Optimize debt structure and repayment strategies",
    capabilities: [
      "Debt analysis",
      "Interest optimization",
      "Refinancing opportunities",
      "Payment strategies",
      "Leverage ratios"
    ],
    promptTemplate: `Analyze debt structure for optimization.

Debt Portfolio:
{debt}

Cash Flow:
{cashFlow}

Question: {query}

Provide:
1. Debt summary and structure
2. Interest rate analysis
3. Refinancing opportunities
4. Optimal payment strategy
5. Leverage ratio analysis

Focus on cost reduction and optimization.`,
    contextRequirements: ["debt", "cashFlow"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "💳",
    color: "#BE123C"
  },

  pricing_strategy: {
    name: "Pricing Strategist",
    category: "optimization",
    description: "Optimize pricing for maximum profitability",
    capabilities: [
      "Price elasticity",
      "Competitive analysis",
      "Margin optimization",
      "Bundle pricing",
      "Dynamic pricing"
    ],
    promptTemplate: `Analyze pricing for optimization.

Pricing Data:
{pricing}

Market Data:
{market}

Cost Structure:
{costs}

Question: {query}

Provide:
1. Current pricing analysis
2. Price elasticity insights
3. Competitive positioning
4. Optimization recommendations
5. Expected impact on revenue/margin

Use data-driven pricing strategies.`,
    contextRequirements: ["pricing", "market", "costs"],
    model: "gpt-4",
    maxTokens: 1500,
    temperature: 0.6,
    icon: "🏷️",
    color: "#A21CAF"
  },

  cost_reduction: {
    name: "Cost Cutter",
    category: "optimization",
    description: "Identify and prioritize cost reduction opportunities",
    capabilities: [
      "Cost analysis",
      "Savings identification",
      "Process optimization",
      "Vendor negotiation",
      "Efficiency metrics"
    ],
    promptTemplate: `Identify cost reduction opportunities.

Cost Data:
{costs}

Operational Data:
{operations}

Question: {query}

Identify:
1. Top 10 cost reduction opportunities
2. Estimated savings for each
3. Implementation difficulty
4. Quick wins vs long-term projects
5. Action plan with timeline

Prioritize by impact and feasibility.`,
    contextRequirements: ["costs", "operations"],
    model: "gpt-3.5-turbo",
    maxTokens: 1500,
    temperature: 0.5,
    icon: "✂️",
    color: "#E11D48"
  },

  forecast_accuracy: {
    name: "Forecast Validator",
    category: "forecasting",
    description: "Analyze forecast accuracy and improve predictions",
    capabilities: [
      "Accuracy metrics",
      "Variance analysis",
      "Model improvement",
      "Confidence intervals",
      "Trend validation"
    ],
    promptTemplate: `Analyze forecast accuracy and improve predictions.

Forecast Data:
{forecasts}

Actual Data:
{actuals}

Question: {query}

Analyze:
1. Forecast accuracy metrics (MAPE, MAE)
2. Systematic biases
3. Confidence intervals
4. Model improvement suggestions
5. Adjusted forecasts

Use statistical methods for validation.`,
    contextRequirements: ["forecasts", "actuals"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.4,
    icon: "🎯",
    color: "#0D9488"
  },

  benchmark_analysis: {
    name: "Benchmark Analyst",
    category: "reporting",
    description: "Compare performance against industry benchmarks",
    capabilities: [
      "Industry comparison",
      "KPI benchmarking",
      "Gap analysis",
      "Best practices",
      "Performance ranking"
    ],
    promptTemplate: `Compare performance to industry benchmarks.

Company Metrics:
{metrics}

Industry Benchmarks:
{benchmarks}

Question: {query}

Provide:
1. Performance vs benchmarks
2. Strengths and weaknesses
3. Gap analysis
4. Improvement priorities
5. Best practice recommendations

Use percentile rankings where applicable.`,
    contextRequirements: ["metrics", "benchmarks"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "📏",
    color: "#4F46E5"
  },

  scenario_planner: {
    name: "Scenario Planner",
    category: "forecasting",
    description: "Model financial scenarios and stress tests",
    capabilities: [
      "Scenario modeling",
      "Sensitivity analysis",
      "Stress testing",
      "What-if analysis",
      "Monte Carlo simulation"
    ],
    promptTemplate: `Model financial scenarios and impacts.

Base Case Data:
{baseCase}

Scenarios:
{scenarios}

Question: {query}

Model:
1. Best case scenario
2. Base case scenario
3. Worst case scenario
4. Sensitivity to key variables
5. Recommended contingency plans

Include probability assessments.`,
    contextRequirements: ["baseCase", "scenarios"],
    model: "gpt-4",
    maxTokens: 2000,
    temperature: 0.6,
    icon: "🎭",
    color: "#06B6D4"
  },

  merger_acquisition: {
    name: "M&A Advisor",
    category: "financial_analysis",
    description: "Analyze M&A opportunities and synergies",
    capabilities: [
      "Valuation analysis",
      "Synergy identification",
      "Due diligence",
      "Integration planning",
      "Deal structuring"
    ],
    promptTemplate: `Analyze M&A opportunity.

Target Company Data:
{target}

Financial Projections:
{projections}

Question: {query}

Analyze:
1. Valuation assessment
2. Synergy opportunities
3. Risk factors
4. Integration challenges
5. Deal recommendation

Provide comprehensive M&A analysis.`,
    contextRequirements: ["target", "projections"],
    model: "gpt-4",
    maxTokens: 2000,
    temperature: 0.5,
    icon: "🤝",
    color: "#7C2D12"
  },

  sustainability_metrics: {
    name: "ESG Analyst",
    category: "reporting",
    description: "Track and analyze ESG and sustainability metrics",
    capabilities: [
      "Carbon footprint",
      "ESG scoring",
      "Sustainability KPIs",
      "Impact measurement",
      "Reporting compliance"
    ],
    promptTemplate: `Analyze ESG and sustainability metrics.

Environmental Data:
{environmental}

Social Data:
{social}

Governance Data:
{governance}

Question: {query}

Provide:
1. ESG performance summary
2. Key sustainability metrics
3. Improvement opportunities
4. Compliance status
5. Stakeholder impact

Align with reporting standards.`,
    contextRequirements: ["environmental", "social", "governance"],
    model: "gpt-3.5-turbo",
    maxTokens: 1200,
    temperature: 0.5,
    icon: "🌿",
    color: "#16A34A"
  }
};

// Cache implementation
const responseCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(agentId: string, query: string, context: any): string {
  return `${agentId}:${query}:${JSON.stringify(context)}`;
}

// Main execution function
export const executeAgent = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    agentType: v.string(),
    query: v.string(),
    sessionId: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Get agent configuration
    const agentConfig = AGENT_CONFIGS[args.agentType as AgentType];
    if (!agentConfig) {
      throw new Error(`Unknown agent type: ${args.agentType}`);
    }

    // Check cache
    const cacheKey = getCacheKey(args.agentType, args.query, args.context);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Record cached response
      await ctx.db.insert("agentExecutions", {
        companyId: args.companyId,
        userId: args.userId,
        agentId: args.agentType,
        sessionId: args.sessionId,
        query: args.query,
        context: args.context || { metrics: {} },
        response: cached.response,
        model: agentConfig.model,
        promptUsed: agentConfig.promptTemplate,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
        },
        executionTime: Date.now() - startTime,
        status: "cached",
        cacheKey,
        createdAt: Date.now(),
      });
      
      return cached.response;
    }

    try {
      // Fetch required context data
      const contextData = await fetchContextData(ctx, args.companyId, agentConfig.contextRequirements);
      
      // Build the prompt
      const prompt = buildPrompt(agentConfig.promptTemplate, {
        company: "Your Company", // Get from company record
        query: args.query,
        ...contextData,
        ...args.context,
      });

      // Execute with OpenAI (if available)
      let responseContent = "";
      let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 };
      
      if (openai) {
        const completion = await openai.chat.completions.create({
          model: agentConfig.model,
          messages: [
            {
              role: "system",
              content: "You are a financial AI assistant providing accurate, data-driven insights. Always be specific with numbers and dates."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: agentConfig.maxTokens,
          temperature: agentConfig.temperature,
        });

        responseContent = completion.choices[0].message.content || "";
        tokenUsage = {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          cost: calculateCost(
            completion.usage?.prompt_tokens || 0,
            completion.usage?.completion_tokens || 0,
            agentConfig.model
          ),
        };
      } else {
        // Mock response when OpenAI is not available
        responseContent = `[Mock Response] Agent ${args.agentType} would analyze: "${args.query}"\n\nNote: OpenAI API key not configured. Please set OPENAI_API_KEY environment variable for actual AI responses.`;
        console.warn('[AI Agent] OpenAI API key not configured, returning mock response');
      }
      
      // Parse response for structured data
      const structuredResponse = parseAgentResponse(responseContent, args.agentType as AgentType);

      // Store execution record
      await ctx.db.insert("agentExecutions", {
        companyId: args.companyId,
        userId: args.userId,
        agentId: args.agentType,
        sessionId: args.sessionId,
        query: args.query,
        context: args.context || { metrics: {} },
        response: structuredResponse,
        model: agentConfig.model,
        promptUsed: prompt,
        tokenUsage,
        executionTime: Date.now() - startTime,
        status: "success",
        cacheKey,
        createdAt: Date.now(),
      });

      // Update session if provided
      if (args.sessionId) {
        await updateSession(ctx, args.sessionId, tokenUsage);
      }

      // Cache the response
      responseCache.set(cacheKey, {
        response: structuredResponse,
        timestamp: Date.now(),
      });

      return structuredResponse;
      
    } catch (error: any) {
      // Store error execution
      await ctx.db.insert("agentExecutions", {
        companyId: args.companyId,
        userId: args.userId,
        agentId: args.agentType,
        sessionId: args.sessionId,
        query: args.query,
        context: args.context || { metrics: {} },
        response: {
          content: "An error occurred while processing your request.",
          confidence: 0,
        },
        model: agentConfig.model,
        promptUsed: agentConfig.promptTemplate,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
        },
        executionTime: Date.now() - startTime,
        status: "error",
        error: error.message,
        createdAt: Date.now(),
      });
      
      throw error;
    }
  },
});

// Helper functions
async function fetchContextData(
  ctx: any,
  companyId: Id<"companies">,
  requirements: string[]
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};
  
  for (const requirement of requirements) {
    switch (requirement) {
      case "metrics":
        // Fetch key metrics
        const accounts = await ctx.db
          .query("accounts")
          .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
          .take(100);
        
        context.metrics = {
          totalAssets: accounts
            .filter((a: any) => a.classification === "Asset")
            .reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0),
          totalLiabilities: accounts
            .filter((a: any) => a.classification === "Liability")
            .reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0),
          totalEquity: accounts
            .filter((a: any) => a.classification === "Equity")
            .reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0),
        };
        break;
        
      case "transactions":
        // Fetch recent transactions
        context.transactions = await ctx.db
          .query("transactions")
          .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
          .order("desc")
          .take(50);
        break;
        
      case "accounts":
        // Fetch chart of accounts
        context.accounts = await ctx.db
          .query("accounts")
          .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
          .collect();
        break;
        
      case "currentCash":
        // Calculate current cash position
        const cashAccounts = await ctx.db
          .query("accounts")
          .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
          .filter((q: any) => q.eq(q.field("accountType"), "Bank"))
          .collect();
        
        context.currentCash = cashAccounts.reduce(
          (sum: number, a: any) => sum + (a.currentBalance || 0),
          0
        );
        break;
        
      case "receivables":
        // Fetch AR data
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_user")
          .take(100);
        
        context.receivables = invoices.reduce(
          (sum: number, inv: any) => sum + (inv.balance || 0),
          0
        );
        break;
        
      case "payables":
        // Fetch AP data
        const bills = await ctx.db
          .query("bills")
          .withIndex("by_user")
          .take(100);
        
        context.payables = bills.reduce(
          (sum: number, bill: any) => sum + (bill.balance || 0),
          0
        );
        break;
    }
  }
  
  return context;
}

function buildPrompt(template: string, data: Record<string, any>): string {
  let prompt = template;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    const replacement = typeof value === "object" 
      ? JSON.stringify(value, null, 2)
      : String(value);
    
    prompt = prompt.replace(new RegExp(placeholder, "g"), replacement);
  }
  
  return prompt;
}

function parseAgentResponse(content: string, agentType: AgentType): any {
  // Extract structured data from response
  const response: any = {
    content,
    confidence: 0.85, // Default confidence
  };
  
  // Try to extract charts data
  const chartMatch = content.match(/\[CHART:(.*?)\]/s);
  if (chartMatch) {
    try {
      response.charts = JSON.parse(chartMatch[1]);
    } catch {}
  }
  
  // Try to extract insights
  const insightMatches = content.match(/\[INSIGHT:(.*?)\]/g);
  if (insightMatches) {
    response.insights = insightMatches.map(m => m.replace(/\[INSIGHT:|]/g, "").trim());
  }
  
  // Try to extract recommendations
  const recMatches = content.match(/\[RECOMMENDATION:(.*?)\]/g);
  if (recMatches) {
    response.recommendations = recMatches.map(m => m.replace(/\[RECOMMENDATION:|]/g, "").trim());
  }
  
  // Extract confidence if mentioned
  const confidenceMatch = content.match(/confidence[:\s]+(\d+(?:\.\d+)?)/i);
  if (confidenceMatch) {
    response.confidence = parseFloat(confidenceMatch[1]) / 100;
  }
  
  return response;
}

function calculateCost(promptTokens: number, completionTokens: number, model: string): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    "gpt-4": { prompt: 0.03, completion: 0.06 },
    "gpt-3.5-turbo": { prompt: 0.001, completion: 0.002 },
  };
  
  const modelPricing = pricing[model] || pricing["gpt-3.5-turbo"];
  
  return (
    (promptTokens / 1000) * modelPricing.prompt +
    (completionTokens / 1000) * modelPricing.completion
  );
}

async function updateSession(ctx: any, sessionId: string, tokenUsage: any) {
  const sessions = await ctx.db
    .query("agentSessions")
    .withIndex("by_session_id", (q: any) => q.eq("sessionId", sessionId))
    .collect();
  
  if (sessions.length > 0) {
    const session = sessions[0];
    await ctx.db.patch(session._id, {
      messageCount: session.messageCount + 1,
      totalTokens: session.totalTokens + tokenUsage.totalTokens,
      totalCost: session.totalCost + tokenUsage.cost,
      lastActivityAt: Date.now(),
    });
  }
}

// Query to get available agents
export const getAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = Object.entries(AGENT_CONFIGS).map(([id, config]) => ({
      id,
      ...config,
    }));
    
    return agents;
  },
});

// Query to get agent execution history
export const getAgentHistory = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agentExecutions")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId));
    
    if (args.userId) {
      query = query.filter((q: any) => q.eq(q.field("userId"), args.userId));
    }
    
    if (args.agentId) {
      query = query.filter((q: any) => q.eq(q.field("agentId"), args.agentId));
    }
    
    return query
      .order("desc")
      .take(args.limit || 50);
  },
});