/**
 * Utility functions for FinHelm.ai Convex operations
 * Includes account hierarchy management and data reconciliation helpers
 */

import { Id } from "./_generated/dataModel";

/**
 * Account hierarchy helper functions
 */
export interface AccountHierarchy {
  id: Id<"accounts">;
  code: string;
  name: string;
  fullName: string;
  type: string;
  level: number;
  balance: number;
  children: AccountHierarchy[];
  parent?: AccountHierarchy;
}

/**
 * Account data interface for type safety
 */
export interface AccountData {
  _id: string;
  code: string;
  name: string;
  fullName: string;
  type: string;
  level: number;
  balance?: number;
  parentId?: string;
}

/**
 * Build account hierarchy tree from flat account list
 */
export function buildAccountHierarchy(accounts: AccountData[]): AccountHierarchy[] {
  const accountMap = new Map<string, AccountHierarchy>();
  const rootAccounts: AccountHierarchy[] = [];

  // First pass: create all accounts
  accounts.forEach(account => {
    accountMap.set(account._id, {
      id: account._id,
      code: account.code,
      name: account.name,
      fullName: account.fullName,
      type: account.type,
      level: account.level,
      balance: account.balance ?? 0, // Nullish coalescing for strict null checks
      children: [],
    });
  });

  // Second pass: build relationships
  accounts.forEach(account => {
    const currentAccount = accountMap.get(account._id);
    if (!currentAccount) return;

    if (account.parentId) {
      const parentAccount = accountMap.get(account.parentId);
      if (parentAccount) {
        parentAccount.children.push(currentAccount);
        currentAccount.parent = parentAccount;
      }
    } else {
      rootAccounts.push(currentAccount);
    }
  });

  return rootAccounts;
}

/**
 * Calculate total balance for account including all children
 */
export function calculateTotalBalance(account: AccountHierarchy): number {
  let total = account.balance;
  
  account.children.forEach(child => {
    total += calculateTotalBalance(child);
  });
  
  return total;
}

/**
 * Find account by code in hierarchy
 */
