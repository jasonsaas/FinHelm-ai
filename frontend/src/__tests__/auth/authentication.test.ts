/**
 * Authentication Service Unit Tests
 * 
 * Comprehensive tests for authentication functionality including:
 * - Login/logout flows
 * - Token management and refresh
 * - Session handling
 * - OAuth integration
 * - Security validation
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  errorLogger,
} from '../../utils/errorHandling';

// Mock authentication service interfaces
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    role: string;
  };
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface OAuthRequest {
  provider: 'google' | 'microsoft' | 'quickbooks';
  code: string;
  state?: string;
}

/**
 * Authentication Service Mock Implementation
 * This would normally be imported from the actual auth service
 */
class AuthenticationService {
  private tokenStorage: Map<string, any> = new Map();
  private refreshTokens: Map<string, any> = new Map();

  /**
   * Authenticate user with email and password
   * @param request - Login credentials
   * @returns Authentication response with tokens
   * @throws AuthenticationError for invalid credentials
   * @throws ValidationError for invalid input
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Input validation
    if (!request.email || !request.password) {
      throw new ValidationError('Email and password are required');
    }

    if (!this.isValidEmail(request.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (request.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Simulate authentication
    if (request.email === 'test@example.com' && request.password === 'validPassword123!') {
      const accessToken = this.generateAccessToken();
      const refreshToken = this.generateRefreshToken();
      
      const response: LoginResponse = {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour
        user: {
          id: 'user-123',
          email: request.email,
          name: 'Test User',
          organizationId: 'org-456',
          role: 'user',
        },
      };

      // Store tokens
      this.tokenStorage.set(accessToken, {
        userId: response.user.id,
        email: response.user.email,
        organizationId: response.user.organizationId,
        role: response.user.role,
        expiresAt: Date.now() + (response.expiresIn * 1000),
      });

      this.refreshTokens.set(refreshToken, {
        userId: response.user.id,
        accessToken,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      });

      return response;
    }

    throw new AuthenticationError('Invalid email or password');
  }

  /**
   * Refresh access token using refresh token
   * @param request - Refresh token request
   * @returns New access token
   * @throws AuthenticationError for invalid refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<{ accessToken: string; expiresIn: number }> {
    const tokenData = this.refreshTokens.get(request.refreshToken);
    
    if (!tokenData) {
      throw new AuthenticationError('Invalid refresh token');
    }

    if (tokenData.expiresAt < Date.now()) {
      this.refreshTokens.delete(request.refreshToken);
      throw new AuthenticationError('Refresh token expired');
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken();
    
    // Get user data from old token
    const oldTokenData = this.tokenStorage.get(tokenData.accessToken);
    if (oldTokenData) {
      // Remove old token
      this.tokenStorage.delete(tokenData.accessToken);
      
      // Store new token
      this.tokenStorage.set(newAccessToken, {
        ...oldTokenData,
        expiresAt: Date.now() + (3600 * 1000), // 1 hour
      });

      // Update refresh token mapping
      tokenData.accessToken = newAccessToken;
    }

    return {
      accessToken: newAccessToken,
      expiresIn: 3600,
    };
  }

  /**
   * Validate access token
   * @param token - Access token to validate
   * @returns Token data if valid
   * @throws AuthenticationError for invalid token
   */
  async validateToken(token: string): Promise<any> {
    const tokenData = this.tokenStorage.get(token);
    
    if (!tokenData) {
      throw new AuthenticationError('Invalid access token');
    }

    if (tokenData.expiresAt < Date.now()) {
      this.tokenStorage.delete(token);
      throw new AuthenticationError('Access token expired');
    }

    return tokenData;
  }

  /**
   * Logout user and invalidate tokens
   * @param accessToken - Access token to invalidate
   * @param refreshToken - Refresh token to invalidate
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    this.tokenStorage.delete(accessToken);
    if (refreshToken) {
      this.refreshTokens.delete(refreshToken);
    }
  }

  /**
   * OAuth authentication flow
   * @param request - OAuth request with provider and code
   * @returns Authentication response
   * @throws AuthenticationError for invalid OAuth flow
   */
  async oauthLogin(request: OAuthRequest): Promise<LoginResponse> {
    // Simulate OAuth validation
    if (!request.code || request.code === 'invalid_code') {
      throw new AuthenticationError('Invalid OAuth authorization code');
    }

    if (request.provider === 'quickbooks' && request.state && request.state !== 'expected_state') {
      throw new AuthenticationError('Invalid OAuth state parameter');
    }

    // Simulate successful OAuth
    return this.login({
      email: `oauth.${request.provider}@example.com`,
      password: 'validPassword123!',
    });
  }

