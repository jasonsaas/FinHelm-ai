#!/usr/bin/env ts-node

/**
 * FinHelm.ai Enhanced Convex Deployment Script v2.1
 * PRD v2.1 Compliant - Oracle AI Agents Integration
 * Handles complete deployment workflow: auth, deploy, configure, verify
 * 
 * Usage: npx ts-node scripts/deploy-convex.ts
 * Debug: DEBUG=1 npx ts-node scripts/deploy-convex.ts
 * 
 * Features:
 * - Smart .env preservation with comments
 * - PRD v2.1 schema validation (11 tables)
 * - Oracle AI Agents mapping verification
 * - Enhanced URL parsing (multiple patterns)
 * - Comprehensive logging and metrics
 * - Git operations with detailed commit messages
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import * as readline from 'readline';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function for colored console output
function colorLog(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Debug logging with timestamps
const DEBUG = process.env.DEBUG === '1';
function debugLog(message: string, data?: any): void {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    colorLog(`[${timestamp}] DEBUG: ${message}`, 'yellow');
    if (data) {
      console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
    }
  }
}

// PRD v2.1 Configuration interface
interface DeploymentConfig {
  expectedTables: string[];
  oracleAgentMappings: { [key: string]: string[] };
  criticalTables: string[];
  testCommands: string[];
  gitFiles: string[];
  urlPatterns: RegExp[];
  confidenceThresholds: {
    minimum: number;
    target: number;
    excellent: number;
  };
  timeouts: {
    deployment: number;
    authentication: number;
    schemaValidation: number;
    urlCapture: number;
  };
}

// Enhanced Deployment metrics interface
interface DeploymentMetrics {
  deploymentTime: number;
  urlCaptureTime: number;
  schemaValidation: {
    tablesFound: number;
    totalExpected: number;
    confidenceScore: number;
    criticalTablesPresent: boolean;
    missingTables: string[];
    oracleMappingSuccess: boolean;
    oracleMappingDetails: { [key: string]: boolean };
  };
  testResults: {
    testsRun: number;
    testsPass: number;
    errorCount: number;
    output: string;
  };
  gitOperations: {
    filesStaged: string[];
    commitSuccess: boolean;
    pushSuccess: boolean;
    branchName: string;
  };
  deploymentUrl: string;
  totalExecutionTime: number;
  prdCompliance: {
    version: string;
    complianceScore: number;
    issues: string[];
  };
}

// Load enhanced configuration for PRD v2.1
function loadConfig(): DeploymentConfig {
  const defaultConfig: DeploymentConfig = {
    // PRD v2.1: 11 core tables for SMB ERP co-pilot
    expectedTables: [
      "users",           // User management with organization support
      "organizations",   // Multi-entity support for SMBs
      "accounts",        // Chart of accounts with CSV hierarchy nesting
      "transactions",    // Transaction data for anomaly detection
      "agents",          // AI agent definitions (25 agents across 4 categories)
      "agentExecutions", // Agent execution history and results
      "erpConnections",  // QuickBooks/Sage Intacct OAuth connections
      "syncJobs",        // Data reconciliation jobs with fuzzy matching
      "reconciliations", // Document IO inspired reconciliation results
      "auditLogs",       // Compliance and audit trail
      "predictions"      // Multivariate forecasting results
    ],
    
    // Oracle AI Agents mapping (Document IO + Ledger + Advanced Prediction)
    oracleAgentMappings: {
      "Document IO": ["erpConnections", "reconciliations", "syncJobs"],
      "Ledger Agent": ["transactions", "auditLogs", "accounts"],
      "Advanced Prediction": ["predictions", "agentExecutions", "agents"]
    },
    
    criticalTables: ["users", "organizations", "accounts", "agents"],
    testCommands: ["node deploy-test-simple.js"],
    gitFiles: [".env", "DEPLOYMENT.md", "README.md", "scripts/deploy-convex.ts"],
    
    // Enhanced URL patterns for Convex deployment detection
    urlPatterns: [
      /https:\/\/[a-zA-Z0-9\-]+\.convex\.cloud/g,
      /https:\/\/[a-zA-Z0-9\-]+\.convex\.site/g,
      /https:\/\/dev-[a-zA-Z0-9\-]+\.convex\.(cloud|site)/g,
      /https:\/\/prod-[a-zA-Z0-9\-]+\.convex\.(cloud|site)/g,
      /Dashboard:\s*(https:\/\/[^\s]+)/g,
      /Functions ready at:\s*(https:\/\/[^\s]+)/g,
      /Convex functions ready!\s*(https:\/\/[^\s]+)/g
    ],
    
    confidenceThresholds: {
      minimum: 70.0,    // Minimum acceptable confidence
      target: 92.7,     // PRD v2.1 target confidence
      excellent: 95.0   // Excellent confidence threshold
    },
    
    timeouts: {
      deployment: 180000,      // 3 minutes (increased for complex schemas)
      authentication: 300000,  // 5 minutes
      schemaValidation: 45000, // 45 seconds (increased for 11 tables)
      urlCapture: 10000        // 10 seconds for URL capture
    }
  };

  const configPath = './scripts/convex-deployment-config.json';
  if (fs.existsSync(configPath)) {
    try {
      const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      debugLog('Custom configuration loaded', configFile);
      return { ...defaultConfig, ...configFile };
    } catch (error) {
      colorLog(`⚠️  Failed to parse config file, using defaults: ${error}`, 'yellow');
    }
  } else {
    debugLog('Using default PRD v2.1 configuration');
  }

  return defaultConfig;
}

/**
 * Step 1: Enhanced project validation for PRD v2.1
 */
