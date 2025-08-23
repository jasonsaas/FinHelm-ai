/**
 * Sample ERP data inspired by CSV chart of accounts
 * Demonstrates nested account hierarchies and relationships
 * Used for testing and development of FinHelm.ai agents
 */

export interface SampleAccount {
  code: string;
  name: string;
  fullName: string;
  type: string;
  category?: string;
  parentCode?: string;
  level: number;
  path: string[];
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface SampleTransaction {
  id: string;
  type: string;
  accountCode: string;
  description: string;
  amount: number;
  debitAmount?: number;
  creditAmount?: number;
  transactionDate: string;
  customerId?: string;
  vendorId?: string;
  projectId?: string;
  status: string;
}

/**
 * Sample Chart of Accounts - Hierarchical Structure
 * Based on typical SMB landscaping company structure
 */
export const sampleAccounts: SampleAccount[] = [
  // Assets (Level 0)
  {
    code: "1000",
    name: "Assets",
    fullName: "Assets",
    type: "asset",
    level: 0,
    path: ["Assets"],
    balance: 285750.50,
    currency: "USD",
    isActive: true,
  },

  // Current Assets (Level 1)
  {
    code: "1100",
    name: "Current Assets",
    fullName: "Assets:Current Assets",
    type: "asset",
    category: "current",
    parentCode: "1000",
    level: 1,
    path: ["Assets", "Current Assets"],
    balance: 156500.25,
    currency: "USD",
    isActive: true,
  },

  // Bank Accounts (Level 2)
  {
    code: "1110",
    name: "Checking Account",
    fullName: "Assets:Current Assets:Checking Account",
    type: "bank",
    parentCode: "1100",
    level: 2,
    path: ["Assets", "Current Assets", "Checking Account"],
    balance: 45200.75,
    currency: "USD",
    isActive: true,
  },

  {
    code: "1120",
    name: "Savings Account",
    fullName: "Assets:Current Assets:Savings Account",
    type: "bank",
    parentCode: "1100",
    level: 2,
    path: ["Assets", "Current Assets", "Savings Account"],
    balance: 25000.00,
    currency: "USD",
    isActive: true,
  },

  // Accounts Receivable (Level 2)
  {
    code: "1200",
    name: "Accounts Receivable",
    fullName: "Assets:Current Assets:Accounts Receivable",
    type: "accounts_receivable",
    parentCode: "1100",
    level: 2,
    path: ["Assets", "Current Assets", "Accounts Receivable"],
    balance: 86299.50,
    currency: "USD",
    isActive: true,
  },

  // Fixed Assets (Level 1)
  {
    code: "1500",
    name: "Equipment",
    fullName: "Assets:Equipment",
    type: "fixed_asset",
    parentCode: "1000",
    level: 1,
    path: ["Assets", "Equipment"],
    balance: 129250.25,
    currency: "USD",
    isActive: true,
  },

  // Equipment Details (Level 2)
  {
    code: "1510",
    name: "Mowers and Equipment",
    fullName: "Assets:Equipment:Mowers and Equipment",
    type: "fixed_asset",
    category: "machinery",
    parentCode: "1500",
    level: 2,
    path: ["Assets", "Equipment", "Mowers and Equipment"],
    balance: 75000.00,
    currency: "USD",
    isActive: true,
  },

  {
    code: "1520",
    name: "Vehicles",
    fullName: "Assets:Equipment:Vehicles",
    type: "fixed_asset",
    category: "vehicles",
    parentCode: "1500",
    level: 2,
    path: ["Assets", "Equipment", "Vehicles"],
    balance: 54250.25,
    currency: "USD",
    isActive: true,
  },

  // Liabilities (Level 0)
  {
    code: "2000",
    name: "Liabilities",
    fullName: "Liabilities",
    type: "liability",
    level: 0,
    path: ["Liabilities"],
    balance: 42150.75,
    currency: "USD",
    isActive: true,
  },

  // Accounts Payable (Level 1) - Nested structure as mentioned in PRD
  {
    code: "2100",
    name: "Accounts Payable",
    fullName: "Liabilities:Accounts Payable",
    type: "accounts_payable",
    parentCode: "2000",
    level: 1,
    path: ["Liabilities", "Accounts Payable"],
    balance: 28750.50,
    currency: "USD",
    isActive: true,
  },

  // Accounts Payable sub-details (Level 2)
  {
    code: "2110",
    name: "Trade Payables",
    fullName: "Liabilities:Accounts Payable:Trade Payables",
    type: "accounts_payable",
    category: "trade",
    parentCode: "2100",
    level: 2,
    path: ["Liabilities", "Accounts Payable", "Trade Payables"],
    balance: 18450.25,
    currency: "USD",
    isActive: true,
  },

  {
    code: "2120",
    name: "Equipment Financing",
    fullName: "Liabilities:Accounts Payable:Equipment Financing",
    type: "accounts_payable",
    category: "financing",
    parentCode: "2100",
    level: 2,
    path: ["Liabilities", "Accounts Payable", "Equipment Financing"],
    balance: 10300.25,
    currency: "USD",
    isActive: true,
  },

  // Revenue (Level 0)
  {
    code: "4000",
    name: "Revenue",
    fullName: "Revenue",
    type: "revenue",
    level: 0,
    path: ["Revenue"],
    balance: 450000.00,
    currency: "USD",
    isActive: true,
  },

  // Revenue Details (Level 1)
  {
    code: "4100",
    name: "Landscaping Services",
    fullName: "Revenue:Landscaping Services",
    type: "revenue",
    category: "services",
    parentCode: "4000",
    level: 1,
    path: ["Revenue", "Landscaping Services"],
    balance: 325000.00,
    currency: "USD",
    isActive: true,
  },

  {
    code: "4200",
    name: "Maintenance Contracts",
    fullName: "Revenue:Maintenance Contracts",
    type: "revenue",
    category: "contracts",
    parentCode: "4000",
    level: 1,
    path: ["Revenue", "Maintenance Contracts"],
    balance: 125000.00,
    currency: "USD",
    isActive: true,
  },

  // Expenses (Level 0)
  {
    code: "5000",
    name: "Cost of Goods Sold",
    fullName: "Cost of Goods Sold",
    type: "cost_of_goods_sold",
    level: 0,
    path: ["Cost of Goods Sold"],
    balance: 180000.00,
    currency: "USD",
    isActive: true,
  },

  // Job Expenses (Level 1) - As mentioned in PRD sample
  {
    code: "5100",
    name: "Job Expenses",
    fullName: "Cost of Goods Sold:Job Expenses",
    type: "cost_of_goods_sold",
    category: "job_costs",
    parentCode: "5000",
    level: 1,
    path: ["Cost of Goods Sold", "Job Expenses"],
    balance: 125000.00,
    currency: "USD",
    isActive: true,
  },

  // Job Expenses Details (Level 2)
  {
    code: "5110",
    name: "Materials",
    fullName: "Cost of Goods Sold:Job Expenses:Materials",
    type: "cost_of_goods_sold",
    category: "materials",
    parentCode: "5100",
    level: 2,
    path: ["Cost of Goods Sold", "Job Expenses", "Materials"],
    balance: 75000.00,
    currency: "USD",
    isActive: true,
  },

  {
    code: "5120",
    name: "Subcontractors",
    fullName: "Cost of Goods Sold:Job Expenses:Subcontractors",
    type: "cost_of_goods_sold",
    category: "subcontractors",
    parentCode: "5100",
    level: 2,
    path: ["Cost of Goods Sold", "Job Expenses", "Subcontractors"],
    balance: 50000.00,
    currency: "USD",
    isActive: true,
  },

  // Operating Expenses (Level 0)
  {
    code: "6000",
    name: "Operating Expenses",
    fullName: "Operating Expenses",
    type: "expense",
    level: 0,
    path: ["Operating Expenses"],
    balance: 95000.00,
    currency: "USD",
    isActive: true,
  },

  // Operating Expense Details (Level 1)
  {
    code: "6100",
    name: "Payroll Expenses",
    fullName: "Operating Expenses:Payroll Expenses",
    type: "expense",
    category: "payroll",
    parentCode: "6000",
    level: 1,
    path: ["Operating Expenses", "Payroll Expenses"],
    balance: 55000.00,
    currency: "USD",
    isActive: true,
  },

  {
    code: "6200",
    name: "Equipment Maintenance",
    fullName: "Operating Expenses:Equipment Maintenance",
    type: "expense",
    category: "maintenance",
    parentCode: "6000",
    level: 1,
    path: ["Operating Expenses", "Equipment Maintenance"],
    balance: 25000.00,
    currency: "USD",
    isActive: true,
  },

  {
    code: "6300",
    name: "Insurance",
    fullName: "Operating Expenses:Insurance",
    type: "expense",
    category: "insurance",
    parentCode: "6000",
    level: 1,
    path: ["Operating Expenses", "Insurance"],
    balance: 15000.00,
    currency: "USD",
    isActive: true,
  },
];

/**
 * Sample Transactions for Testing Agent Functionality
 */
export const sampleTransactions: SampleTransaction[] = [
  {
    id: "TXN-001",
    type: "invoice",
    accountCode: "4100",
    description: "Landscaping services - Johnson Residence",
    amount: 2500.00,
    debitAmount: 2500.00,
    creditAmount: 0,
    transactionDate: "2024-08-15",
    customerId: "CUST-001",
    projectId: "PROJ-JR-001",
    status: "posted",
  },
  {
    id: "TXN-002",
    type: "bill",
    accountCode: "5110",
    description: "Mulch and soil - Home Depot",
    amount: 450.75,
    debitAmount: 450.75,
    creditAmount: 0,
    transactionDate: "2024-08-16",
    vendorId: "VEND-001",
    status: "posted",
  },
  {
    id: "TXN-003",
    type: "payment",
    accountCode: "1110",
    description: "Customer payment - Johnson Residence",
    amount: 2500.00,
    debitAmount: 2500.00,
    creditAmount: 0,
    transactionDate: "2024-08-20",
    customerId: "CUST-001",
    status: "reconciled",
  },
  {
    id: "TXN-004",
    type: "journal_entry",
    accountCode: "6200",
    description: "Equipment maintenance - Monthly service",
    amount: 850.00,
    debitAmount: 850.00,
    creditAmount: 0,
    transactionDate: "2024-08-22",
    vendorId: "VEND-002",
    status: "posted",
  },
  {
    id: "TXN-005",
    type: "deposit",
    accountCode: "1110",
    description: "Multiple customer payments",
    amount: 8750.50,
    debitAmount: 8750.50,
    creditAmount: 0,
    transactionDate: "2024-08-23",
    status: "posted",
  },
];

/**
 * Mock data for variance analysis testing
 */
export const mockVarianceData = {
  period: {
    current: { start: "2024-08-01", end: "2024-08-31" },
    previous: { start: "2024-07-01", end: "2024-07-31" },
  },
  metrics: {
    revenue: {
      current: 38500.00,
      previous: 42150.00,
      variance: -3650.00,
      variancePercent: -8.66,
    },
    expenses: {
      current: 18750.50,
      previous: 19200.25,
      variance: -449.75,
      variancePercent: -2.34,
    },
    margin: {
      current: 19749.50,
      previous: 22949.75,
      variance: -3200.25,
      variancePercent: -13.94,
    },
  },
  drivers: [
    {
      account: "4100",
      name: "Landscaping Services",
      impact: -2800.00,
      reason: "Seasonal slowdown in August",
    },
    {
      account: "4200", 
      name: "Maintenance Contracts",
      impact: -850.00,
      reason: "Two contract cancellations",
    },
    {
      account: "5110",
      name: "Materials",
      impact: 350.00,
      reason: "Bulk purchase discount achieved",
    },
  ],
};

/**
 * Sample agent configuration templates
 */
export const sampleAgentConfigs = {
  varianceExplanation: {
    prompt: `Analyze the financial variance between current and previous periods. 
    Focus on identifying the key drivers and providing actionable insights for management.
    Consider seasonal trends, customer behavior, and operational efficiency.`,
    model: "grok-4",
    temperature: 0.3,
    dataSource: ["transactions", "accounts", "budget"],
    filters: {
      accounts: ["revenue", "expense", "cost_of_goods_sold"],
      dateRange: { days: 30 },
    },
  },
  
  cashFlowIntelligence: {
    prompt: `Analyze cash flow patterns and predict upcoming liquidity needs. 
    Consider accounts receivable aging, accounts payable terms, and seasonal patterns.
    Recommend actions to optimize working capital.`,
    model: "grok-4",
    temperature: 0.2,
    dataSource: ["transactions", "accounts", "ar_aging", "ap_aging"],
    filters: {
      accounts: ["bank", "accounts_receivable", "accounts_payable"],
      minAmount: 100.00,
    },
  },
  
  anomalyDetection: {
    prompt: `Monitor transaction patterns for anomalies and unusual activities. 
    Flag transactions that deviate significantly from historical patterns.
    Consider transaction timing, amounts, and counterparties.`,
    model: "grok-4",
    temperature: 0.1,
    dataSource: ["transactions"],
    filters: {
      dateRange: { days: 7 },
      minAmount: 500.00,
    },
  },
};