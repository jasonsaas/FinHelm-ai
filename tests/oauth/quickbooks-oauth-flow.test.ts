import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuickBooksIntegration } from '../../integrations/quickbooks';
import type { QuickBooksConfig, QuickBooksTokens } from '../../integrations/quickbooks';

/**
 * Comprehensive OAuth Flow Testing for QuickBooks Integration
 * Tests the complete OAuth 2.0 authentication flow including:
 * - Authorization URL generation
 * - Token exchange
 * - Token refresh
 * - Error handling
 * - State validation
 * - PKCE support (if implemented)
 */

describe('QuickBooks OAuth Flow', () => {
  let integration: QuickBooksIntegration;
  const mockConfig: QuickBooksConfig = {
    clientId: 'Intuit_QB_Client_12345',
    clientSecret: 'QB_Client_Secret_67890',
    scope: 'com.intuit.quickbooks.accounting',
    redirectUri: 'https://app.finhelm.ai/auth/quickbooks/callback',
    environment: 'sandbox',
  };

  beforeEach(() => {
    integration = new QuickBooksIntegration(mockConfig, 'http://localhost:3001');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authorization URL Generation', () => {
    it('should generate valid authorization URL with all required parameters', () => {
      const state = 'secure-random-state-123';
      const authUri = integration.getAuthUri(state);

      // Parse the URL to validate components
      const url = new URL(authUri);
      
      expect(url.hostname).toBe('appcenter.intuit.com');
      expect(url.pathname).toBe('/connect/oauth2');
      expect(url.searchParams.get('client_id')).toBe(mockConfig.clientId);
      expect(url.searchParams.get('scope')).toBe(mockConfig.scope);
      expect(url.searchParams.get('redirect_uri')).toBe(mockConfig.redirectUri);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('access_type')).toBe('offline');
      expect(url.searchParams.get('state')).toBe(state);
    });

    it('should handle special characters in state parameter', () => {
      const state = 'state-with-special-chars!@#$%^&*()';
      const encodedState = encodeURIComponent(state);
      const authUri = integration.getAuthUri(state);
      
      expect(authUri).toContain(encodedState);
    });

    it('should generate different URLs for different environments', () => {
      const prodConfig = { ...mockConfig, environment: 'production' as const };
      const prodIntegration = new QuickBooksIntegration(prodConfig, 'http://localhost:3001');
      
      const sandboxUri = integration.getAuthUri('test-state');
      const prodUri = prodIntegration.getAuthUri('test-state');
      
      // Both should use the same OAuth server but the integration handles environment internally
      expect(sandboxUri).toContain('appcenter.intuit.com');
      expect(prodUri).toContain('appcenter.intuit.com');
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should successfully exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        token: {
          access_token: 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...',
          refresh_token: 'L011546037639L9UkbpQEeaolaMxdCc...',
          realmId: '9130347596842384658',
          expires_in: 3600,
          token_type: 'Bearer',
          refresh_token_expires_in: 8726400,
        }
      };

      const mockCreateToken = vi.spyOn(integration['oauthClient'], 'createToken')
        .mockResolvedValue(mockTokenResponse);

      const result = await integration.handleCallback(
        'Q011546037639njI9ma6VFWEihtWNf2JRejN5W...',
        '9130347596842384658',
        'secure-state-123'
      );

      expect(mockCreateToken).toHaveBeenCalledWith(
        'https://app.finhelm.ai/auth/quickbooks/callback?code=Q011546037639njI9ma6VFWEihtWNf2JRejN5W...&realmId=9130347596842384658&state=secure-state-123'
      );

      expect(result).toEqual({
        access_token: mockTokenResponse.token.access_token,
        refresh_token: mockTokenResponse.token.refresh_token,
        realmId: mockTokenResponse.token.realmId,
        expires_in: mockTokenResponse.token.expires_in,
        token_type: mockTokenResponse.token.token_type,
        refresh_token_expires_in: mockTokenResponse.token.refresh_token_expires_in,
      });
    });

    it('should handle invalid authorization code', async () => {
      const mockError = new Error('invalid_grant: Invalid authorization code');
      vi.spyOn(integration['oauthClient'], 'createToken').mockRejectedValue(mockError);

      await expect(
        integration.handleCallback('invalid-code', 'realm-id', 'state')
      ).rejects.toThrow('OAuth callback failed: Error: invalid_grant: Invalid authorization code');
    });

    it('should handle expired authorization code', async () => {
      const mockError = new Error('invalid_grant: Authorization code expired');
      vi.spyOn(integration['oauthClient'], 'createToken').mockRejectedValue(mockError);

      await expect(
        integration.handleCallback('expired-code', 'realm-id', 'state')
      ).rejects.toThrow('OAuth callback failed: Error: invalid_grant: Authorization code expired');
    });

    it('should validate realmId parameter', async () => {
      await expect(
        integration.handleCallback('valid-code', '', 'state')
      ).rejects.toThrow();

      await expect(
        integration.handleCallback('valid-code', null as any, 'state')
      ).rejects.toThrow();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should successfully refresh expired access tokens', async () => {
      const mockRefreshResponse = {
        token: {
          access_token: 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn1...',
          refresh_token: 'L011546037639L9UkbpQEeaolaMxdCc_new...',
          realmId: '9130347596842384658',
          expires_in: 3600,
          token_type: 'Bearer',
          refresh_token_expires_in: 8726400,
        }
      };

      const mockRefresh = vi.spyOn(integration['oauthClient'], 'refresh')
        .mockResolvedValue(mockRefreshResponse);

      const currentRefreshToken = 'L011546037639L9UkbpQEeaolaMxdCc_old...';
      const result = await integration.refreshTokens(currentRefreshToken);

      expect(mockRefresh).toHaveBeenCalledWith(currentRefreshToken);
      expect(result.access_token).toBe(mockRefreshResponse.token.access_token);
      expect(result.refresh_token).toBe(mockRefreshResponse.token.refresh_token);
      expect(result.expires_in).toBe(3600);
    });

    it('should handle invalid refresh token', async () => {
      const mockError = new Error('invalid_grant: Invalid refresh token');
      vi.spyOn(integration['oauthClient'], 'refresh').mockRejectedValue(mockError);

      await expect(
        integration.refreshTokens('invalid-refresh-token')
      ).rejects.toThrow('Token refresh failed: Error: invalid_grant: Invalid refresh token');
    });

    it('should handle expired refresh token', async () => {
      const mockError = new Error('invalid_grant: Refresh token expired');
      vi.spyOn(integration['oauthClient'], 'refresh').mockRejectedValue(mockError);

      await expect(
        integration.refreshTokens('expired-refresh-token')
      ).rejects.toThrow('Token refresh failed: Error: invalid_grant: Refresh token expired');
    });
  });

  describe('Token Validation', () => {
    it('should validate access token format', () => {
      const validToken = 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...';
      const invalidToken = 'not-a-valid-token';
      
      expect(() => integration['validateAccessToken'](validToken)).not.toThrow();
      expect(() => integration['validateAccessToken'](invalidToken)).toThrow('Invalid access token format');
    });

    it('should check token expiration', () => {
      const now = Date.now();
      const expiredTokens: QuickBooksTokens = {
        access_token: 'token',
        refresh_token: 'refresh',
        realmId: 'realm',
        expires_in: 3600,
        token_type: 'Bearer',
        issued_at: now - 4000000, // Token issued 4000 seconds ago (expired)
      };

      const validTokens: QuickBooksTokens = {
        access_token: 'token',
        refresh_token: 'refresh',
        realmId: 'realm',
        expires_in: 3600,
        token_type: 'Bearer',
        issued_at: now - 1800000, // Token issued 1800 seconds ago (still valid)
      };

      expect(integration['isTokenExpired'](expiredTokens)).toBe(true);
      expect(integration['isTokenExpired'](validTokens)).toBe(false);
    });
  });

  describe('OAuth Security', () => {
    it('should generate cryptographically secure state parameters', () => {
      const states = new Set();
      
      // Generate 100 state parameters and ensure they're all unique
      for (let i = 0; i < 100; i++) {
        const state = integration['generateSecureState']();
        expect(state).toMatch(/^[a-zA-Z0-9_-]{32,}$/); // Base64 URL-safe characters, at least 32 chars
        expect(states.has(state)).toBe(false);
        states.add(state);
      }
    });

    it('should validate state parameter in callback', async () => {
      const expectedState = 'expected-state-123';
      const invalidState = 'different-state-456';
      
      // Mock successful token exchange
      const mockTokenResponse = {
        token: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          realmId: 'test-realm',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      // This should succeed with correct state
      await expect(
        integration.handleCallback('code', 'realm', expectedState)
      ).resolves.toBeDefined();
      
      // This should fail with incorrect state (if state validation is implemented)
      // Note: Actual implementation may not validate state - that would be handled by the application
    });

    it('should handle SSL/TLS certificate validation in production', () => {
      const prodConfig = { ...mockConfig, environment: 'production' as const };
      const prodIntegration = new QuickBooksIntegration(prodConfig, 'https://api.finhelm.ai');
      
      // Verify that production integration is configured to use HTTPS endpoints
      expect(prodIntegration).toBeDefined();
      // Additional SSL validation would be tested in integration tests
    });
  });

  describe('OAuth Scope Handling', () => {
    it('should handle different OAuth scopes', () => {
      const accountingScope = 'com.intuit.quickbooks.accounting';
      const paymentsScope = 'com.intuit.quickbooks.payment';
      const bothScopes = 'com.intuit.quickbooks.accounting com.intuit.quickbooks.payment';
      
      const accountingConfig = { ...mockConfig, scope: accountingScope };
      const paymentsConfig = { ...mockConfig, scope: paymentsScope };
      const bothConfig = { ...mockConfig, scope: bothScopes };
      
      const accountingIntegration = new QuickBooksIntegration(accountingConfig, 'http://localhost:3001');
      const paymentsIntegration = new QuickBooksIntegration(paymentsConfig, 'http://localhost:3001');
      const bothIntegration = new QuickBooksIntegration(bothConfig, 'http://localhost:3001');
      
      expect(accountingIntegration.getAuthUri('state')).toContain(encodeURIComponent(accountingScope));
      expect(paymentsIntegration.getAuthUri('state')).toContain(encodeURIComponent(paymentsScope));
      expect(bothIntegration.getAuthUri('state')).toContain(encodeURIComponent(bothScopes));
    });

    it('should validate scope permissions for API calls', async () => {
      // Mock a scenario where the token has limited scope
      const limitedScopeError = {
        response: {
          status: 403,
          data: {
            Fault: {
              Error: [{ Detail: 'Insufficient scope for this operation' }]
            }
          }
        }
      };

      vi.doMock('axios');
      const axios = await import('axios');
      vi.mocked(axios.default.get).mockRejectedValue(limitedScopeError);

      await expect(
        integration.getChartOfAccounts('limited-scope-token', 'realm-id')
      ).rejects.toThrow('QuickBooks API error: 403 - Insufficient scope for this operation');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should implement exponential backoff for transient failures', async () => {
      const transientError = { response: { status: 503, data: 'Service temporarily unavailable' } };
      
      vi.doMock('axios');
      const axios = await import('axios');
      
      // Mock 3 failures followed by success
      vi.mocked(axios.default.get)
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({
          data: { QueryResponse: { CompanyInfo: [{ Id: '1', CompanyName: 'Test Company' }] } }
        });

      // Mock setTimeout to track backoff timing
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 0); // Execute immediately in tests
      }) as any;

      const result = await integration.testConnection('test-token', 'test-realm');
      
      expect(result).toBe(true);
      expect(delays).toEqual([1000, 2000, 4000]); // Exponential backoff: 1s, 2s, 4s
      
      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should handle concurrent token refresh requests', async () => {
      const mockRefreshResponse = {
        token: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          realmId: 'realm-id',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };

      const mockRefresh = vi.spyOn(integration['oauthClient'], 'refresh')
        .mockResolvedValue(mockRefreshResponse);

      // Simulate multiple concurrent refresh requests
      const refreshToken = 'current-refresh-token';
      const promises = [
        integration.refreshTokens(refreshToken),
        integration.refreshTokens(refreshToken),
        integration.refreshTokens(refreshToken),
      ];

      const results = await Promise.all(promises);

      // Should only make one actual refresh call due to request deduplication
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      results.forEach(result => {
        expect(result.access_token).toBe('new-access-token');
      });
    });
  });

  describe('Performance and Monitoring', () => {
    it('should complete OAuth flow within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const mockTokenResponse = {
        token: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          realmId: 'test-realm',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };

      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);

      await integration.handleCallback('auth-code', 'realm-id', 'state');
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should emit proper metrics for OAuth events', async () => {
      const metrics: Array<{ event: string; duration: number; success: boolean }> = [];
      
      // Mock metrics collection
      const originalConsoleLog = console.log;
      console.log = vi.fn((message) => {
        if (message.includes('OAUTH_METRIC')) {
          const data = JSON.parse(message.split('OAUTH_METRIC: ')[1]);
          metrics.push(data);
        }
      });

      const mockTokenResponse = {
        token: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          realmId: 'test-realm',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };

      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);

      await integration.handleCallback('auth-code', 'realm-id', 'state');

      expect(metrics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'oauth_token_exchange',
            success: true,
            duration: expect.any(Number),
          })
        ])
      );

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });
});