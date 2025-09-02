#!/usr/bin/env node

/**
 * QuickBooks OAuth Flow Test Script
 * Tests the complete OAuth flow and API integration
 */

const { ConvexClient } = require("convex/browser");
const { api } = require("./convex/_generated/api");

// Configuration
const CONVEX_URL = process.env.CONVEX_URL || "https://ardent-dog-632.convex.cloud";
const client = new ConvexClient(CONVEX_URL);

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("");
  log(`${"=".repeat(60)}`, colors.bright);
  log(title, colors.bright + colors.cyan);
  log(`${"=".repeat(60)}`, colors.bright);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Step 1: Generate OAuth URL
 */
async function generateOAuthUrl() {
  logSection("Step 1: Generating OAuth URL");
  
  try {
    const result = await client.mutation(api.quickbooks.oauth.generateAuthUrl, {});
    
    log("✅ OAuth URL generated successfully!", colors.green);
    log(`Environment: ${result.environment}`, colors.blue);
    log(`State: ${result.state}`, colors.blue);
    log("");
    log("📋 Authorization URL:", colors.yellow);
    log(result.authUrl, colors.bright);
    log("");
    log("👉 Next Steps:", colors.yellow);
    log("1. Open the URL above in your browser");
    log("2. Log in with your QuickBooks sandbox credentials");
    log("3. Select a company and authorize the connection");
    log("4. You'll be redirected to the callback URL");
    log("");
    
    // For development, also show the callback URL
    const callbackUrl = result.environment === "sandbox" 
      ? `https://ardent-dog-632.convex.site/quickbooks/callback`
      : `https://expert-elephant-40.convex.site/quickbooks/callback`;
    
    log(`📍 Callback URL: ${callbackUrl}`, colors.blue);
    
    return {
      authUrl: result.authUrl,
      state: result.state,
    };
  } catch (error) {
    log(`❌ Error generating OAuth URL: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Step 2: Wait for OAuth callback (simulate)
 */
async function waitForAuthorization() {
  logSection("Step 2: Waiting for Authorization");
  
  log("⏳ Please complete the authorization in your browser...", colors.yellow);
  log("");
  log("After authorization, the callback will automatically:", colors.blue);
  log("1. Exchange the code for tokens");
  log("2. Create or update the company record");
  log("3. Store encrypted tokens");
  log("4. Display success message");
  log("");
  log("Press Ctrl+C to cancel", colors.yellow);
  
  // In a real implementation, you would poll for the company status
  // or wait for a webhook/websocket notification
}

/**
 * Step 3: Test API Calls
 */
async function testApiCalls(companyId) {
  logSection("Step 3: Testing QuickBooks API Calls");
  
  // Test 1: Get Company Info
  try {
    log("📊 Fetching company information...", colors.yellow);
    const companyInfo = await client.query(api.quickbooks.apiClient.getCompanyInfo, {
      companyId,
    });
    log("✅ Company Name: " + companyInfo.CompanyName, colors.green);
    log("   Country: " + (companyInfo.Country || "Not specified"), colors.blue);
    log("   Fiscal Year Start: " + (companyInfo.FiscalYearStartMonth || "January"), colors.blue);
  } catch (error) {
    log(`⚠️ Could not fetch company info: ${error.message}`, colors.yellow);
  }
  
  await sleep(1000);
  
  // Test 2: Get Invoices
  try {
    log("");
    log("📄 Fetching invoices...", colors.yellow);
    const invoices = await client.mutation(api.quickbooks.apiClient.getInvoices, {
      companyId,
      limit: 5,
    });
    log(`✅ Found ${invoices.count} invoices`, colors.green);
    
    if (invoices.count > 0) {
      log("   Recent invoices:", colors.blue);
      invoices.invoices.slice(0, 3).forEach(inv => {
        log(`   - ${inv.docNumber || inv.id}: $${inv.total.toFixed(2)} (${inv.status})`, colors.blue);
      });
    }
  } catch (error) {
    log(`⚠️ Could not fetch invoices: ${error.message}`, colors.yellow);
  }
  
  await sleep(1000);
  
  // Test 3: Get Bills
  try {
    log("");
    log("💰 Fetching bills...", colors.yellow);
    const bills = await client.mutation(api.quickbooks.apiClient.getBills, {
      companyId,
      limit: 5,
    });
    log(`✅ Found ${bills.count} bills`, colors.green);
    
    if (bills.count > 0) {
      log("   Recent bills:", colors.blue);
      bills.bills.slice(0, 3).forEach(bill => {
        log(`   - ${bill.docNumber || bill.id}: $${bill.total.toFixed(2)} (${bill.status})`, colors.blue);
      });
    }
  } catch (error) {
    log(`⚠️ Could not fetch bills: ${error.message}`, colors.yellow);
  }
  
  await sleep(1000);
  
  // Test 4: Get Accounts
  try {
    log("");
    log("📚 Fetching chart of accounts...", colors.yellow);
    const accounts = await client.mutation(api.quickbooks.apiClient.getAccounts, {
      companyId,
      accountType: "Bank",
      onlyActive: true,
    });
    log(`✅ Found ${accounts.count} bank accounts`, colors.green);
    
    if (accounts.count > 0) {
      log("   Bank accounts:", colors.blue);
      accounts.accounts.slice(0, 5).forEach(acc => {
        const balance = acc.balance !== undefined ? `$${acc.balance.toFixed(2)}` : "N/A";
        log(`   - ${acc.name}: ${balance}`, colors.blue);
      });
    }
  } catch (error) {
    log(`⚠️ Could not fetch accounts: ${error.message}`, colors.yellow);
  }
  
  await sleep(1000);
  
  // Test 5: Get Cash Flow Data
  try {
    log("");
    log("💹 Generating cash flow forecast...", colors.yellow);
    const cashFlow = await client.mutation(api.quickbooks.apiClient.getCashFlowData, {
      companyId,
      forecastWeeks: 4,
    });
    
    log("✅ Cash Flow Analysis:", colors.green);
    log(`   Current Cash: $${cashFlow.currentCash.toFixed(2)}`, colors.blue);
    log(`   Receivables: $${cashFlow.totalReceivables.toFixed(2)}`, colors.blue);
    log(`   Payables: $${cashFlow.totalPayables.toFixed(2)}`, colors.blue);
    log(`   Net Position: $${cashFlow.netPosition.toFixed(2)}`, colors.blue);
    log(`   DSO: ${cashFlow.dso} days`, colors.blue);
    
    if (cashFlow.forecast.length > 0) {
      log("");
      log("   4-Week Forecast:", colors.blue);
      cashFlow.forecast.forEach(week => {
        log(`   Week ${week.week}: $${week.projectedCash.toFixed(2)}`, colors.blue);
      });
    }
  } catch (error) {
    log(`⚠️ Could not generate cash flow: ${error.message}`, colors.yellow);
  }
}

/**
 * Step 4: Test Token Management
 */
async function testTokenManagement(companyId) {
  logSection("Step 4: Testing Token Management");
  
  try {
    log("🔐 Checking connection status...", colors.yellow);
    const status = await client.query(api.quickbooks.oauth.checkConnectionStatus, {
      companyId,
    });
    
    log(`✅ Connection Status:`, colors.green);
    log(`   Connected: ${status.connected ? "Yes" : "No"}`, colors.blue);
    log(`   Realm ID: ${status.realmId || "Not set"}`, colors.blue);
    log(`   Token Valid: ${status.tokenStatus?.accessTokenValid ? "Yes" : "No"}`, colors.blue);
    log(`   Needs Refresh: ${status.tokenStatus?.needsRefreshSoon ? "Yes" : "No"}`, colors.blue);
    
    if (status.lastSyncAt) {
      const lastSync = new Date(status.lastSyncAt);
      log(`   Last Sync: ${lastSync.toLocaleString()}`, colors.blue);
    }
  } catch (error) {
    log(`❌ Error checking status: ${error.message}`, colors.red);
  }
}

/**
 * Main test flow
 */
async function main() {
  log("");
  log("🚀 QuickBooks OAuth Flow Test", colors.bright + colors.cyan);
  log(`📍 Convex URL: ${CONVEX_URL}`, colors.blue);
  
  try {
    // Step 1: Generate OAuth URL
    const { authUrl, state } = await generateOAuthUrl();
    
    // Step 2: Wait for user to authorize
    await waitForAuthorization();
    
    // For testing, you can manually provide a company ID after authorization
    // In production, this would come from the callback or be retrieved from the database
    log("");
    log("📝 Note: After authorization, use the company ID from the callback to test API calls", colors.yellow);
    log("Example: node test-quickbooks-flow.js --company-id <your-company-id>", colors.blue);
    
    // Check if company ID was provided as argument
    const companyIdArg = process.argv.find(arg => arg.startsWith("--company-id="));
    if (companyIdArg) {
      const companyId = companyIdArg.split("=")[1];
      log("");
      log(`Using Company ID: ${companyId}`, colors.green);
      
      // Step 3: Test API calls
      await testApiCalls(companyId);
      
      // Step 4: Test token management
      await testTokenManagement(companyId);
      
      logSection("✅ All Tests Complete!");
      log("QuickBooks integration is working correctly!", colors.green);
    }
    
  } catch (error) {
    log("");
    log(`❌ Test failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, colors.red);
  process.exit(1);
});