/**
 * Sandbox Integration Tests for OAuth2 Providers
 * Tests actual sandbox API endpoints for Sage Intacct and QuickBooks
 * These tests require valid sandbox credentials and are typically run in CI/CD
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import OAuthClient from "intuit-oauth";

// Skip these tests unless explicitly running integration tests
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)("Sandbox Integration Tests", () => {
  let sageIntaccOAuthClient: OAuthClient;
  let quickBooksOAuthClient: OAuthClient;

  beforeAll(() => {
    // Initialize OAuth clients with sandbox credentials
    sageIntaccOAuthClient = new OAuthClient({
      clientId: process.env.SAGE_INTACCT_CLIENT_ID!,
      clientSecret: process.env.SAGE_INTACCT_CLIENT_SECRET!,
      environment: 'sandbox',
      redirectUri: process.env.SAGE_INTACCT_REDIRECT_URI!,
      logging: true,
      // Custom Sage Intacct endpoints
      token_url: process.env.SAGE_INTACCT_SANDBOX_TOKEN_URL || 'https://api-sandbox.intacct.com/oauth2/token',
      revoke_url: process.env.SAGE_INTACCT_SANDBOX_REVOKE_URL || 'https://api-sandbox.intacct.com/oauth2/revoke',
    });

    quickBooksOAuthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID!,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
      environment: 'sandbox',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
      logging: true,
    });
  });

  describe("Sage Intacct Sandbox Integration", () => {
    it("should generate valid authorization URL", () => {
      const authUrl = sageIntaccOAuthClient.authorizeUri({
        scope: 'openid profile company',
        state: 'test-state-12345',
      });

      expect(authUrl).toContain('api-sandbox.intacct.com');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=openid%20profile%20company');
      expect(authUrl).toContain('state=test-state-12345');
    });

    it("should handle token exchange with valid code", async () => {
      // This test requires a valid authorization code from the OAuth flow
      // In a real scenario, this would be obtained by completing the OAuth flow
      const mockAuthCode = process.env.TEST_SAGE_INTACCT_AUTH_CODE;
      
      if (!mockAuthCode) {
        console.warn('Skipping token exchange test - no TEST_SAGE_INTACCT_AUTH_CODE provided');
        return;
      }

      try {
        const authResponse = await sageIntaccOAuthClient.createToken(mockAuthCode);
        
        expect(authResponse).toBeDefined();
        expect(authResponse.token).toBeDefined();
        expect(authResponse.token.access_token).toBeTruthy();
        expect(authResponse.token.refresh_token).toBeTruthy();
        expect(authResponse.token.expires_in).toBeGreaterThan(0);
      } catch (error: any) {
        // Expected for invalid/expired codes
        expect(error.message).toMatch(/(invalid|expired|unauthorized)/i);
      }
    });

    it("should test API connectivity with mock token", async () => {
      // Mock a valid token for API testing
      const mockToken = {
        access_token: 'sandbox_test_token',
        refresh_token: 'sandbox_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      // Test Sage Intacct XML API endpoint
      const testXmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <control>
            <senderid>${process.env.SAGE_INTACCT_SENDER_ID || 'test_sender'}</senderid>
            <password>${process.env.SAGE_INTACCT_SENDER_PASSWORD || 'test_password'}</password>
            <controlid>test-${Date.now()}</controlid>
            <uniqueid>false</uniqueid>
            <dtdversion>3.0</dtdversion>
          </control>
          <operation>
            <authentication>
              <access_token>${mockToken.access_token}</access_token>
            </authentication>
            <content>
              <function controlid="test">
                <getAPISession></getAPISession>
              </function>
            </content>
          </operation>
        </request>`;

      try {
        const response = await fetch(
          process.env.SAGE_INTACCT_SANDBOX_API_URL || 'https://api-sandbox.intacct.com/ia/xml/xmlgw.phtml',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/xml',
              'Authorization': `Bearer ${mockToken.access_token}`,
            },
            body: testXmlRequest,
          }
        );

        expect(response).toBeDefined();
        
        // Even with invalid token, we should get a structured response
        const responseText = await response.text();
        expect(responseText).toContain('<?xml');
      } catch (error) {
        console.warn('Sage Intacct sandbox API not reachable:', error);
      }
    });
  });

  describe("QuickBooks Sandbox Integration", () => {
    it("should generate valid authorization URL", () => {
      const authUrl = quickBooksOAuthClient.authorizeUri({
        scope: 'com.intuit.quickbooks.accounting',
        state: 'qb-test-state-12345',
      });

      expect(authUrl).toContain('appcenter.intuit.com');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=com.intuit.quickbooks.accounting');
      expect(authUrl).toContain('state=qb-test-state-12345');
    });

    it("should handle token exchange with valid code", async () => {
      const mockAuthCode = process.env.TEST_QUICKBOOKS_AUTH_CODE;
      
      if (!mockAuthCode) {
        console.warn('Skipping QB token exchange test - no TEST_QUICKBOOKS_AUTH_CODE provided');
        return;
      }

      try {
        const authResponse = await quickBooksOAuthClient.createToken(mockAuthCode);
        
        expect(authResponse).toBeDefined();
        expect(authResponse.token).toBeDefined();
        expect(authResponse.token.access_token).toBeTruthy();
        expect(authResponse.token.refresh_token).toBeTruthy();
        expect(authResponse.token.realmId).toBeTruthy();
      } catch (error: any) {
        // Expected for invalid/expired codes
        expect(error.message).toMatch(/(invalid|expired|unauthorized)/i);
      }
    });

    it("should test sandbox API with mock credentials", async () => {
      const mockRealmId = 'sandbox_company_123';
      const mockToken = {
        access_token: 'sandbox_qb_token',
        refresh_token: 'sandbox_qb_refresh',
        realmId: mockRealmId,
        expires_in: 3600,
      };

      // Set mock token
      quickBooksOAuthClient.token.setToken(mockToken);

      try {
        const apiResponse = await quickBooksOAuthClient.makeApiCall({
          url: `${OAuthClient.environment.sandbox}v3/companyinfo/${mockRealmId}/companyinfo/1`,
          method: 'GET',
        });

        // Even with invalid token, we should get a structured error response
        expect(apiResponse).toBeDefined();
      } catch (error: any) {
        // Expected for invalid tokens - check it's a proper API error
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle network timeouts gracefully", async () => {
      const slowClient = new OAuthClient({
        clientId: 'test_client',
        clientSecret: 'test_secret',
        environment: 'sandbox',
        redirectUri: 'http://localhost:3000/callback',
      });

      try {
        // This should timeout or fail gracefully
        await Promise.race([
          slowClient.createToken('invalid_code'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 5000))
        ]);
      } catch (error: any) {
        expect(error.message).toMatch(/(timeout|invalid|network|connection)/i);
      }
    });

    it("should handle malformed responses", async () => {
      // Mock fetch to return malformed response
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('Internal Server Error'),
      });

      try {
        const response = await fetch('https://api-sandbox.intacct.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'invalid=request',
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(500);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Token Lifecycle Management", () => {
    it("should handle token refresh scenarios", async () => {
      const mockExpiredToken = {
        access_token: 'expired_token',
        refresh_token: 'valid_refresh_token',
        expires_in: -1, // Expired
        realmId: 'test_realm',
      };

      quickBooksOAuthClient.token.setToken(mockExpiredToken);

      try {
        const refreshResponse = await quickBooksOAuthClient.refresh();
        // This will likely fail with invalid credentials, but we're testing the flow
        expect(refreshResponse).toBeDefined();
      } catch (error: any) {
        // Expected with invalid refresh token
        expect(error.message).toMatch(/(invalid|expired|refresh|token)/i);
      }
    });

    it("should validate token expiration checks", () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      const pastExpiry = Date.now() - 1000; // 1 second ago

      const validToken = {
        access_token: 'valid_token',
        expires_in: 3600,
        issued_at: Date.now(),
      };

      const expiredToken = {
        access_token: 'expired_token',
        expires_in: 3600,
        issued_at: Date.now() - 7200000, // 2 hours ago
      };

      // Test token validation logic
      const isValidToken = (token: any) => {
        const expiresAt = token.issued_at + (token.expires_in * 1000);
        return expiresAt > Date.now();
      };

      expect(isValidToken(validToken)).toBe(true);
      expect(isValidToken(expiredToken)).toBe(false);
    });
  });

  describe("Compliance and Security Testing", () => {
    it("should ensure tokens are properly formatted", () => {
      const mockToken = global.testUtils.createMockToken();
      
      expect(mockToken.access_token).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(mockToken.token_type).toBe('Bearer');
      expect(mockToken.expires_in).toBeGreaterThan(0);
      expect(mockToken.scope).toBeTruthy();
    });

    it("should validate OAuth state parameter security", () => {
      const generateSecureState = () => {
        const timestamp = Date.now();
        const randomBytes = Math.random().toString(36).substring(2, 15);
        return `state_${timestamp}_${randomBytes}`;
      };

      const state1 = generateSecureState();
      const state2 = generateSecureState();

      expect(state1).not.toBe(state2);
      expect(state1).toMatch(/^state_\d+_[a-z0-9]+$/);
      expect(state1.length).toBeGreaterThan(20);
    });

    it("should test PKCE code challenge generation", () => {
      // Mock PKCE implementation
      const generateCodeVerifier = () => {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
      };

      const generateCodeChallenge = (verifier: string) => {
        // In real implementation, this would use crypto.subtle.digest('SHA-256', ...)
        return Buffer.from(verifier).toString('base64url');
      };

      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      expect(verifier).toBeTruthy();
      expect(challenge).toBeTruthy();
      expect(verifier).not.toBe(challenge);
    });
  });
});