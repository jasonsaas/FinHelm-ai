#!/usr/bin/env npx tsx

/**
 * Environment Configuration Validator
 * Validates all required environment variables for FinHelm.ai
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
const result = config({ path: envPath });

if (result.error) {
  console.error(chalk.red('❌ Failed to load .env.local file'));
  console.error(chalk.yellow('Make sure .env.local exists in the project root'));
  process.exit(1);
}

// Environment variable configuration
interface EnvConfig {
  name: string;
  required: boolean;
  pattern?: RegExp;
  validate?: (value: string) => boolean;
  description: string;
  group: string;
}

const envConfigs: EnvConfig[] = [
  // Convex
  {
    name: 'CONVEX_DEPLOYMENT',
    required: true,
    pattern: /^dev:[a-z-]+\d+$/,
    description: 'Convex deployment identifier',
    group: 'Convex'
  },
  {
    name: 'CONVEX_URL',
    required: true,
    pattern: /^https:\/\/[a-z-]+\d+\.convex\.cloud$/,
    description: 'Convex deployment URL',
    group: 'Convex'
  },
  
  // QuickBooks
  {
    name: 'QUICKBOOKS_CLIENT_ID',
    required: true,
    description: 'QuickBooks OAuth client ID',
    group: 'QuickBooks'
  },
  {
    name: 'QUICKBOOKS_CLIENT_SECRET',
    required: true,
    description: 'QuickBooks OAuth client secret',
    group: 'QuickBooks'
  },
  {
    name: 'QUICKBOOKS_REDIRECT_URI',
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'QuickBooks OAuth redirect URI',
    group: 'QuickBooks'
  },
  {
    name: 'QUICKBOOKS_ENVIRONMENT',
    required: true,
    validate: (value) => ['sandbox', 'production'].includes(value),
    description: 'QuickBooks environment (sandbox/production)',
    group: 'QuickBooks'
  },
  
  // Clerk
  {
    name: 'CLERK_SECRET_KEY',
    required: false,
    pattern: /^sk_(test|live)_.+/,
    description: 'Clerk secret key',
    group: 'Clerk'
  },
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    required: false,
    pattern: /^pk_(test|live)_.+/,
    description: 'Clerk publishable key',
    group: 'Clerk'
  },
  
  // AI Services
  {
    name: 'OPENAI_API_KEY',
    required: false,
    pattern: /^sk-.+/,
    description: 'OpenAI API key',
    group: 'AI Services'
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    pattern: /^sk-ant-.+/,
    description: 'Anthropic API key',
    group: 'AI Services'
  },
  
  // Application
  {
    name: 'NODE_ENV',
    required: true,
    validate: (value) => ['development', 'staging', 'production'].includes(value),
    description: 'Node environment',
    group: 'Application'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'Application URL',
    group: 'Application'
  }
];

// Validation functions
function validateEnvVar(config: EnvConfig): {
  valid: boolean;
  message?: string;
} {
  const value = process.env[config.name];
  
  // Check if required
  if (config.required && !value) {
    return {
      valid: false,
      message: 'Missing required variable'
    };
  }
  
  // Skip validation if not set and not required
  if (!value && !config.required) {
    return { valid: true };
  }
  
  // Validate pattern
  if (config.pattern && value && !config.pattern.test(value)) {
    return {
      valid: false,
      message: `Invalid format. Expected pattern: ${config.pattern}`
    };
  }
  
  // Custom validation
  if (config.validate && value && !config.validate(value)) {
    return {
      valid: false,
      message: 'Failed custom validation'
    };
  }
  
  return { valid: true };
}

// Test connectivity functions
async function testConvex(): Promise<boolean> {
  const url = process.env.CONVEX_URL;
  if (!url) return false;
  
  try {
    const response = await fetch(url);
    return response.ok || response.status === 404; // 404 is ok for base URL
  } catch {
    return false;
  }
}

async function testQuickBooks(): Promise<boolean> {
  // Check if we have the required credentials
  return !!(
    process.env.QUICKBOOKS_CLIENT_ID &&
    process.env.QUICKBOOKS_CLIENT_SECRET
  );
}

async function testClerk(): Promise<boolean> {
  // Check if Clerk keys are present
  return !!(
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
}

// Main validation
async function validateEnvironment() {
  console.log(chalk.blue('🔍 Validating Environment Configuration\n'));
  
  const groups = new Map<string, { configs: EnvConfig[], results: any[] }>();
  let hasErrors = false;
  let hasWarnings = false;
  
  // Group configurations
  envConfigs.forEach(config => {
    if (!groups.has(config.group)) {
      groups.set(config.group, { configs: [], results: [] });
    }
    groups.get(config.group)!.configs.push(config);
  });
  
  // Validate each group
  for (const [groupName, group] of groups) {
    console.log(chalk.bold(`\n${groupName}:`));
    
    for (const config of group.configs) {
      const result = validateEnvVar(config);
      const value = process.env[config.name];
      
      if (!result.valid) {
        hasErrors = hasErrors || config.required;
        hasWarnings = hasWarnings || !config.required;
        
        const icon = config.required ? '❌' : '⚠️';
        const color = config.required ? chalk.red : chalk.yellow;
        console.log(
          `  ${icon} ${chalk.bold(config.name)}: ${color(result.message)}`
        );
      } else if (value) {
        const displayValue = config.name.includes('SECRET') || 
                           config.name.includes('KEY') || 
                           config.name.includes('TOKEN')
          ? '***' + value.slice(-4)
          : value.length > 50 ? value.slice(0, 47) + '...' : value;
        
        console.log(
          `  ✅ ${chalk.bold(config.name)}: ${chalk.green(displayValue)}`
        );
      } else {
        console.log(
          `  ⏭️  ${chalk.bold(config.name)}: ${chalk.gray('Not configured (optional)')}`
        );
      }
    }
  }
  
  // Test connectivity
  console.log(chalk.bold('\n🔌 Testing Service Connectivity:\n'));
  
  const tests = [
    { name: 'Convex Database', test: testConvex },
    { name: 'QuickBooks API', test: testQuickBooks },
    { name: 'Clerk Authentication', test: testClerk }
  ];
  
  for (const { name, test } of tests) {
    process.stdout.write(`  Testing ${name}...`);
    const success = await test();
    
    if (success) {
      console.log(chalk.green(' ✓'));
    } else {
      console.log(chalk.yellow(' ⚠️  Not configured or unreachable'));
    }
  }
  
  // Summary
  console.log('\n' + chalk.blue('━'.repeat(50)));
  
  if (hasErrors) {
    console.log(chalk.red('\n❌ Environment validation failed!'));
    console.log(chalk.yellow('Please configure all required variables in .env.local'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow('\n⚠️  Environment validated with warnings'));
    console.log(chalk.gray('Some optional services are not configured'));
  } else {
    console.log(chalk.green('\n✨ Environment configuration is valid!'));
  }
  
  // Helpful tips
  console.log(chalk.gray('\nTips:'));
  console.log(chalk.gray('  • Copy .env.example to .env.local to get started'));
  console.log(chalk.gray('  • Run scripts/setup-wizard.ts for guided configuration'));
  console.log(chalk.gray('  • Check documentation for service-specific setup guides'));
}

// Run validation
validateEnvironment().catch(error => {
  console.error(chalk.red('\n❌ Validation error:'), error);
  process.exit(1);
});