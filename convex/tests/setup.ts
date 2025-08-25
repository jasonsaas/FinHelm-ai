/**
 * Vitest setup file for OAuth testing environment
 * Configures test environment variables and global mocks
 */

import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SAGE_INTACCT_CLIENT_ID = 'test-sage-client-id';
process.env.SAGE_INTACCT_CLIENT_SECRET = 'test-sage-client-secret';
process.env.SAGE_INTACCT_REDIRECT_URI = 'http://localhost:3000/oauth/sage-intacct/callback';
process.env.QUICKBOOKS_CLIENT_ID = 'test-qb-client-id';
process.env.QUICKBOOKS_CLIENT_SECRET = 'test-qb-client-secret';
process.env.QUICKBOOKS_REDIRECT_URI = 'http://localhost:3000/oauth/quickbooks/callback';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
};

// Mock setTimeout/setInterval for testing
vi.mock('timers', () => ({
  setTimeout: vi.fn((fn, delay) => {
    if (delay === 0) return setImmediate(fn);
    return global.setTimeout(fn, delay);
  }),
  clearTimeout: vi.fn(global.clearTimeout),
  setInterval: vi.fn(global.setInterval),
  clearInterval: vi.fn(global.clearInterval),
}));

// Global test utilities
declare global {
  var testUtils: {
    createMockToken: (overrides?: any) => any;
    createMockOAuthResponse: (overrides?: any) => any;
    createMockConnection: (overrides?: any) => any;
    waitForAsync: (fn: () => Promise<any>, timeout?: number) => Promise<any>;
  };
}

global.testUtils = {
  createMockToken: (overrides = {}) => ({
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'openid profile company',
    realmId: 'MOCK_COMPANY_123',
    ...overrides,
  }),

  createMockOAuthResponse: (overrides = {}) => ({
    token: global.testUtils.createMockToken(),
    response: {
      status: 200,
      statusText: 'OK',
    },
    ...overrides,
  }),

  createMockConnection: (overrides = {}) => ({
    erpType: 'sage_intacct',
    connectionName: 'Mock Connection',
    isActive: true,
    credentials: {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      companyId: 'MOCK_COMPANY',
      expiresAt: Date.now() + 3600000,
    },
    syncStatus: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  waitForAsync: async (fn: () => Promise<any>, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        return await fn();
      } catch (error) {
        if (Date.now() - start >= timeout) throw error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    throw new Error('Async operation timed out');
  },
};