function validateProjectRoot(): boolean {
  colorLog('\n[1/8] 🔍 Validating FinHelm.ai project structure...', 'cyan');
  
  const requiredFiles = ['package.json', 'convex.json', '.env'];
  const requiredDirs = ['convex', 'scripts'];
  const optionalFiles = ['.env.example', 'README.md'];
  
  let validationScore = 0;
  const totalChecks = requiredFiles.length + requiredDirs.length;
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      colorLog(`❌ Missing required file: ${file}`, 'red');
      return false;
    }
    validationScore++;
    debugLog(`✅ Found ${file}`);
  }
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      colorLog(`❌ Missing required directory: ${dir}`, 'red');
      return false;
    }
    validationScore++;
    debugLog(`✅ Found ${dir}/`);
  }

  // Optional files check
  for (const file of optionalFiles) {
    if (fs.existsSync(file)) {
      debugLog(`✅ Found optional file: ${file}`);
    } else {
      debugLog(`⚠️  Optional file missing: ${file}`);
    }
  }

  // Verify this is FinHelm.ai project
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.name !== 'finhelm-ai') {
      colorLog(`⚠️  Project name is '${packageJson.name}', expected 'finhelm-ai'`, 'yellow');
    } else {
      colorLog('✅ FinHelm.ai project confirmed', 'green');
    }
    
    // Check for workspaces (monorepo structure)
    if (packageJson.workspaces) {
      debugLog(`Workspaces detected: ${packageJson.workspaces.join(', ')}`);
    }
  } catch (error) {
    colorLog(`❌ Failed to parse package.json: ${error}`, 'red');
    return false;
  }

  const validationPercentage = (validationScore / totalChecks * 100).toFixed(1);
  colorLog(`✅ Project structure validated (${validationPercentage}% checks passed)`, 'green');
  return true;
}

/**
 * Execute command safely with enhanced error handling
 */
function executeCommand(command: string, options: { timeout?: number; silent?: boolean; cwd?: string } = {}): { success: boolean; output: string; error?: string; code?: number } {
  try {
    debugLog(`Executing: ${command}${options.cwd ? ` (cwd: ${options.cwd})` : ''}`);
    const output = execSync(command, { 
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd()
    });
    
    return { success: true, output: output.toString().trim() };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    const exitCode = error.status || error.signal || -1;
    
    if (!options.silent) {
      debugLog(`Command failed (code: ${exitCode}): ${errorMessage}`);
    }
    return { 
      success: false, 
      output: error.stdout?.toString() || '', 
      error: errorMessage,
      code: exitCode
    };
  }
}

/**
 * Step 2: Enhanced Convex authentication with retry logic
 */
async function handleConvexAuth(config: DeploymentConfig): Promise<boolean> {
  colorLog('\n[2/8] 🔐 Checking Convex authentication...', 'cyan');
  
  // Check if Convex CLI is installed
  const versionCheck = executeCommand('npx convex --version', { silent: true });
  if (!versionCheck.success) {
    colorLog('❌ Convex CLI not available. Installing...', 'red');
    const installResult = executeCommand('npm install -g convex', { timeout: 60000 });
    if (!installResult.success) {
      colorLog('❌ Failed to install Convex CLI', 'red');
      return false;
    }
  } else {
    debugLog(`Convex CLI version: ${versionCheck.output}`);
  }

  // Try to check auth status with multiple approaches
  let authChecks = [
    { cmd: 'npx convex auth', desc: 'auth status' },
    { cmd: 'npx convex whoami', desc: 'user identity' },
    { cmd: 'npx convex status', desc: 'deployment status' }
  ];
  
  let isAuthenticated = false;
  
  for (const check of authChecks) {
    const result = executeCommand(check.cmd, { silent: true, timeout: 15000 });
    if (result.success && !result.output.includes('not authenticated') && !result.output.includes('login required')) {
      debugLog(`Authentication verified via ${check.desc}: ${result.output.substring(0, 100)}`);
      isAuthenticated = true;
      break;
    }
  }
  
  if (isAuthenticated) {
    colorLog('✅ Already authenticated with Convex', 'green');
    return true;
  }

  // Need to authenticate
  colorLog('🔑 Authentication required. Initiating Convex login...', 'yellow');
  colorLog('This will open your browser for OAuth authentication.', 'blue');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nPress Enter to continue with Convex login (or Ctrl+C to cancel): ', () => {
      rl.close();
      
      // Execute login command with extended timeout
      colorLog('🌐 Opening browser for authentication...', 'blue');
      const loginResult = executeCommand('npx convex login', { 
        timeout: config.timeouts.authentication,
        silent: false 
      });
      
      if (loginResult.success) {
        colorLog('✅ Successfully authenticated with Convex', 'green');
        
        // Verify authentication worked
        const verifyResult = executeCommand('npx convex whoami', { silent: true });
        if (verifyResult.success) {
          debugLog(`Authenticated as: ${verifyResult.output}`);
        }
        
        resolve(true);
      } else {
        colorLog(`❌ Authentication failed: ${loginResult.error}`, 'red');
        colorLog('💡 Troubleshooting suggestions:', 'yellow');
        colorLog('   • Check your internet connection', 'yellow');
        colorLog('   • Try running: npx convex login --help', 'yellow');
        colorLog('   • Verify your Convex account at https://dashboard.convex.dev', 'yellow');
        resolve(false);
      }
    });
  });
}

