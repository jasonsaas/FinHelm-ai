#!/usr/bin/env ts-node

/**
 * FinHelm.ai Environment Update Script
 * Handles Convex deployment URL configuration and git operations
 * 
 * Usage: npx ts-node env-update.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper function for colored console output
function colorLog(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Interface for environment key-value pairs
interface EnvVars {
  [key: string]: string;
}

/**
 * Parse existing .env file into key-value pairs
 */
function parseEnvFile(envPath: string): EnvVars {
  const envVars: EnvVars = {};
  
  try {
    if (!fs.existsSync(envPath)) {
      colorLog(`📄 No existing .env file found at ${envPath}`, 'yellow');
      return envVars;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Parse key=value pairs
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        envVars[key] = value;
      }
    }

    colorLog(`✅ Parsed ${Object.keys(envVars).length} environment variables from existing .env`, 'green');
    return envVars;

  } catch (error) {
    colorLog(`❌ Error reading .env file: ${error}`, 'red');
    return envVars;
  }
}

/**
 * Generate .env file content from key-value pairs
 */
function generateEnvContent(envVars: EnvVars): string {
  const lines: string[] = [];
  
  // Add header comment
  lines.push('# FinHelm.ai Environment Configuration');
  lines.push('# Generated and updated by env-update.ts');
  lines.push(`# Last updated: ${new Date().toISOString()}`);
  lines.push('');
  
  // Add Convex configuration section if CONVEX_DEPLOYMENT exists
  if (envVars.CONVEX_DEPLOYMENT) {
    lines.push('# ======================================');
    lines.push('# Convex Configuration');
    lines.push('# ======================================');
    lines.push(`CONVEX_DEPLOYMENT=${envVars.CONVEX_DEPLOYMENT}`);
    lines.push('');
  }

  // Add other environment variables (excluding CONVEX_DEPLOYMENT as it's already added)
  const otherVars = Object.entries(envVars).filter(([key]) => key !== 'CONVEX_DEPLOYMENT');
  
  if (otherVars.length > 0) {
    lines.push('# ======================================');
    lines.push('# Other Configuration');
    lines.push('# ======================================');
    
    for (const [key, value] of otherVars) {
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Prompt user for Convex deployment URL
 */
function promptForConvexUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    colorLog('\n🔗 Convex Deployment URL Setup', 'cyan');
    colorLog('Please enter your Convex deployment URL from `npx convex dev`:', 'blue');
    colorLog('Example: https://happy-animal-123.convex.cloud', 'yellow');

    rl.question('\n> Convex Deployment URL: ', (input) => {
      rl.close();
      
      const url = input.trim();
      
      if (!url) {
        reject(new Error('❌ Convex deployment URL is required'));
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        reject(new Error('❌ Invalid URL format'));
        return;
      }

      // Check if it looks like a Convex URL
      if (!url.includes('convex.cloud') && !url.includes('convex.site')) {
        colorLog('⚠️  Warning: URL doesn\'t appear to be a Convex deployment URL', 'yellow');
      }

      resolve(url);
    });
  });
}

/**
 * Execute git command safely
 */