export function findAccountByCode(accounts: AccountHierarchy[], code: string): AccountHierarchy | null {
  for (const account of accounts) {
    if (account.code === code) {
      return account;
    }
    
    const found = findAccountByCode(account.children, code);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Get all descendant accounts (flattened)
 */
export function getDescendantAccounts(account: AccountHierarchy): AccountHierarchy[] {
  const descendants: AccountHierarchy[] = [];
  
  account.children.forEach(child => {
    descendants.push(child);
    descendants.push(...getDescendantAccounts(child));
  });
  
  return descendants;
}

/**
 * Get path to root account
 */
export function getAccountPath(account: AccountHierarchy): string[] {
  const path: string[] = [account.name];
  
  let current = account.parent;
  while (current) {
    path.unshift(current.name);
    current = current.parent;
  }
  
  return path;
}

/**
 * Data reconciliation helpers
 */

/**
 * Fuzzy string matching for account reconciliation
 * Inspired by Oracle Document IO intelligent matching
 */
export function fuzzyMatchScore(str1: string, str2: string): number {
  const normalize = (str: string) => 
    str.toLowerCase()
       .replace(/[^\w\s]/g, '')
       .replace(/\s+/g, ' ')
       .trim();

  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1.0;

  // Levenshtein distance - optimized matrix initialization
  const len1 = s1.length;
  const len2 = s2.length;
  
  // Pre-allocate the entire matrix with proper dimensions
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map((_, i) => {
      const row = Array(len2 + 1).fill(0);
      row[0] = i; // Initialize first column
      return row;
    });
  
  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,      // deletion
        matrix[i]![j - 1]! + 1,      // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : (maxLen - matrix[len1]![len2]!) / maxLen;
}

/**
 * Find best matching accounts for reconciliation
 */
export function findBestAccountMatches(
  sourceAccounts: { code: string; name: string }[],
  targetAccounts: { code: string; name: string }[],
  threshold = 0.7
): Array<{
  source: { code: string; name: string };
  target: { code: string; name: string };
  score: number;
}> {
  const matches: Array<{
    source: { code: string; name: string };
    target: { code: string; name: string };
    score: number;
  }> = [];

  for (const source of sourceAccounts) {
    let bestMatch: { target: { code: string; name: string }; score: number } | null = null;

    for (const target of targetAccounts) {
      // Try matching by code first
      let score = fuzzyMatchScore(source.code, target.code);
      
      // If code match is poor, try name matching
      if (score < 0.8) {
        const nameScore = fuzzyMatchScore(source.name, target.name);
        score = Math.max(score * 0.3, nameScore * 0.7); // Weight name higher if code doesn't match
      }

      if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { target, score };
      }
    }

    if (bestMatch) {
      matches.push({
        source,
        target: bestMatch.target,
        score: bestMatch.score,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Normalize currency amounts for comparison
 */
export function normalizeAmount(amount: number, fromCurrency: string, toCurrency: string, exchangeRate = 1.0): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  return amount * exchangeRate;
}

/**
 * Transaction interface for type safety
 */
export interface Transaction {
  id: string;
  accountCode: string;
  amount: number;
  transactionDate: number;
  type: string;
}

/**
 * Historical data interface for type safety
 */
export interface HistoricalData {
  accountCode: string;
  avgAmount: number;
  stdDev: number;
  frequency: number;
}

/**
 * Detect potential anomalies in transaction data
 */
export interface AnomalyDetectionResult {
  transactionId: string;
  anomalyType: 'amount' | 'timing' | 'frequency' | 'pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
}

/**
 * Optimized transaction anomaly detection
 */
export function detectTransactionAnomalies(
  transactions: Transaction[],
  historicalData?: HistoricalData[]
): AnomalyDetectionResult[] {
  const anomalies: AnomalyDetectionResult[] = [];

  // Group transactions by account for pattern analysis
  const accountGroups = new Map<string, Transaction[]>();
  
  // Pre-allocate arrays for better performance
  for (const txn of transactions) {
    if (!accountGroups.has(txn.accountCode)) {
      accountGroups.set(txn.accountCode, []);
    }
    const group = accountGroups.get(txn.accountCode);
    if (group) {
      group.push(txn);
    }
  }

  // Detect amount anomalies
  accountGroups.forEach((txns, accountCode) => {
    // Use historical data if available
    const historicalStats = historicalData?.find(h => h.accountCode === accountCode);
    
    // Calculate statistics only if historical data is not available
    if (!historicalStats) {
      const amounts = txns.map(t => Math.abs(t.amount));
      
      // Calculate mean in a single pass
      let sum = 0;
      for (const amount of amounts) {
        sum += amount;
      }
      const mean = sum / amounts.length;
      
      // Calculate standard deviation in a single pass
      let sumSquaredDiff = 0;
      for (const amount of amounts) {
        sumSquaredDiff += Math.pow(amount - mean, 2);
      }
      const stdDev = Math.sqrt(sumSquaredDiff / amounts.length) || 1; // Avoid division by zero
      
      // Check each transaction for anomalies
      for (const txn of txns) {
        const zScore = Math.abs((Math.abs(txn.amount) - mean) / stdDev);
        
        if (zScore > 3) { // More than 3 standard deviations
          anomalies.push({
            transactionId: txn.id,
            anomalyType: 'amount',
            severity: zScore > 5 ? 'high' : 'medium',
            description: `Transaction amount ${txn.amount} is ${zScore.toFixed(1)} standard deviations from normal for account ${accountCode}`,
            confidence: Math.min(0.95, zScore / 5),
          });
        }
      }
    } else {
      // Use historical data for comparison
      for (const txn of txns) {
        const zScore = Math.abs((Math.abs(txn.amount) - historicalStats.avgAmount) / 
                               (historicalStats.stdDev || 1)); // Avoid division by zero
        
        if (zScore > 3) {
          anomalies.push({
            transactionId: txn.id,
            anomalyType: 'amount',
            severity: zScore > 5 ? 'high' : 'medium',
            description: `Transaction amount ${txn.amount} is ${zScore.toFixed(1)} standard deviations from historical average for account ${accountCode}`,
            confidence: Math.min(0.95, zScore / 5),
          });
        }
      }
    }
  });

  return anomalies.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate financial ratios for analysis
 */
export interface FinancialRatios {
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  grossMargin: number;
  netMargin: number;
}

/**
 * Financial balances interface for type safety
 */
export interface FinancialBalances {
  currentAssets: number;
  currentLiabilities: number;
  totalDebt: number;
  totalEquity: number;
  revenue: number;
  costOfGoodsSold: number;
  netIncome: number;
}

/**
 * Calculate financial ratios with null safety
 */
export function calculateFinancialRatios(balances: FinancialBalances): FinancialRatios {
  return {
    currentRatio: balances.currentLiabilities !== 0 ? balances.currentAssets / balances.currentLiabilities : 0,
    quickRatio: balances.currentLiabilities !== 0 ? (balances.currentAssets * 0.8) / balances.currentLiabilities : 0, // Simplified
    debtToEquity: balances.totalEquity !== 0 ? balances.totalDebt / balances.totalEquity : 0,
    grossMargin: balances.revenue !== 0 ? (balances.revenue - balances.costOfGoodsSold) / balances.revenue : 0,
    netMargin: balances.revenue !== 0 ? balances.netIncome / balances.revenue : 0,
  };
}

/**
 * Date and time utilities
 */
export function getDateRange(period: 'week' | 'month' | 'quarter' | 'year', offset = 0): { start: number; end: number } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'week':
      start.setDate(now.getDate() - (7 * (offset + 1)) + 1);
      end.setDate(now.getDate() - (7 * offset));
      break;
    case 'month':
      start.setMonth(now.getMonth() - offset - 1, 1);
      end.setMonth(now.getMonth() - offset, 0);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3 - (offset + 1) * 3;
      start.setMonth(quarterStart, 1);
      end.setMonth(quarterStart + 3, 0);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - offset - 1, 0, 1);
      end.setFullYear(now.getFullYear() - offset, 11, 31);
      break;
  }

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}