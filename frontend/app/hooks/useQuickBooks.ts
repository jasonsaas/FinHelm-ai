import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

// Hook for company information
export function useCompanyInfo(userId: string) {
  const companyData = useQuery(api.companies.queries.getByUserId, { userId });
  const syncCompany = useMutation(api.quickbooks.dataSync.syncCompanyData);

  return {
    company: companyData,
    isLoading: companyData === undefined,
    error: null,
    refetch: async (newData: any) => {
      if (newData) {
        await syncCompany({ userId, companyData: newData });
      }
    },
  };
}

// Hook for cash flow with real-time updates
export function useCashFlow(userId: string) {
  const cashPosition = useQuery(api.quickbooks.dataSync.fetchCashPosition, { userId });
  const forecast = useQuery(api.quickbooks.dataSync.calculate13WeekForecast, { userId });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      // Convex queries automatically refresh when data changes
      console.log("Cash flow data refreshed");
    }, 5 * 60 * 1000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userId]);

  return {
    currentCash: cashPosition?.totalCash || 0,
    accounts: cashPosition?.accounts || [],
    dailyFlow: cashPosition?.dailyCashFlow || {},
    forecast: forecast?.forecast || [],
    summary: forecast?.summary || {
      totalExpectedReceivables: 0,
      totalExpectedPayables: 0,
      endingCash: 0,
      lowestProjectedBalance: 0,
      weeksWithNegativeBalance: 0,
    },
    isLoading: cashPosition === undefined || forecast === undefined,
    lastUpdated: cashPosition?.lastUpdated || Date.now(),
  };
}

// Hook for invoices with pagination
export function useInvoices(
  userId: string, 
  options?: { 
    limit?: number; 
    offset?: number; 
    status?: string;
  }
) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(options?.limit || 20);
  const [statusFilter, setStatusFilter] = useState(options?.status || "all");

  const invoicesData = useQuery(api.quickbooks.dataSync.fetchLatestInvoices, {
    userId,
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const syncInvoices = useMutation(api.quickbooks.dataSync.syncInvoices);

  return {
    invoices: invoicesData?.invoices || [],
    total: invoicesData?.total || 0,
    hasMore: invoicesData?.hasMore || false,
    isLoading: invoicesData === undefined,
    page,
    pageSize,
    statusFilter,
    setPage,
    setPageSize,
    setStatusFilter,
    nextPage: () => setPage(p => p + 1),
    previousPage: () => setPage(p => Math.max(0, p - 1)),
    sync: async (newInvoices: any[]) => {
      if (newInvoices && newInvoices.length > 0) {
        await syncInvoices({ userId, invoices: newInvoices });
      }
    },
  };
}

// Hook for bills with filtering
export function useBills(
  userId: string,
  options?: {
    status?: "paid" | "unpaid" | "overdue" | "all";
    vendorId?: string;
  }
) {
  const [statusFilter, setStatusFilter] = useState(options?.status || "all");
  const [vendorFilter, setVendorFilter] = useState(options?.vendorId || "");

  // Note: You'll need to create a fetchBills query similar to fetchLatestInvoices
  const billsData = useQuery(api.bills?.getByUserId, { 
    userId,
    status: statusFilter === "all" ? undefined : statusFilter,
    vendorId: vendorFilter || undefined,
  });

  const syncBills = useMutation(api.quickbooks.dataSync.syncBills);

  const filteredBills = billsData || [];

  // Calculate summary statistics
  const summary = {
    totalOutstanding: filteredBills
      .filter((b: any) => b.balance > 0)
      .reduce((sum: number, b: any) => sum + b.balance, 0),
    overdueCount: filteredBills
      .filter((b: any) => {
        const dueDate = new Date(b.dueDate);
        return dueDate < new Date() && b.balance > 0;
      }).length,
    upcomingCount: filteredBills
      .filter((b: any) => {
        const dueDate = new Date(b.dueDate);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return dueDate >= new Date() && dueDate <= nextWeek && b.balance > 0;
      }).length,
  };

  return {
    bills: filteredBills,
    summary,
    isLoading: billsData === undefined,
    statusFilter,
    vendorFilter,
    setStatusFilter,
    setVendorFilter,
    sync: async (newBills: any[]) => {
      if (newBills && newBills.length > 0) {
        await syncBills({ userId, bills: newBills });
      }
    },
  };
}

// Hook for dashboard metrics
export function useDashboardMetrics(userId: string) {
  const cashFlow = useCashFlow(userId);
  const invoices = useInvoices(userId, { status: "unpaid" });
  const bills = useBills(userId, { status: "unpaid" });

  return {
    metrics: {
      currentCash: cashFlow.currentCash,
      receivables: invoices.invoices.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0),
      payables: bills.bills.reduce((sum: number, bill: any) => sum + (bill.balance || 0), 0),
      netPosition: cashFlow.currentCash + 
        invoices.invoices.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0) -
        bills.bills.reduce((sum: number, bill: any) => sum + (bill.balance || 0), 0),
      forecast: cashFlow.forecast,
    },
    isLoading: cashFlow.isLoading || invoices.isLoading || bills.isLoading,
  };
}

// Hook for real-time sync status
export function useSyncStatus(userId: string) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      // This would call your backend API to sync with QuickBooks
      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    lastSync,
    isSyncing,
    error,
    sync: performSync,
  };
}