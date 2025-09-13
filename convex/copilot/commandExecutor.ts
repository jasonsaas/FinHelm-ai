import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Command Executor for CFO Copilot specialized commands
// Handles /forecast, /compare, /optimize, /report, and /alert commands

interface CommandResult {
  success: boolean;
  result?: any;
  error?: string;
  visualizations?: any[];
  actions?: any[];
  followUpSuggestions?: string[];
}

interface ExecutionContext {
  organizationId: string;
  userId?: string;
  currentPeriod: string;
  permissions: string[];
}

export const executeCommand = action({
  args: {
    command: v.object({
      type: v.string(),
      parameters: v.any()
    }),
    context: v.object({
      organizationId: v.string(),
      userId: v.optional(v.string()),
      currentPeriod: v.optional(v.string())
    })
  },
  handler: async (ctx, args): Promise<CommandResult> => {
    const { command, context } = args;

    try {
      switch (command.type) {
        case "forecast":
          return await executeForecastCommand(ctx, command.parameters, context);
        case "compare":
          return await executeCompareCommand(ctx, command.parameters, context);
        case "optimize":
          return await executeOptimizeCommand(ctx, command.parameters, context);
        case "report":
          return await executeReportCommand(ctx, command.parameters, context);
        case "alert":
          return await executeAlertCommand(ctx, command.parameters, context);
        default:
          return {
            success: false,
            error: `Unknown command type: ${command.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Command execution failed: ${error}`
      };
    }
  }
});

// /forecast [scenario] - Run scenario analysis
async function executeForecastCommand(ctx: any, parameters: any, context: any): Promise<CommandResult> {
  const { scenario } = parameters;
  
  // Parse scenario parameters
  const scenarioConfig = parseScenarioString(scenario);
  
  // Generate forecast based on scenario
  const forecastData = await generateScenarioForecast(context.organizationId, scenarioConfig);
  
  const visualizations = [
    {
      type: "line_chart",
      title: `${scenarioConfig.metric || "Cash Flow"} Forecast - ${scenarioConfig.name || scenario}`,
      data: forecastData.timeSeries,
      xAxis: "period",
      yAxis: "value",
      metadata: {
        confidence_interval: forecastData.confidenceInterval,
        assumptions: forecastData.assumptions
      }
    },
    {
      type: "scenario_comparison",
      title: "Scenario Comparison",
      data: forecastData.scenarios,
      metrics: ["best_case", "base_case", "worst_case"]
    }
  ];

  const actions = [
    {
      label: "Export Forecast",
      action: `/export forecast ${scenario}`,
      type: "secondary"
    },
    {
      label: "Create Alert",
      action: `/alert forecast_deviation ${scenario}`,
      type: "primary"
    },
    {
      label: "Refine Assumptions",
      action: `/optimize forecast_accuracy`,
      type: "secondary"
    }
  ];

  const followUpSuggestions = [
    "Would you like to see the assumptions behind this forecast?",
    "Should I create alerts for significant deviations?",
    `Try: /compare ${scenario} vs last_year`,
    "Consider running sensitivity analysis on key variables"
  ];

  return {
    success: true,
    result: {
      scenario: scenarioConfig.name || scenario,
      forecast: forecastData,
      summary: generateForecastSummary(forecastData),
      recommendations: generateForecastRecommendations(forecastData)
    },
    visualizations,
    actions,
    followUpSuggestions
  };
}

// /compare [period] - Period comparisons
async function executeCompareCommand(ctx: any, parameters: any, context: any): Promise<CommandResult> {
  const { periods } = parameters;
  
  // Parse and validate periods
  const normalizedPeriods = periods.map((p: string) => normalizePeriod(p));
  
  if (normalizedPeriods.length < 2) {
    return {
      success: false,
      error: "Comparison requires at least 2 periods. Example: /compare this_month vs last_month"
    };
  }

  // Get comparison data
  const comparisonData = await getComparisonData(context.organizationId, normalizedPeriods);
  
  const visualizations = [
    {
      type: "comparison_chart",
      title: `Period Comparison: ${normalizedPeriods.join(" vs ")}`,
      data: comparisonData.metrics,
      periods: normalizedPeriods
    },
    {
      type: "variance_analysis",
      title: "Variance Analysis",
      data: comparisonData.variances,
      showPercentages: true
    },
    {
      type: "trend_analysis",
      title: "Trend Analysis",
      data: comparisonData.trends,
      showDirection: true
    }
  ];

  const actions = [
    {
      label: "Drill Down",
      action: `/analyze variances ${normalizedPeriods.join("_vs_")}`,
      type: "primary"
    },
    {
      label: "Export Comparison",
      action: `/export comparison ${normalizedPeriods.join("_vs_")}`,
      type: "secondary"
    }
  ];

  const followUpSuggestions = [
    "Would you like to see account-level details for these variances?",
    "Should I identify the top drivers of these changes?",
    `Try: /optimize ${identifyWorstPerforming(comparisonData.variances)}`,
    "Consider setting up alerts for similar variance patterns"
  ];

  return {
    success: true,
    result: {
      periods: normalizedPeriods,
      comparison: comparisonData,
      summary: generateComparisonSummary(comparisonData),
      keyInsights: generateComparisonInsights(comparisonData)
    },
    visualizations,
    actions,
    followUpSuggestions
  };
}

// /optimize [metric] - Get optimization suggestions
async function executeOptimizeCommand(ctx: any, parameters: any, context: any): Promise<CommandResult> {
  const { metric } = parameters;
  
  // Get current state of the metric
  const currentState = await getMetricCurrentState(context.organizationId, metric);
  
  // Generate optimization recommendations
  const optimizations = await generateOptimizationSuggestions(context.organizationId, metric, currentState);
  
  const visualizations = [
    {
      type: "optimization_opportunities",
      title: `${metric} Optimization Opportunities`,
      data: optimizations.opportunities,
      showImpact: true
    },
    {
      type: "implementation_roadmap",
      title: "Implementation Priority",
      data: optimizations.roadmap,
      showTimeline: true
    }
  ];

  const actions = optimizations.opportunities.map((opp: any) => ({
    label: `Implement: ${opp.title}`,
    action: `/implement ${opp.id}`,
    type: opp.priority === "high" ? "primary" : "secondary",
    impact: opp.estimatedImpact
  }));

  const followUpSuggestions = [
    `Would you like a detailed implementation plan for the top opportunity?`,
    `Should I create alerts to track ${metric} improvements?`,
    `Try: /forecast ${metric} with these optimizations`,
    `Consider: /compare current vs optimized scenarios`
  ];

  return {
    success: true,
    result: {
      metric,
      currentState,
      optimizations: optimizations.opportunities,
      estimatedImpact: optimizations.totalImpact,
      implementationPlan: optimizations.roadmap
    },
    visualizations,
    actions,
    followUpSuggestions
  };
}

// /report [type] - Generate instant reports
async function executeReportCommand(ctx: any, parameters: any, context: any): Promise<CommandResult> {
  const { reportType } = parameters;
  
  // Validate report type
  const availableReports = [
    "executive_summary", "board_deck", "investor_update", "cash_flow",
    "variance_analysis", "budget_performance", "kpi_dashboard", "financial_statement"
  ];
  
  if (!availableReports.includes(reportType)) {
    return {
      success: false,
      error: `Unknown report type: ${reportType}. Available: ${availableReports.join(", ")}`
    };
  }

  // Generate report
  const reportData = await generateInstantReport(context.organizationId, reportType);
  
  const visualizations = [
    {
      type: "report_preview",
      title: `${reportType.replace(/_/g, " ").toUpperCase()} Report Preview`,
      data: reportData.preview,
      reportType
    }
  ];

  const actions = [
    {
      label: "Download PDF",
      action: `/export pdf ${reportType}`,
      type: "primary"
    },
    {
      label: "Download Excel",
      action: `/export excel ${reportType}`,
      type: "secondary"
    },
    {
      label: "Email Report",
      action: `/email ${reportType}`,
      type: "secondary"
    },
    {
      label: "Schedule Recurring",
      action: `/schedule ${reportType}`,
      type: "secondary"
    }
  ];

  const followUpSuggestions = [
    "Would you like to customize this report format?",
    "Should I schedule this report to be generated automatically?",
    `Try: /compare ${reportType} vs last_period`,
    "Consider adding this to your executive dashboard"
  ];

  return {
    success: true,
    result: {
      reportType,
      data: reportData,
      generatedAt: new Date().toISOString(),
      downloadUrls: reportData.downloadUrls
    },
    visualizations,
    actions,
    followUpSuggestions
  };
}

// /alert [type] - Configure alerts
async function executeAlertCommand(ctx: any, parameters: any, context: any): Promise<CommandResult> {
  const { alertType } = parameters;
  
  // Get existing alerts for this type
  const existingAlerts = await getExistingAlerts(context.organizationId, alertType);
  
  // Suggest alert configuration based on type
  const alertConfig = await suggestAlertConfiguration(context.organizationId, alertType);
  
  const actions = [
    {
      label: "Create Alert",
      action: `/create_alert ${alertType}`,
      type: "primary"
    },
    {
      label: "Modify Existing",
      action: `/modify_alert ${alertType}`,
      type: "secondary",
      disabled: existingAlerts.length === 0
    },
    {
      label: "Test Alert",
      action: `/test_alert ${alertType}`,
      type: "secondary"
    }
  ];

  const followUpSuggestions = [
    "Would you like to set specific thresholds for this alert?",
    "Should I suggest optimal alert frequencies?",
    `Try: /optimize alert_sensitivity ${alertType}`,
    "Consider setting up escalation rules for critical alerts"
  ];

  return {
    success: true,
    result: {
      alertType,
      existingAlerts,
      suggestedConfig: alertConfig,
      currentThresholds: alertConfig.thresholds
    },
    actions,
    followUpSuggestions
  };
}

// Helper functions for command execution

function parseScenarioString(scenario: string) {
  const scenarios = {
    "conservative": { growth: -0.1, confidence: 0.7, name: "Conservative" },
    "optimistic": { growth: 0.15, confidence: 0.6, name: "Optimistic" },
    "realistic": { growth: 0.05, confidence: 0.8, name: "Realistic" },
    "cash_flow": { metric: "cash_flow", periods: 12, name: "Cash Flow" },
    "revenue": { metric: "revenue", periods: 6, name: "Revenue" },
    "expenses": { metric: "expenses", periods: 6, name: "Expenses" }
  };

  const lowerScenario = scenario.toLowerCase();
  return scenarios[lowerScenario as keyof typeof scenarios] || {
    name: scenario,
    growth: 0.05,
    confidence: 0.75,
    periods: 6
  };
}

async function generateScenarioForecast(orgId: string, config: any) {
  // Mock forecast generation - would integrate with ML models
  const baseValue = 100000;
  const periods = config.periods || 6;
  const growth = config.growth || 0.05;
  
  const timeSeries = Array.from({ length: periods }, (_, i) => ({
    period: `Month ${i + 1}`,
    value: baseValue * Math.pow(1 + growth, i) * (0.9 + Math.random() * 0.2),
    confidence_lower: baseValue * Math.pow(1 + growth, i) * 0.85,
    confidence_upper: baseValue * Math.pow(1 + growth, i) * 1.15
  }));

  const scenarios = {
    best_case: timeSeries.map(p => ({ ...p, value: p.value * 1.2 })),
    base_case: timeSeries,
    worst_case: timeSeries.map(p => ({ ...p, value: p.value * 0.8 }))
  };

  return {
    timeSeries,
    scenarios,
    confidenceInterval: config.confidence || 0.75,
    assumptions: [
      `Growth rate: ${(growth * 100).toFixed(1)}%`,
      `Confidence level: ${((config.confidence || 0.75) * 100).toFixed(0)}%`,
      "Seasonal adjustments: Enabled",
      "External factors: Included"
    ]
  };
}

function normalizePeriod(period: string): string {
  const periodMap: Record<string, string> = {
    "this month": "current_month",
    "last month": "previous_month",
    "this quarter": "current_quarter",
    "last quarter": "previous_quarter",
    "this year": "current_year",
    "last year": "previous_year",
    "ytd": "year_to_date",
    "mtd": "month_to_date"
  };
  
  return periodMap[period.toLowerCase()] || period;
}

async function getComparisonData(orgId: string, periods: string[]) {
  // Mock comparison data - would query actual financial data
  return {
    metrics: {
      revenue: periods.map(p => ({ period: p, value: 150000 + Math.random() * 50000 })),
      expenses: periods.map(p => ({ period: p, value: 120000 + Math.random() * 30000 })),
      profit: periods.map(p => ({ period: p, value: 30000 + Math.random() * 20000 }))
    },
    variances: {
      revenue: { absolute: 25000, percentage: 16.7, trend: "increasing" },
      expenses: { absolute: -8000, percentage: -6.2, trend: "decreasing" },
      profit: { absolute: 33000, percentage: 110.0, trend: "increasing" }
    },
    trends: {
      overall: "positive",
      revenue_growth: "accelerating",
      expense_control: "improving",
      profitability: "strong"
    }
  };
}

async function getMetricCurrentState(orgId: string, metric: string) {
  // Mock current state - would query actual data
  return {
    currentValue: 45000,
    benchmarkValue: 52000,
    industryAverage: 48000,
    trend: "stable",
    lastUpdated: new Date().toISOString()
  };
}

async function generateOptimizationSuggestions(orgId: string, metric: string, currentState: any) {
  // Mock optimization suggestions - would use AI analysis
  return {
    opportunities: [
      {
        id: "opt_001",
        title: "Vendor Payment Terms Optimization",
        description: "Negotiate extended payment terms with top 5 vendors",
        estimatedImpact: "$12,000 monthly cash flow improvement",
        priority: "high",
        effort: "medium",
        timeframe: "30-60 days"
      },
      {
        id: "opt_002",
        title: "Accounts Receivable Acceleration",
        description: "Implement early payment discounts",
        estimatedImpact: "$8,500 monthly cash flow improvement",
        priority: "medium",
        effort: "low",
        timeframe: "14-30 days"
      }
    ],
    totalImpact: "$20,500 monthly",
    roadmap: [
      { phase: "Quick Wins", timeframe: "0-30 days", items: ["AR discounts"] },
      { phase: "Strategic", timeframe: "30-90 days", items: ["Vendor negotiations"] }
    ]
  };
}

async function generateInstantReport(orgId: string, reportType: string) {
  // Mock report generation - would use actual report generators
  return {
    preview: {
      title: reportType.replace(/_/g, " ").toUpperCase(),
      summary: "Financial performance shows strong growth with improved margins",
      keyMetrics: [
        { name: "Revenue Growth", value: "15.2%", trend: "up" },
        { name: "Gross Margin", value: "34.7%", trend: "up" },
        { name: "Cash Position", value: "$1.2M", trend: "stable" }
      ]
    },
    downloadUrls: {
      pdf: `/api/reports/${reportType}.pdf`,
      excel: `/api/reports/${reportType}.xlsx`,
      powerpoint: `/api/reports/${reportType}.pptx`
    }
  };
}

async function getExistingAlerts(orgId: string, alertType: string) {
  // Mock existing alerts - would query alert system
  return [
    {
      id: "alert_001",
      type: alertType,
      threshold: "15%",
      frequency: "daily",
      active: true
    }
  ];
}

async function suggestAlertConfiguration(orgId: string, alertType: string) {
  return {
    thresholds: {
      warning: "10%",
      critical: "20%"
    },
    frequency: "daily",
    channels: ["email", "dashboard"]
  };
}

function generateForecastSummary(forecastData: any): string {
  const lastValue = forecastData.timeSeries[forecastData.timeSeries.length - 1]?.value || 0;
  const firstValue = forecastData.timeSeries[0]?.value || 0;
  const growth = ((lastValue - firstValue) / firstValue * 100).toFixed(1);
  
  return `Forecast shows ${growth}% growth over the period with ${(forecastData.confidenceInterval * 100).toFixed(0)}% confidence.`;
}

function generateForecastRecommendations(forecastData: any): string[] {
  return [
    "Monitor actual vs forecast monthly to adjust assumptions",
    "Consider scenario planning for key business decisions",
    "Set up alerts for significant deviations from forecast"
  ];
}

function generateComparisonSummary(comparisonData: any): string {
  const revenueVariance = comparisonData.variances.revenue?.percentage || 0;
  const profitVariance = comparisonData.variances.profit?.percentage || 0;
  
  return `Revenue ${revenueVariance > 0 ? "increased" : "decreased"} by ${Math.abs(revenueVariance).toFixed(1)}%, while profit ${profitVariance > 0 ? "improved" : "declined"} by ${Math.abs(profitVariance).toFixed(1)}%.`;
}

function generateComparisonInsights(comparisonData: any): string[] {
  return [
    "Revenue growth is outpacing expense growth - positive trend",
    "Profit margins are improving due to better cost control",
    "Consider investigating drivers behind the revenue increase"
  ];
}

function identifyWorstPerforming(variances: any): string {
  const metrics = Object.entries(variances);
  const worst = metrics.reduce((worst, [key, data]: [string, any]) => {
    return data.percentage < (worst[1] as any).percentage ? [key, data] : worst;
  });
  return worst[0] as string;
}