import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";

export function useLiveQuickBooksData(companyId: Id<"companies"> | undefined) {
  const data = useQuery(
    api.queries.getLiveQuickBooksData, 
    companyId ? { companyId } : "skip"
  );

  return {
    company: data?.company,
    accounts: data?.accounts || [],
    invoices: data?.invoices || [],
    customers: data?.customers || [],
    bills: data?.bills || [],
    vendors: data?.vendors || [],
    transactions: data?.transactions || [],
    lastSyncAt: data?.lastSyncAt,
    syncStatus: data?.syncStatus,
    isLoading: !companyId || data === undefined,
    error: null,
  };
}

export function useDashboardMetrics(companyId: Id<"companies"> | undefined) {
  const data = useQuery(
    api.queries.getDashboardMetrics,
    companyId ? { companyId } : "skip"
  );

  return {
    metrics: data?.metrics || {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      totalCash: 0,
      accountsReceivable: 0,
      accountsPayable: 0,
      invoiceCount: 0,
      billCount: 0,
      accountCount: 0,
    },
    recentAnomalies: data?.recentAnomalies || [],
    lastSyncAt: data?.lastSyncAt,
    syncStatus: data?.syncStatus,
    isLoading: !companyId || data === undefined,
    error: null,
  };
}

export function useRecentTransactions(
  companyId: Id<"companies"> | undefined,
  limit?: number
) {
  const transactions = useQuery(
    api.queries.getRecentTransactions,
    companyId ? { companyId, limit } : "skip"
  );

  return {
    transactions: transactions || [],
    isLoading: !companyId || transactions === undefined,
    error: null,
  };
}

export function useAccountDetails(accountId: Id<"accounts"> | undefined) {
  const data = useQuery(
    api.queries.getAccountDetails,
    accountId ? { accountId } : "skip"
  );

  return {
    account: data?.account,
    transactions: data?.transactions || [],
    childAccounts: data?.childAccounts || [],
    isLoading: !accountId || data === undefined,
    error: null,
  };
}

export function useCompanyList(userId: string | undefined) {
  const companies = useQuery(
    api.queries.getCompanyList,
    userId ? { userId } : "skip"
  );

  return {
    companies: companies || [],
    isLoading: !userId || companies === undefined,
    error: null,
  };
}

export function useSyncStatus(companyId: Id<"companies"> | undefined) {
  const data = useQuery(
    api.queries.getSyncStatus,
    companyId ? { companyId } : "skip"
  );

  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAutoRefreshEnabled && companyId) {
      const interval = setInterval(() => {
        console.log("Sync status auto-refreshed");
      }, 30 * 1000);

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isAutoRefreshEnabled, companyId]);

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => !prev);
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [refreshInterval]);

  return {
    syncStatus: data?.syncStatus || "disconnected",
    lastSyncAt: data?.lastSyncAt,
    recentLogs: data?.recentLogs || [],
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    isLoading: !companyId || data === undefined,
    error: null,
  };
}

export function useCashFlow(companyId: Id<"companies"> | undefined) {
  const metrics = useQuery(
    api.queries.getDashboardMetrics,
    companyId ? { companyId } : "skip"
  );

  const accounts = useQuery(
    api.queries.getLiveQuickBooksData,
    companyId ? { companyId } : "skip"
  );

  const bankAccounts = accounts?.accounts?.filter(
    acc => acc.accountType === "Bank"
  ) || [];

  const forecast = calculateForecast(
    metrics?.metrics || {},
    accounts?.invoices || [],
    accounts?.bills || []
  );

  return {
    currentCash: metrics?.metrics?.totalCash || 0,
    accounts: bankAccounts,
    dailyFlow: calculateDailyFlow(accounts?.transactions || []),
    forecast: forecast.weeks,
    summary: forecast.summary,
    isLoading: !companyId || metrics === undefined || accounts === undefined,
    lastUpdated: Date.now(),
  };
}

function calculateDailyFlow(transactions: any[]) {
  const dailyFlow: Record<string, { inflow: number; outflow: number }> = {};
  
  transactions.forEach(txn => {
    if (!txn.txnDate) return;
    
    const date = new Date(txn.txnDate).toISOString().split('T')[0];
    if (!dailyFlow[date]) {
      dailyFlow[date] = { inflow: 0, outflow: 0 };
    }
    
    if (txn.amount > 0) {
      dailyFlow[date].inflow += txn.amount;
    } else {
      dailyFlow[date].outflow += Math.abs(txn.amount);
    }
  });
  
  return dailyFlow;
}

function calculateForecast(metrics: any, invoices: any[], bills: any[]) {
  const weeks = [];
  const startingCash = metrics.totalCash || 0;
  let runningBalance = startingCash;
  let lowestBalance = startingCash;
  let weeksWithNegative = 0;

  for (let i = 0; i < 13; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekInvoices = invoices.filter(inv => {
      const dueDate = inv.dueDate || inv.txnDate;
      return dueDate >= weekStart.getTime() && dueDate < weekEnd.getTime();
    });

    const weekBills = bills.filter(bill => {
      const dueDate = bill.dueDate || bill.txnDate;
      return dueDate >= weekStart.getTime() && dueDate < weekEnd.getTime();
    });

    const expectedReceivables = weekInvoices.reduce(
      (sum, inv) => sum + (inv.balance || 0), 
      0
    );
    const expectedPayables = weekBills.reduce(
      (sum, bill) => sum + (bill.balance || 0), 
      0
    );

    runningBalance = runningBalance + expectedReceivables - expectedPayables;
    
    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance;
    }
    
    if (runningBalance < 0) {
      weeksWithNegative++;
    }

    weeks.push({
      weekNumber: i + 1,
      weekStart: weekStart.toISOString(),
      expectedReceivables,
      expectedPayables,
      netCashFlow: expectedReceivables - expectedPayables,
      projectedBalance: runningBalance,
    });
  }

  const totalExpectedReceivables = weeks.reduce(
    (sum, week) => sum + week.expectedReceivables, 
    0
  );
  const totalExpectedPayables = weeks.reduce(
    (sum, week) => sum + week.expectedPayables, 
    0
  );

  return {
    weeks,
    summary: {
      totalExpectedReceivables,
      totalExpectedPayables,
      endingCash: runningBalance,
      lowestProjectedBalance: lowestBalance,
      weeksWithNegativeBalance: weeksWithNegative,
    },
  };
}

export function useWebhookSync(companyId: Id<"companies"> | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const triggerSync = useCallback(async (syncType: string = "full_sync") => {
    if (!companyId) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/webhooks/quickbooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-n8n-signature": process.env.NEXT_PUBLIC_N8N_WEBHOOK_SECRET || "",
        },
        body: JSON.stringify({
          type: syncType,
          companyId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Sync completed:", result);
    } catch (error) {
      console.error("Sync error:", error);
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [companyId]);

  return {
    triggerSync,
    isSyncing,
    syncError,
  };
}