/**
 * Comprehensive test suite for ERP OAuth2 Authentication
 * Tests Sage Intacct and QuickBooks OAuth flows with mock and sandbox integration
 * Covers role-based access control, token management, and compliance scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import OAuthClient from "intuit-oauth";

// Mock the intuit-oauth module
vi.mock("intuit-oauth", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      authorizeUri: vi.fn(),
      createToken: vi.fn(),
      refresh: vi.fn(),
      makeApiCall: vi.fn(),
      token: {
        setToken: vi.fn(),
      },
      environment: "sandbox",
    })),
    discovery_urls: {
      sandbox_base_url: "https://sandbox-quickbooks.api.intuit.com",
    },
    environment: {
      sandbox: "https://sandbox-quickbooks.api.intuit.com",
      production: "https://quickbooks.api.intuit.com",
    },
  };
});

// Mock fetch for Sage Intacct API calls
global.fetch = vi.fn();

describe("ERP OAuth2 Authentication", () => {
  let t: ConvexTestingHelper;
  let mockOAuthClient: any;
  let mockFetch: Mock;

  // Test data
  const testUser = {
    email: "test@finhelm.ai",
    name: "Test User",
    role: "admin" as const,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const testCompliance = {
    email: "compliance@finhelm.ai",
    name: "Compliance Agent",
    role: "compliance_agent" as const,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const testOrganization = {
    name: "Test Company",
    slug: "test-company",
    erpType: "sage_intacct" as const,
    erpSettings: {
      companyId: "TEST_COMPANY",
      baseUrl: "https://api-sandbox.intacct.com",
      apiVersion: "3.0",
      features: ["oauth2", "data_sync"],
    },
    isActive: true,
    subscriptionTier: "enterprise" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.run(async (ctx) => {
      // Insert test user
      const userId = await ctx.db.insert("users", testUser);
      const complianceUserId = await ctx.db.insert("users", testCompliance);
      
      // Insert test organization
      const orgId = await ctx.db.insert("organizations", testOrganization);
      
      // Link user to organization
      await ctx.db.insert("userOrganizations", {
        userId,
        organizationId: orgId,
        role: "admin",
        permissions: ["oauth:authorize", "oauth:token", "oauth:refresh"],
        joinedAt: Date.now(),
        isActive: true,
      });

      await ctx.db.insert("userOrganizations", {
        userId: complianceUserId,
        organizationId: orgId,
        role: "member",
        permissions: ["oauth:token", "oauth:refresh", "data:sync"],
        joinedAt: Date.now(),
        isActive: true,
      });
    });

    // Reset mocks
    mockOAuthClient = new (OAuthClient as any)();
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("OAuth Authorization Flow", () => {
    it("should initiate Sage Intacct OAuth authorization", async () => {
      const authUri = "https://api-sandbox.intacct.com/oauth2/authorize?client_id=test&response_type=code&scope=openid+profile+company&state=test-state";
      mockOAuthClient.authorizeUri.mockReturnValue(authUri);

      const result = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();
        
        // Mock user identity
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

        return await api.erpAuth.authorize(ctx, {
          provider: "sage_intacct",
          organizationId: org!._id,
          state: "test-state",
        });
      });

      expect(result).toMatchObject({
        authorizationUrl: authUri,
        provider: "sage_intacct",
        state: expect.stringContaining("test-state"),
      });
    });

    it("should reject unauthorized users", async () => {
      await expect(
        t.run(async (ctx) => {
          const org = await ctx.db.query("organizations").first();
          
          // Mock unauthorized user
          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: "unauthorized@test.com" });

          return await api.erpAuth.authorize(ctx, {
            provider: "sage_intacct",
            organizationId: org!._id,
          });
        })
      ).rejects.toThrow("User not found");
    });

    it("should reject users without OAuth permissions", async () => {
      await expect(
        t.run(async (ctx) => {
          // Create user with viewer role
          const viewerUser = {
            ...testUser,
            email: "viewer@test.com",
            role: "viewer" as const,
          };
          const userId = await ctx.db.insert("users", viewerUser);
          const org = await ctx.db.query("organizations").first();
          
          await ctx.db.insert("userOrganizations", {
            userId,
            organizationId: org!._id,
            role: "viewer",
            permissions: [],
            joinedAt: Date.now(),
            isActive: true,
          });

          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: "viewer@test.com" });

          return await api.erpAuth.authorize(ctx, {
            provider: "sage_intacct",
            organizationId: org!._id,
          });
        })
      ).rejects.toThrow("Insufficient permissions for OAuth authorization");
    });
  });

  describe("Token Exchange", () => {
    it("should exchange authorization code for Sage Intacct token", async () => {
      const mockToken = {
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        expires_in: 3600,
        token_type: "Bearer",
        realmId: "TEST_COMPANY_123",
      };

      mockOAuthClient.createToken.mockResolvedValue({
        token: mockToken,
      });

      const result = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();
        const state = `${org!._id}_${user!._id}_${Date.now()}`;
        
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

        return await api.erpAuth.getToken(ctx, {
          provider: "sage_intacct",
          code: "test_authorization_code",
          state,
          realmId: "TEST_COMPANY_123",
        });
      });

      expect(result).toMatchObject({
        success: true,
        provider: "sage_intacct",
        companyId: "TEST_COMPANY_123",
        expiresAt: expect.any(Number),
      });

      // Verify connection was created
      const connection = await t.run(async (ctx) => {
        return await ctx.db.query("erpConnections").first();
      });

      expect(connection).toMatchObject({
        erpType: "sage_intacct",
        isActive: true,
        syncStatus: "active",
        credentials: {
          accessToken: "test_access_token",
          refreshToken: "test_refresh_token",
          companyId: "TEST_COMPANY_123",
        },
      });
    });

    it("should handle token exchange failures", async () => {
      mockOAuthClient.createToken.mockRejectedValue(new Error("Invalid authorization code"));

      await expect(
        t.run(async (ctx) => {
          const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
          const org = await ctx.db.query("organizations").first();
          const state = `${org!._id}_${user!._id}_${Date.now()}`;
          
          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

          return await api.erpAuth.getToken(ctx, {
            provider: "sage_intacct",
            code: "invalid_code",
            state,
          });
        })
      ).rejects.toThrow("Token exchange failed");
    });

    it("should validate state parameter", async () => {
      await expect(
        t.run(async (ctx) => {
          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

          return await api.erpAuth.getToken(ctx, {
            provider: "sage_intacct",
            code: "test_code",
            state: "invalid_state",
          });
        })
      ).rejects.toThrow("Invalid state parameter");
    });
  });

  describe("Token Refresh", () => {
    let connectionId: Id<"erpConnections">;

    beforeEach(async () => {
      connectionId = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();

        return await ctx.db.insert("erpConnections", {
          organizationId: org!._id,
          userId: user!._id,
          erpType: "sage_intacct",
          connectionName: "Test Connection",
          isActive: true,
          credentials: {
            accessToken: "old_access_token",
            refreshToken: "test_refresh_token",
            companyId: "TEST_COMPANY",
            expiresAt: Date.now() - 1000, // Expired
          },
          syncStatus: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
    });

    it("should refresh expired token successfully", async () => {
      const newToken = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      mockOAuthClient.refresh.mockResolvedValue({
        token: newToken,
      });

      const result = await t.run(async (ctx) => {
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

        return await api.erpAuth.refreshToken(ctx, {
          connectionId,
        });
      });

      expect(result).toMatchObject({
        success: true,
        provider: "sage_intacct",
        expiresAt: expect.any(Number),
      });

      // Verify connection was updated
      const connection = await t.run(async (ctx) => {
        return await ctx.db.get(connectionId);
      });

      expect(connection?.credentials.accessToken).toBe("new_access_token");
      expect(connection?.syncStatus).toBe("active");
    });

    it("should allow compliance agents to refresh tokens", async () => {
      const newToken = {
        access_token: "compliance_new_token",
        refresh_token: "compliance_refresh_token",
        expires_in: 3600,
      };

      mockOAuthClient.refresh.mockResolvedValue({
        token: newToken,
      });

      const result = await t.run(async (ctx) => {
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testCompliance.email });

        return await api.erpAuth.refreshToken(ctx, {
          connectionId,
        });
      });

      expect(result.success).toBe(true);
    });

    it("should handle refresh failures and mark connection as failed", async () => {
      mockOAuthClient.refresh.mockRejectedValue(new Error("Refresh token expired"));

      await expect(
        t.run(async (ctx) => {
          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

          return await api.erpAuth.refreshToken(ctx, {
            connectionId,
          });
        })
      ).rejects.toThrow("Token refresh failed");

      // Verify connection status was updated
      const connection = await t.run(async (ctx) => {
        return await ctx.db.get(connectionId);
      });

      expect(connection?.syncStatus).toBe("failed");
    });
  });

  describe("Connection Testing", () => {
    let connectionId: Id<"erpConnections">;

    beforeEach(async () => {
      connectionId = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testCompliance.email)).first();
        const org = await ctx.db.query("organizations").first();

        return await ctx.db.insert("erpConnections", {
          organizationId: org!._id,
          userId: user!._id,
          erpType: "sage_intacct",
          connectionName: "Test Connection",
          isActive: true,
          credentials: {
            accessToken: "valid_access_token",
            refreshToken: "valid_refresh_token",
            companyId: "TEST_COMPANY",
            expiresAt: Date.now() + 3600000, // Valid for 1 hour
          },
          syncStatus: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
    });

    it("should test Sage Intacct connection successfully", async () => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <response>
            <operation>
              <authentication>
                <status>success</status>
              </authentication>
            </operation>
          </response>`,
      } as Response);

      const result = await t.run(async (ctx) => {
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testCompliance.email });

        return await api.erpAuth.testConnection(ctx, {
          connectionId,
        });
      });

      expect(result).toMatchObject({
        success: true,
        healthy: true,
        provider: "sage_intacct",
        companyId: "TEST_COMPANY",
      });
    });

    it("should test QuickBooks connection successfully", async () => {
      // Update connection to QuickBooks
      await t.run(async (ctx) => {
        await ctx.db.patch(connectionId, {
          erpType: "quickbooks",
          credentials: {
            accessToken: "qb_access_token",
            refreshToken: "qb_refresh_token",
            realmId: "QB_COMPANY_123",
            expiresAt: Date.now() + 3600000,
          },
        });
      });

      mockOAuthClient.makeApiCall.mockResolvedValue({
        response: {
          QueryResponse: {
            CompanyInfo: [
              {
                Id: "1",
                CompanyName: "Test Company",
              },
            ],
          },
        },
      });

      const result = await t.run(async (ctx) => {
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testCompliance.email });

        return await api.erpAuth.testConnection(ctx, {
          connectionId,
        });
      });

      expect(result).toMatchObject({
        success: true,
        healthy: true,
        provider: "quickbooks",
        companyId: "QB_COMPANY_123",
      });
    });

    it("should handle connection test failures", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await t.run(async (ctx) => {
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testCompliance.email });

        return await api.erpAuth.testConnection(ctx, {
          connectionId,
        });
      });

      expect(result).toMatchObject({
        success: false,
        healthy: false,
        provider: "sage_intacct",
        error: "Network error",
      });
    });
  });

  describe("Connection Status Monitoring", () => {
    it("should return connection status for organization", async () => {
      const result = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();
        
        // Create test connections
        await ctx.db.insert("erpConnections", {
          organizationId: org!._id,
          userId: user!._id,
          erpType: "sage_intacct",
          connectionName: "Active Connection",
          isActive: true,
          credentials: {
            accessToken: "active_token",
            companyId: "ACTIVE_COMPANY",
            expiresAt: Date.now() + 3600000,
          },
          syncStatus: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("erpConnections", {
          organizationId: org!._id,
          userId: user!._id,
          erpType: "quickbooks",
          connectionName: "Expired Connection",
          isActive: true,
          credentials: {
            accessToken: "expired_token",
            realmId: "EXPIRED_COMPANY",
            expiresAt: Date.now() - 1000, // Expired
          },
          syncStatus: "failed",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

        return await api.erpAuth.getConnectionStatus(ctx, {
          organizationId: org!._id,
        });
      });

      expect(result).toMatchObject({
        connections: expect.arrayContaining([
          expect.objectContaining({
            provider: "sage_intacct",
            isActive: true,
            syncStatus: "active",
            isExpired: false,
          }),
          expect.objectContaining({
            provider: "quickbooks",
            isActive: true,
            syncStatus: "failed",
            isExpired: true,
          }),
        ]),
        summary: {
          total: 2,
          active: 1,
          expired: 1,
          failed: 1,
        },
      });
    });

    it("should filter by provider", async () => {
      const result = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();
        
        // Create mixed connections
        await ctx.db.insert("erpConnections", {
          organizationId: org!._id,
          userId: user!._id,
          erpType: "sage_intacct",
          connectionName: "Sage Connection",
          isActive: true,
          credentials: { accessToken: "sage_token", companyId: "SAGE_CO", expiresAt: Date.now() + 3600000 },
          syncStatus: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

        return await api.erpAuth.getConnectionStatus(ctx, {
          organizationId: org!._id,
          provider: "sage_intacct",
        });
      });

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].provider).toBe("sage_intacct");
    });
  });

  describe("Role-Based Access Control", () => {
    it("should deny access to viewers for token operations", async () => {
      const connectionId = await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();

        return await ctx.db.insert("erpConnections", {
          organizationId: org!._id,
          userId: user!._id,
          erpType: "sage_intacct",
          connectionName: "Test Connection",
          isActive: true,
          credentials: {
            accessToken: "test_token",
            refreshToken: "test_refresh",
            expiresAt: Date.now() + 3600000,
          },
          syncStatus: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.run(async (ctx) => {
          // Create viewer user
          const viewerUser = {
            ...testUser,
            email: "viewer@test.com",
            role: "viewer" as const,
          };
          await ctx.db.insert("users", viewerUser);

          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: "viewer@test.com" });

          return await api.erpAuth.refreshToken(ctx, {
            connectionId,
          });
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("Environment Variable Validation", () => {
    it("should handle missing OAuth credentials gracefully", async () => {
      // Mock missing environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SAGE_INTACCT_CLIENT_ID: undefined,
        SAGE_INTACCT_CLIENT_SECRET: undefined,
      };

      await expect(
        t.run(async (ctx) => {
          const org = await ctx.db.query("organizations").first();
          ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

          return await api.erpAuth.authorize(ctx, {
            provider: "sage_intacct",
            organizationId: org!._id,
          });
        })
      ).rejects.toThrow("Missing OAuth credentials for sage_intacct");

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe("Audit Logging", () => {
    it("should log OAuth events for compliance", async () => {
      const authUri = "https://test-auth-url.com";
      mockOAuthClient.authorizeUri.mockReturnValue(authUri);

      await t.run(async (ctx) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), testUser.email)).first();
        const org = await ctx.db.query("organizations").first();
        
        ctx.auth.getUserIdentity = vi.fn().mockResolvedValue({ email: testUser.email });

        await api.erpAuth.authorize(ctx, {
          provider: "sage_intacct",
          organizationId: org!._id,
        });

        // Check audit log was created
        const auditLog = await ctx.db.query("auditLogs")
          .filter(q => q.eq(q.field("action"), "oauth_authorize_initiated"))
          .first();

        expect(auditLog).toMatchObject({
          organizationId: org!._id,
          userId: user!._id,
          action: "oauth_authorize_initiated",
          resourceType: "erp_connection",
          resourceId: "sage_intacct",
        });
      });
    });
  });
});