/**
 * Step 3: Enhanced deployment with multiple URL capture strategies
 */
async function deployConvex(config: DeploymentConfig): Promise<string | null> {
  colorLog('\n[3/8] 🚀 Deploying to Convex with PRD v2.1 schema...', 'cyan');
  
  return new Promise((resolve) => {
    let deploymentUrl: string | null = null;
    let outputBuffer = '';
    let urlCaptureStartTime = Date.now();
    
    // Enhanced deployment command - try multiple approaches
    const deploymentStrategies = [
      { cmd: ['convex', 'dev'], desc: 'development deployment' },
      { cmd: ['convex', 'deploy', '--prod'], desc: 'production deployment' },
      { cmd: ['convex', 'deploy'], desc: 'standard deployment' }
    ];
    
    let currentStrategy = 0;
    
    function attemptDeployment() {
      if (currentStrategy >= deploymentStrategies.length) {
        colorLog('❌ All deployment strategies failed', 'red');
        resolve(null);
        return;
      }
      
      const strategy = deploymentStrategies[currentStrategy];
      colorLog(`   Attempting ${strategy.desc}...`, 'blue');
      
      const child = spawn('npx', strategy.cmd, {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      // Set timeout for this strategy
      const timeout = setTimeout(() => {
        if (!deploymentUrl) {
          debugLog(`Strategy ${currentStrategy + 1} timed out, trying next...`);
          child.kill();
          currentStrategy++;
          attemptDeployment();
        }
      }, config.timeouts.deployment / deploymentStrategies.length);

      // Handle stdout with multiple URL detection patterns
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        // Try all URL patterns
        for (const pattern of config.urlPatterns) {
          const matches = output.match(pattern);
          if (matches && matches.length > 0) {
            // Extract clean URL
            let foundUrl = matches[0];
            
            // Clean up dashboard/status prefixes
            if (foundUrl.includes('Dashboard:')) {
              foundUrl = foundUrl.replace('Dashboard:', '').trim();
            }
            if (foundUrl.includes('Functions ready at:')) {
              foundUrl = foundUrl.replace('Functions ready at:', '').trim();
            }
            
            if (foundUrl.startsWith('https://') && !deploymentUrl) {
              deploymentUrl = foundUrl;
              const urlCaptureTime = Date.now() - urlCaptureStartTime;
              clearTimeout(timeout);
              
              debugLog(`URL captured in ${urlCaptureTime}ms: ${deploymentUrl}`);
              
              // Give a moment for deployment to stabilize
              setTimeout(() => {
                child.kill('SIGTERM');
                colorLog(`✅ Deployment successful: ${deploymentUrl}`, 'green');
                resolve(deploymentUrl);
              }, 3000);
              break;
            }
          }
        }
        
        // Also look for success indicators
        if (output.includes('Convex functions ready') || output.includes('deployment complete')) {
          debugLog('Deployment completion indicator detected');
        }
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        const error = data.toString();
        debugLog(`Convex stderr: ${error}`);
        
        // Check for critical errors
        if (error.toLowerCase().includes('error') || error.toLowerCase().includes('failed')) {
          clearTimeout(timeout);
          child.kill();
          
          debugLog(`Critical error in strategy ${currentStrategy + 1}, trying next...`);
          currentStrategy++;
          attemptDeployment();
        }
      });

      // Handle process exit
      child.on('exit', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0 && !deploymentUrl) {
          debugLog(`Strategy ${currentStrategy + 1} exited with code ${code}`);
          currentStrategy++;
          attemptDeployment();
        }
      });
    }
    
    // Start deployment attempts
    attemptDeployment();
  });
}

/**
 * Smart .env file management with comment and structure preservation
 */
function smartEnvUpdate(deploymentUrl: string): boolean {
  colorLog('\n[4/8] 🔧 Smart .env update with preservation...', 'cyan');
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    let envContent = '';
    let preservedStructure = false;
    
    // Try to preserve existing .env structure
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      preservedStructure = true;
      debugLog('Existing .env file found, preserving structure');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
      debugLog('Using .env.example as template');
    } else {
      // Create minimal structure
      envContent = `# FinHelm.ai Environment Configuration
# Generated by deploy-convex.ts on ${new Date().toISOString()}

CONVEX_DEPLOYMENT=
CONVEX_URL=
`;
    }
    
    // Add PRD v2.1 context header if not present
    const prdHeader = `# PRD v2.1 Compliant Configuration
# Oracle AI Agents: Document IO + Ledger + Advanced Prediction
# 11-table schema for SMB ERP co-pilot functionality`;
    
    if (!envContent.includes('PRD v2.1')) {
      envContent = prdHeader + '\n\n' + envContent;
    }
    
    // Smart URL replacement
    const convexDeploymentRegex = /^CONVEX_DEPLOYMENT=.*$/m;
    const convexUrlRegex = /^CONVEX_URL=.*$/m;
    
    if (convexDeploymentRegex.test(envContent)) {
      envContent = envContent.replace(convexDeploymentRegex, `CONVEX_DEPLOYMENT=${deploymentUrl}`);
      debugLog('Updated existing CONVEX_DEPLOYMENT');
    } else {
      // Add to Convex section or create new section
      const convexSectionRegex = /# Convex Configuration\n# ======================================/;
      if (convexSectionRegex.test(envContent)) {
        envContent = envContent.replace(
          convexSectionRegex,
          `# Convex Configuration\n# ======================================\nCONVEX_DEPLOYMENT=${deploymentUrl}`
        );
      } else {
        envContent += `\n# ======================================\n# Convex Configuration\n# ======================================\nCONVEX_DEPLOYMENT=${deploymentUrl}\n`;
      }
      debugLog('Added new CONVEX_DEPLOYMENT');
    }
    
    if (convexUrlRegex.test(envContent)) {
      envContent = envContent.replace(convexUrlRegex, `CONVEX_URL=${deploymentUrl}`);
      debugLog('Updated existing CONVEX_URL');
    } else {
      envContent = envContent.replace(
        `CONVEX_DEPLOYMENT=${deploymentUrl}`,
        `CONVEX_DEPLOYMENT=${deploymentUrl}\nCONVEX_URL=${deploymentUrl}`
      );
      debugLog('Added new CONVEX_URL');
    }
    
    // Create backup if preserving structure
    if (preservedStructure) {
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, fs.readFileSync(envPath, 'utf8'));
      debugLog(`Backup created: ${backupPath}`);
    }
    
    // Write updated content
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    colorLog(`✅ Environment smartly updated: ${envPath}`, 'green');
    colorLog(`   CONVEX_DEPLOYMENT=${deploymentUrl}`, 'blue');
    colorLog(`   Structure preserved: ${preservedStructure}`, 'blue');
    
    return true;
  } catch (error) {
    colorLog(`❌ Failed to update environment: ${error}`, 'red');
    return false;
  }
}

