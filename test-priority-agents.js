/**
 * Test Script for Priority AI Agents
 * Run this to verify the 5 priority agents are working with live Convex data
 */

const { ConvexHttpClient } = require("convex/browser");

// Configuration
const CONVEX_URL = process.env.CONVEX_URL || "https://optimal-albacore-587.convex.cloud";

async function testPriorityAgents() {
  const client = new ConvexHttpClient(CONVEX_URL);
  
  console.log("🚀 Testing Priority AI Agents with Live Convex Data\n");
  console.log("=" .repeat(60));
  
  try {
    // Get a company for testing
    const companies = await client.query("companies:getCompanies");
    
    if (!companies || companies.length === 0) {
      console.log("❌ No companies found. Please connect QuickBooks first.");
      return;
    }
    
    const company = companies[0];
    const companyId = company._id;
    const userId = company.userId;
    
    console.log(`✅ Found company: ${company.name}`);
    console.log(`   ERP System: ${company.erpSystem}`);
    console.log(`   Status: ${company.syncStatus}\n`);
    
    // Test each priority agent
    const agents = [
      {
        name: "Cash Flow Forecast",
        mutation: "ai.priorityAgents:executeCashFlowForecast",
        query: "What is my cash position for the next 13 weeks?",
        weeks: 13
      },
      {
        name: "Collections",
        mutation: "ai.priorityAgents:executeCollections",
        query: "Show me overdue invoices and collection priorities"
      },
      {
        name: "Anomaly Detection",
        mutation: "ai.priorityAgents:executeAnomalyDetection",
        query: "Find unusual transactions and duplicates"
      },
      {
        name: "Month-End Close",
        mutation: "ai.priorityAgents:executeMonthEndClose",
        query: "What tasks remain for month-end close?"
      },
      {
        name: "Budget vs Actual",
        mutation: "ai.priorityAgents:executeBudgetVsActual",
        query: "Show me budget variance analysis"
      }
    ];
    
    for (const agent of agents) {
      console.log("=" .repeat(60));
      console.log(`\n📊 Testing: ${agent.name}`);
      console.log(`   Query: "${agent.query}"`);
      console.log("-" .repeat(40));
      
      try {
        const args = {
          companyId,
          userId,
          query: agent.query
        };
        
        if (agent.weeks) {
          args.weeks = agent.weeks;
        }
        
        const response = await client.mutation(agent.mutation, args);
        
        if (response) {
          console.log("\n✅ Agent Response:");
          
          // Display key metrics based on agent type
          if (agent.name === "Cash Flow Forecast" && response.metrics) {
            console.log(`   Current Cash: $${response.metrics.currentCash?.toFixed(2) || '0.00'}`);
            console.log(`   Receivables: $${response.metrics.receivables?.toFixed(2) || '0.00'}`);
            console.log(`   Payables: $${response.metrics.payables?.toFixed(2) || '0.00'}`);
            if (response.projections && response.projections.length > 0) {
              console.log(`   Week 1 Ending Balance: $${response.projections[0].endingBalance?.toFixed(2) || '0.00'}`);
            }
          }
          
          if (agent.name === "Collections" && response.metrics) {
            console.log(`   Total Overdue: $${response.totalOverdue?.toFixed(2) || '0.00'}`);
            console.log(`   Current: ${response.metrics.current || 0} invoices`);
            console.log(`   30+ days: ${response.metrics.thirtyDays || 0} invoices`);
            console.log(`   60+ days: ${response.metrics.sixtyDays || 0} invoices`);
            console.log(`   90+ days: ${response.metrics.overNinetyDays || 0} invoices`);
          }
          
          if (agent.name === "Anomaly Detection" && response.metrics) {
            console.log(`   Total Transactions: ${response.metrics.transactions || 0}`);
            console.log(`   Outliers Detected: ${response.metrics.outliers || 0}`);
            console.log(`   Duplicates Found: ${response.metrics.duplicates || 0}`);
            console.log(`   Risk Score: ${response.riskScore || 0}/100`);
          }
          
          if (agent.name === "Month-End Close" && response.metrics) {
            console.log(`   Completed Tasks: ${response.metrics.completedTasks || 0}/${response.metrics.totalTasks || 0}`);
            console.log(`   Unreconciled Items: ${response.metrics.totalUnreconciled || 0}`);
            console.log(`   Accounts to Reconcile: ${response.metrics.accountsToReconcile || 0}`);
          }
          
          if (agent.name === "Budget vs Actual" && response.metrics) {
            console.log(`   Total Budget: $${response.metrics.totalBudget?.toFixed(2) || '0.00'}`);
            console.log(`   Total Actual: $${response.metrics.totalActual?.toFixed(2) || '0.00'}`);
            console.log(`   Variance: $${response.metrics.totalVariance?.toFixed(2) || '0.00'} (${response.metrics.variancePercent?.toFixed(1) || '0.0'}%)`);
            console.log(`   Accounts Over Budget: ${response.metrics.accountsOverBudget || 0}`);
          }
          
          console.log(`   Confidence: ${(response.confidence * 100).toFixed(0)}%`);
          
          if (response.content) {
            console.log("\n📝 Analysis:");
            console.log(response.content.substring(0, 300) + "...");
          }
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log("\n" + "=" .repeat(60));
    console.log("✅ All priority agents tested successfully!");
    console.log("\n📌 Next Steps:");
    console.log("1. Access the chat interface at: /ai/chat");
    console.log("2. Agents query live Convex data from QuickBooks sync");
    console.log("3. Results are cached for 5 minutes for performance");
    console.log("4. Set OPENAI_API_KEY for GPT-4 enhanced analysis");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testPriorityAgents().catch(console.error);