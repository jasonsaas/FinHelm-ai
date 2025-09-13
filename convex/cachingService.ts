import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Caching Service for External API Responses and Expensive Computations
 * Implements 30-minute TTL for QuickBooks API responses and request batching
 */

// Cache table schema would be added to schema.ts:
/*
cacheEntries: defineTable({
  key: v.string(),
  value: v.any(),
  expiresAt: v.number(),
  organizationId: v.id("organizations"),
  cacheType: v.union(
    v.literal("qb_reports"),
    v.literal("qb_customers"),
    v.literal("qb_items"),
    v.literal("dashboard_metrics"),
    v.literal("search_results")
  ),
  createdAt: v.number(),
  accessCount: v.number(),
  lastAccessedAt: v.number(),
})
.index("by_key", ["key"])
.index("by_expires", ["expiresAt"])
.index("by_organization_type", ["organizationId", "cacheType"])
.index("by_last_accessed", ["lastAccessedAt"]),
*/

/**
 * Generic cache getter with TTL support
 */
export const getCacheEntry = query({
  args: {
    key: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    try {
      // In a real implementation, this would query the cache table
      // For now, we'll simulate cache behavior
      const cacheEntry = await ctx.db
        .query("cacheEntries")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .filter((q) => 
          args.organizationId 
            ? q.eq(q.field("organizationId"), args.organizationId)
            : q.always()
        )
        .first();
      
      if (!cacheEntry) {
        return null;
      }
      
      const now = Date.now();
      
      // Check if cache entry is expired
      if (cacheEntry.expiresAt < now) {
        // Mark as expired but don't delete immediately for cleanup efficiency
        return null;
      }
      
      // Update access statistics
      await ctx.db.patch(cacheEntry._id, {
        lastAccessedAt: now,
        accessCount: cacheEntry.accessCount + 1,
      });
      
      return {
        value: cacheEntry.value,
        cacheHit: true,
        expiresAt: cacheEntry.expiresAt,
        createdAt: cacheEntry.createdAt,
      };
      
    } catch (error) {
      console.error("Cache retrieval error:", error);
      return null;
    }
  },
});

/**
 * Set cache entry with TTL
 */
export const setCacheEntry = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    ttlMinutes: v.optional(v.number()),
    organizationId: v.id("organizations"),
    cacheType: v.union(
      v.literal("qb_reports"),
      v.literal("qb_customers"),
      v.literal("qb_items"),
      v.literal("dashboard_metrics"),
      v.literal("search_results")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ttlMs = (args.ttlMinutes || 30) * 60 * 1000; // Default 30 minutes
    const expiresAt = now + ttlMs;
    
    try {
      // Check if entry already exists
      const existingEntry = await ctx.db
        .query("cacheEntries")
        .withIndex("by_key", (q) => q.eq("key", args.key))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();
      
      if (existingEntry) {
        // Update existing entry
        await ctx.db.patch(existingEntry._id, {
          value: args.value,
          expiresAt,
          lastAccessedAt: now,
          accessCount: existingEntry.accessCount + 1,
        });
        return existingEntry._id;
      } else {
        // Create new entry
        const entryId = await ctx.db.insert("cacheEntries", {
          key: args.key,
          value: args.value,
          expiresAt,
          organizationId: args.organizationId,
          cacheType: args.cacheType,
          createdAt: now,
          accessCount: 1,
          lastAccessedAt: now,
        });
        return entryId;
      }
    } catch (error) {
      console.error("Cache storage error:", error);
      throw new Error("Failed to store cache entry");
    }
  },
});

/**
 * QuickBooks API response caching wrapper
 */
export const getQuickBooksDataCached = action({
  args: {
    organizationId: v.id("organizations"),
    endpoint: v.string(),
    params: v.optional(v.object({})),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const cacheKey = `qb_${args.organizationId}_${args.endpoint}_${JSON.stringify(args.params || {})}`;
    
    // Try cache first unless force refresh
    if (!args.forceRefresh) {
      const cachedResult = await ctx.runQuery(api.cachingService.getCacheEntry, {
        key: cacheKey,
        organizationId: args.organizationId,
      });
      
      if (cachedResult) {
        return {
          ...cachedResult.value,
          fromCache: true,
          cachedAt: cachedResult.createdAt,
        };
      }
    }
    
    try {
      // Simulate QuickBooks API call - replace with actual implementation
      const apiResult = await mockQuickBooksAPI(args.endpoint, args.params);
      
      // Cache the result with 30-minute TTL
      await ctx.runMutation(api.cachingService.setCacheEntry, {
        key: cacheKey,
        value: apiResult,
        ttlMinutes: 30,
        organizationId: args.organizationId,
        cacheType: "qb_reports",
      });
      
      return {
        ...apiResult,
        fromCache: false,
        fetchedAt: Date.now(),
      };
      
    } catch (error) {
      console.error("QuickBooks API error:", error);
      throw new Error("Failed to fetch QuickBooks data");
    }
  },
});

