/**
 * FinHelm.ai - Main Entry Point
 * AI-powered ERP insights for QuickBooks and Sage Intacct with Convex backend
 */

import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config(); // Also load .env if it exists

// Initialize Convex client
const convexUrl = process.env["CONVEX_URL"];
if (!convexUrl) {
  throw new Error("CONVEX_URL environment variable is required. Make sure .env.local exists and contains CONVEX_URL.");
}

const convex = new ConvexHttpClient(convexUrl);

async function main() {
  console.log("🚀 FinHelm.ai Backend Starting...");
  console.log("📊 Convex URL:", process.env["CONVEX_URL"]);
  
  try {
    // Test Convex connection
    console.log("✅ Convex client initialized successfully");
    
    // Add your main application logic here
    console.log("🎯 FinHelm.ai backend is ready for ERP integrations");
    
  } catch (error) {
    console.error("❌ Error starting FinHelm.ai backend:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n🛑 Shutting down FinHelm.ai backend gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n🛑 Shutting down FinHelm.ai backend gracefully...");
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

export { convex };
export default main;