/**
 * Test utilities and helpers for OAuth testing
 * Provides reusable test data, mocks, and utility functions
 */

import { Id } from "../../_generated/dataModel";
import { vi } from "vitest";

export interface TestUser {
  _id?: Id<"users">;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer" | "compliance_agent" | "data_sync_agent";
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TestOrganization {
  _id?: Id<"organizations">;
  name: string;
  slug: string;
  erpType: "quickbooks" | "sage_intacct" | "netsuite" | "xero";
  erpSettings: {
    companyId?: string;
    baseUrl?: string;
    apiVersion?: string;
    features: string[];
  };
  isActive: boolean;
  subscriptionTier: "free" | "basic" | "premium" | "enterprise";
  createdAt: number;
  updatedAt: number;
}

export interface TestConnection {
  _id?: Id<"erpConnections">;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  erpType: "quickbooks" | "sage_intacct" | "netsuite" | "xero";
  connectionName: string;
  isActive: boolean;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    companyId?: string;
    realmId?: string;
    expiresAt?: number;
    tokenType?: string;
    scope?: string;
  };
  syncStatus: "active" | "failed" | "pending" | "disabled";
  createdAt: number;
  updatedAt: number;
}

/**
 * Test data factory functions
 */
export class TestDataFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      email: "test@finhelm.ai",
      name: "Test User",
      role: "admin",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  static createComplianceAgent(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      email: "compliance@finhelm.ai",
      name: "Compliance Agent",
      role: "compliance_agent",
      ...overrides,
    });
  }

  static createDataSyncAgent(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      email: "datasync@finhelm.ai",
      name: "Data Sync Agent",
      role: "data_sync_agent",
      ...overrides,
    });
  }

  static createViewer(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      email: "viewer@finhelm.ai",
      name: "Viewer User",
      role: "viewer",
      ...overrides,
    });
  }

  static createOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
    return {
      name: "Test Company",
      slug: "test-company",
      erpType: "sage_intacct",
      erpSettings: {
        companyId: "TEST_COMPANY",
        baseUrl: "https://api-sandbox.intacct.com",
        apiVersion: "3.0",
        features: ["oauth2", "data_sync"],
      },
      isActive: true,
      subscriptionTier: "enterprise",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  static createQuickBooksOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
    return this.createOrganization({
      name: "QuickBooks Test Company",
      slug: "qb-test-company",
      erpType: "quickbooks",
      erpSettings: {
        companyId: "QB_TEST_COMPANY",
        baseUrl: "https://sandbox-quickbooks.api.intuit.com",
        apiVersion: "v3",
        features: ["oauth2", "accounting"],
      },
      ...overrides,
    });
  }

  static createConnection(
    organizationId: Id<"organizations">,
    userId: Id<"users">,
    overrides: Partial<TestConnection> = {}
  ): TestConnection {
    return {
      organizationId,
      userId,
      erpType: "sage_intacct",
      connectionName: "Test Connection",
      isActive: true,
      credentials: {
        accessToken: "test_access_token",
        refreshToken: "test_refresh_token",
        companyId: "TEST_COMPANY",
        expiresAt: Date.now() + 3600000, // 1 hour from now
        tokenType: "Bearer",
        scope: "openid profile company",
      },
      syncStatus: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  static createExpiredConnection(
    organizationId: Id<"organizations">,
    userId: Id<"users">,
    overrides: Partial<TestConnection> = {}
  ): TestConnection {
    return this.createConnection(organizationId, userId, {
      credentials: {
        accessToken: "expired_access_token",
        refreshToken: "expired_refresh_token",
        companyId: "EXPIRED_COMPANY",
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      },
      syncStatus: "failed",
      ...overrides,
    });
  }

  static createQuickBooksConnection(
    organizationId: Id<"organizations">,
    userId: Id<"users">,
    overrides: Partial<TestConnection> = {}
  ): TestConnection {
    return this.createConnection(organizationId, userId, {
      erpType: "quickbooks",
      connectionName: "QuickBooks Connection",
      credentials: {
        accessToken: "qb_access_token",
        refreshToken: "qb_refresh_token",
        realmId: "QB_REALM_123",
        expiresAt: Date.now() + 3600000,
        tokenType: "Bearer",
        scope: "com.intuit.quickbooks.accounting",
      },
      ...overrides,
    });
  }
}

/**
 * OAuth response mocks
 */
export class OAuthMocks {
  static createSuccessfulTokenResponse(overrides: any = {}) {
    return {
      token: {
        access_token: "mock_access_token_" + Date.now(),
        refresh_token: "mock_refresh_token_" + Date.now(),
        expires_in: 3600,
        token_type: "Bearer",
        scope: "openid profile company",
        realmId: "MOCK_REALM_" + Date.now(),
        ...overrides,
      },
      response: {
        status: 200,
        statusText: "OK",
      },
    };
  }

  static createFailedTokenResponse(error: string = "invalid_grant") {
    return Promise.reject(new Error(`OAuth Error: ${error}`));
  }

  static createMockOAuthClient() {
    return {
      authorizeUri: vi.fn().mockReturnValue("https://mock-oauth-url.com"),
      createToken: vi.fn().mockResolvedValue(this.createSuccessfulTokenResponse()),
      refresh: vi.fn().mockResolvedValue(this.createSuccessfulTokenResponse()),
      makeApiCall: vi.fn().mockResolvedValue({
        response: {
          QueryResponse: {
            CompanyInfo: [{ Id: "1", CompanyName: "Mock Company" }],
          },
        },
      }),
      token: {
        setToken: vi.fn(),
      },
      environment: "sandbox",
    };
  }

  static createSageIntacctApiResponse(success: boolean = true) {
    if (success) {
      return {
        ok: true,
        status: 200,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <response>
            <operation>
              <authentication>
                <status>success</status>
                <userid>mock_user</userid>
                <companyid>MOCK_COMPANY</companyid>
              </authentication>
            </operation>
          </response>`,
      };
    } else {
      return {
        ok: false,
        status: 401,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <response>
            <operation>
              <authentication>
                <status>failure</status>
                <error>
                  <errorno>XL03000006</errorno>
                  <description>Sign-on information is incorrect</description>
                </error>
              </authentication>
            </operation>
          </response>`,
      };
    }
  }
}

/**
 * Test state management utilities
 */
export class TestStateManager {
  private static states = new Map<string, any>();

  static setState(key: string, value: any) {
    this.states.set(key, value);
  }

  static getState(key: string) {
    return this.states.get(key);
  }

  static clearState(key?: string) {
    if (key) {
      this.states.delete(key);
    } else {
      this.states.clear();
    }
  }

  static generateOAuthState(organizationId: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${organizationId}_${userId}_${timestamp}_${random}`;
  }

  static parseOAuthState(state: string): { organizationId: string; userId: string; timestamp: number } | null {
    const parts = state.split('_');
    if (parts.length < 3) return null;

    return {
      organizationId: parts[0],
      userId: parts[1],
      timestamp: parseInt(parts[2], 10),
    };
  }
}

/**
 * Time utilities for testing
 */
export class TestTimeUtils {
  static now(): number {
    return Date.now();
  }

  static hoursFromNow(hours: number): number {
    return Date.now() + (hours * 60 * 60 * 1000);
  }

  static hoursAgo(hours: number): number {
    return Date.now() - (hours * 60 * 60 * 1000);
  }

  static daysFromNow(days: number): number {
    return Date.now() + (days * 24 * 60 * 60 * 1000);
  }

  static daysAgo(days: number): number {
    return Date.now() - (days * 24 * 60 * 60 * 1000);
  }

  static isExpired(expiresAt: number): boolean {
    return expiresAt < Date.now();
  }

  static timeUntilExpiry(expiresAt: number): number {
    return Math.max(0, expiresAt - Date.now());
  }
}

/**
 * Validation utilities
 */
export class TestValidationUtils {
  static isValidToken(token: any): boolean {
    return !!(
      token &&
      token.access_token &&
      typeof token.access_token === 'string' &&
      token.access_token.length > 0
    );
  }

  static isValidConnectionCredentials(credentials: any): boolean {
    return !!(
      credentials &&
      credentials.accessToken &&
      (credentials.companyId || credentials.realmId) &&
      credentials.expiresAt &&
      credentials.expiresAt > Date.now()
    );
  }

  static isValidOAuthState(state: string): boolean {
    const parsed = TestStateManager.parseOAuthState(state);
    return !!(parsed && parsed.organizationId && parsed.userId && parsed.timestamp);
  }

  static isValidProvider(provider: string): boolean {
    return ['sage_intacct', 'quickbooks', 'netsuite', 'xero'].includes(provider);
  }

  static isValidRole(role: string): boolean {
    return ['admin', 'user', 'viewer', 'compliance_agent', 'data_sync_agent'].includes(role);
  }
}

/**
 * Error simulation utilities
 */
export class TestErrorSimulator {
  static networkError(): Error {
    return new Error('Network connection failed');
  }

  static timeoutError(): Error {
    return new Error('Request timeout');
  }

  static unauthorizedError(): Error {
    return new Error('Unauthorized: Invalid credentials');
  }

  static expiredTokenError(): Error {
    return new Error('Token expired');
  }

  static invalidGrantError(): Error {
    return new Error('invalid_grant: Authorization code expired');
  }

  static rateLimitError(): Error {
    return new Error('Rate limit exceeded');
  }

  static serverError(): Error {
    return new Error('Internal server error');
  }

  static malformedResponseError(): Error {
    return new Error('Malformed response from server');
  }
}

/**
 * Performance testing utilities
 */
export class TestPerformanceUtils {
  static async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    return { result, duration };
  }

  static async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  static createLoadTest(
    operation: () => Promise<any>,
    concurrency: number,
    iterations: number
  ): Promise<{ successful: number; failed: number; avgDuration: number }> {
    const runIteration = async () => {
      const start = Date.now();
      try {
        await operation();
        return { success: true, duration: Date.now() - start };
      } catch (error) {
        return { success: false, duration: Date.now() - start };
      }
    };

    const runConcurrentBatch = async () => {
      const promises = Array(concurrency).fill(null).map(() => runIteration());
      return Promise.all(promises);
    };

    return new Promise(async (resolve) => {
      let successful = 0;
      let failed = 0;
      let totalDuration = 0;

      for (let i = 0; i < iterations; i++) {
        const results = await runConcurrentBatch();
        results.forEach(result => {
          if (result.success) {
            successful++;
          } else {
            failed++;
          }
          totalDuration += result.duration;
        });
      }

      const avgDuration = totalDuration / (successful + failed);
      resolve({ successful, failed, avgDuration });
    });
  }
}