function executeGitCommand(command: string): { success: boolean; output: string; error?: string } {
  try {
    const output = execSync(command, { 
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return { success: true, output: output.toString().trim() };
  } catch (error: any) {
    return { 
      success: false, 
      output: '', 
      error: error.message || 'Unknown git error'
    };
  }
}

/**
 * Check if file is gitignored
 */
function isGitIgnored(filePath: string): boolean {
  const result = executeGitCommand(`git check-ignore "${filePath}"`);
  return result.success; // If check-ignore succeeds, file is ignored
}

/**
 * Handle git operations for environment file changes
 */
async function handleGitOperations(): Promise<void> {
  colorLog('\n📋 Checking git status...', 'cyan');

  // Check if we're in a git repository
  const gitStatusResult = executeGitCommand('git status --porcelain');
  if (!gitStatusResult.success) {
    colorLog('⚠️  Not in a git repository or git not available, skipping git operations', 'yellow');
    return;
  }

  // Check for .env file git ignore status
  const envPath = '.env';
  if (isGitIgnored(envPath)) {
    colorLog(`ℹ️  ${envPath} is gitignored, skipping git add for this file`, 'blue');
  } else {
    colorLog(`📄 ${envPath} is not gitignored, will be staged for commit`, 'green');
  }

  // Check for changes in related files
  const relatedFiles = ['.env', '.env.example', 'package.json', 'convex.json'];
  const changedFiles: string[] = [];

  for (const file of relatedFiles) {
    if (fs.existsSync(file)) {
      const gitResult = executeGitCommand(`git status --porcelain "${file}"`);
      if (gitResult.success && gitResult.output) {
        if (!isGitIgnored(file)) {
          changedFiles.push(file);
        }
      }
    }
  }

  if (changedFiles.length === 0) {
    colorLog('ℹ️  No git-trackable changes found in related files', 'blue');
    return;
  }

  colorLog(`📝 Found changes in: ${changedFiles.join(', ')}`, 'green');

  // Stage the changed files
  for (const file of changedFiles) {
    const addResult = executeGitCommand(`git add "${file}"`);
    if (addResult.success) {
      colorLog(`✅ Staged ${file}`, 'green');
    } else {
      colorLog(`❌ Failed to stage ${file}: ${addResult.error}`, 'red');
    }
  }

  // Commit the changes
  const commitMessage = 'Add Convex deployment URL post-auth';
  const commitResult = executeGitCommand(`git commit -m "${commitMessage}"`);
  
  if (commitResult.success) {
    colorLog(`✅ Committed changes: "${commitMessage}"`, 'green');
    
    // Push to origin main
    colorLog('🚀 Pushing to origin main...', 'cyan');
    const pushResult = executeGitCommand('git push origin main');
    
    if (pushResult.success) {
      colorLog('✅ Successfully pushed to origin main', 'green');
    } else {
      colorLog(`❌ Failed to push to origin main: ${pushResult.error}`, 'red');
      colorLog('💡 You may need to push manually later', 'yellow');
    }
  } else {
    if (commitResult.error?.includes('nothing to commit')) {
      colorLog('ℹ️  No changes to commit', 'blue');
    } else {
      colorLog(`❌ Failed to commit: ${commitResult.error}`, 'red');
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    colorLog('🚀 FinHelm.ai Environment Update Script', 'bright');
    colorLog('=====================================', 'cyan');

    // Step 1: Prompt for Convex deployment URL
    colorLog('\n📍 Step 1: Get Convex deployment URL', 'magenta');
    const convexUrl = await promptForConvexUrl();
    colorLog(`✅ Received Convex URL: ${convexUrl}`, 'green');

    // Step 2: Parse existing .env file
    colorLog('\n📍 Step 2: Parse existing environment configuration', 'magenta');
    const envPath = path.join(process.cwd(), '.env');
    const existingEnvVars = parseEnvFile(envPath);

    // Step 3: Update environment variables
    colorLog('\n📍 Step 3: Update environment variables', 'magenta');
    existingEnvVars.CONVEX_DEPLOYMENT = convexUrl;

    if (fs.existsSync(envPath)) {
      colorLog('📝 Updating existing .env file', 'blue');
    } else {
      colorLog('📝 Creating new .env file', 'blue');
    }

    // Step 4: Write updated .env file
    const envContent = generateEnvContent(existingEnvVars);
    fs.writeFileSync(envPath, envContent, 'utf8');
    colorLog(`✅ Successfully updated ${envPath}`, 'green');

    // Step 5: Handle git operations
    colorLog('\n📍 Step 4: Handle git operations', 'magenta');
    await handleGitOperations();

    // Final success message
    colorLog('\n🎉 Environment update completed successfully!', 'bright');
    colorLog('\n📋 Summary:', 'cyan');
    colorLog(`   • Convex URL: ${convexUrl}`, 'green');
    colorLog(`   • Environment file: ${envPath}`, 'green');
    colorLog('   • Git operations: Completed', 'green');
    
    colorLog('\n🚀 Next steps:', 'blue');
    colorLog('   1. Verify your .env file contains the correct URL', 'yellow');
    colorLog('   2. Test your Convex functions with: npx convex dev', 'yellow');
    colorLog('   3. Run your application to ensure everything works', 'yellow');

  } catch (error: any) {
    colorLog(`\n💥 Error: ${error.message}`, 'red');
    colorLog('\n🔧 Troubleshooting:', 'yellow');
    colorLog('   • Ensure you have proper permissions to write files', 'yellow');
    colorLog('   • Check that you\'re in the correct project directory', 'yellow');
    colorLog('   • Verify git is properly configured if using git features', 'yellow');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  colorLog('\n\n⚠️  Operation cancelled by user', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  colorLog('\n\n⚠️  Operation terminated', 'yellow');
  process.exit(0);
});

// Execute main function
if (require.main === module) {
  main().catch((error) => {
    colorLog(`\n💥 Unhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}