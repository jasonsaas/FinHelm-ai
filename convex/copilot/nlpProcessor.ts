import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Natural Language Processing for CFO Copilot
// Converts natural language queries to structured financial queries

interface ParsedQuery {
  type: "metric" | "comparison" | "forecast" | "analysis" | "command";
  intent: string;
  entities: string[];
  timeframe?: {
    start?: string;
    end?: string;
    period?: string;
  };
  metrics?: string[];
  filters?: Record<string, any>;
  command?: {
    type: string;
    parameters: Record<string, any>;
  };
}

interface QueryContext {
  userId: string;
  organizationId: string;
  previousQueries: string[];
  currentFinancialPeriod: string;
  availableData: {
    accounts: string[];
    vendors: string[];
    customers: string[];
    periods: string[];
  };
}

// Financial keywords and mappings
const FINANCIAL_KEYWORDS = {
  metrics: {
    "revenue": ["revenue", "sales", "income", "turnover", "receipts"],
    "expenses": ["expenses", "costs", "spending", "outgoings", "expenditure"],
    "profit": ["profit", "earnings", "net income", "bottom line", "profit margin"],
    "cash flow": ["cash flow", "cash", "liquidity", "working capital"],
    "accounts receivable": ["ar", "receivables", "outstanding invoices", "customer debt"],
    "accounts payable": ["ap", "payables", "vendor bills", "supplier debt"],
    "inventory": ["inventory", "stock", "goods", "merchandise"],
    "assets": ["assets", "resources", "investments", "property"],
    "liabilities": ["liabilities", "debt", "obligations", "payables"],
    "equity": ["equity", "capital", "ownership", "shareholders equity"]
  },
  
  timeframes: {
    "today": { period: "day", offset: 0 },
    "yesterday": { period: "day", offset: -1 },
    "this week": { period: "week", offset: 0 },
    "last week": { period: "week", offset: -1 },
    "this month": { period: "month", offset: 0 },
    "last month": { period: "month", offset: -1 },
    "this quarter": { period: "quarter", offset: 0 },
    "last quarter": { period: "quarter", offset: -1 },
    "this year": { period: "year", offset: 0 },
    "last year": { period: "year", offset: -1 },
    "ytd": { period: "year-to-date", offset: 0 },
    "mtd": { period: "month-to-date", offset: 0 },
    "qtd": { period: "quarter-to-date", offset: 0 }
  },
  
  comparisons: ["vs", "versus", "compared to", "against", "relative to"],
  
  intents: {
    "show": ["show", "display", "get", "fetch", "retrieve", "list"],
    "analyze": ["analyze", "examine", "review", "assess", "evaluate"],
    "compare": ["compare", "contrast", "benchmark", "measure"],
    "forecast": ["forecast", "predict", "project", "estimate", "model"],
    "optimize": ["optimize", "improve", "enhance", "maximize", "minimize"],
    "alert": ["alert", "notify", "warn", "flag", "highlight"],
    "export": ["export", "download", "generate", "create report"]
  }
};

// Specialized command patterns
const COMMAND_PATTERNS = [
  {
    pattern: /^\/forecast\s+(.+)$/i,
    type: "forecast",
    extractor: (match: RegExpMatchArray) => ({
      scenario: match[1].trim()
    })
  },
  {
    pattern: /^\/compare\s+(.+)$/i,
    type: "compare",
    extractor: (match: RegExpMatchArray) => ({
      periods: match[1].trim().split(/\s+vs\s+|\s+and\s+|\s*,\s*/)
    })
  },
  {
    pattern: /^\/optimize\s+(.+)$/i,
    type: "optimize",
    extractor: (match: RegExpMatchArray) => ({
      metric: match[1].trim()
    })
  },
  {
    pattern: /^\/report\s+(.+)$/i,
    type: "report",
    extractor: (match: RegExpMatchArray) => ({
      reportType: match[1].trim()
    })
  },
  {
    pattern: /^\/alert\s+(.+)$/i,
    type: "alert",
    extractor: (match: RegExpMatchArray) => ({
      alertType: match[1].trim()
    })
  }
];

