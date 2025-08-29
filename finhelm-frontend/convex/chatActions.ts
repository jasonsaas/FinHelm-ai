import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Re-export processChat action for frontend compatibility.
 * This should match the backend chatActions.ts processChat function.
 */
export const processChat = action({
  args: {
    orgId: v.string(),
    message: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // This is a frontend-only stub - actual implementation is in the backend
    return {
      response: `I'm your FinHelm AI Insights assistant for Sage Intacct analysis. I can help you with:\n\n📊 Dimension Analysis - Drill down into departments, locations, projects\n🏢 Entity Comparisons - Multi-entity performance review\n📈 Revenue Analytics - Geographic and dimensional breakdowns\n🔍 Anomaly Detection - Identify unusual patterns and variances\n📊 Financial Forecasting - Predictive analysis and projections\n💼 Statistical Accounts - Advanced GL analysis\n\nTry asking about specific dimensions, entity performance, or variance analysis.`,
      confidence: 0.85,
      timestamp: new Date().toISOString(),
    };
  },
});