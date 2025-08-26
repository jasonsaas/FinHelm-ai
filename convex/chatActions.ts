import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Chat Management Actions for FinHelm.ai AI Assistant
 */

/**
 * Send a chat message and get AI response
 */
export const sendChatMessage = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    sessionId: v.string(),
    content: v.string(),
    agentId: v.optional(v.id("agents")), // Use default agent if not specified
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Store user message
    const userMessageId = await ctx.runMutation(api.chatActions.createChatMessage, {
      organizationId: args.organizationId,
      userId: args.userId,
      sessionId: args.sessionId,
      type: "user",
      content: args.content,
    });

    try {
      // Find or use default agent
      let agentId = args.agentId;
      if (!agentId) {
        // Get the default financial intelligence agent for this organization
        const defaultAgent = await ctx.runQuery(api.chatActions.getDefaultAgent, {
          organizationId: args.organizationId,
        });
        agentId = defaultAgent?._id;
      }

      if (!agentId) {
        throw new Error("No agent available for chat");
      }

      // Generate AI insights using existing agent system
      const agentResult = await ctx.runAction(api.agentActions.getAgentInsights, {
        organizationId: args.organizationId,
        agentId,
        query: args.content,
      });

      // Store assistant response
      const assistantMessageId = await ctx.runMutation(api.chatActions.createChatMessage, {
        organizationId: args.organizationId,
        userId: args.userId,
        sessionId: args.sessionId,
        type: "assistant",
        content: agentResult.insights.summary,
        response: agentResult.insights,
        agentExecutionId: agentResult.executionId,
      });

      return {
        userMessageId,
        assistantMessageId,
        response: agentResult.insights,
        executionTime: Date.now() - startTime,
      };

    } catch (error) {
      // Store error response
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await ctx.runMutation(api.chatActions.createChatMessage, {
        organizationId: args.organizationId,
        userId: args.userId,
        sessionId: args.sessionId,
        type: "assistant",
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again or rephrase your question.`,
      });
      
      throw error;
    }
  },
});

/**
 * Create a chat message
 */
export const createChatMessage = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    sessionId: v.string(),
    type: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    response: v.optional(v.object({
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
    })),
    agentExecutionId: v.optional(v.id("agentExecutions")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const messageId = await ctx.db.insert("chatMessages", {
      organizationId: args.organizationId,
      userId: args.userId,
      sessionId: args.sessionId,
      type: args.type,
      content: args.content,
      response: args.response,
      agentExecutionId: args.agentExecutionId,
      createdAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

/**
 * Get chat messages for a session
 */
export const getChatMessages = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chatMessages")
      .withIndex("by_session_time", (q) => 
        q.eq("sessionId", args.sessionId)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId));

    if (args.offset) {
      query = query.skip(args.offset);
    }

    if (args.limit) {
      query = query.take(args.limit);
    } else {
      query = query.take(100); // Default limit
    }

    const messages = await query.collect();
    
    // Sort by creation time (oldest first for chat display)
    return messages.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Get recent chat sessions for a user
 */
export const getChatSessions = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Group by session and get latest message for each
    const sessionMap = new Map<string, any>();
    
    messages.forEach(message => {
      const existing = sessionMap.get(message.sessionId);
      if (!existing || message.createdAt > existing.createdAt) {
        sessionMap.set(message.sessionId, {
          sessionId: message.sessionId,
          lastMessage: message,
          lastActivity: message.createdAt,
        });
      }
    });

    // Convert to array and sort by last activity
    let sessions = Array.from(sessionMap.values())
      .sort((a, b) => b.lastActivity - a.lastActivity);

    if (args.limit) {
      sessions = sessions.slice(0, args.limit);
    }

    return sessions;
  },
});

/**
 * Delete a chat session
 */
export const deleteChatSession = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => 
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .collect();

    // Delete all messages in the session
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return { deleted: messages.length };
  },
});

/**
 * Get or create default financial intelligence agent
 */
export const getDefaultAgent = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Look for an existing general financial intelligence agent
    const existingAgent = await ctx.db
      .query("agents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => 
        q.and(
          q.eq(q.field("category"), "financial_intelligence"),
          q.eq(q.field("type"), "multivariate_prediction"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    return existingAgent;
  },
});

/**
 * Create default agent if none exists
 */
export const createDefaultAgent = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const agentId = await ctx.db.insert("agents", {
      organizationId: args.organizationId,
      userId: args.userId,
      name: "FinHelm AI Assistant",
      description: "General purpose financial intelligence agent for comprehensive analysis and insights",
      category: "financial_intelligence",
      type: "multivariate_prediction",
      isActive: true,
      isPremium: false,
      config: {
        prompt: "You are FinHelm AI, a financial intelligence assistant. Analyze the provided financial data and provide insights, patterns, and actionable recommendations.",
        model: "grok-beta",
        temperature: 0.3,
        maxTokens: 2000,
        dataSource: ["transactions", "accounts", "agentExecutions"],
        filters: {
          dateRange: {
            start: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days
            end: Date.now(),
          },
        },
        schedule: {
          frequency: "manual",
        },
      },
      lastRunAt: null,
      runCount: 0,
      averageExecutionTime: null,
      createdAt: now,
      updatedAt: now,
    });

    return agentId;
  },
});

/**
 * Get chat statistics for a user
 */
export const getChatStats = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    days: v.optional(v.number()), // Stats for last N days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.gte(q.field("createdAt"), since)
        )
      )
      .collect();

    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.type === "user").length;
    const assistantMessages = messages.filter(m => m.type === "assistant").length;
    const uniqueSessions = new Set(messages.map(m => m.sessionId)).size;

    return {
      totalMessages,
      userMessages,
      assistantMessages,
      uniqueSessions,
      period: days,
      averageMessagesPerSession: uniqueSessions > 0 ? Math.round(totalMessages / uniqueSessions) : 0,
    };
  },
});