export const parseNaturalLanguageQuery = action({
  args: {
    query: v.string(),
    context: v.object({
      organizationId: v.string(),
      userId: v.optional(v.string()),
      previousQueries: v.optional(v.array(v.string())),
      currentPeriod: v.optional(v.string())
    })
  },
  handler: async (ctx, args): Promise<ParsedQuery> => {
    const { query, context } = args;
    const normalizedQuery = query.toLowerCase().trim();

    // Check for specialized commands first
    for (const commandPattern of COMMAND_PATTERNS) {
      const match = query.match(commandPattern.pattern);
      if (match) {
        return {
          type: "command",
          intent: "execute_command",
          entities: [],
          command: {
            type: commandPattern.type,
            parameters: commandPattern.extractor(match)
          }
        };
      }
    }

    // Extract entities (metrics, timeframes, etc.)
    const entities = extractEntities(normalizedQuery);
    const timeframe = extractTimeframe(normalizedQuery);
    const metrics = extractMetrics(normalizedQuery);
    const intent = extractIntent(normalizedQuery);

    // Determine query type based on content
    let queryType: ParsedQuery["type"] = "metric";
    
    if (normalizedQuery.includes("forecast") || normalizedQuery.includes("predict")) {
      queryType = "forecast";
    } else if (FINANCIAL_KEYWORDS.comparisons.some(comp => normalizedQuery.includes(comp))) {
      queryType = "comparison";
    } else if (normalizedQuery.includes("analyz") || normalizedQuery.includes("review")) {
      queryType = "analysis";
    }

    return {
      type: queryType,
      intent,
      entities,
      timeframe,
      metrics,
      filters: extractFilters(normalizedQuery, context)
    };
  }
});

export const generateSQLFromQuery = action({
  args: {
    parsedQuery: v.any(),
    context: v.object({
      organizationId: v.string(),
      availableFields: v.array(v.string()),
      tableSchema: v.optional(v.any())
    })
  },
  handler: async (ctx, args) => {
    const { parsedQuery, context } = args;
    
    // Generate SQL based on parsed query
    let baseQuery = "SELECT ";
    let fields: string[] = [];
    let tables: string[] = [];
    let conditions: string[] = [];
    let groupBy: string[] = [];
    let orderBy: string[] = [];

    // Determine fields based on metrics
    if (parsedQuery.metrics && parsedQuery.metrics.length > 0) {
      parsedQuery.metrics.forEach((metric: string) => {
        switch (metric) {
          case "revenue":
            fields.push("SUM(revenue) as total_revenue");
            break;
          case "expenses":
            fields.push("SUM(expenses) as total_expenses");
            break;
          case "profit":
            fields.push("SUM(revenue - expenses) as net_profit");
            break;
          case "cash flow":
            fields.push("SUM(cash_inflow - cash_outflow) as net_cash_flow");
            break;
          default:
            fields.push(`SUM(${metric}) as total_${metric.replace(/\s+/g, '_')}`);
        }
      });
    } else {
      fields.push("*");
    }

    // Base tables
    tables.push("financial_transactions ft");
    tables.push("LEFT JOIN accounts a ON ft.account_id = a.id");

    // Add organization filter
    conditions.push(`ft.organization_id = '${context.organizationId}'`);

    // Add timeframe conditions
    if (parsedQuery.timeframe) {
      const dateCondition = buildDateCondition(parsedQuery.timeframe);
      if (dateCondition) {
        conditions.push(dateCondition);
      }
    }

    // Add filters
    if (parsedQuery.filters) {
      Object.entries(parsedQuery.filters).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          conditions.push(`${key} = '${value}'`);
        } else if (Array.isArray(value)) {
          conditions.push(`${key} IN (${value.map(v => `'${v}'`).join(', ')})`);
        }
      });
    }

    // Group by for aggregations
    if (fields.some(f => f.includes("SUM") || f.includes("COUNT") || f.includes("AVG"))) {
      if (parsedQuery.timeframe?.period === "month") {
        groupBy.push("DATE_TRUNC('month', ft.transaction_date)");
        fields.unshift("DATE_TRUNC('month', ft.transaction_date) as period");
      } else if (parsedQuery.timeframe?.period === "quarter") {
        groupBy.push("DATE_TRUNC('quarter', ft.transaction_date)");
        fields.unshift("DATE_TRUNC('quarter', ft.transaction_date) as period");
      }
    }

    // Build final query
    const sqlQuery = [
      baseQuery + fields.join(", "),
      "FROM " + tables.join(" "),
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "",
      groupBy.length > 0 ? "GROUP BY " + groupBy.join(", ") : "",
      orderBy.length > 0 ? "ORDER BY " + orderBy.join(", ") : ""
    ].filter(Boolean).join("\n");

    return {
      sql: sqlQuery,
      parameters: extractQueryParameters(parsedQuery),
      description: generateQueryDescription(parsedQuery)
    };
  }
});

