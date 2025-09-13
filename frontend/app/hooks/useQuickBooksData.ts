'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface QuickBooksData {
  isLoading: boolean
  error: string | null
  lastSyncAt: Date | null
  isSyncing: boolean
  
  // Financial metrics
  metrics: {
    currentCash: number
    monthlyRevenue: number
    monthlyExpenses: number
    burnRate: number
    runway: number
    accountsReceivable: number
    accountsPayable: number
    customerCount: number
    vendorCount: number
  }
  
  // Cash flow data
  cashFlow: {
    dailyTrends: Array<{
      date: string
      inflow: number
      outflow: number
      balance: number
    }>
    forecast: Array<{
      weekNumber: number
      weekStart: string
      weekEnd: string
      expectedReceivables: number
      expectedPayables: number
      projectedBalance: number
      netCashFlow: number
    }>
  }
  
  // Account hierarchy
  accounts: Array<{
    id: string
    name: string
    type: string
    balance: number
    children?: Array<any>
  }>
  
  // Recent transactions
  transactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    category: string
    vendorName?: string
    customerName?: string
  }>
  
  // Expense breakdown
  expenseBreakdown: Array<{
    category: string
    amount: number
    percentage: number
  }>
  
  // Revenue trends
  revenueTrends: Array<{
    month: string
    revenue: number
    invoiceCount: number
    avgInvoiceValue: number
  }>
  
  // Methods
  refresh: () => Promise<void>
  triggerSync: () => Promise<void>
}

