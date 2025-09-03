import { action, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Context Engine for CFO Copilot
// Provides context-aware responses and proactive insights based on data patterns

interface UserContext {
  organizationId: string;
  userId?: string;
  role: string;
  recentQueries: string[];
  preferences: {
    defaultTimeframe: string;
    favoriteMetrics: string[];
    alertThresholds: Record<string, number>;
    reportFormats: string[];
  };
  currentSession: {
    startTime: string;
    queryCount: number;
    focusAreas: string[];
  };
}

interface DataContext {
  organizationId: string;
  currentPeriod: string;
  latestData: {
    lastUpdated: string;
    completeness: number;
    dataQuality: number;
  };
  trends: {
    revenue: TrendData;
    expenses: TrendData;
    cashFlow: TrendData;
    profitability: TrendData;
  };
  anomalies: AnomalyData[];
  alerts: AlertData[];
  seasonalPatterns: SeasonalData;
}

interface TrendData {
  direction: "up" | "down" | "stable";
  magnitude: number;
  confidence: number;
  timeframe: string;
  keyDrivers: string[];
}

interface AnomalyData {
  id: string;
  type: "expense_spike" | "revenue_drop" | "cash_anomaly" | "pattern_break";
  severity: "low" | "medium" | "high" | "critical";
  detected: string;
  description: string;
  suggestedActions: string[];
  confidence: number;
}

interface AlertData {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  triggered: string;
  acknowledged: boolean;
  relatedMetrics: string[];
}

interface SeasonalData {
  patterns: {
    metric: string;
    seasonality: "monthly" | "quarterly" | "yearly";
    peakPeriods: string[];
    lowPeriods: string[];
    variance: number;
  }[];
  adjustments: Record<string, number>;
}

interface ProactiveInsight {
  id: string;
  type: "opportunity" | "risk" | "trend" | "anomaly" | "optimization";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: string;
  confidence: number;
  suggestedActions: string[];
  relatedData: any[];
  expires?: string;
}

export const getUserContext = query({
  args: {
    organizationId: v.string(),
    userId: v.optional(v.string())
  },
  handler: async (ctx, args): Promise<UserContext> => {
    // In a real implementation, this would query user preferences and history
    return {
      organizationId: args.organizationId,
      userId: args.userId,
      role: "CFO", // Would be determined from user data
      recentQueries: [
        "show cash flow this month",
        "compare revenue this quarter vs last quarter",
        "analyze expense anomalies"
      ],
      preferences: {
        defaultTimeframe: "month",
        favoriteMetrics: ["cash_flow", "revenue", "gross_margin"],
        alertThresholds: {
          cash_runway: 90, // days
          expense_variance: 15, // percentage
          revenue_decline: 10 // percentage
        },
        reportFormats: ["pdf", "excel"]
      },
      currentSession: {
        startTime: new Date().toISOString(),
        queryCount: 3,
        focusAreas: ["cash_management", "expense_control"]
      }
    };
  }
});

export const getDataContext = query({
  args: {
    organizationId: v.string()
  },
  handler: async (ctx, args): Promise<DataContext> => {
    // Mock data context - would analyze actual financial data
    const now = new Date();
    
    return {
      organizationId: args.organizationId,
      currentPeriod: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
      latestData: {
        lastUpdated: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        completeness: 0.95,
        dataQuality: 0.92
      },
      trends: {
        revenue: {
          direction: "up",
          magnitude: 0.152, // 15.2%
          confidence: 0.87,
          timeframe: "3_months",
          keyDrivers: ["product_sales", "service_revenue", "international_expansion"]
        },
        expenses: {
          direction: "up",
          magnitude: 0.082, // 8.2%
          confidence: 0.91,
          timeframe: "3_months",
          keyDrivers: ["marketing_spend", "headcount_growth", "infrastructure_costs"]
        },
        cashFlow: {
          direction: "stable",
          magnitude: 0.032, // 3.2%
          confidence: 0.78,
          timeframe: "3_months",
          keyDrivers: ["improved_collections", "vendor_terms", "seasonal_variation"]
        },
        profitability: {
          direction: "up",
          magnitude: 0.243, // 24.3%
          confidence: 0.83,
          timeframe: "3_months",
          keyDrivers: ["margin_improvement", "cost_optimization", "revenue_mix"]
        }
      },
      anomalies: [
        {
          id: "anom_001",
          type: "expense_spike",
          severity: "medium",
          detected: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          description: "Marketing expenses increased by 34% above normal patterns",
          suggestedActions: [
            "Review marketing campaign ROI",
            "Verify vendor billing accuracy",
            "Analyze campaign effectiveness metrics"
          ],
          confidence: 0.89
        },
        {
          id: "anom_002",
          type: "cash_anomaly",
          severity: "high",
          detected: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
          description: "Unusual large cash outflow detected - $125k transaction",
          suggestedActions: [
            "Verify transaction authorization",
            "Check for duplicate payments",
            "Review cash management controls"
          ],
          confidence: 0.95
        }
      ],
      alerts: [
        {
          id: "alert_001",
          type: "cash_runway",
          severity: "warning",
          message: "Cash runway decreased to 67 days (below 90-day threshold)",
          triggered: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          acknowledged: false,
          relatedMetrics: ["cash_balance", "burn_rate", "collections"]
        }
      ],
      seasonalPatterns: {
        patterns: [
          {
            metric: "revenue",
            seasonality: "quarterly",
            peakPeriods: ["Q4", "Q1"],
            lowPeriods: ["Q3"],
            variance: 0.18
          },
          {
            metric: "expenses",
            seasonality: "monthly",
            peakPeriods: ["January", "July"],
            lowPeriods: ["February", "August"],
            variance: 0.12
          }
        ],
        adjustments: {
          "Q1": 1.15,
          "Q2": 1.02,
          "Q3": 0.89,
          "Q4": 1.23
        }
      }
    };
  }
});

export const generateProactiveInsights = action({
  args: {
    organizationId: v.string(),
    userContext: v.optional(v.any()),
    dataContext: v.optional(v.any()),
    triggerEvent: v.optional(v.string())
  },
  handler: async (ctx, args): Promise<ProactiveInsight[]> => {
    const { organizationId, userContext, dataContext, triggerEvent } = args;
    
    const insights: ProactiveInsight[] = [];
    const now = new Date();

    // Generate insights based on current context and data patterns
    
    // 1. Cash Flow Optimization Opportunity
    if (dataContext?.trends?.cashFlow?.direction === "stable" && 
        dataContext?.trends?.revenue?.direction === "up") {
      insights.push({
        id: "insight_cash_opt",
        type: "opportunity",
        priority: "high",
        title: "Cash Flow Optimization Opportunity",
        description: "With revenue growing 15.2% but cash flow remaining stable, there's potential to optimize working capital management.",
        impact: "Could improve cash position by $85K-120K monthly",
        confidence: 0.82,
        suggestedActions: [
          "/optimize working_capital",
          "/analyze accounts_receivable collection_time",
          "/compare payment_terms vs industry"
        ],
        relatedData: ["cash_conversion_cycle", "dso", "dpo"],
        expires: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
    }

    // 2. Expense Anomaly Risk Alert
    if (dataContext?.anomalies?.some(a => a.severity === "medium" || a.severity === "high")) {
      insights.push({
        id: "insight_expense_risk",
        type: "risk",
        priority: "medium",
        title: "Expense Pattern Anomalies Detected",
        description: "Multiple expense categories showing unusual patterns that could indicate control issues or billing errors.",
        impact: "Potential cost leakage of $15K-45K monthly",
        confidence: 0.76,
        suggestedActions: [
          "/analyze expense_anomalies detailed",
          "/compare expense_trends vs budget",
          "/alert expense_variance 10%"
        ],
        relatedData: ["expense_categories", "vendor_spend", "budget_variance"]
      });
    }

    // 3. Seasonal Revenue Planning
    if (dataContext?.seasonalPatterns?.patterns?.some(p => 
        p.metric === "revenue" && p.peakPeriods.includes(getCurrentQuarter()))) {
      insights.push({
        id: "insight_seasonal_plan",
        type: "opportunity",
        priority: "medium",
        title: "Seasonal Revenue Peak Approaching",
        description: "Historical data shows this quarter typically sees 23% revenue increase. Plan for capacity and cash flow needs.",
        impact: "Revenue opportunity: $340K-480K additional",
        confidence: 0.91,
        suggestedActions: [
          "/forecast revenue seasonal_peak",
          "/optimize inventory_levels peak_demand",
          "/report cash_flow_planning Q4"
        ],
        relatedData: ["seasonal_revenue", "capacity_planning", "inventory_turnover"]
      });
    }

    // 4. Profitability Trend Insight
    if (dataContext?.trends?.profitability?.direction === "up" && 
        dataContext?.trends?.profitability?.magnitude > 0.2) {
      insights.push({
        id: "insight_profit_trend",
        type: "trend",
        priority: "high",
        title: "Strong Profitability Momentum",
        description: "Profit margins have improved by 24.3% over 3 months, driven by cost optimization and revenue mix improvements.",
        impact: "Sustainable margin improvement trajectory",
        confidence: 0.88,
        suggestedActions: [
          "/analyze profitability_drivers detailed",
          "/forecast profit_margins next_quarter",
          "/report investor_update profitability_focus"
        ],
        relatedData: ["gross_margin", "operating_margin", "cost_structure"]
      });
    }

    // 5. Data Quality Alert
    if (dataContext?.latestData?.dataQuality < 0.95 || 
        dataContext?.latestData?.completeness < 0.98) {
      insights.push({
        id: "insight_data_quality",
        type: "risk",
        priority: "medium",
        title: "Data Quality Attention Needed",
        description: "Recent data completeness is at 95% with quality score of 92%. This may impact analysis accuracy.",
        impact: "Risk of inaccurate financial insights",
        confidence: 0.99,
        suggestedActions: [
          "Review data integration processes",
          "Validate recent transaction imports",
          "Check for missing account mappings"
        ],
        relatedData: ["data_imports", "account_mapping", "validation_errors"]
      });
    }

    // 6. Context-based personalized insights
    if (userContext?.preferences?.favoriteMetrics?.includes("cash_flow") && 
        triggerEvent === "session_start") {
      insights.push({
        id: "insight_personalized",
        type: "trend",
        priority: "low",
        title: "Your Cash Flow Dashboard",
        description: "Based on your focus on cash flow management, here's your personalized insight for today.",
        impact: "Stay informed on your key metric",
        confidence: 1.0,
        suggestedActions: [
          "/forecast cash_flow next_30_days",
          "show cash_flow_trends this_month",
          "/compare cash_position vs targets"
        ],
        relatedData: ["daily_cash_position", "collections_forecast", "payment_schedule"]
      });
    }

    // Sort insights by priority and confidence
    return insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }
});

export const getContextualResponse = action({
  args: {
    query: v.string(),
    organizationId: v.string(),
    userContext: v.any(),
    dataContext: v.any(),
    conversationHistory: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const { query, organizationId, userContext, dataContext, conversationHistory } = args;
    
    // Analyze query in context
    const contextAnalysis = analyzeQueryContext(query, userContext, dataContext, conversationHistory);
    
    // Generate contextual response
    const response = await generateContextualResponse(query, contextAnalysis, dataContext);
    
    // Add proactive suggestions based on context
    const suggestions = await generateContextualSuggestions(query, contextAnalysis, dataContext);
    
    return {
      response: response.text,
      confidence: response.confidence,
      context: contextAnalysis,
      suggestions,
      followUpQuestions: response.followUpQuestions,
      relatedInsights: response.relatedInsights
    };
  }
});

// Helper functions

function getCurrentQuarter(): string {
  const month = new Date().getMonth() + 1; // 1-12
  return `Q${Math.ceil(month / 3)}`;
}

function analyzeQueryContext(query: string, userContext: any, dataContext: any, history?: string[]) {
  const lowerQuery = query.toLowerCase();
  
  return {
    intent: extractQueryIntent(lowerQuery),
    metrics: extractMentionedMetrics(lowerQuery),
    timeframe: extractTimeframe(lowerQuery),
    urgency: assessQueryUrgency(lowerQuery, dataContext),
    personalization: {
      alignsWithPreferences: userContext?.preferences?.favoriteMetrics?.some((m: string) => 
        lowerQuery.includes(m.replace(/_/g, ' '))),
      sessionContext: userContext?.currentSession?.focusAreas?.some((area: string) => 
        lowerQuery.includes(area.replace(/_/g, ' '))),
      historyRelevance: assessHistoryRelevance(query, history || [])
    },
    dataAvailability: assessDataAvailability(lowerQuery, dataContext),
    anomalyRelevance: assessAnomalyRelevance(lowerQuery, dataContext?.anomalies || [])
  };
}

function extractQueryIntent(query: string): string {
  const intents = {
    analyze: ["analyze", "examination", "review", "assess"],
    compare: ["compare", "versus", "vs", "difference", "against"],
    forecast: ["forecast", "predict", "projection", "future", "estimate"],
    optimize: ["optimize", "improve", "enhance", "better", "maximize"],
    alert: ["alert", "notify", "warning", "threshold", "monitor"],
    explain: ["why", "how", "explain", "reason", "cause"],
    show: ["show", "display", "get", "fetch", "list"]
  };
  
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return intent;
    }
  }
  return "show";
}

function extractMentionedMetrics(query: string): string[] {
  const metrics = [
    "revenue", "sales", "income",
    "expenses", "costs", "spending",
    "profit", "margin", "earnings",
    "cash", "cash flow", "liquidity",
    "receivables", "payables", "inventory",
    "assets", "liabilities", "equity"
  ];
  
  return metrics.filter(metric => query.includes(metric));
}

function extractTimeframe(query: string): string | null {
  const timeframes = [
    "today", "yesterday", "this week", "last week",
    "this month", "last month", "this quarter", "last quarter",
    "this year", "last year", "ytd", "mtd", "qtd"
  ];
  
  for (const timeframe of timeframes) {
    if (query.includes(timeframe)) {
      return timeframe;
    }
  }
  return null;
}

function assessQueryUrgency(query: string, dataContext: any): "low" | "medium" | "high" {
  const urgentKeywords = ["urgent", "critical", "emergency", "immediate", "asap"];
  const alertKeywords = ["problem", "issue", "error", "anomaly", "spike"];
  
  if (urgentKeywords.some(keyword => query.includes(keyword))) {
    return "high";
  }
  
  if (alertKeywords.some(keyword => query.includes(keyword)) || 
      dataContext?.alerts?.some((alert: any) => alert.severity === "critical")) {
    return "medium";
  }
  
  return "low";
}

function assessHistoryRelevance(query: string, history: string[]): number {
  if (history.length === 0) return 0;
  
  const recentHistory = history.slice(-3); // Last 3 queries
  const queryWords = query.toLowerCase().split(/\s+/);
  
  let relevanceScore = 0;
  recentHistory.forEach(historyQuery => {
    const historyWords = historyQuery.toLowerCase().split(/\s+/);
    const commonWords = queryWords.filter(word => 
      historyWords.includes(word) && word.length > 3);
    relevanceScore += commonWords.length / queryWords.length;
  });
  
  return Math.min(relevanceScore / recentHistory.length, 1);
}

function assessDataAvailability(query: string, dataContext: any): "full" | "partial" | "limited" {
  const dataQuality = dataContext?.latestData?.dataQuality || 0;
  const completeness = dataContext?.latestData?.completeness || 0;
  
  if (dataQuality > 0.95 && completeness > 0.98) return "full";
  if (dataQuality > 0.85 && completeness > 0.90) return "partial";
  return "limited";
}

function assessAnomalyRelevance(query: string, anomalies: AnomalyData[]): AnomalyData[] {
  if (anomalies.length === 0) return [];
  
  const lowerQuery = query.toLowerCase();
  return anomalies.filter(anomaly => 
    anomaly.description.toLowerCase().includes(lowerQuery.split(' ')[0]) ||
    lowerQuery.includes(anomaly.type.replace(/_/g, ' '))
  );
}

async function generateContextualResponse(query: string, context: any, dataContext: any) {
  // Generate response based on context analysis
  let responseText = "";
  let confidence = 0.8;
  
  if (context.urgency === "high") {
    responseText = "I understand this is urgent. ";
    confidence += 0.1;
  }
  
  if (context.personalization.alignsWithPreferences) {
    responseText += "Based on your interest in " + context.metrics.join(", ") + ", ";
    confidence += 0.05;
  }
  
  if (context.anomalyRelevance.length > 0) {
    responseText += "I notice there are related anomalies in your data. ";
    confidence += 0.1;
  }
  
  // Base response generation would use AI/ML here
  responseText += `Here's what I found regarding ${context.metrics.join(", ") || "your query"}: `;
  
  if (context.dataAvailability === "limited") {
    responseText += "Note: Some data may be incomplete, which could affect accuracy. ";
    confidence -= 0.2;
  }
  
  return {
    text: responseText + generateMockResponse(query, context),
    confidence: Math.min(confidence, 1.0),
    followUpQuestions: generateFollowUpQuestions(context),
    relatedInsights: context.anomalyRelevance.slice(0, 2)
  };
}

function generateMockResponse(query: string, context: any): string {
  if (context.metrics.includes("cash")) {
    return "Your current cash position is $1.2M with a 67-day runway. Cash flow has been stable at +$45K monthly average.";
  }
  if (context.metrics.includes("revenue")) {
    return "Revenue is up 15.2% this quarter, driven by product sales growth and international expansion.";
  }
  if (context.metrics.includes("expenses")) {
    return "Expenses increased 8.2% but remain well-controlled relative to revenue growth.";
  }
  return "I've analyzed your financial data and found several key insights that might interest you.";
}

function generateFollowUpQuestions(context: any): string[] {
  const questions = [];
  
  if (context.metrics.includes("cash")) {
    questions.push("Would you like to see cash flow projections for the next 90 days?");
  }
  if (context.intent === "compare") {
    questions.push("Should I include variance analysis in this comparison?");
  }
  if (context.anomalyRelevance.length > 0) {
    questions.push("Would you like me to investigate the detected anomalies?");
  }
  
  questions.push("Is there a specific aspect you'd like me to drill down into?");
  
  return questions.slice(0, 3);
}

async function generateContextualSuggestions(query: string, context: any, dataContext: any) {
  const suggestions = [];
  
  // Add suggestions based on context
  if (context.metrics.includes("cash")) {
    suggestions.push({
      text: "Optimize cash flow timing",
      action: "/optimize cash_flow",
      type: "optimization"
    });
  }
  
  if (context.anomalyRelevance.length > 0) {
    suggestions.push({
      text: "Investigate expense anomalies",
      action: "/analyze anomalies detailed",
      type: "investigation"
    });
  }
  
  if (context.personalization.alignsWithPreferences) {
    suggestions.push({
      text: "Create personalized dashboard",
      action: "/report custom_dashboard",
      type: "personalization"
    });
  }
  
  return suggestions;
}