export const getContextualSuggestions = action({
  args: {
    organizationId: v.string(),
    currentQuery: v.optional(v.string()),
    recentActivity: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const { organizationId, currentQuery, recentActivity } = args;

    // Get organization's financial data patterns
    // This would typically query the database for insights

    const suggestions = [
      {
        type: "insight",
        title: "Cash Flow Alert",
        description: "Your cash runway has decreased by 15% this month",
        action: "/forecast cash_flow",
        priority: "high"
      },
      {
        type: "optimization",
        title: "Vendor Payment Optimization",
        description: "You could save 2.3% by optimizing payment timing",
        action: "/optimize vendor_payments",
        priority: "medium"
      },
      {
        type: "anomaly",
        title: "Unusual Expense Pattern",
        description: "Marketing expenses are 34% above normal for this period",
        action: "analyze marketing expenses this month vs last month",
        priority: "medium"
      },
      {
        type: "opportunity",
        title: "Revenue Growth Opportunity",
        description: "Customer segment A shows 45% growth potential",
        action: "/analyze customer_segments",
        priority: "low"
      }
    ];

    // Filter based on current context
    if (currentQuery) {
      // Add query-specific suggestions
      if (currentQuery.includes("cash")) {
        suggestions.unshift({
          type: "related",
          title: "Related: Working Capital Analysis",
          description: "Analyze your working capital efficiency",
          action: "/analyze working_capital",
          priority: "medium"
        });
      }
    }

    return suggestions;
  }
});

// Helper functions
function extractEntities(query: string): string[] {
  const entities: string[] = [];
  
  Object.entries(FINANCIAL_KEYWORDS.metrics).forEach(([key, variations]) => {
    variations.forEach(variation => {
      if (query.includes(variation)) {
        entities.push(key);
      }
    });
  });

  return [...new Set(entities)]; // Remove duplicates
}

function extractTimeframe(query: string) {
  for (const [phrase, config] of Object.entries(FINANCIAL_KEYWORDS.timeframes)) {
    if (query.includes(phrase)) {
      return {
        period: config.period,
        offset: config.offset
      };
    }
  }
  return undefined;
}

function extractMetrics(query: string): string[] {
  const metrics: string[] = [];
  
  Object.entries(FINANCIAL_KEYWORDS.metrics).forEach(([metric, variations]) => {
    if (variations.some(variation => query.includes(variation))) {
      metrics.push(metric);
    }
  });

  return metrics;
}

function extractIntent(query: string): string {
  for (const [intent, keywords] of Object.entries(FINANCIAL_KEYWORDS.intents)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return intent;
    }
  }
  return "show"; // Default intent
}

function extractFilters(query: string, context: any): Record<string, any> {
  const filters: Record<string, any> = {};
  
  // Extract specific account mentions
  const accountMatch = query.match(/account[s]?\s+([a-zA-Z0-9\s,]+)/i);
  if (accountMatch) {
    filters.accounts = accountMatch[1].split(',').map(a => a.trim());
  }

  // Extract vendor mentions
  const vendorMatch = query.match(/vendor[s]?\s+([a-zA-Z0-9\s,]+)/i);
  if (vendorMatch) {
    filters.vendors = vendorMatch[1].split(',').map(v => v.trim());
  }

  // Extract customer mentions
  const customerMatch = query.match(/customer[s]?\s+([a-zA-Z0-9\s,]+)/i);
  if (customerMatch) {
    filters.customers = customerMatch[1].split(',').map(c => c.trim());
  }

  return filters;
}

function buildDateCondition(timeframe: any): string | null {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (timeframe.period) {
    case "day":
      startDate = new Date(now);
      startDate.setDate(now.getDate() + (timeframe.offset || 0));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth() + (timeframe.offset || 0), 1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      break;
    case "quarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart + (timeframe.offset || 0) * 3, 1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);
      break;
    case "year":
      startDate = new Date(now.getFullYear() + (timeframe.offset || 0), 0, 1);
      endDate = new Date(startDate.getFullYear(), 11, 31);
      break;
    default:
      return null;
  }

  return `ft.transaction_date >= '${startDate.toISOString()}' AND ft.transaction_date <= '${endDate.toISOString()}'`;
}

function extractQueryParameters(parsedQuery: any): Record<string, any> {
  return {
    metrics: parsedQuery.metrics || [],
    timeframe: parsedQuery.timeframe || null,
    filters: parsedQuery.filters || {},
    type: parsedQuery.type
  };
}

function generateQueryDescription(parsedQuery: any): string {
  let description = "Analyzing ";
  
  if (parsedQuery.metrics && parsedQuery.metrics.length > 0) {
    description += parsedQuery.metrics.join(", ");
  } else {
    description += "financial data";
  }

  if (parsedQuery.timeframe) {
    description += ` for ${parsedQuery.timeframe.period}`;
  }

  if (parsedQuery.filters && Object.keys(parsedQuery.filters).length > 0) {
    description += " with specific filters";
  }

  return description;
}