/**
 * Public API functions for AI agent execution
 */

import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";

// Execute an agent with a query
export const execute = action({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    agentType: v.string(),
    query: v.string(),
    sessionId: v.optional(v.string()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Call the internal mutation
    const result = await ctx.runMutation(api.ai.agentExecutor.executeAgent, args);
    return result;
  },
});

// Get list of available agents
export const listAgents = query({
  args: {
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("aiAgents");
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    
    if (args.isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), args.isActive));
    }
    
    const agents = await query.collect();
    
    return agents.map(agent => ({
      id: agent.agentId,
      name: agent.name,
      category: agent.category,
      description: agent.description,
      capabilities: agent.capabilities,
      icon: agent.icon,
      color: agent.color,
      model: agent.model,
      isActive: agent.isActive,
    }));
  },
});

// Get agent execution history
export const getHistory = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    agentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agentExecutions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId));
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    if (args.agentId) {
      query = query.filter((q) => q.eq(q.field("agentId"), args.agentId));
    }
    
    if (args.sessionId) {
      query = query.filter((q) => q.eq(q.field("sessionId"), args.sessionId));
    }
    
    const executions = await query
      .order("desc")
      .take(args.limit || 50);
    
    return executions;
  },
});

// Create or get a session
export const createSession = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await ctx.db.insert("agentSessions", {
      sessionId,
      companyId: args.companyId,
      userId: args.userId,
      title: args.title,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      status: "active",
    });
    
    return { sessionId };
  },
});

// Get session details
export const getSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    if (sessions.length === 0) {
      return null;
    }
    
    const session = sessions[0];
    
    // Get all executions for this session
    const executions = await ctx.db
      .query("agentExecutions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
    
    return {
      ...session,
      executions,
    };
  },
});

// Get user's sessions
export const getSessions = query({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agentSessions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("userId"), args.userId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return query
      .order("desc")
      .take(args.limit || 20);
  },
});

// Provide feedback on an execution
export const provideFeedback = mutation({
  args: {
    executionId: v.id("agentExecutions"),
    rating: v.number(),
    comment: v.optional(v.string()),
    helpful: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      feedback: {
        rating: args.rating,
        comment: args.comment,
        helpful: args.helpful,
      },
    });
    
    return { success: true };
  },
});

// Get usage statistics
export const getUsageStats = query({
  args: {
    companyId: v.id("companies"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agentExecutions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId));
    
    const executions = await query.collect();
    
    // Filter by date range if provided
    const filtered = executions.filter(exec => {
      if (args.startDate && exec.createdAt < args.startDate) return false;
      if (args.endDate && exec.createdAt > args.endDate) return false;
      return true;
    });
    
    // Calculate statistics
    const stats = {
      totalExecutions: filtered.length,
      totalTokens: filtered.reduce((sum, exec) => sum + exec.tokenUsage.totalTokens, 0),
      totalCost: filtered.reduce((sum, exec) => sum + exec.tokenUsage.cost, 0),
      averageExecutionTime: filtered.length > 0 
        ? filtered.reduce((sum, exec) => sum + exec.executionTime, 0) / filtered.length
        : 0,
      successRate: filtered.length > 0
        ? filtered.filter(exec => exec.status === "success").length / filtered.length
        : 0,
      cacheHitRate: filtered.length > 0
        ? filtered.filter(exec => exec.status === "cached").length / filtered.length
        : 0,
      agentUsage: {} as Record<string, number>,
      dailyUsage: {} as Record<string, number>,
    };
    
    // Count by agent
    filtered.forEach(exec => {
      stats.agentUsage[exec.agentId] = (stats.agentUsage[exec.agentId] || 0) + 1;
      
      // Count by day
      const date = new Date(exec.createdAt).toISOString().split('T')[0];
      stats.dailyUsage[date] = (stats.dailyUsage[date] || 0) + 1;
    });
    
    return stats;
  },
});