/**
 * Batch request processing for multiple API calls
 */
export const batchQuickBooksRequests = action({
  args: {
    organizationId: v.id("organizations"),
    requests: v.array(v.object({
      endpoint: v.string(),
      params: v.optional(v.object({})),
    })),
    maxConcurrency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxConcurrency = args.maxConcurrency || 5; // Limit concurrent requests
    const results: Array<{ success: boolean; data?: any; error?: string; endpoint: string }> = [];
    
    // Process requests in batches to avoid overwhelming the API
    for (let i = 0; i < args.requests.length; i += maxConcurrency) {
      const batch = args.requests.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async (request) => {
        try {
          const result = await ctx.runAction(api.cachingService.getQuickBooksDataCached, {
            organizationId: args.organizationId,
            endpoint: request.endpoint,
            params: request.params,
          });
          
          return {
            success: true,
            data: result,
            endpoint: request.endpoint,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            endpoint: request.endpoint,
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful to the API
      if (i + maxConcurrency < args.requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      results,
      totalRequests: args.requests.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  },
});

/**
 * Cache cleanup for expired entries
 */
export const cleanupExpiredCache = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const batchSize = args.batchSize || 100;
    
    let query = ctx.db
      .query("cacheEntries")
      .withIndex("by_expires", (q) => q.lte("expiresAt", now));
    
    if (args.organizationId) {
      query = query.filter((q) => q.eq(q.field("organizationId"), args.organizationId));
    }
    
    const expiredEntries = await query.take(batchSize).collect();
    
    // Delete expired entries
    const deletePromises = expiredEntries.map(entry => ctx.db.delete(entry._id));
    await Promise.all(deletePromises);
    
    console.log(`Cleaned up ${expiredEntries.length} expired cache entries`);
    
    return {
      deletedCount: expiredEntries.length,
      hasMore: expiredEntries.length === batchSize,
    };
  },
});

/**
 * Cache statistics for monitoring
 */
export const getCacheStats = query({
  args: {
    organizationId: v.id("organizations"),
    cacheType: v.optional(v.union(
      v.literal("qb_reports"),
      v.literal("qb_customers"),
      v.literal("qb_items"),
      v.literal("dashboard_metrics"),
      v.literal("search_results")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    let query = ctx.db
      .query("cacheEntries")
      .withIndex("by_organization_type", (q) => 
        args.cacheType 
          ? q.eq("organizationId", args.organizationId).eq("cacheType", args.cacheType)
          : q.eq("organizationId", args.organizationId)
      );
    
    const entries = await query.collect();
    
    const stats = {
      totalEntries: entries.length,
      activeEntries: entries.filter(e => e.expiresAt > now).length,
      expiredEntries: entries.filter(e => e.expiresAt <= now).length,
      totalAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0),
      averageAccessCount: entries.length > 0 
        ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length 
        : 0,
      cacheTypes: {} as Record<string, number>,
      oldestEntry: Math.min(...entries.map(e => e.createdAt)),
      newestEntry: Math.max(...entries.map(e => e.createdAt)),
    };
    
    // Count by cache type
    entries.forEach(entry => {
      stats.cacheTypes[entry.cacheType] = (stats.cacheTypes[entry.cacheType] || 0) + 1;
    });
    
    return stats;
  },
});

/**
 * In-memory cache for frequently accessed data (simulated - would use Redis in production)
 */
const memoryCache = new Map<string, { value: any; expiresAt: number; accessCount: number }>();

export const getFromMemoryCache = (key: string): any | null => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  entry.accessCount++;
  return entry.value;
};

export const setMemoryCache = (key: string, value: any, ttlMs: number = 5 * 60 * 1000) => {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    accessCount: 0,
  });
};

/**
 * Mock QuickBooks API for demonstration
 */
async function mockQuickBooksAPI(endpoint: string, params?: any) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  switch (endpoint) {
    case "customers":
      return {
        customers: Array.from({ length: 50 }, (_, i) => ({
          id: `customer-${i + 1}`,
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`,
          balance: Math.random() * 10000,
        })),
        totalCount: 50,
      };
      
    case "items":
      return {
        items: Array.from({ length: 30 }, (_, i) => ({
          id: `item-${i + 1}`,
          name: `Product ${i + 1}`,
          price: Math.random() * 500,
          quantity: Math.floor(Math.random() * 100),
        })),
        totalCount: 30,
      };
      
    case "reports/profit-loss":
      const revenue = Math.random() * 100000;
      const expenses = Math.random() * 80000;
      return {
        reportData: {
          totalRevenue: revenue,
          totalExpenses: expenses,
          netIncome: revenue - expenses,
          period: params?.period || "month",
          generatedAt: Date.now(),
        },
      };
      
    default:
      return {
        message: `Mock data for endpoint: ${endpoint}`,
        params,
        timestamp: Date.now(),
      };
  }
}