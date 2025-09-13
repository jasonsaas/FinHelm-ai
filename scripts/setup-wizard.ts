#!/usr/bin/env npx tsx

/**
 * FinHelm.ai Interactive Setup Wizard
 * Guides users through environment configuration
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import * as readline from 'readline/promises';
import chalk from 'chalk';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

interface ServiceConfig {
  name: string;
  envVars: Array<{
    key: string;
    prompt: string;
    secret?: boolean;
    default?: string;
    validate?: (value: string) => boolean;
    generate?: () => string;
  }>;
  setupGuide?: string;
  testConnection?: () => Promise<boolean>;
}

// Generate random secret
function generateSecret(length = 32): string {
  try {
    const result = execSync(`openssl rand -hex ${length}`).toString().trim();
    return result;
  } catch {
    // Fallback to Node.js crypto
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length * 2; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Service configurations
const services: ServiceConfig[] = [
  {
    name: 'Convex Database',
    setupGuide: `
To set up Convex:
1. Run 'npx convex dev' in your project root
2. This will create a new deployment and provide the URL
3. Copy the deployment name and URL when prompted
`,
    envVars: [
      {
        key: 'CONVEX_DEPLOYMENT',
        prompt: 'Convex deployment name (e.g., dev:ardent-dog-632)',
        default: 'dev:ardent-dog-632'
      },
      {
        key: 'CONVEX_URL',
        prompt: 'Convex URL',
        default: 'https://ardent-dog-632.convex.cloud',
        validate: (value) => value.startsWith('https://') && value.includes('.convex.cloud')
      }
    ],
    testConnection: async () => {
      const url = process.env.CONVEX_URL;
      if (!url) return false;
      try {
        const response = await fetch(url);
        return response.ok || response.status === 404;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'QuickBooks Integration',
    setupGuide: `
To set up QuickBooks:
1. Go to https://developer.intuit.com
2. Sign in or create an account
3. Create a new app for QuickBooks Online
4. Choose 'com.intuit.quickbooks.accounting' scope
5. For development, use the Sandbox environment
6. Add redirect URI: http://localhost:3000/api/quickbooks/callback
7. Copy your Client ID and Client Secret
`,
    envVars: [
      {
        key: 'QUICKBOOKS_CLIENT_ID',
        prompt: 'QuickBooks Client ID',
        secret: false
      },
      {
        key: 'QUICKBOOKS_CLIENT_SECRET',
        prompt: 'QuickBooks Client Secret',
        secret: true
      },
      {
        key: 'QUICKBOOKS_REDIRECT_URI',
        prompt: 'QuickBooks Redirect URI',
        default: 'http://localhost:3000/api/quickbooks/callback'
      },
      {
        key: 'QUICKBOOKS_ENVIRONMENT',
        prompt: 'QuickBooks Environment (sandbox/production)',
        default: 'sandbox',
        validate: (value) => ['sandbox', 'production'].includes(value)
      },
      {
        key: 'QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN',
        prompt: 'QuickBooks Webhook Token (press Enter to generate)',
        generate: () => generateSecret(),
        secret: true
      }
    ]
  },
  {
    name: 'Clerk Authentication',
    setupGuide: `
To set up Clerk:
1. Go to https://dashboard.clerk.com
2. Sign up or sign in
3. Create a new application
4. Go to API Keys in the dashboard
5. Copy your Publishable Key and Secret Key
`,
    envVars: [
      {
        key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        prompt: 'Clerk Publishable Key (starts with pk_)',
        validate: (value) => value.startsWith('pk_')
      },
      {
        key: 'CLERK_SECRET_KEY',
        prompt: 'Clerk Secret Key (starts with sk_)',
        secret: true,
        validate: (value) => value.startsWith('sk_')
      },
      {
        key: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        prompt: 'Clerk Sign In URL',
        default: '/auth/sign-in'
      },
      {
        key: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
        prompt: 'Clerk Sign Up URL',
        default: '/auth/sign-up'
      },
      {
        key: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
        prompt: 'After Sign In URL',
        default: '/dashboard'
      },
      {
        key: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
        prompt: 'After Sign Up URL',
        default: '/dashboard'
      }
    ]
  },
  {
    name: 'AI Services',
    setupGuide: `
To set up AI services:

OpenAI:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with sk-)

Anthropic:
1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy the key (starts with sk-ant-)
`,
    envVars: [
      {
        key: 'OPENAI_API_KEY',
        prompt: 'OpenAI API Key (optional, press Enter to skip)',
        secret: true,
        validate: (value) => !value || value.startsWith('sk-')
      },
      {
        key: 'ANTHROPIC_API_KEY',
        prompt: 'Anthropic API Key (optional, press Enter to skip)',
        secret: true,
        validate: (value) => !value || value.startsWith('sk-ant-')
      }
    ]
  },
  {
    name: 'Monitoring (Sentry)',
    setupGuide: `
To set up Sentry (optional):
1. Go to https://sentry.io
2. Create an account and project
3. Go to Settings > Projects > [Your Project] > Client Keys
4. Copy the DSN
5. Create an auth token at Settings > Account > API > Auth Tokens
`,
    envVars: [
      {
        key: 'SENTRY_DSN',
        prompt: 'Sentry DSN (optional, press Enter to skip)',
        validate: (value) => !value || value.startsWith('https://')
      },
      {
        key: 'SENTRY_ORG',
        prompt: 'Sentry Organization (optional)',
      },
      {
        key: 'SENTRY_PROJECT',
        prompt: 'Sentry Project (optional)',
      },
      {
        key: 'SENTRY_AUTH_TOKEN',
        prompt: 'Sentry Auth Token (optional)',
        secret: true
      }
    ]
  },
  {
    name: 'Application Settings',
    envVars: [
      {
        key: 'NODE_ENV',
        prompt: 'Node Environment (development/staging/production)',
        default: 'development',
        validate: (value) => ['development', 'staging', 'production'].includes(value)
      },
      {
        key: 'NEXT_PUBLIC_APP_URL',
        prompt: 'Application URL',
        default: 'http://localhost:3000'
      },
      {
        key: 'NEXT_PUBLIC_API_URL',
        prompt: 'API URL',
        default: 'http://localhost:3000/api'
      }
    ]
  }
];

// Main wizard
async function runWizard() {
  console.clear();
  console.log(chalk.bold.blue('🚀 FinHelm.ai Setup Wizard\n'));
  console.log(chalk.gray('This wizard will help you configure your environment.\n'));
  
  const config: Record<string, string> = {};
  
  // Check for existing .env.local
  const envPath = resolve(process.cwd(), '.env.local');
  let existingConfig: Record<string, string> = {};
  
  try {
    const existing = await fs.readFile(envPath, 'utf-8');
    existing.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key) {
          existingConfig[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    console.log(chalk.yellow('⚠️  Found existing .env.local file'));
    const overwrite = await rl.question('Do you want to update it? (y/n): ');
    
    if (overwrite.toLowerCase() !== 'y') {
      console.log(chalk.gray('\nSetup cancelled.'));
      process.exit(0);
    }
    
    Object.assign(config, existingConfig);
  } catch {
    // No existing file
  }
  
  // Configure each service
  for (const service of services) {
    console.log(chalk.bold.cyan(`\n📦 ${service.name}`));
    
    if (service.setupGuide) {
      const showGuide = await rl.question('Show setup guide? (y/n): ');
      if (showGuide.toLowerCase() === 'y') {
        console.log(chalk.gray(service.setupGuide));
      }
    }
    
    for (const envVar of service.envVars) {
      let prompt = envVar.prompt;
      if (envVar.default) {
        prompt += chalk.gray(` [${envVar.default}]`);
      }
      if (config[envVar.key]) {
        const masked = envVar.secret ? '***' + config[envVar.key].slice(-4) : config[envVar.key];
        prompt += chalk.gray(` (current: ${masked})`);
      }
      
      let value = await rl.question(`${prompt}: `);
      
      // Handle defaults and generation
      if (!value && envVar.default) {
        value = envVar.default;
      }
      if (!value && envVar.generate) {
        value = envVar.generate();
        console.log(chalk.green(`Generated: ${envVar.secret ? '***' : value}`));
      }
      
      // Validate
      if (envVar.validate && value && !envVar.validate(value)) {
        console.log(chalk.red('Invalid value. Please try again.'));
        // Re-prompt
        value = await rl.question(`${prompt}: `);
      }
      
      if (value) {
        config[envVar.key] = value;
      }
    }
    
    // Test connection if available
    if (service.testConnection) {
      process.stdout.write(chalk.gray('\nTesting connection...'));
      
      // Set temp env vars for testing
      Object.entries(config).forEach(([key, val]) => {
        process.env[key] = val;
      });
      
      const success = await service.testConnection();
      if (success) {
        console.log(chalk.green(' ✓'));
      } else {
        console.log(chalk.yellow(' ⚠️  Could not connect'));
      }
    }
  }
  
  // Write configuration
  console.log(chalk.bold.blue('\n💾 Saving Configuration\n'));
  
  const envContent = `# ==========================================
# FINHELM.AI ENVIRONMENT CONFIGURATION
# ==========================================
# Generated by setup wizard on ${new Date().toISOString()}
# DO NOT commit this file to version control

${Object.entries(config)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')}
`;
  
  await fs.writeFile(envPath, envContent);
  console.log(chalk.green(`✓ Configuration saved to ${envPath}`));
  
  // Write frontend-specific config if needed
  const frontendEnvPath = resolve(process.cwd(), 'frontend', '.env.local');
  const frontendConfig = Object.entries(config)
    .filter(([key]) => key.startsWith('NEXT_PUBLIC_') || key.startsWith('CLERK_'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  if (Object.keys(frontendConfig).length > 0) {
    const frontendEnvContent = `# Frontend Environment Configuration
# Generated by setup wizard

${Object.entries(frontendConfig)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')}
`;
    
    try {
      await fs.mkdir(resolve(process.cwd(), 'frontend'), { recursive: true });
      await fs.writeFile(frontendEnvPath, frontendEnvContent);
      console.log(chalk.green(`✓ Frontend configuration saved to ${frontendEnvPath}`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not write frontend config: ${error}`));
    }
  }
  
  // Final validation
  console.log(chalk.bold.blue('\n🔍 Running Validation\n'));
  
  try {
    execSync('npx tsx scripts/validate-env.ts', { stdio: 'inherit' });
  } catch {
    console.log(chalk.yellow('⚠️  Validation encountered issues'));
  }
  
  // Next steps
  console.log(chalk.bold.green('\n✨ Setup Complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Review your .env.local file'));
  console.log(chalk.gray('  2. Run "npm run dev" to start the development server'));
  console.log(chalk.gray('  3. Visit http://localhost:3000 to see your app'));
  
  rl.close();
}

// Error handling
process.on('SIGINT', () => {
  console.log(chalk.red('\n\nSetup cancelled.'));
  rl.close();
  process.exit(0);
});

// Run the wizard
runWizard().catch(error => {
  console.error(chalk.red('\n❌ Setup failed:'), error);
  rl.close();
  process.exit(1);
});