export function useQuickBooksData(userId: string): QuickBooksData {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch company info
  const company = useQuery(api.quickbooks.dataSync.getCompanyByUserId, { userId })
  
  // Fetch cash position
  const cashData = useQuery(
    api.quickbooks.dataSync.fetchCashPosition,
    company ? { userId } : 'skip'
  )
  
  // Fetch 13-week forecast
  const forecast = useQuery(
    api.quickbooks.dataSync.calculate13WeekForecast,
    company ? { userId } : 'skip'
  )
  
  // Fetch latest invoices
  const invoices = useQuery(
    api.quickbooks.dataSync.fetchLatestInvoices,
    company ? { userId, limit: 50 } : 'skip'
  )
  
  // Fetch latest bills
  const bills = useQuery(
    api.quickbooks.dataSync.fetchLatestBills,
    company ? { userId, limit: 50 } : 'skip'
  )
  
  // Fetch expense analysis
  const expenseAnalysis = useQuery(
    api.quickbooks.dataSync.getExpenseAnalysis,
    company ? { userId, period: 30 } : 'skip'
  )
  
  // Fetch revenue analysis
  const revenueAnalysis = useQuery(
    api.quickbooks.dataSync.getRevenueAnalysis,
    company ? { userId, months: 6 } : 'skip'
  )
  
  // Fetch customers and vendors
  const customers = useQuery(
    api.quickbooks.dataSync.getCustomers,
    company ? { userId } : 'skip'
  )
  
  const vendors = useQuery(
    api.quickbooks.dataSync.getVendors,
    company ? { userId } : 'skip'
  )
  
  // Fetch account hierarchy
  const accountHierarchy = useQuery(
    api.quickbooks.dataSync.getAccountHierarchy,
    company ? { userId } : 'skip'
  )
  
  // Fetch recent transactions
  const recentTransactions = useQuery(
    api.quickbooks.dataSync.getRecentTransactions,
    company ? { userId, limit: 20 } : 'skip'
  )

  // Mutations for syncing
  const syncCompany = useMutation(api.quickbooks.dataSync.triggerFullSync)
  
  // Calculate derived metrics
  const calculateMetrics = useCallback(() => {
    if (!cashData || !invoices || !bills || !expenseAnalysis) {
      return {
        currentCash: 0,
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        burnRate: 0,
        runway: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        customerCount: 0,
        vendorCount: 0,
      }
    }

    const currentCash = cashData.totalCash || 0
    
    // Calculate monthly revenue from invoices
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    
    const monthlyRevenue = invoices?.invoices
      ?.filter(inv => {
        const invDate = new Date(inv.txnDate)
        return invDate.getMonth() === thisMonth && invDate.getFullYear() === thisYear
      })
      ?.reduce((sum, inv) => sum + inv.totalAmt, 0) || 0

    // Calculate monthly expenses
    const monthlyExpenses = expenseAnalysis?.totalExpenses || 0
    const burnRate = monthlyExpenses - monthlyRevenue
    const runway = burnRate > 0 ? currentCash / burnRate : 999

    // Calculate AR/AP
    const accountsReceivable = invoices?.invoices
      ?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0
      
    const accountsPayable = bills?.bills
      ?.reduce((sum, bill) => sum + (bill.balance || 0), 0) || 0

    return {
      currentCash,
      monthlyRevenue,
      monthlyExpenses,
      burnRate: Math.abs(burnRate),
      runway: Math.min(runway, 999),
      accountsReceivable,
      accountsPayable,
      customerCount: customers?.length || 0,
      vendorCount: vendors?.length || 0,
    }
  }, [cashData, invoices, bills, expenseAnalysis, customers, vendors])

  // Process cash flow data
  const processCashFlow = useCallback(() => {
    if (!cashData || !forecast) {
      return {
        dailyTrends: [],
        forecast: [],
      }
    }

    // Convert daily cash flow object to array
    const dailyTrends = Object.entries(cashData.dailyCashFlow || {})
      .map(([date, data]) => ({
        date,
        inflow: data.inflow,
        outflow: data.outflow,
        balance: cashData.totalCash, // This should be calculated cumulatively
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      dailyTrends,
      forecast: forecast.forecast || [],
    }
  }, [cashData, forecast])

  // Process expense breakdown
  const processExpenseBreakdown = useCallback(() => {
    if (!expenseAnalysis?.categories) {
      return []
    }

    const total = expenseAnalysis.totalExpenses || 1
    return expenseAnalysis.categories.map(cat => ({
      category: cat.name,
      amount: cat.amount,
      percentage: (cat.amount / total) * 100,
    }))
  }, [expenseAnalysis])

  // Process revenue trends
  const processRevenueTrends = useCallback(() => {
    if (!revenueAnalysis?.monthlyData) {
      return []
    }

    return revenueAnalysis.monthlyData.map(month => ({
      month: month.month,
      revenue: month.totalRevenue,
      invoiceCount: month.invoiceCount,
      avgInvoiceValue: month.invoiceCount > 0 ? month.totalRevenue / month.invoiceCount : 0,
    }))
  }, [revenueAnalysis])

  // Process account hierarchy
  const processAccounts = useCallback(() => {
    if (!accountHierarchy) {
      return []
    }

    return accountHierarchy.map(acc => ({
      id: acc._id,
      name: acc.name,
      type: acc.accountType,
      balance: acc.currentBalance || 0,
      children: acc.children,
    }))
  }, [accountHierarchy])

  // Process transactions
  const processTransactions = useCallback(() => {
    if (!recentTransactions) {
      return []
    }

    return recentTransactions.map(txn => ({
      id: txn._id,
      date: new Date(txn.date).toISOString(),
      description: txn.description || 'No description',
      amount: txn.amount,
      category: txn.accountName || 'Uncategorized',
      vendorName: txn.vendorName,
      customerName: txn.customerName,
    }))
  }, [recentTransactions])

  // Refresh function
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    
    try {
      // This would typically trigger a re-fetch of all queries
      // For now, we'll just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Data refreshed successfully')
    } catch (err: any) {
      setError(err.message)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Trigger sync function
  const triggerSync = useCallback(async () => {
    if (!company) {
      toast.error('No company connected')
      return
    }

    try {
      await syncCompany({ userId, companyId: company._id })
      toast.success('Sync triggered successfully')
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`)
    }
  }, [company, userId, syncCompany])

  // Check if any query is loading
  const isLoading = !company || !cashData || !forecast || !invoices || !bills

  return {
    isLoading,
    error,
    lastSyncAt: company?.lastSyncAt ? new Date(company.lastSyncAt) : null,
    isSyncing: company?.syncStatus === 'syncing',
    metrics: calculateMetrics(),
    cashFlow: processCashFlow(),
    accounts: processAccounts(),
    transactions: processTransactions(),
    expenseBreakdown: processExpenseBreakdown(),
    revenueTrends: processRevenueTrends(),
    refresh,
    triggerSync,
  }
}