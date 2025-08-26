import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Type definitions matching the frontend component interfaces
export type IntacctPreferencesDoc = Doc<"intacctPreferences">;

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  inApp: boolean;
  desktop: boolean;
}

export interface UICustomizations {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  showGridLines: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  primaryColor: string;
}

export interface DashboardWidget {
  enabled: boolean;
  position: number;
  size: 'small' | 'medium' | 'large';
}

export interface DashboardWidgets {
  cashFlow: DashboardWidget;
  revenueChart: DashboardWidget;
  expenseSummary: DashboardWidget;
  quickActions: DashboardWidget;
  recentTransactions: DashboardWidget;
  alerts: DashboardWidget;
}

export interface ProductivityTools {
  keyboardShortcuts: {
    'Ctrl+S': boolean;
    'Ctrl+N': boolean;
    'Ctrl+F': boolean;
    'Ctrl+Z': boolean;
    'Ctrl+Y': boolean;
  };
  autoSave: boolean;
  autoSaveInterval: number;
  bulkOperations: boolean;
  quickFilters: boolean;
  smartSuggestions: boolean;
  templateLibrary: boolean;
}

export interface IntacctPreferencesInput {
  userId: Id<"users">;
  organizationId: Id<"organizations">;
  userRole: UserRole;
  notifications: NotificationSettings;
  uiCustomizations: UICustomizations;
  dashboardWidgets: DashboardWidgets;
  productivityTools: ProductivityTools;
  grokAIEnabled: boolean;
}

/**
 * Get user's Intacct preferences
 */
export const getIntacctPreferences = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if user exists and has access to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check user-organization relationship
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!userOrg) {
      throw new Error("User does not have access to this organization");
    }

    // Get preferences
    const preferences = await ctx.db
      .query("intacctPreferences")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    return preferences;
  },
});

/**
 * Create or update user's Intacct preferences
 */
export const saveIntacctPreferences = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    userRole: v.object({
      id: v.string(),
      name: v.string(),
      permissions: v.array(v.string()),
    }),
    notifications: v.object({
      email: v.boolean(),
      sms: v.boolean(),
      inApp: v.boolean(),
      desktop: v.boolean(),
    }),
    uiCustomizations: v.object({
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
      compactMode: v.boolean(),
      sidebarCollapsed: v.boolean(),
      showGridLines: v.boolean(),
      highContrast: v.boolean(),
      fontSize: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      primaryColor: v.string(),
    }),
    dashboardWidgets: v.object({
      cashFlow: v.object({
        enabled: v.boolean(),
        position: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      }),
      revenueChart: v.object({
        enabled: v.boolean(),
        position: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      }),
      expenseSummary: v.object({
        enabled: v.boolean(),
        position: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      }),
      quickActions: v.object({
        enabled: v.boolean(),
        position: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      }),
      recentTransactions: v.object({
        enabled: v.boolean(),
        position: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      }),
      alerts: v.object({
        enabled: v.boolean(),
        position: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      }),
    }),
    productivityTools: v.object({
      keyboardShortcuts: v.object({
        'Ctrl+S': v.boolean(),
        'Ctrl+N': v.boolean(),
        'Ctrl+F': v.boolean(),
        'Ctrl+Z': v.boolean(),
        'Ctrl+Y': v.boolean(),
      }),
      autoSave: v.boolean(),
      autoSaveInterval: v.number(),
      bulkOperations: v.boolean(),
      quickFilters: v.boolean(),
      smartSuggestions: v.boolean(),
      templateLibrary: v.boolean(),
    }),
    grokAIEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Validation: Check if user exists and has access to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check user-organization relationship
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!userOrg) {
      throw new Error("User does not have access to this organization");
    }

    // Role-based validation
    const hasWritePermission = args.userRole.permissions.includes('write') || 
                              args.userRole.permissions.includes('admin') ||
                              userOrg.role === 'owner' ||
                              userOrg.role === 'admin';

    if (!hasWritePermission) {
      throw new Error("Insufficient permissions to modify preferences");
    }

    // Validate productivity tools settings
    if (args.productivityTools.autoSave && args.productivityTools.autoSaveInterval < 60) {
      throw new Error("Auto-save interval must be at least 60 seconds");
    }

    if (args.productivityTools.autoSaveInterval > 3600) {
      throw new Error("Auto-save interval cannot exceed 3600 seconds (1 hour)");
    }

    // Check for existing preferences
    const existingPreferences = await ctx.db
      .query("intacctPreferences")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    const now = Date.now();
    const preferencesData = {
      userId: args.userId,
      organizationId: args.organizationId,
      userRole: args.userRole,
      notifications: args.notifications,
      uiCustomizations: args.uiCustomizations,
      dashboardWidgets: args.dashboardWidgets,
      productivityTools: args.productivityTools,
      grokAIEnabled: args.grokAIEnabled,
      lastUpdated: now,
      updatedAt: now,
    };

    if (existingPreferences) {
      // Update existing preferences
      const preferencesId = await ctx.db.patch(existingPreferences._id, preferencesData);
      return { 
        id: existingPreferences._id, 
        ...preferencesData,
        createdAt: existingPreferences.createdAt 
      };
    } else {
      // Create new preferences
      const preferencesId = await ctx.db.insert("intacctPreferences", {
        ...preferencesData,
        createdAt: now,
      });
      return { 
        id: preferencesId, 
        ...preferencesData,
        createdAt: now 
      };
    }
  },
});

