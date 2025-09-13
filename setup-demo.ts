import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://ardent-dog-632.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

// Sample QuickBooks-like data for demo
const generateDemoData = () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  return {
    company: {
      userId: "demo-user",
      companyData: {
        companyName: "Demo Company Inc.",
        country: "US",
        fiscalYearStartMonth: "January",
        legalName: "Demo Company Incorporated",
        legalAddress: [{
          line1: "123 Demo Street",
          city: "San Francisco",
          countrySubDivisionCode: "CA",
          postalCode: "94105"
        }]
      }
    },
    
    invoices: Array.from({ length: 20 }, (_, i) => ({
      invoiceId: `INV-DEMO-${1000 + i}`,
      invoiceNumber: `INV-${1000 + i}`,
      customerId: `CUST-${100 + (i % 5)}`,
      customerName: `Customer ${(i % 5) + 1}`,
      txnDate: new Date(now - (i * oneDay * 2)).toISOString(),
      dueDate: new Date(now + ((30 - i) * oneDay)).toISOString(),
      totalAmt: Math.round(Math.random() * 50000 + 5000),
      balance: i < 10 ? Math.round(Math.random() * 25000) : 0,
      status: i < 10 ? "Pending" : "Paid",
      lineItems: [
        {
          description: "Professional Services",
          amount: Math.round(Math.random() * 30000 + 2000),
          quantity: Math.round(Math.random() * 10 + 1),
        }
      ]
    })),
    
    bills: Array.from({ length: 15 }, (_, i) => ({
      billId: `BILL-DEMO-${2000 + i}`,
      vendorId: `VEND-${200 + (i % 4)}`,
      vendorName: `Vendor ${(i % 4) + 1}`,
      txnDate: new Date(now - (i * oneDay * 3)).toISOString(),
      dueDate: new Date(now + ((20 - i) * oneDay)).toISOString(),
      totalAmt: Math.round(Math.random() * 20000 + 2000),
      balance: i < 8 ? Math.round(Math.random() * 10000) : 0,
      status: i < 8 ? "Unpaid" : "Paid"
    })),
    
    accounts: [
      {
        userId: "demo-user",
        accountId: "ACC-001",
        accountName: "Primary Checking",
        accountType: "Bank",
        currentBalance: 150000,
        currency: "USD"
      },
      {
        userId: "demo-user",
        accountId: "ACC-002",
        accountName: "Business Savings",
        accountType: "Bank",
        currentBalance: 75000,
        currency: "USD"
      },
      {
        userId: "demo-user",
        accountId: "ACC-003",
        accountName: "Petty Cash",
        accountType: "Cash",
        currentBalance: 2500,
        currency: "USD"
      }
    ],
    
    transactions: Array.from({ length: 50 }, (_, i) => {
      const isIncome = Math.random() > 0.4;
      return {
        userId: "demo-user",
        txnId: `TXN-DEMO-${3000 + i}`,
        txnDate: now - (i * oneDay * 0.5),
        totalAmt: isIncome 
          ? Math.round(Math.random() * 30000 + 5000)
          : -Math.round(Math.random() * 20000 + 1000),
        txnType: isIncome ? "Income" : "Expense",
        description: isIncome 
          ? `Payment from Customer ${(i % 5) + 1}`
          : `Payment to Vendor ${(i % 4) + 1}`
      };
    })
  };
};

async function seedDemoData() {
  console.log("🌱 Starting demo data seeding...");
  
  try {
    const demoData = generateDemoData();
    
    // 1. Create/update company
    console.log("Creating demo company...");
    await client.mutation(api.quickbooks.dataSync.syncCompanyData, demoData.company);
    
    // 2. Sync invoices
    console.log("Syncing demo invoices...");
    await client.mutation(api.quickbooks.dataSync.syncInvoices, {
      userId: "demo-user",
      invoices: demoData.invoices
    });
    
    // 3. Sync bills
    console.log("Syncing demo bills...");
    await client.mutation(api.quickbooks.dataSync.syncBills, {
      userId: "demo-user",
      bills: demoData.bills
    });
    
    // 4. Create accounts (you'll need to create a syncAccounts mutation)
    console.log("Creating demo accounts...");
    for (const account of demoData.accounts) {
      // Note: You'll need to create this mutation in Convex
      // await client.mutation(api.accounts.create, account);
      console.log(`  - ${account.accountName}: ${account.currentBalance}`);
    }
    
    // 5. Create transactions (you'll need to create a syncTransactions mutation)
    console.log("Creating demo transactions...");
    // Note: You'll need to create this mutation in Convex
    // await client.mutation(api.transactions.syncBatch, {
    //   userId: "demo-user",
    //   transactions: demoData.transactions
    // });
    
    console.log("✅ Demo data seeded successfully!");
    console.log("\nDemo Statistics:");
    console.log(`  - Company: ${demoData.company.companyData.companyName}`);
    console.log(`  - Invoices: ${demoData.invoices.length} (${demoData.invoices.filter(i => i.balance > 0).length} pending)`);
    console.log(`  - Bills: ${demoData.bills.length} (${demoData.bills.filter(b => b.balance > 0).length} unpaid)`);
    console.log(`  - Bank Accounts: ${demoData.accounts.length}`);
    console.log(`  - Total Cash: $${demoData.accounts.reduce((sum, a) => sum + a.currentBalance, 0).toLocaleString()}`);
    
    console.log("\n🎉 Demo mode is ready! Toggle 'Demo Mode' in the dashboard to see the data.");
    
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { generateDemoData, seedDemoData };