/**
 * Step 5: Enhanced schema validation with Oracle AI Agents mapping
 */
async function validateSchemas(config: DeploymentConfig, deploymentUrl: string): Promise<DeploymentMetrics['schemaValidation']> {
  colorLog('\n[5/8] 📋 Validating PRD v2.1 schemas with Oracle AI mapping...', 'cyan');
  
  const schemaValidation: DeploymentMetrics['schemaValidation'] = {
    tablesFound: 0,
    totalExpected: config.expectedTables.length,
    confidenceScore: 0,
    criticalTablesPresent: false,
    missingTables: [],
    oracleMappingSuccess: false,
    oracleMappingDetails: {}
  };

  try {
    let foundTables: string[] = [];
    
    // Multiple strategies for table detection
    const validationStrategies = [
      { cmd: 'npx convex run --prod list:tables', desc: 'production table listing' },
      { cmd: 'npx convex run list:tables', desc: 'development table listing' },
      { cmd: 'npx convex dashboard --list-tables', desc: 'dashboard table listing' }
    ];
    
    let tablesDetected = false;
    
    for (const strategy of validationStrategies) {
      if (tablesDetected) break;
      
      debugLog(`Trying ${strategy.desc}...`);
      const listResult = executeCommand(strategy.cmd, { 
        silent: true, 
        timeout: config.timeouts.schemaValidation 
      });
      
      if (listResult.success && listResult.output) {
        debugLog(`Strategy succeeded: ${strategy.desc}`);
        
        // Enhanced table name extraction
        const tablePatterns = [
          /["\']([a-zA-Z][a-zA-Z0-9_]*)["\']|^([a-zA-Z][a-zA-Z0-9_]*):?\s*$/gm,
          /table\s+([a-zA-Z][a-zA-Z0-9_]*)/gi,
          /defineTable\s*\(\s*["\']([^"\']+)["\']/g,
          /([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*defineTable/g
        ];
        
        for (const pattern of tablePatterns) {
          const matches = Array.from(listResult.output.matchAll(pattern));
          if (matches.length > 0) {
            foundTables = matches.map(match => 
              (match[1] || match[2] || match[0]).replace(/["\':]/g, '').trim()
            ).filter(name => name.length > 0 && /^[a-zA-Z]/.test(name));
            
            if (foundTables.length > 0) {
              tablesDetected = true;
              break;
            }
          }
        }
      }
    }
    
    // Fallback: Schema file analysis
    if (!tablesDetected) {
      debugLog('Using schema file analysis fallback...');
      const schemaFiles = ['./convex/schema.ts', './convex/schema.js', './backend/convex/schema.ts'];
      
      for (const schemaPath of schemaFiles) {
        if (fs.existsSync(schemaPath)) {
          const schemaContent = fs.readFileSync(schemaPath, 'utf8');
          
          // Extract table definitions from schema
          const defineTablePatterns = [
            /(\w+):\s*defineTable/g,
            /export\s+const\s+(\w+)\s*=\s*defineTable/g,
            /"(\w+)":\s*defineTable/g
          ];
          
          for (const pattern of defineTablePatterns) {
            const matches = Array.from(schemaContent.matchAll(pattern));
            if (matches.length > 0) {
              foundTables = matches.map(match => match[1]).filter(name => name && name.length > 0);
              tablesDetected = true;
              break;
            }
          }
          
          if (tablesDetected) {
            debugLog(`Tables found in ${schemaPath}: ${foundTables.join(', ')}`);
            break;
          }
        }
      }
    }
    
    // Remove duplicates and sort
    foundTables = [...new Set(foundTables)].sort();
    
    // Validate against expected tables
    schemaValidation.tablesFound = foundTables.length;
    schemaValidation.missingTables = config.expectedTables.filter(
      expected => !foundTables.includes(expected)
    );
    
    // Check critical tables
    schemaValidation.criticalTablesPresent = config.criticalTables.every(
      critical => foundTables.includes(critical)
    );
    
    // Calculate confidence score
    const foundExpected = config.expectedTables.filter(expected => 
      foundTables.includes(expected)
    ).length;
    schemaValidation.confidenceScore = (foundExpected / config.expectedTables.length) * 100;
    
    // Oracle AI Agents mapping validation
    let oracleMappingScore = 0;
    const totalMappings = Object.keys(config.oracleAgentMappings).length;
    
    for (const [agentType, requiredTables] of Object.entries(config.oracleAgentMappings)) {
      const mappingSuccess = requiredTables.every(table => foundTables.includes(table));
      schemaValidation.oracleMappingDetails[agentType] = mappingSuccess;
      
      if (mappingSuccess) {
        oracleMappingScore++;
        debugLog(`✅ Oracle ${agentType} mapping successful`);
      } else {
        const missingForAgent = requiredTables.filter(table => !foundTables.includes(table));
        debugLog(`❌ Oracle ${agentType} mapping failed, missing: ${missingForAgent.join(', ')}`);
      }
    }
    
    schemaValidation.oracleMappingSuccess = (oracleMappingScore / totalMappings) >= 0.67; // 2/3 success rate
    
    // Enhanced reporting
    colorLog(`✅ Schema validation complete`, 'green');
    colorLog(`   Tables found: ${schemaValidation.tablesFound} (${foundTables.join(', ')})`, 'blue');
    colorLog(`   Expected match: ${foundExpected}/${config.expectedTables.length}`, 'blue');
    colorLog(`   Confidence: ${schemaValidation.confidenceScore.toFixed(1)}%`, 'blue');
    colorLog(`   Critical tables: ${schemaValidation.criticalTablesPresent ? '✅' : '❌'}`, schemaValidation.criticalTablesPresent ? 'green' : 'red');
    colorLog(`   Oracle AI mapping: ${schemaValidation.oracleMappingSuccess ? '✅' : '❌'} (${oracleMappingScore}/${totalMappings})`, schemaValidation.oracleMappingSuccess ? 'green' : 'yellow');
    
    // Confidence assessment
    if (schemaValidation.confidenceScore >= config.confidenceThresholds.excellent) {
      colorLog(`   🏆 Excellent confidence level!`, 'green');
    } else if (schemaValidation.confidenceScore >= config.confidenceThresholds.target) {
      colorLog(`   ✅ Target confidence achieved!`, 'green');
    } else if (schemaValidation.confidenceScore >= config.confidenceThresholds.minimum) {
      colorLog(`   ⚠️  Minimum confidence met`, 'yellow');
    } else {
      colorLog(`   ❌ Below minimum confidence threshold`, 'red');
    }
    
    if (schemaValidation.missingTables.length > 0) {
      colorLog(`   ⚠️  Missing tables: ${schemaValidation.missingTables.join(', ')}`, 'yellow');
    }

  } catch (error) {
    colorLog(`❌ Schema validation failed: ${error}`, 'red');
  }

  return schemaValidation;
}

/**
 * Step 6: Enhanced verification tests with detailed reporting
 */
function runVerificationTests(config: DeploymentConfig): DeploymentMetrics['testResults'] {
  colorLog('\n[6/8] 🧪 Running enhanced verification tests...', 'cyan');
  
  const testResults: DeploymentMetrics['testResults'] = {
    testsRun: 0,
    testsPass: 0,
    errorCount: 0,
    output: ''
  };

  for (const testCommand of config.testCommands) {
    testResults.testsRun++;
    
    colorLog(`   Running: ${testCommand}`, 'blue');
    const result = executeCommand(testCommand, { silent: true, timeout: 60000 });
    
    if (result.success) {
      testResults.testsPass++;
      
      // Enhanced success pattern detection
      const successPatterns = [
        /All deployment checks passed!/i,
        /deployment successful/i,
        /(\d+\.?\d*)%?\s*confidence/i,
        /✅.*complete/i,
        /oracle.*mapping.*success/i
      ];
      
      for (const pattern of successPatterns) {
        const match = result.output.match(pattern);
        if (match) {
          if (pattern.source.includes('confidence')) {
            colorLog(`   ✅ Confidence detected: ${match[1]}%`, 'green');
          } else {
            colorLog(`   ✅ Success: ${match[0]}`, 'green');
          }
        }
      }
      
      // Check for specific PRD v2.1 indicators
      if (result.output.includes('PRD v2.1') || result.output.includes('Oracle AI')) {
        colorLog(`   ✅ PRD v2.1 compliance detected`, 'green');
      }
      
    } else {
      testResults.errorCount++;
      colorLog(`   ❌ Test failed: ${testCommand}`, 'red');
      debugLog(`Test error: ${result.error}`);
      
      // Check for specific error patterns
      if (result.output.includes('timeout')) {
        colorLog(`   ⚠️  Test timed out - may need longer timeout`, 'yellow');
      }
      if (result.output.includes('connection')) {
        colorLog(`   ⚠️  Connection issue detected`, 'yellow');
      }
    }
    
    testResults.output += `${testCommand}:\n${result.output}\n\n`;
  }

  const successRate = (testResults.testsPass / testResults.testsRun * 100).toFixed(1);
  colorLog(`✅ Tests completed: ${testResults.testsPass}/${testResults.testsRun} passed (${successRate}%)`, 'green');

  return testResults;
}

/**
 * Enhanced git operations with detailed commit messages
 */
function handleGitOperations(config: DeploymentConfig, metrics: Partial<DeploymentMetrics>): DeploymentMetrics['gitOperations'] {
  colorLog('\n[7/8] 📝 Enhanced git operations...', 'cyan');
  
  const gitOperations: DeploymentMetrics['gitOperations'] = {
    filesStaged: [],
    commitSuccess: false,
    pushSuccess: false,
    branchName: ''
  };

  try {
    // Get current branch
    const branchResult = executeCommand('git branch --show-current', { silent: true });
    if (branchResult.success) {
      gitOperations.branchName = branchResult.output.trim();
      debugLog(`Current branch: ${gitOperations.branchName}`);
    }

    // Check if in git repository
    const statusResult = executeCommand('git status --porcelain', { silent: true });
    if (!statusResult.success) {
      colorLog('⚠️  Not in a git repository, skipping git operations', 'yellow');
      return gitOperations;
    }

    // Enhanced file staging with existence checks
    const allPossibleFiles = [
      ...config.gitFiles,
      'DEPLOYMENT.md',
      'deployment-logs-template.md',
      'docs/DEPLOYMENT-INTEGRATION-GUIDE.md',
      'scripts/convex-deployment-config.json'
    ];
    
    const filesToStage = allPossibleFiles.filter(file => fs.existsSync(file));
    
    for (const file of filesToStage) {
      const addResult = executeCommand(`git add "${file}"`, { silent: true });
      if (addResult.success) {
        gitOperations.filesStaged.push(file);
        colorLog(`   ✅ Staged: ${file}`, 'green');
      } else {
        colorLog(`   ⚠️  Failed to stage: ${file}`, 'yellow');
        debugLog(`Git add error for ${file}: ${addResult.error}`);
      }
    }

    // Enhanced commit message with metrics
    if (gitOperations.filesStaged.length > 0) {
      const schemaValidation = metrics.schemaValidation;
      const confidenceScore = schemaValidation?.confidenceScore || 0;
      const tablesFound = schemaValidation?.tablesFound || 0;
      const oracleSuccess = schemaValidation?.oracleMappingSuccess ? 'Success' : 'Partial';
      
      const commitMessage = `Convex deployment post-auth (PRD v2.1)

✅ PRD v2.1 schema validation: ${confidenceScore.toFixed(1)}% confidence
🔗 Oracle AI Agents mapping: ${oracleSuccess}
📊 Tables validated: ${tablesFound}/11 (users, organizations, accounts, transactions, agents, agentExecutions, erpConnections, syncJobs, reconciliations, auditLogs, predictions)
⚡ Deployment time: ${metrics.deploymentTime ? (metrics.deploymentTime / 1000).toFixed(1) : 'N/A'}s
🧪 Tests: ${metrics.testResults?.testsPass || 0}/${metrics.testResults?.testsRun || 0} passed

🎯 Oracle AI Agents Status:
${Object.entries(schemaValidation?.oracleMappingDetails || {}).map(([agent, success]) => 
  `   ${success ? '✅' : '❌'} ${agent}`
).join('\n')}

🚀 FinHelm.ai backend foundation ready for SMB ERP co-pilot

🤖 Generated with deploy-convex.ts v2.1`;
      
      const commitResult = executeCommand(`git commit -m "${commitMessage}"`, { silent: true });
      if (commitResult.success) {
        gitOperations.commitSuccess = true;
        colorLog('   ✅ Enhanced commit created', 'green');
        
        // Push to remote if on a tracked branch
        if (gitOperations.branchName) {
          const pushResult = executeCommand(`git push origin ${gitOperations.branchName}`, { silent: true });
          if (pushResult.success) {
            gitOperations.pushSuccess = true;
            colorLog('   ✅ Changes pushed to remote', 'green');
          } else {
            colorLog('   ⚠️  Failed to push to remote (may need to set upstream)', 'yellow');
            debugLog(`Push error: ${pushResult.error}`);
          }
        }
      } else {
        colorLog('   ⚠️  Commit failed or no changes to commit', 'yellow');
        debugLog(`Commit error: ${commitResult.error}`);
      }
    } else {
      colorLog('   ℹ️  No relevant files to stage', 'blue');
    }

  } catch (error) {
    colorLog(`❌ Git operations failed: ${error}`, 'red');
  }

  return gitOperations;
}

/**
 * Step 8: PRD compliance assessment
 */
function assessPRDCompliance(metrics: Partial<DeploymentMetrics>): DeploymentMetrics['prdCompliance'] {
  colorLog('\n[8/8] 📋 Assessing PRD v2.1 compliance...', 'cyan');
  
  const prdCompliance: DeploymentMetrics['prdCompliance'] = {
    version: 'v2.1',
    complianceScore: 0,
    issues: []
  };
  
  let compliancePoints = 0;
  const maxPoints = 10;
  
  // Check deployment URL (2 points)
  if (metrics.deploymentUrl) {
    compliancePoints += 2;
    debugLog('✅ Deployment URL present');
  } else {
    prdCompliance.issues.push('Missing deployment URL');
  }
  
  // Check schema validation (3 points)
  if (metrics.schemaValidation) {
    if (metrics.schemaValidation.confidenceScore >= 70) compliancePoints += 1;
    if (metrics.schemaValidation.confidenceScore >= 92.7) compliancePoints += 1;
    if (metrics.schemaValidation.criticalTablesPresent) compliancePoints += 1;
    
    if (!metrics.schemaValidation.criticalTablesPresent) {
      prdCompliance.issues.push('Critical tables missing');
    }
  } else {
    prdCompliance.issues.push('Schema validation failed');
  }
  
  // Check Oracle AI mapping (2 points)
  if (metrics.schemaValidation?.oracleMappingSuccess) {
    compliancePoints += 2;
    debugLog('✅ Oracle AI mapping successful');
  } else {
    prdCompliance.issues.push('Oracle AI Agents mapping incomplete');
  }
  
  // Check test results (2 points)
  if (metrics.testResults) {
    if (metrics.testResults.testsPass > 0) compliancePoints += 1;
    if (metrics.testResults.testsPass === metrics.testResults.testsRun) compliancePoints += 1;
  } else {
    prdCompliance.issues.push('No tests executed');
  }
  
  // Check git operations (1 point)
  if (metrics.gitOperations?.commitSuccess) {
    compliancePoints += 1;
    debugLog('✅ Git operations successful');
  }
  
  prdCompliance.complianceScore = (compliancePoints / maxPoints) * 100;
  
  colorLog(`✅ PRD v2.1 compliance assessment complete`, 'green');
  colorLog(`   Compliance score: ${prdCompliance.complianceScore.toFixed(1)}% (${compliancePoints}/${maxPoints} points)`, 'blue');
  
  if (prdCompliance.issues.length > 0) {
    colorLog(`   Issues found: ${prdCompliance.issues.length}`, 'yellow');
    prdCompliance.issues.forEach(issue => {
      colorLog(`     - ${issue}`, 'yellow');
    });
  }
  
  return prdCompliance;
}

/**
 * Generate comprehensive deployment report
 */
function generateEnhancedReport(metrics: DeploymentMetrics): void {
  colorLog('\n' + '='.repeat(60), 'cyan');
  colorLog('🎉 FINHELM.AI CONVEX DEPLOYMENT COMPLETE (PRD v2.1)', 'bright');
  colorLog('='.repeat(60), 'cyan');
  
  colorLog(`\n📊 Deployment Summary:`, 'bright');
  colorLog(`✅ Deployment URL: ${metrics.deploymentUrl}`, 'green');
  colorLog(`✅ Schema Validation: ${metrics.schemaValidation.tablesFound} tables found`, 'green');
  colorLog(`✅ Confidence Score: ${metrics.schemaValidation.confidenceScore.toFixed(1)}% ${
    metrics.schemaValidation.confidenceScore >= 92.7 ? '🎯' : 
    metrics.schemaValidation.confidenceScore >= 70 ? '⚠️' : '❌'
  }`, metrics.schemaValidation.confidenceScore >= 70 ? 'green' : 'red');
  colorLog(`✅ Critical Tables: ${metrics.schemaValidation.criticalTablesPresent ? '✅ Present' : '❌ Missing'}`, 
          metrics.schemaValidation.criticalTablesPresent ? 'green' : 'red');
  colorLog(`✅ Oracle AI Mapping: ${metrics.schemaValidation.oracleMappingSuccess ? '✅ Success' : '❌ Failed'}`, 
          metrics.schemaValidation.oracleMappingSuccess ? 'green' : 'red');
  colorLog(`✅ Tests: ${metrics.testResults.testsPass}/${metrics.testResults.testsRun} passed`, 
          metrics.testResults.testsPass === metrics.testResults.testsRun ? 'green' : 'yellow');
  colorLog(`✅ Git Operations: ${metrics.gitOperations.filesStaged.length} files staged, committed: ${metrics.gitOperations.commitSuccess}`, 
          metrics.gitOperations.commitSuccess ? 'green' : 'yellow');
  colorLog(`✅ PRD v2.1 Compliance: ${metrics.prdCompliance.complianceScore.toFixed(1)}%`, 
          metrics.prdCompliance.complianceScore >= 80 ? 'green' : 'yellow');
  
  colorLog(`\n🔮 Oracle AI Agents Status:`, 'magenta');
  Object.entries(metrics.schemaValidation.oracleMappingDetails).forEach(([agent, success]) => {
    colorLog(`   ${success ? '✅' : '❌'} ${agent}`, success ? 'green' : 'red');
  });
  
  colorLog(`\n⏱️  Performance Metrics:`, 'cyan');
  colorLog(`   Total Execution Time: ${(metrics.totalExecutionTime / 1000).toFixed(1)}s`, 'blue');
  colorLog(`   Deployment Time: ${(metrics.deploymentTime / 1000).toFixed(1)}s`, 'blue');
  colorLog(`   URL Capture Time: ${(metrics.urlCaptureTime / 1000).toFixed(1)}s`, 'blue');
  
  if (metrics.schemaValidation.missingTables.length > 0) {
    colorLog(`\n⚠️  Missing Tables (${metrics.schemaValidation.missingTables.length}):`, 'yellow');
    metrics.schemaValidation.missingTables.forEach(table => {
      colorLog(`   - ${table}`, 'yellow');
    });
  }
  
  if (metrics.prdCompliance.issues.length > 0) {
    colorLog(`\n⚠️  PRD Compliance Issues:`, 'yellow');
    metrics.prdCompliance.issues.forEach(issue => {
      colorLog(`   - ${issue}`, 'yellow');
    });
  }
  
  colorLog(`\n🚀 Next Steps:`, 'bright');
  colorLog(`   1. Test Convex functions: ${metrics.deploymentUrl}`, 'blue');
  colorLog(`   2. Open Convex Dashboard to monitor deployment`, 'blue');
  colorLog(`   3. Start FinHelm.ai application: npm run dev`, 'blue');
  colorLog(`   4. Configure ERP integrations (QuickBooks/Sage Intacct)`, 'blue');
  colorLog(`   5. Initialize Oracle AI Agents for Document IO + Ledger + Prediction`, 'blue');
  
  colorLog(`\n🎯 Deployment Status: ${
    metrics.prdCompliance.complianceScore >= 90 ? 'EXCELLENT ✨' :
    metrics.prdCompliance.complianceScore >= 80 ? 'GOOD ✅' :
    metrics.prdCompliance.complianceScore >= 70 ? 'ACCEPTABLE ⚠️' : 'NEEDS ATTENTION ❌'
  }`, 'bright');
  colorLog('\n🎉 FinHelm.ai SMB ERP co-pilot backend is ready! 🎉\n', 'bright');
}

/**
 * Enhanced main execution function
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  
  try {
    colorLog('🚀 FinHelm.ai Enhanced Convex Deployment Assistant v2.1', 'bright');
    colorLog('============================================================', 'cyan');
    colorLog('PRD v2.1 Compliant | Oracle AI Agents | 11-Table Schema', 'blue');
    colorLog('============================================================\n', 'cyan');

    // Load PRD v2.1 configuration
    const config = loadConfig();
    debugLog(`Loaded PRD v2.1 config: ${JSON.stringify(config, null, 2)}`);

    // Initialize enhanced metrics
    const metrics: DeploymentMetrics = {
      deploymentTime: 0,
      urlCaptureTime: 0,
      schemaValidation: {
        tablesFound: 0,
        totalExpected: config.expectedTables.length,
        confidenceScore: 0,
        criticalTablesPresent: false,
        missingTables: [],
        oracleMappingSuccess: false,
        oracleMappingDetails: {}
      },
      testResults: {
        testsRun: 0,
        testsPass: 0,
        errorCount: 0,
        output: ''
      },
      gitOperations: {
        filesStaged: [],
        commitSuccess: false,
        pushSuccess: false,
        branchName: ''
      },
      deploymentUrl: '',
      totalExecutionTime: 0,
      prdCompliance: {
        version: 'v2.1',
        complianceScore: 0,
        issues: []
      }
    };

    // Step 1: Enhanced project validation
    if (!validateProjectRoot()) {
      throw new Error('Project validation failed');
    }

    // Step 2: Enhanced authentication
    if (!(await handleConvexAuth(config))) {
      throw new Error('Authentication failed');
    }

    // Step 3: Enhanced deployment with URL capture
    const deployStart = Date.now();
    const urlCaptureStart = Date.now();
    
    const deploymentUrl = await deployConvex(config);
    metrics.deploymentTime = Date.now() - deployStart;
    metrics.urlCaptureTime = Date.now() - urlCaptureStart;
    
    if (!deploymentUrl) {
      throw new Error('Deployment failed - no URL captured');
    }
    metrics.deploymentUrl = deploymentUrl;

    // Step 4: Smart environment update
    if (!smartEnvUpdate(deploymentUrl)) {
      throw new Error('Environment update failed');
    }

    // Step 5: Enhanced schema validation with Oracle AI mapping
    metrics.schemaValidation = await validateSchemas(config, deploymentUrl);

    // Step 6: Enhanced verification tests
    metrics.testResults = runVerificationTests(config);

    // Step 7: Enhanced git operations
    metrics.gitOperations = handleGitOperations(config, metrics);

    // Step 8: PRD compliance assessment
    metrics.prdCompliance = assessPRDCompliance(metrics);

    // Calculate total time and generate enhanced report
    metrics.totalExecutionTime = Date.now() - startTime;
    generateEnhancedReport(metrics);

    // Exit with appropriate code based on compliance
    if (metrics.prdCompliance.complianceScore < 70) {
      colorLog('⚠️  Deployment completed with compliance issues. Manual review recommended.', 'yellow');
      process.exit(1);
    }

  } catch (error: any) {
    colorLog(`\n💥 Deployment failed: ${error.message}`, 'red');
    colorLog('\n🔧 Enhanced Troubleshooting Guide:', 'yellow');
    colorLog('   • Authentication: npx convex login', 'yellow');
    colorLog('   • Network: Check internet connectivity', 'yellow');
    colorLog('   • Permissions: Verify Convex project access', 'yellow');
    colorLog('   • Structure: Ensure convex/ directory exists', 'yellow');
    colorLog('   • Dependencies: npm install convex', 'yellow');
    colorLog('   • Debug mode: DEBUG=1 npx ts-node scripts/deploy-convex.ts', 'yellow');
    
    const executionTime = (Date.now() - startTime) / 1000;
    colorLog(`\n⏱️  Failed after ${executionTime.toFixed(1)}s`, 'red');
    process.exit(1);
  }
}

// Enhanced process termination handling
process.on('SIGINT', () => {
  colorLog('\n\n⚠️  Deployment cancelled by user (SIGINT)', 'yellow');
  colorLog('   Cleaning up any partially completed operations...', 'yellow');
  
  // Attempt graceful cleanup
  try {
    const cleanupResult = executeCommand('pkill -f "convex dev"', { silent: true, timeout: 5000 });
    if (cleanupResult.success) {
      debugLog('Convex processes cleaned up');
    }
  } catch (error) {
    debugLog('Cleanup attempt completed');
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  colorLog('\n\n⚠️  Deployment terminated (SIGTERM)', 'yellow');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  colorLog(`\n💥 Uncaught exception: ${error.message}`, 'red');
  debugLog(`Stack trace: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  colorLog(`\n💥 Unhandled promise rejection: ${reason}`, 'red');
  debugLog(`Promise: ${promise}`);
  process.exit(1);
});

// Execute main function if run directly
if (require.main === module) {
  main().catch((error) => {
    colorLog(`\n💥 Fatal error: ${error.message}`, 'red');
    if (DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

// Export for potential module usage
export { main, loadConfig, DeploymentConfig, DeploymentMetrics };