import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "@jest/globals";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

const modules = {
  intacctPreferencesActions: import("../intacctPreferencesActions"),
};

describe("IntacctPreferences Actions", () => {
  let t: any;
  let userId: Id<"users">;
  let organizationId: Id<"organizations">;
  let userOrgId: Id<"userOrganizations">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    
    // Create test user
    userId = await t.db.insert("users", {
      email: "test@example.com",
      name: "Test User",
      role: "user",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create test organization
    organizationId = await t.db.insert("organizations", {
      name: "Test Organization",
      slug: "test-org",
      erpType: "sage_intacct",
      erpSettings: {
        features: ["preferences", "dashboard"],
      },
      isActive: true,
      subscriptionTier: "premium",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create user-organization relationship
    userOrgId = await t.db.insert("userOrganizations", {
      userId,
      organizationId,
      role: "member",
      permissions: ["read", "write"],
      joinedAt: Date.now(),
      isActive: true,
    });
  });

  describe("getIntacctPreferences", () => {
    test("should return null when no preferences exist", async () => {
      const result = await t.query(api.intacctPreferencesActions.getIntacctPreferences, {
        userId,
        organizationId,
      });

      expect(result).toBeNull();
    });

    test("should return preferences when they exist", async () => {
      // Insert test preferences
      const preferencesId = await t.db.insert("intacctPreferences", {
        userId,
        organizationId,
        userRole: { id: "user", name: "User", permissions: ["read", "write"] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: "light",
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: "medium",
          primaryColor: "#3B82F6",
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: "large" },
          revenueChart: { enabled: true, position: 1, size: "large" },
          expenseSummary: { enabled: true, position: 2, size: "medium" },
          quickActions: { enabled: true, position: 3, size: "small" },
          recentTransactions: { enabled: true, position: 4, size: "medium" },
          alerts: { enabled: true, position: 5, size: "small" },
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
        lastUpdated: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await t.query(api.intacctPreferencesActions.getIntacctPreferences, {
        userId,
        organizationId,
      });

      expect(result).not.toBeNull();
      expect(result?._id).toBe(preferencesId);
      expect(result?.userId).toBe(userId);
      expect(result?.organizationId).toBe(organizationId);
      expect(result?.uiCustomizations.theme).toBe("light");
    });

    test("should throw error for non-existent user", async () => {
      const fakeUserId = "invalid-user-id" as Id<"users">;
      
      await expect(
        t.query(api.intacctPreferencesActions.getIntacctPreferences, {
          userId: fakeUserId,
          organizationId,
        })
      ).rejects.toThrow("User not found");
    });

    test("should throw error for non-existent organization", async () => {
      const fakeOrgId = "invalid-org-id" as Id<"organizations">;
      
      await expect(
        t.query(api.intacctPreferencesActions.getIntacctPreferences, {
          userId,
          organizationId: fakeOrgId,
        })
      ).rejects.toThrow("Organization not found");
    });

    test("should throw error when user has no access to organization", async () => {
      // Create another organization
      const otherOrgId = await t.db.insert("organizations", {
        name: "Other Organization",
        slug: "other-org",
        erpType: "quickbooks",
        erpSettings: { features: [] },
        isActive: true,
        subscriptionTier: "basic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        t.query(api.intacctPreferencesActions.getIntacctPreferences, {
          userId,
          organizationId: otherOrgId,
        })
      ).rejects.toThrow("User does not have access to this organization");
    });
  });

  describe("saveIntacctPreferences", () => {
    const validPreferences = {
      userRole: { id: "user", name: "User", permissions: ["read", "write"] },
      notifications: { email: true, sms: false, inApp: true, desktop: true },
      uiCustomizations: {
        theme: "light" as const,
        compactMode: false,
        sidebarCollapsed: false,
        showGridLines: true,
        highContrast: false,
        fontSize: "medium" as const,
        primaryColor: "#3B82F6",
      },
      dashboardWidgets: {
        cashFlow: { enabled: true, position: 0, size: "large" as const },
        revenueChart: { enabled: true, position: 1, size: "large" as const },
        expenseSummary: { enabled: true, position: 2, size: "medium" as const },
        quickActions: { enabled: true, position: 3, size: "small" as const },
        recentTransactions: { enabled: true, position: 4, size: "medium" as const },
        alerts: { enabled: true, position: 5, size: "small" as const },
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

    test("should create new preferences when none exist", async () => {
      const result = await t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
        userId,
        organizationId,
        ...validPreferences,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.organizationId).toBe(organizationId);
      expect(result.uiCustomizations.theme).toBe("light");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test("should update existing preferences", async () => {
      // First create preferences
      await t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
        userId,
        organizationId,
        ...validPreferences,
      });

      // Then update them
      const updatedPreferences = {
        ...validPreferences,
        uiCustomizations: {
          ...validPreferences.uiCustomizations,
          theme: "dark" as const,
          compactMode: true,
        },
      };

      const result = await t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
        userId,
        organizationId,
        ...updatedPreferences,
      });

      expect(result.uiCustomizations.theme).toBe("dark");
      expect(result.uiCustomizations.compactMode).toBe(true);
    });

    test("should validate auto-save interval minimum", async () => {
      const invalidPreferences = {
        ...validPreferences,
        productivityTools: {
          ...validPreferences.productivityTools,
          autoSave: true,
          autoSaveInterval: 30, // Too low
        },
      };

      await expect(
        t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
          userId,
          organizationId,
          ...invalidPreferences,
        })
      ).rejects.toThrow("Auto-save interval must be at least 60 seconds");
    });

    test("should validate auto-save interval maximum", async () => {
      const invalidPreferences = {
        ...validPreferences,
        productivityTools: {
          ...validPreferences.productivityTools,
          autoSave: true,
          autoSaveInterval: 4000, // Too high
        },
      };

      await expect(
        t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
          userId,
          organizationId,
          ...invalidPreferences,
        })
      ).rejects.toThrow("Auto-save interval cannot exceed 3600 seconds");
    });

    test("should check user permissions", async () => {
      // Update user-org relationship to have only read permission
      await t.db.patch(userOrgId, {
        permissions: ["read"],
      });

      await expect(
        t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
          userId,
          organizationId,
          ...validPreferences,
        })
      ).rejects.toThrow("Insufficient permissions to modify preferences");
    });

    test("should allow admins to modify preferences", async () => {
      // Update user-org relationship to admin
      await t.db.patch(userOrgId, {
        role: "admin",
      });

      const result = await t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
        userId,
        organizationId,
        ...validPreferences,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
    });

    test("should allow owners to modify preferences", async () => {
      // Update user-org relationship to owner
      await t.db.patch(userOrgId, {
        role: "owner",
      });

      const result = await t.mutation(api.intacctPreferencesActions.saveIntacctPreferences, {
        userId,
        organizationId,
        ...validPreferences,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
    });
  });

  describe("deleteIntacctPreferences", () => {
    let preferencesId: Id<"intacctPreferences">;

    beforeEach(async () => {
      preferencesId = await t.db.insert("intacctPreferences", {
        userId,
        organizationId,
        userRole: { id: "user", name: "User", permissions: ["read", "write"] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: "light",
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: "medium",
          primaryColor: "#3B82F6",
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: "large" },
          revenueChart: { enabled: true, position: 1, size: "large" },
          expenseSummary: { enabled: true, position: 2, size: "medium" },
          quickActions: { enabled: true, position: 3, size: "small" },
          recentTransactions: { enabled: true, position: 4, size: "medium" },
          alerts: { enabled: true, position: 5, size: "small" },
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
        lastUpdated: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    test("should delete existing preferences", async () => {
      // Update to admin for delete permission
      await t.db.patch(userOrgId, {
        role: "admin",
      });

      const result = await t.mutation(api.intacctPreferencesActions.deleteIntacctPreferences, {
        userId,
        organizationId,
      });

      expect(result.deleted).toBe(true);
      expect(result.id).toBe(preferencesId);

      // Verify it was actually deleted
      const preferences = await t.db.get(preferencesId);
      expect(preferences).toBeNull();
    });

    test("should return false when preferences don't exist", async () => {
      // Update to admin for delete permission
      await t.db.patch(userOrgId, {
        role: "admin",
      });

      // Delete first
      await t.mutation(api.intacctPreferencesActions.deleteIntacctPreferences, {
        userId,
        organizationId,
      });

      // Try to delete again
      const result = await t.mutation(api.intacctPreferencesActions.deleteIntacctPreferences, {
        userId,
        organizationId,
      });

      expect(result.deleted).toBe(false);
      expect(result.message).toBe("Preferences not found");
    });

    test("should check delete permissions", async () => {
      // Regular member should not be able to delete
      await expect(
        t.mutation(api.intacctPreferencesActions.deleteIntacctPreferences, {
          userId,
          organizationId,
        })
      ).rejects.toThrow("Insufficient permissions to delete preferences");
    });

    test("should allow owners to delete preferences", async () => {
      await t.db.patch(userOrgId, {
        role: "owner",
      });

      const result = await t.mutation(api.intacctPreferencesActions.deleteIntacctPreferences, {
        userId,
        organizationId,
      });

      expect(result.deleted).toBe(true);
    });
  });

  describe("getOrganizationIntacctPreferences", () => {
    test("should return all preferences for organization when user is admin", async () => {
      // Create another user and preferences
      const otherUserId = await t.db.insert("users", {
        email: "other@example.com",
        name: "Other User",
        role: "user",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await t.db.insert("userOrganizations", {
        userId: otherUserId,
        organizationId,
        role: "member",
        permissions: ["read", "write"],
        joinedAt: Date.now(),
        isActive: true,
      });

      // Create preferences for both users
      await t.db.insert("intacctPreferences", {
        userId,
        organizationId,
        userRole: { id: "user", name: "User", permissions: ["read", "write"] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: "light",
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: "medium",
          primaryColor: "#3B82F6",
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: "large" },
          revenueChart: { enabled: true, position: 1, size: "large" },
          expenseSummary: { enabled: true, position: 2, size: "medium" },
          quickActions: { enabled: true, position: 3, size: "small" },
          recentTransactions: { enabled: true, position: 4, size: "medium" },
          alerts: { enabled: true, position: 5, size: "small" },
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
        lastUpdated: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await t.db.insert("intacctPreferences", {
        userId: otherUserId,
        organizationId,
        userRole: { id: "user", name: "User", permissions: ["read", "write"] },
        notifications: { email: false, sms: true, inApp: false, desktop: false },
        uiCustomizations: {
          theme: "dark",
          compactMode: true,
          sidebarCollapsed: true,
          showGridLines: false,
          highContrast: true,
          fontSize: "large",
          primaryColor: "#FF0000",
        },
        dashboardWidgets: {
          cashFlow: { enabled: false, position: 0, size: "small" },
          revenueChart: { enabled: true, position: 1, size: "medium" },
          expenseSummary: { enabled: true, position: 2, size: "large" },
          quickActions: { enabled: false, position: 3, size: "small" },
          recentTransactions: { enabled: true, position: 4, size: "small" },
          alerts: { enabled: false, position: 5, size: "medium" },
        },
        productivityTools: {
          keyboardShortcuts: {
            'Ctrl+S': false,
            'Ctrl+N': false,
            'Ctrl+F': true,
            'Ctrl+Z': false,
            'Ctrl+Y': false,
          },
          autoSave: false,
          autoSaveInterval: 600,
          bulkOperations: false,
          quickFilters: false,
          smartSuggestions: false,
          templateLibrary: false,
        },
        grokAIEnabled: true,
        lastUpdated: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Make requesting user an admin
      await t.db.patch(userOrgId, {
        role: "admin",
      });

      const result = await t.query(api.intacctPreferencesActions.getOrganizationIntacctPreferences, {
        organizationId,
        requestingUserId: userId,
      });

      expect(result).toHaveLength(2);
      expect(result.map(p => p.userId)).toContain(userId);
      expect(result.map(p => p.userId)).toContain(otherUserId);
    });

    test("should throw error for non-admin users", async () => {
      await expect(
        t.query(api.intacctPreferencesActions.getOrganizationIntacctPreferences, {
          organizationId,
          requestingUserId: userId,
        })
      ).rejects.toThrow("Insufficient permissions to view organization preferences");
    });
  });

  describe("getDefaultPreferencesForRole", () => {
    test("should return default preferences for user role", async () => {
      const result = await t.query(api.intacctPreferencesActions.getDefaultPreferencesForRole, {
        roleName: "user",
      });

      expect(result).toBeDefined();
      expect(result.notifications.email).toBe(true);
      expect(result.uiCustomizations.theme).toBe("light");
      expect(result.grokAIEnabled).toBe(false);
    });

    test("should return enhanced preferences for admin role", async () => {
      const result = await t.query(api.intacctPreferencesActions.getDefaultPreferencesForRole, {
        roleName: "admin",
      });

      expect(result).toBeDefined();
      expect(result.productivityTools.bulkOperations).toBe(true);
      expect(result.productivityTools.smartSuggestions).toBe(true);
      expect(result.grokAIEnabled).toBe(true);
    });

    test("should return restricted preferences for viewer role", async () => {
      const result = await t.query(api.intacctPreferencesActions.getDefaultPreferencesForRole, {
        roleName: "viewer",
      });

      expect(result).toBeDefined();
      expect(result.dashboardWidgets.quickActions.enabled).toBe(false);
      expect(result.productivityTools.bulkOperations).toBe(false);
    });

    test("should return owner preferences for owner role", async () => {
      const result = await t.query(api.intacctPreferencesActions.getDefaultPreferencesForRole, {
        roleName: "owner",
      });

      expect(result).toBeDefined();
      expect(result.grokAIEnabled).toBe(true);
      expect(result.productivityTools.bulkOperations).toBe(true);
    });
  });
});