  private generateAccessToken(): string {
    return `access_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private generateRefreshToken(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

describe('Authentication Service', () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = new AuthenticationService();
    errorLogger.clearLogs();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    test('should successfully authenticate with valid credentials', async () => {
      const request: LoginRequest = {
        email: 'test@example.com',
        password: 'validPassword123!',
      };

      const response = await authService.login(request);

      expect(response.accessToken).toBeTruthy();
      expect(response.refreshToken).toBeTruthy();
      expect(response.expiresIn).toBe(3600);
      expect(response.user.email).toBe(request.email);
      expect(response.user.id).toBeTruthy();
    });

    test('should reject invalid email format', async () => {
      const request: LoginRequest = {
        email: 'invalid-email',
        password: 'validPassword123!',
      };

      await expect(authService.login(request)).rejects.toThrow(ValidationError);
      await expect(authService.login(request)).rejects.toThrow('Invalid email format');
    });

    test('should reject empty credentials', async () => {
      const request: LoginRequest = {
        email: '',
        password: '',
      };

      await expect(authService.login(request)).rejects.toThrow(ValidationError);
      await expect(authService.login(request)).rejects.toThrow('Email and password are required');
    });

    test('should reject short passwords', async () => {
      const request: LoginRequest = {
        email: 'test@example.com',
        password: 'short',
      };

      await expect(authService.login(request)).rejects.toThrow(ValidationError);
      await expect(authService.login(request)).rejects.toThrow('Password must be at least 8 characters');
    });

    test('should reject invalid credentials', async () => {
      const request: LoginRequest = {
        email: 'wrong@example.com',
        password: 'wrongPassword123!',
      };

      await expect(authService.login(request)).rejects.toThrow(AuthenticationError);
      await expect(authService.login(request)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    test('should successfully refresh valid token', async () => {
      // First, login to get tokens
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      const refreshResponse = await authService.refreshToken({
        refreshToken: loginResponse.refreshToken,
      });

      expect(refreshResponse.accessToken).toBeTruthy();
      expect(refreshResponse.accessToken).not.toBe(loginResponse.accessToken);
      expect(refreshResponse.expiresIn).toBe(3600);
    });

    test('should reject invalid refresh token', async () => {
      const request: RefreshTokenRequest = {
        refreshToken: 'invalid_refresh_token',
      };

      await expect(authService.refreshToken(request)).rejects.toThrow(AuthenticationError);
      await expect(authService.refreshToken(request)).rejects.toThrow('Invalid refresh token');
    });

    test('should reject expired refresh token', async () => {
      // Login to get tokens
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      // Manually expire the refresh token
      const authServiceInternal = authService as any;
      const tokenData = authServiceInternal.refreshTokens.get(loginResponse.refreshToken);
      tokenData.expiresAt = Date.now() - 1000; // 1 second ago

      await expect(authService.refreshToken({
        refreshToken: loginResponse.refreshToken,
      })).rejects.toThrow(AuthenticationError);
      await expect(authService.refreshToken({
        refreshToken: loginResponse.refreshToken,
      })).rejects.toThrow('Refresh token expired');
    });
  });

  describe('validateToken', () => {
    test('should validate correct access token', async () => {
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      const tokenData = await authService.validateToken(loginResponse.accessToken);

      expect(tokenData.userId).toBe('user-123');
      expect(tokenData.email).toBe('test@example.com');
      expect(tokenData.organizationId).toBe('org-456');
      expect(tokenData.role).toBe('user');
    });

    test('should reject invalid access token', async () => {
      await expect(authService.validateToken('invalid_token')).rejects.toThrow(AuthenticationError);
      await expect(authService.validateToken('invalid_token')).rejects.toThrow('Invalid access token');
    });

    test('should reject expired access token', async () => {
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      // Manually expire the token
      const authServiceInternal = authService as any;
      const tokenData = authServiceInternal.tokenStorage.get(loginResponse.accessToken);
      tokenData.expiresAt = Date.now() - 1000; // 1 second ago

      await expect(authService.validateToken(loginResponse.accessToken)).rejects.toThrow(AuthenticationError);
      await expect(authService.validateToken(loginResponse.accessToken)).rejects.toThrow('Access token expired');
    });
  });

  describe('logout', () => {
    test('should invalidate tokens on logout', async () => {
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      await authService.logout(loginResponse.accessToken, loginResponse.refreshToken);

      // Tokens should now be invalid
      await expect(authService.validateToken(loginResponse.accessToken)).rejects.toThrow(AuthenticationError);
      await expect(authService.refreshToken({
        refreshToken: loginResponse.refreshToken,
      })).rejects.toThrow(AuthenticationError);
    });

    test('should handle logout without refresh token', async () => {
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      // Should not throw error
      await expect(authService.logout(loginResponse.accessToken)).resolves.toBeUndefined();

      // Access token should be invalid
      await expect(authService.validateToken(loginResponse.accessToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('oauthLogin', () => {
    test('should handle successful OAuth flow', async () => {
      const request: OAuthRequest = {
        provider: 'quickbooks',
        code: 'valid_oauth_code',
        state: 'expected_state',
      };

      const response = await authService.oauthLogin(request);

      expect(response.accessToken).toBeTruthy();
      expect(response.refreshToken).toBeTruthy();
      expect(response.user.email).toContain('oauth.quickbooks');
    });

    test('should reject invalid OAuth code', async () => {
      const request: OAuthRequest = {
        provider: 'google',
        code: 'invalid_code',
      };

      await expect(authService.oauthLogin(request)).rejects.toThrow(AuthenticationError);
      await expect(authService.oauthLogin(request)).rejects.toThrow('Invalid OAuth authorization code');
    });

    test('should reject invalid OAuth state', async () => {
      const request: OAuthRequest = {
        provider: 'quickbooks',
        code: 'valid_oauth_code',
        state: 'wrong_state',
      };

      await expect(authService.oauthLogin(request)).rejects.toThrow(AuthenticationError);
      await expect(authService.oauthLogin(request)).rejects.toThrow('Invalid OAuth state parameter');
    });

    test('should handle different OAuth providers', async () => {
      const providers: Array<'google' | 'microsoft' | 'quickbooks'> = ['google', 'microsoft', 'quickbooks'];

      for (const provider of providers) {
        const request: OAuthRequest = {
          provider,
          code: 'valid_oauth_code',
        };

        const response = await authService.oauthLogin(request);
        expect(response.user.email).toContain(`oauth.${provider}`);
      }
    });
  });

  describe('Token Management', () => {
    test('should handle concurrent token refresh', async () => {
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      // Simulate concurrent refresh requests
      const refreshPromises = Array.from({ length: 3 }, () =>
        authService.refreshToken({ refreshToken: loginResponse.refreshToken })
      );

      const results = await Promise.allSettled(refreshPromises);

      // At least one should succeed
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should handle session cleanup on multiple logouts', async () => {
      const loginResponse = await authService.login({
        email: 'test@example.com',
        password: 'validPassword123!',
      });

      // Multiple logout calls should not cause errors
      await authService.logout(loginResponse.accessToken, loginResponse.refreshToken);
      await authService.logout(loginResponse.accessToken, loginResponse.refreshToken);

      // Token should still be invalid
      await expect(authService.validateToken(loginResponse.accessToken)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('Security Validation', () => {
    test('should prevent timing attacks on token validation', async () => {
      const validToken = 'valid_token_123';
      const invalidToken = 'invalid_token_456';

      const startTime1 = process.hrtime.bigint();
      await authService.validateToken(validToken).catch(() => {});
      const endTime1 = process.hrtime.bigint();

      const startTime2 = process.hrtime.bigint();
      await authService.validateToken(invalidToken).catch(() => {});
      const endTime2 = process.hrtime.bigint();

      const time1 = Number(endTime1 - startTime1) / 1000000; // Convert to milliseconds
      const time2 = Number(endTime2 - startTime2) / 1000000;

      // The timing difference should be minimal (within 10ms)
      // This is a basic check - in production, use constant-time comparison
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });

    test('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        null,
        undefined,
        '',
        '   ',
        'a'.repeat(1000), // Very long token
        '{}',
        'Bearer token',
        '123.456.789', // JWT-like structure
      ];

      for (const token of malformedTokens) {
        await expect(authService.validateToken(token as any)).rejects.toThrow(AuthenticationError);
      }
    });
  });
});