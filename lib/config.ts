/**
 * Type-safe configuration module for FinHelm.ai
 * Validates and exports environment configuration with Zod
 */

import { z } from 'zod';

// Environment type
const EnvironmentSchema = z.enum(['development', 'staging', 'production']);
type Environment = z.infer<typeof EnvironmentSchema>;

// QuickBooks environment
const QuickBooksEnvironmentSchema = z.enum(['sandbox', 'production']);
type QuickBooksEnvironment = z.infer<typeof QuickBooksEnvironmentSchema>;

// Configuration schema
const ConfigSchema = z.object({
  // Convex
  convex: z.object({
    deployment: z.string().min(1, 'Convex deployment is required'),
    url: z.string().url('Invalid Convex URL').startsWith('https://'),
  }),
  
  // QuickBooks
  quickbooks: z.object({
    clientId: z.string().min(1, 'QuickBooks Client ID is required'),
    clientSecret: z.string().min(1, 'QuickBooks Client Secret is required'),
    redirectUri: z.string().url('Invalid QuickBooks redirect URI'),
    environment: QuickBooksEnvironmentSchema,
    webhookVerifierToken: z.string().optional(),
    companyId: z.string().optional(),
  }),
  
  // Clerk Authentication
  clerk: z.object({
    secretKey: z.string().optional(),
    publishableKey: z.string().optional(),
    signInUrl: z.string().default('/auth/sign-in'),
    signUpUrl: z.string().default('/auth/sign-up'),
    afterSignInUrl: z.string().default('/dashboard'),
    afterSignUpUrl: z.string().default('/dashboard'),
  }),
  
  // AI Services
  ai: z.object({
    openaiKey: z.string().optional(),
    anthropicKey: z.string().optional(),
  }),
  
  // N8N Workflow
  n8n: z.object({
    webhookSecret: z.string().optional(),
    webhookUrl: z.string().url().optional().or(z.literal('')),
  }),
  
  // Monitoring
  monitoring: z.object({
    sentryDsn: z.string().optional(),
    sentryOrg: z.string().optional(),
    sentryProject: z.string().optional(),
    sentryAuthToken: z.string().optional(),
  }),
  
  // Application
  app: z.object({
    environment: EnvironmentSchema,
    url: z.string().url('Invalid app URL'),
    apiUrl: z.string().url('Invalid API URL'),
  }),
  
  // Database
  database: z.object({
    url: z.string().optional(),
  }),
  
  // Email
  email: z.object({
    resendApiKey: z.string().optional(),
    from: z.string().email().optional().or(z.literal('')),
  }),
  
  // Feature flags
  features: z.object({
    quickbooksSync: z.boolean().default(true),
    aiInsights: z.boolean().default(true),
    webhookProcessing: z.boolean().default(true),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Parse boolean environment variables
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Load configuration from environment
function loadConfig(): Config {
  // Check if we're in browser or server
  const isBrowser = typeof window !== 'undefined';
  
  // Get environment variables (works in both browser and server)
  const env = isBrowser ? (window as any).process?.env || {} : process.env;
  
  const rawConfig = {
    convex: {
      deployment: env.CONVEX_DEPLOYMENT || '',
      url: env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL || '',
    },
    quickbooks: {
      clientId: env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: env.QUICKBOOKS_CLIENT_SECRET || '',
      redirectUri: env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback',
      environment: (env.QUICKBOOKS_ENVIRONMENT || env.NEXT_PUBLIC_QUICKBOOKS_ENVIRONMENT || 'sandbox') as QuickBooksEnvironment,
      webhookVerifierToken: env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN,
      companyId: env.NEXT_PUBLIC_QUICKBOOKS_COMPANY_ID,
    },
    clerk: {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      signInUrl: env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/sign-in',
      signUpUrl: env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/auth/sign-up',
      afterSignInUrl: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
      afterSignUpUrl: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard',
    },
    ai: {
      openaiKey: env.OPENAI_API_KEY,
      anthropicKey: env.ANTHROPIC_API_KEY,
    },
    n8n: {
      webhookSecret: env.N8N_WEBHOOK_SECRET,
      webhookUrl: env.N8N_WEBHOOK_URL || '',
    },
    monitoring: {
      sentryDsn: env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN,
      sentryOrg: env.SENTRY_ORG,
      sentryProject: env.SENTRY_PROJECT,
      sentryAuthToken: env.SENTRY_AUTH_TOKEN,
    },
    app: {
      environment: (env.NODE_ENV || 'development') as Environment,
      url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      apiUrl: env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    },
    database: {
      url: env.DATABASE_URL,
    },
    email: {
      resendApiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM || '',
    },
    features: {
      quickbooksSync: parseBoolean(env.ENABLE_QUICKBOOKS_SYNC || env.NEXT_PUBLIC_ENABLE_QUICKBOOKS, true),
      aiInsights: parseBoolean(env.ENABLE_AI_INSIGHTS || env.NEXT_PUBLIC_ENABLE_AI_INSIGHTS, true),
      webhookProcessing: parseBoolean(env.ENABLE_WEBHOOK_PROCESSING, true),
    },
  };
  
  return rawConfig;
}

// Validate configuration
function validateConfig(config: unknown): Config {
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => {
        const path = issue.path.join('.');
        return `  - ${path}: ${issue.message}`;
      }).join('\n');
      
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

// Export singleton config
let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    const rawConfig = loadConfig();
    
    // In development, validate but don't throw on missing optional fields
    if (process.env.NODE_ENV === 'development') {
      try {
        cachedConfig = validateConfig(rawConfig);
      } catch (error) {
        console.warn('Configuration validation warning:', error);
        // Return raw config in development even if validation fails
        cachedConfig = rawConfig as Config;
      }
    } else {
      // In production, strict validation
      cachedConfig = validateConfig(rawConfig);
    }
  }
  
  return cachedConfig;
}

// Environment-specific helpers
export function isDevelopment(): boolean {
  return getConfig().app.environment === 'development';
}

export function isStaging(): boolean {
  return getConfig().app.environment === 'staging';
}

export function isProduction(): boolean {
  return getConfig().app.environment === 'production';
}

// Feature flag helpers
export function isFeatureEnabled(feature: keyof Config['features']): boolean {
  return getConfig().features[feature];
}

// Service availability helpers
export function hasQuickBooksConfig(): boolean {
  const config = getConfig();
  return !!(config.quickbooks.clientId && config.quickbooks.clientSecret);
}

export function hasClerkConfig(): boolean {
  const config = getConfig();
  return !!(config.clerk.secretKey && config.clerk.publishableKey);
}

export function hasAIConfig(): boolean {
  const config = getConfig();
  return !!(config.ai.openaiKey || config.ai.anthropicKey);
}

export function hasSentryConfig(): boolean {
  const config = getConfig();
  return !!config.monitoring.sentryDsn;
}

// Export types
export type { Environment, QuickBooksEnvironment };

// Default export
export default getConfig();