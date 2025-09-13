/**
 * Frontend-specific configuration module
 * Type-safe configuration for Next.js frontend
 */

import { z } from 'zod';

// Configuration schema for frontend
const FrontendConfigSchema = z.object({
  // Public Convex configuration
  convex: z.object({
    url: z.string().url('Invalid Convex URL').startsWith('https://'),
  }),
  
  // Public QuickBooks configuration
  quickbooks: z.object({
    companyId: z.string().optional(),
    environment: z.enum(['sandbox', 'production']).default('sandbox'),
  }),
  
  // Public Clerk configuration
  clerk: z.object({
    publishableKey: z.string().min(1, 'Clerk publishable key is required'),
    signInUrl: z.string().default('/auth/sign-in'),
    signUpUrl: z.string().default('/auth/sign-up'),
    afterSignInUrl: z.string().default('/dashboard'),
    afterSignUpUrl: z.string().default('/dashboard'),
  }),
  
  // Public application configuration
  app: z.object({
    url: z.string().url('Invalid app URL'),
    apiUrl: z.string().url('Invalid API URL'),
  }),
  
  // Public monitoring
  monitoring: z.object({
    sentryDsn: z.string().optional(),
  }),
  
  // Public feature flags
  features: z.object({
    quickbooks: z.boolean().default(true),
    aiInsights: z.boolean().default(true),
  }),
});

export type FrontendConfig = z.infer<typeof FrontendConfigSchema>;

// Parse boolean environment variables
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Load configuration
function loadFrontendConfig(): FrontendConfig {
  // Next.js makes env vars available via process.env
  const env = process.env;
  
  const rawConfig = {
    convex: {
      url: env.NEXT_PUBLIC_CONVEX_URL || '',
    },
    quickbooks: {
      companyId: env.NEXT_PUBLIC_QUICKBOOKS_COMPANY_ID,
      environment: (env.NEXT_PUBLIC_QUICKBOOKS_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    },
    clerk: {
      publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
      signInUrl: env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/sign-in',
      signUpUrl: env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/auth/sign-up',
      afterSignInUrl: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
      afterSignUpUrl: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard',
    },
    app: {
      url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      apiUrl: env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    },
    monitoring: {
      sentryDsn: env.NEXT_PUBLIC_SENTRY_DSN,
    },
    features: {
      quickbooks: parseBoolean(env.NEXT_PUBLIC_ENABLE_QUICKBOOKS, true),
      aiInsights: parseBoolean(env.NEXT_PUBLIC_ENABLE_AI_INSIGHTS, true),
    },
  };
  
  return rawConfig;
}

// Validate configuration
function validateFrontendConfig(config: unknown): FrontendConfig {
  try {
    return FrontendConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => {
        const path = issue.path.join('.');
        return `  - ${path}: ${issue.message}`;
      }).join('\n');
      
      if (typeof window !== 'undefined') {
        console.error(`Frontend configuration validation failed:\n${issues}`);
      }
      
      throw new Error(`Frontend configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

// Export singleton config
let cachedConfig: FrontendConfig | null = null;

export function getFrontendConfig(): FrontendConfig {
  if (!cachedConfig) {
    const rawConfig = loadFrontendConfig();
    
    // In development, be more lenient
    if (process.env.NODE_ENV === 'development') {
      try {
        cachedConfig = validateFrontendConfig(rawConfig);
      } catch (error) {
        console.warn('Frontend configuration validation warning:', error);
        // Return raw config in development
        cachedConfig = rawConfig as FrontendConfig;
      }
    } else {
      // In production, strict validation
      cachedConfig = validateFrontendConfig(rawConfig);
    }
  }
  
  return cachedConfig;
}

// Helper functions
export function isQuickBooksEnabled(): boolean {
  return getFrontendConfig().features.quickbooks;
}

export function isAIInsightsEnabled(): boolean {
  return getFrontendConfig().features.aiInsights;
}

export function getApiUrl(endpoint: string): string {
  const config = getFrontendConfig();
  const baseUrl = config.app.apiUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

export function getAppUrl(path: string = ''): string {
  const config = getFrontendConfig();
  const baseUrl = config.app.url.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// Default export
const config = getFrontendConfig();
export default config;