/**
 * Delete user's Intacct preferences
 */
export const deleteIntacctPreferences = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if user exists and has access to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check user-organization relationship and permissions
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!userOrg) {
      throw new Error("User does not have access to this organization");
    }

    // Only allow deletion if user is owner/admin or has explicit delete permissions
    const canDelete = userOrg.role === 'owner' || 
                     userOrg.role === 'admin' ||
                     userOrg.permissions.includes('delete');

    if (!canDelete) {
      throw new Error("Insufficient permissions to delete preferences");
    }

    // Find and delete preferences
    const preferences = await ctx.db
      .query("intacctPreferences")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (preferences) {
      await ctx.db.delete(preferences._id);
      return { deleted: true, id: preferences._id };
    } else {
      return { deleted: false, message: "Preferences not found" };
    }
  },
});

/**
 * Get all preferences for an organization (admin only)
 */
export const getOrganizationIntacctPreferences = query({
  args: {
    organizationId: v.id("organizations"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if requesting user is admin or owner of the organization
    const userOrg = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user_org", (q) => 
        q.eq("userId", args.requestingUserId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!userOrg || (userOrg.role !== 'owner' && userOrg.role !== 'admin')) {
      throw new Error("Insufficient permissions to view organization preferences");
    }

    // Get all preferences for the organization
    const preferences = await ctx.db
      .query("intacctPreferences")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return preferences;
  },
});

/**
 * Get default preferences for a user role
 */
export const getDefaultPreferencesForRole = query({
  args: {
    roleName: v.string(),
  },
  handler: async (ctx, args) => {
    // Define default preferences based on role
    const baseDefaults = {
      notifications: {
        email: true,
        sms: false,
        inApp: true,
        desktop: true,
      },
      uiCustomizations: {
        theme: 'light' as const,
        compactMode: false,
        sidebarCollapsed: false,
        showGridLines: true,
        highContrast: false,
        fontSize: 'medium' as const,
        primaryColor: '#3B82F6',
      },
      dashboardWidgets: {
        cashFlow: { enabled: true, position: 0, size: 'large' as const },
        revenueChart: { enabled: true, position: 1, size: 'large' as const },
        expenseSummary: { enabled: true, position: 2, size: 'medium' as const },
        quickActions: { enabled: true, position: 3, size: 'small' as const },
        recentTransactions: { enabled: true, position: 4, size: 'medium' as const },
        alerts: { enabled: true, position: 5, size: 'small' as const },
      },
      productivityTools: {
        keyboardShortcuts: {
          'Ctrl+S': true,
          'Ctrl+N': true,
          'Ctrl+F': true,
          'Ctrl+Z': true,
          'Ctrl+Y': true,
        },
        autoSave: true,
        autoSaveInterval: 300,
        bulkOperations: true,
        quickFilters: true,
        smartSuggestions: true,
        templateLibrary: true,
      },
      grokAIEnabled: false,
    };

    // Role-specific customizations
    if (args.roleName === 'admin' || args.roleName === 'owner') {
      return {
        ...baseDefaults,
        productivityTools: {
          ...baseDefaults.productivityTools,
          bulkOperations: true,
          smartSuggestions: true,
        },
        grokAIEnabled: true,
      };
    } else if (args.roleName === 'viewer') {
      return {
        ...baseDefaults,
        dashboardWidgets: {
          ...baseDefaults.dashboardWidgets,
          quickActions: { enabled: false, position: 3, size: 'small' as const },
        },
        productivityTools: {
          ...baseDefaults.productivityTools,
          bulkOperations: false,
        },
      };
    }

    return baseDefaults;
  },
});