import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// CFO Copilot Orchestrator
// Main entry point that coordinates all copilot functionality

interface CopilotRequest {
  query: string;
  organizationId: string;
  userId?: string;
  context?: {
    conversationHistory?: string[];
    sessionId?: string;
    userPreferences?: any;
  };
}

interface CopilotResponse {
  success: boolean;
  response: string;
  type: "natural_language" | "command" | "error";
  data?: any;
  visualizations?: any[];
  actions?: any[];
  suggestions?: any[];
  insights?: any[];
  confidence: number;
  processingTime: number;
  metadata?: {
    queryType: string;
    dataSource: string[];
    cacheUsed: boolean;
  };
}

export const processCopilotRequest = action({
  args: {
    query: v.string(),
    organizationId: v.string(),
    userId: v.optional(v.string()),
    context: v.optional(v.object({
      conversationHistory: v.optional(v.array(v.string())),
      sessionId: v.optional(v.string()),
      userPreferences: v.optional(v.any())
    }))
  },
  handler: async (ctx, args): Promise<CopilotResponse> => {
    const startTime = Date.now();
    
    try {
      const { query, organizationId, userId, context } = args;
      
      // Step 1: Get user and data context
      const [userContext, dataContext] = await Promise.all([
        ctx.runAction(api.copilot.contextEngine.getUserContext, {
          organizationId,
          userId
        }),
        ctx.runAction(api.copilot.contextEngine.getDataContext, {
          organizationId
        })
      ]);

      // Step 2: Parse the natural language query
      const parsedQuery = await ctx.runAction(api.copilot.nlpProcessor.parseNaturalLanguageQuery, {
        query,
        context: {
          organizationId,
          userId,
          previousQueries: context?.conversationHistory || [],
          currentPeriod: dataContext.currentPeriod
        }
      });

      let response: CopilotResponse;

      // Step 3: Route based on query type
      if (parsedQuery.type === "command" && parsedQuery.command) {
        // Execute specialized command
        response = await executeCommandFlow(ctx, parsedQuery.command, {
          organizationId,
          userId,
          userContext,
          dataContext
        });
      } else {
        // Process as natural language query
        response = await executeNaturalLanguageFlow(ctx, parsedQuery, {
          organizationId,
          userId,
          userContext,
          dataContext,
          originalQuery: query
        });
      }

      // Step 4: Generate contextual insights and suggestions
      const insights = await ctx.runAction(api.copilot.contextEngine.generateProactiveInsights, {
        organizationId,
        userContext,
        dataContext,
        triggerEvent: "query_processed"
      });

      // Step 5: Enhance response with proactive insights
      response.insights = insights.slice(0, 3); // Top 3 most relevant
      
      // Add processing metadata
      response.processingTime = Date.now() - startTime;
      response.metadata = {
        queryType: parsedQuery.type,
        dataSource: determineDataSources(parsedQuery),
        cacheUsed: false // Would implement caching in production
      };

      return response;
      
    } catch (error) {
      return {
        success: false,
        response: `I encountered an error processing your request: ${error}. Please try rephrasing your question or use a specific command like /forecast, /compare, /optimize, /report, or /alert.`,
        type: "error",
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }
});

export const getCopilotCapabilities = action({
  args: {
    organizationId: v.string()
  },
  handler: async (ctx, args) => {
    return {
      naturalLanguageProcessing: {
        supported: true,
        capabilities: [
          "Financial query interpretation",
          "SQL generation from natural language",
          "Context-aware responses",
          "Multi-turn conversations"
        ]
      },
      specializedCommands: {
        supported: true,
        commands: [
          {
            command: "/forecast",
            description: "Generate financial forecasts with scenario analysis",
            parameters: ["scenario", "timeframe", "confidence_level"],
            examples: ["/forecast cash_flow", "/forecast revenue optimistic"]
          },
          {
            command: "/compare",
            description: "Compare financial metrics between periods",
            parameters: ["periods", "metrics"],
            examples: ["/compare this_month vs last_month", "/compare Q1 vs Q2 revenue"]
          },
          {
            command: "/optimize",
            description: "Get optimization suggestions for metrics",
            parameters: ["metric", "objective"],
            examples: ["/optimize cash_flow", "/optimize working_capital"]
          },
          {
            command: "/report",
            description: "Generate instant financial reports",
            parameters: ["report_type", "format"],
            examples: ["/report executive_summary", "/report board_deck"]
          },
          {
            command: "/alert",
            description: "Configure monitoring and alerts",
            parameters: ["alert_type", "threshold"],
            examples: ["/alert cash_runway 90", "/alert expense_variance 15%"]
          }
        ]
      },
      proactiveInsights: {
        supported: true,
        types: ["opportunities", "risks", "trends", "anomalies", "optimizations"],
        updateFrequency: "real-time"
      },
      integrations: {
        supportedSystems: ["QuickBooks", "Sage Intacct", "NetSuite", "Xero"],
        realTimeData: true,
        historicalAnalysis: true
      },
      exportOptions: {
        formats: ["PDF", "Excel", "PowerPoint", "CSV"],
        scheduling: true,
        automation: true
      }
    };
  }
});

export const getCopilotPerformanceMetrics = action({
  args: {
    organizationId: v.string(),
    timeframe: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // In production, this would query actual usage metrics
    return {
      usage: {
        totalQueries: 1247,
        successRate: 0.94,
        averageResponseTime: 850, // milliseconds
        commandUsage: {
          "/forecast": 312,
          "/compare": 298,
          "/optimize": 156,
          "/report": 203,
          "/alert": 87,
          "natural_language": 191
        }
      },
      accuracy: {
        overallConfidence: 0.87,
        nlpAccuracy: 0.91,
        sqlGenerationSuccess: 0.89,
        forecastAccuracy: 0.83
      },
      userSatisfaction: {
        rating: 4.6,
        feedbackCount: 89,
        mostUsedFeatures: [
          "Cash flow forecasting",
          "Expense analysis",
          "Period comparisons"
        ]
      },
      insights: {
        totalGenerated: 567,
        actionsTaken: 234,
        valueRealized: "$127,400" // Estimated value from optimizations
      }
    };
  }
});

// Helper function to execute command flow
async function executeCommandFlow(ctx: any, command: any, context: any): Promise<CopilotResponse> {
  const commandResult = await ctx.runAction(api.copilot.commandExecutor.executeCommand, {
    command,
    context: {
      organizationId: context.organizationId,
      userId: context.userId,
      currentPeriod: context.dataContext.currentPeriod
    }
  });

  if (!commandResult.success) {
    return {
      success: false,
      response: `Command execution failed: ${commandResult.error}`,
      type: "error",
      confidence: 0,
      processingTime: 0
    };
  }

  // Format command result into copilot response
  let responseText = `✅ Command executed successfully!\n\n`;
  
  if (commandResult.result) {
    responseText += formatCommandResult(command.type, commandResult.result);
  }

  return {
    success: true,
    response: responseText,
    type: "command",
    data: commandResult.result,
    visualizations: commandResult.visualizations || [],
    actions: commandResult.actions || [],
    suggestions: commandResult.followUpSuggestions?.map(s => ({
      text: s,
      action: s,
      type: "follow_up"
    })) || [],
    confidence: 0.95
  };
}

// Helper function to execute natural language flow
async function executeNaturalLanguageFlow(ctx: any, parsedQuery: any, context: any): Promise<CopilotResponse> {
  // Generate contextual response
  const contextualResponse = await ctx.runAction(api.copilot.contextEngine.getContextualResponse, {
    query: context.originalQuery,
    organizationId: context.organizationId,
    userContext: context.userContext,
    dataContext: context.dataContext,
    conversationHistory: []
  });

  // Generate SQL if applicable
  let sqlQuery = null;
  if (parsedQuery.metrics && parsedQuery.metrics.length > 0) {
    try {
      const sqlResult = await ctx.runAction(api.copilot.nlpProcessor.generateSQLFromQuery, {
        parsedQuery,
        context: {
          organizationId: context.organizationId,
          availableFields: ["revenue", "expenses", "cash_flow", "profit"],
          tableSchema: {}
        }
      });
      sqlQuery = sqlResult;
    } catch (error) {
      console.error("SQL generation failed:", error);
    }
  }

  return {
    success: true,
    response: contextualResponse.response,
    type: "natural_language",
    data: {
      parsedQuery,
      sqlQuery,
      context: contextualResponse.context
    },
    suggestions: contextualResponse.suggestions || [],
    confidence: contextualResponse.confidence || 0.8
  };
}

// Helper function to format command results
function formatCommandResult(commandType: string, result: any): string {
  switch (commandType) {
    case "forecast":
      return `📈 **Forecast Analysis**\n${result.summary || "Forecast generated successfully"}\n\n` +
             `**Key Insights:**\n${(result.recommendations || []).map((r: string) => `• ${r}`).join('\n')}`;
    
    case "compare":
      return `📊 **Comparison Analysis**\n${result.summary || "Comparison completed"}\n\n` +
             `**Key Changes:**\n${(result.keyInsights || []).map((i: string) => `• ${i}`).join('\n')}`;
    
    case "optimize":
      return `🎯 **Optimization Recommendations**\n\n` +
             `**Estimated Impact:** ${result.estimatedImpact || "Significant improvement potential"}\n\n` +
             `**Top Opportunities:**\n${(result.optimizations || []).slice(0, 3).map((opt: any) => 
               `• ${opt.title}: ${opt.estimatedImpact}`).join('\n')}`;
    
    case "report":
      return `📄 **Report Generated**\n\n${result.data?.preview?.summary || "Report is ready for download"}\n\n` +
             `**Available Formats:** PDF, Excel, PowerPoint`;
    
    case "alert":
      return `🔔 **Alert Configuration**\n\n` +
             `**Alert Type:** ${result.alertType}\n` +
             `**Current Thresholds:** ${JSON.stringify(result.suggestedConfig?.thresholds || {})}\n` +
             `**Existing Alerts:** ${result.existingAlerts?.length || 0}`;
    
    default:
      return "Command executed successfully. Check the results above for details.";
  }
}

// Helper function to determine data sources used
function determineDataSources(parsedQuery: any): string[] {
  const sources: string[] = [];
  
  if (parsedQuery.metrics?.length > 0) {
    sources.push("financial_transactions");
  }
  
  if (parsedQuery.timeframe) {
    sources.push("time_series_data");
  }
  
  if (parsedQuery.filters) {
    if (parsedQuery.filters.accounts) sources.push("chart_of_accounts");
    if (parsedQuery.filters.vendors) sources.push("vendor_data");
    if (parsedQuery.filters.customers) sources.push("customer_data");
  }
  
  return sources.length > 0 ? sources : ["general"];
}

// Main chat processing for compatibility with existing chat system
export const processChat = action({
  args: {
    orgId: v.string(),
    message: v.string(),
    context: v.any()
  },
  handler: async (ctx, args) => {
    // Route to the main copilot orchestrator
    const result = await ctx.runAction(api.copilot.copilotOrchestrator.processCopilotRequest, {
      query: args.message,
      organizationId: args.orgId,
      context: args.context
    });
    
    return {
      response: result.response,
      success: result.success,
      visualizations: result.visualizations || [],
      actions: result.actions || [],
      suggestions: result.suggestions || [],
      confidence: result.confidence
    };
  }
});