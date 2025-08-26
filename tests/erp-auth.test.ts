/**
 * FinHelm.ai ERP OAuth Authentication Tests
 * Comprehensive test suite for Sage Intacct and QuickBooks OAuth2 integration
 * Tests role-based authentication, security, and compliance features
 */

import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../convex/_generated/api';
import schema from '../convex/schema';

describe('ERP OAuth Authentication', () => {
  let th: ConvexTestingHelper;
  let userId: any;
  let organizationId: any;

  beforeEach(async () => {
    th = new ConvexTestingHelper(schema);

    // Create test user with admin role
    userId = await th.mutation(api.users.create, {
      email: 'test@finhelm.ai',
      name: 'Test User',
      role: 'admin',
      isActive: true,
      preferences: {
        timezone: 'America/New_York',
        language: 'en',
        notifications: {
          email: true,
          sms: false,
          inApp: true,
        },
      },
    });

    // Create test organization
    organizationId = await th.mutation(api.organizations.create, {
      name: 'Test Company',
      slug: 'test-company',
      erpType: 'sage_intacct',
      erpSettings: {
        companyId: 'TEST_COMPANY_123',
        baseUrl: 'https://api-sandbox.intacct.com',
        apiVersion: 'v1',
        features: ['oauth2', 'accounting', 'financial_reporting'],
      },
      isActive: true,
      subscriptionTier: 'premium',
    });

    // Create user-organization relationship
    await th.mutation(api.userOrganizations.create, {
      userId,
      organizationId,
      role: 'admin',
      permissions: ['read', 'write', 'oauth', 'compliance'],
      joinedAt: Date.now(),
      isActive: true,
    });
  });

  afterEach(async () => {
    await th.finishTest();
  });

  describe('Permission Checks', () => {
    it('should check OAuth permissions for admin user', async () => {
      const permissions = await th.query(api.erpAuth.checkOAuthPermissions, {
        userId,
        organizationId,
      });

      expect(permissions).toMatchObject({
        hasOAuthAccess: true,
        userRole: 'admin',
        canInitiateOAuth: true,
        canManageConnections: true,
      });

      expect(permissions.permissions).toContain('oauth');
      expect(permissions.permissions).toContain('compliance');
    });

    it('should restrict OAuth permissions for viewer user', async () => {
      // Create viewer user
      const viewerId = await th.mutation(api.users.create, {
        email: 'viewer@finhelm.ai',
        name: 'Viewer User',
        role: 'viewer',
        isActive: true,
      });

      await th.mutation(api.userOrganizations.create, {
        userId: viewerId,
        organizationId,
        role: 'viewer',
        permissions: ['read'],
        joinedAt: Date.now(),
        isActive: true,
      });

      const permissions = await th.query(api.erpAuth.checkOAuthPermissions, {
        userId: viewerId,
        organizationId,
      });

      expect(permissions).toMatchObject({
        hasOAuthAccess: false,
        userRole: 'viewer',
        canInitiateOAuth: false,
        canManageConnections: false,
      });
    });

    it('should allow OAuth permissions for compliance agents', async () => {
      const complianceUserId = await th.mutation(api.users.create, {
        email: 'compliance@finhelm.ai',
        name: 'Compliance Agent',
        role: 'user',
        isActive: true,
      });

      await th.mutation(api.userOrganizations.create, {
        userId: complianceUserId,
        organizationId,
        role: 'compliance_agent',
        permissions: ['read', 'oauth', 'audit', 'compliance'],
        joinedAt: Date.now(),
        isActive: true,
      });

      const permissions = await th.query(api.erpAuth.checkOAuthPermissions, {
        userId: complianceUserId,
        organizationId,
      });

      expect(permissions).toMatchObject({
        hasOAuthAccess: true,
        userRole: 'compliance_agent',
        canInitiateOAuth: true,
        canManageConnections: false, // Compliance agents can't manage, only access
      });

      expect(permissions.permissions).toContain('compliance');
      expect(permissions.permissions).toContain('audit');
    });
  });

  describe('Sage Intacct OAuth Flow', () => {
    it('should initiate Sage Intacct OAuth flow successfully', async () => {
      const result = await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.authorizationUrl).toContain('api-sandbox.intacct.com');
      expect(result.authorizationUrl).toContain('response_type=code');
      expect(result.authorizationUrl).toContain('code_challenge');
      expect(result.erpType).toBe('sage_intacct');
      expect(result.state).toHaveLength(64); // 32 bytes hex encoded
    });

    it('should fail OAuth initiation for unauthorized user', async () => {
      const unauthorizedUserId = await th.mutation(api.users.create, {
        email: 'unauthorized@finhelm.ai',
        name: 'Unauthorized User',
        role: 'viewer',
        isActive: true,
      });

      const result = await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId: unauthorizedUserId,
        organizationId,
        useSandbox: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    it('should store and retrieve OAuth state correctly', async () => {
      const state = 'test_state_' + Date.now();
      const nonce = 'test_nonce_' + Date.now();
      const codeVerifier = 'test_code_verifier_' + Date.now();

      // Store OAuth state
      await th.mutation(api.erpAuth.storeOAuthState, {
        userId,
        organizationId,
        erpType: 'sage_intacct',
        state,
        nonce,
        codeVerifier,
        userRole: 'admin',
        permissions: ['read', 'write', 'oauth'],
        expiresAt: Date.now() + (15 * 60 * 1000),
      });

      // Retrieve OAuth state
      const storedState = await th.query(api.erpAuth.getOAuthState, { state });

      expect(storedState).toMatchObject({
        userId,
        organizationId,
        erpType: 'sage_intacct',
        state,
        nonce,
        codeVerifier,
        userRole: 'admin',
      });

      expect(storedState.permissions).toContain('oauth');
    });

    it('should clean up expired OAuth states', async () => {
      const expiredState = 'expired_state_' + Date.now();

      // Store expired OAuth state
      await th.mutation(api.erpAuth.storeOAuthState, {
        userId,
        organizationId,
        erpType: 'sage_intacct',
        state: expiredState,
        nonce: 'test_nonce',
        userRole: 'admin',
        permissions: ['oauth'],
        expiresAt: Date.now() - 1000, // Expired
      });

      // Try to retrieve expired state
      const storedState = await th.query(api.erpAuth.getOAuthState, { 
        state: expiredState 
      });

      expect(storedState).toBeNull();
    });
  });

  describe('QuickBooks OAuth Flow (Fallback)', () => {
    it('should initiate QuickBooks OAuth flow successfully', async () => {
      const result = await th.action(api.erpAuth.initiateQuickBooksOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.authorizationUrl).toContain('sandbox-appcenter.intuit.com');
      expect(result.authorizationUrl).toContain('response_type=code');
      expect(result.authorizationUrl).toContain('com.intuit.quickbooks.accounting');
      expect(result.erpType).toBe('quickbooks');
    });

    it('should handle QuickBooks OAuth callback with mock data', async () => {
      // First initiate OAuth to create state
      const initResult = await th.action(api.erpAuth.initiateQuickBooksOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      expect(initResult.success).toBe(true);

      // Mock callback (in real implementation, this would be called by QuickBooks)
      // For testing, we'll simulate successful token exchange
      const mockCode = 'test_authorization_code';
      const mockRealmId = 'test_realm_123';

      // Note: In a real test environment, you would mock the fetch calls
      // to simulate successful token exchange with QuickBooks
    });
  });

  describe('Role-Based Access Control', () => {
    const testRoles = [
      { role: 'owner', shouldHaveAccess: true, canManage: true },
      { role: 'admin', shouldHaveAccess: true, canManage: true },
      { role: 'compliance_agent', shouldHaveAccess: true, canManage: false },
      { role: 'financial_analyst', shouldHaveAccess: true, canManage: false },
      { role: 'member', shouldHaveAccess: false, canManage: false },
      { role: 'viewer', shouldHaveAccess: false, canManage: false },
    ];

    testRoles.forEach(({ role, shouldHaveAccess, canManage }) => {
      it(`should ${shouldHaveAccess ? 'allow' : 'deny'} OAuth access for ${role}`, async () => {
        const testUserId = await th.mutation(api.users.create, {
          email: `${role}@finhelm.ai`,
          name: `${role} User`,
          role: 'user',
          isActive: true,
        });

        await th.mutation(api.userOrganizations.create, {
          userId: testUserId,
          organizationId,
          role: role as any,
          permissions: shouldHaveAccess ? ['read', 'oauth'] : ['read'],
          joinedAt: Date.now(),
          isActive: true,
        });

        const permissions = await th.query(api.erpAuth.checkOAuthPermissions, {
          userId: testUserId,
          organizationId,
        });

        expect(permissions.hasOAuthAccess).toBe(shouldHaveAccess);
        expect(permissions.canManageConnections).toBe(canManage);
      });
    });
  });

  describe('Security Features', () => {
    it('should generate secure random strings', async () => {
      const result1 = await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      const result2 = await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      // States should be different
      expect(result1.state).not.toBe(result2.state);
      
      // States should be properly formatted hex strings
      expect(result1.state).toMatch(/^[a-f0-9]{64}$/);
      expect(result2.state).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should enforce OAuth state expiration', async () => {
      const shortExpiry = Date.now() + 1000; // 1 second
      const state = 'short_lived_state';

      await th.mutation(api.erpAuth.storeOAuthState, {
        userId,
        organizationId,
        erpType: 'sage_intacct',
        state,
        nonce: 'test_nonce',
        userRole: 'admin',
        permissions: ['oauth'],
        expiresAt: shortExpiry,
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const storedState = await th.query(api.erpAuth.getOAuthState, { state });
      expect(storedState).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log OAuth initiation events', async () => {
      await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      // Query audit logs
      const auditLogs = await th.query(api.auditLogs.getByAction, {
        organizationId,
        action: 'oauth_initiate',
        limit: 1,
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        organizationId,
        userId,
        action: 'oauth_initiate',
        resourceType: 'erp_connection',
      });

      expect(auditLogs[0].details.metadata).toMatchObject({
        erpType: 'sage_intacct',
        sandbox: true,
      });
    });

    it('should log OAuth callback success events', async () => {
      // This would be tested with mock callback data
      // Implementation depends on having proper OAuth callback mocking
    });
  });

  describe('Connection Management', () => {
    it('should retrieve active connections with proper permissions', async () => {
      // Create a test connection
      const connectionId = await th.mutation(api.erpConnections.create, {
        organizationId,
        userId,
        erpType: 'sage_intacct',
        connectionName: 'Test Sage Intacct Connection',
        isActive: true,
        credentials: {
          accessToken: 'test_access_token',
          refreshToken: 'test_refresh_token',
          companyId: 'TEST_COMPANY_123',
          expiresAt: Date.now() + (3600 * 1000),
        },
        syncStatus: 'active',
      });

      const connections = await th.query(api.erpAuth.getActiveConnections, {
        organizationId,
        userId,
      });

      expect(connections).toHaveLength(1);
      expect(connections[0]).toMatchObject({
        id: connectionId,
        erpType: 'sage_intacct',
        connectionName: 'Test Sage Intacct Connection',
        syncStatus: 'active',
        isTokenExpired: false,
      });

      // Should not include sensitive credential data
      expect(connections[0]).not.toHaveProperty('accessToken');
      expect(connections[0]).not.toHaveProperty('refreshToken');
    });

    it('should deny connection access for unauthorized users', async () => {
      const unauthorizedUserId = await th.mutation(api.users.create, {
        email: 'unauthorized@finhelm.ai',
        name: 'Unauthorized User',
        role: 'viewer',
        isActive: true,
      });

      await expect(
        th.query(api.erpAuth.getActiveConnections, {
          organizationId,
          userId: unauthorizedUserId,
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user IDs gracefully', async () => {
      const invalidUserId = 'invalid_user_id' as any;

      await expect(
        th.query(api.erpAuth.checkOAuthPermissions, {
          userId: invalidUserId,
          organizationId,
        })
      ).rejects.toThrow('User not found');
    });

    it('should handle missing organization relationships', async () => {
      const orphanUserId = await th.mutation(api.users.create, {
        email: 'orphan@finhelm.ai',
        name: 'Orphan User',
        role: 'user',
        isActive: true,
      });

      const permissions = await th.query(api.erpAuth.checkOAuthPermissions, {
        userId: orphanUserId,
        organizationId,
      });

      // Should fall back to user's base role
      expect(permissions.userRole).toBe('user');
      expect(permissions.hasOAuthAccess).toBe(false);
    });
  });

  describe('Sandbox Testing', () => {
    it('should correctly use sandbox URLs when specified', async () => {
      const sandboxResult = await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      const prodResult = await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: false,
      });

      expect(sandboxResult.authorizationUrl).toContain('sandbox');
      expect(prodResult.authorizationUrl).not.toContain('sandbox');
    });
  });

  describe('Compliance Features', () => {
    it('should track all OAuth operations for compliance', async () => {
      // Initiate OAuth
      await th.action(api.erpAuth.initiateSageIntacctOAuth, {
        userId,
        organizationId,
        useSandbox: true,
      });

      // Check audit trail
      const auditLogs = await th.query(api.auditLogs.getByOrganization, {
        organizationId,
        limit: 10,
      });

      const oauthLogs = auditLogs.filter(log => log.action.includes('oauth'));
      expect(oauthLogs.length).toBeGreaterThan(0);

      // Verify required compliance fields
      oauthLogs.forEach(log => {
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('resourceType');
        expect(log.details).toHaveProperty('metadata');
      });
    });
  });
});

/**
 * Integration Tests (require actual API access)
 * These tests should be run in a separate test environment
 * with proper test credentials and sandbox access
 */
describe.skip('ERP OAuth Integration Tests', () => {
  // These tests would require:
  // 1. Test Sage Intacct developer account
  // 2. Test QuickBooks developer account  
  // 3. Valid sandbox credentials
  // 4. Network access to ERP APIs

  it('should complete full Sage Intacct OAuth flow', async () => {
    // Test full OAuth flow with real Sage Intacct sandbox
  });

  it('should complete full QuickBooks OAuth flow', async () => {
    // Test full OAuth flow with real QuickBooks sandbox
  });

  it('should successfully refresh Sage Intacct tokens', async () => {
    // Test token refresh with real API
  });

  it('should successfully refresh QuickBooks tokens', async () => {
    // Test token refresh with real API
  });

  it('should handle API errors gracefully', async () => {
    // Test error handling with real API responses
  });
});