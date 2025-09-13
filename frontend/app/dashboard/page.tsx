'use client'

import { useState, useEffect, Suspense } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Download, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { 
  useDashboardMetrics, 
  useCashFlow, 
  useInvoices, 
  useBills,
  useSyncStatus 
} from '@/app/hooks/useQuickBooks'

// Loading component
const DashboardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

// Demo data generators (for demo mode)
const getDemoData = () => ({
  currentCash: 150000,
  forecast: Array.from({ length: 13 }, (_, i) => ({
    weekNumber: i + 1,
    weekStart: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    expectedReceivables: Math.random() * 20000 + 10000,
    expectedPayables: Math.random() * 15000 + 5000,
    projectedBalance: 150000 + Math.random() * 50000 - 25000,
  })),
  invoices: Array.from({ length: 5 }, (_, i) => ({
    invoiceId: `INV-${1000 + i}`,
    customerName: `Customer ${i + 1}`,
    totalAmt: Math.round(Math.random() * 10000 + 1000),
    balance: Math.round(Math.random() * 5000),
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: Math.random() > 0.5 ? 'Pending' : 'Paid'
  })),
  bills: Array.from({ length: 5 }, (_, i) => ({
    billId: `BILL-${2000 + i}`,
    vendorName: `Vendor ${i + 1}`,
    totalAmt: Math.round(Math.random() * 5000 + 500),
    balance: Math.round(Math.random() * 2500),
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: Math.random() > 0.5 ? 'Pending' : 'Paid'
  }))
})

export default function DashboardPage() {
  const [isDemoMode, setIsDemoMode] = useState(true) // Default to demo mode
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // Use demo mode for now (will integrate with Clerk later)
  const userId = "demo-user"
  
  // Real data hooks (will use demo data when not connected to QuickBooks)
  const dashboardMetrics = isDemoMode ? null : useDashboardMetrics(userId)
  const cashFlow = isDemoMode ? null : useCashFlow(userId)
  const invoices = isDemoMode ? null : useInvoices(userId, { limit: 5 })
  const bills = isDemoMode ? null : useBills(userId)
  const syncStatus = useSyncStatus(userId)
  
  // Demo data
  const demoData = isDemoMode ? getDemoData() : null
  
  // Determine loading state
  const isLoading = !isDemoMode && (
    dashboardMetrics?.isLoading || 
    cashFlow?.isLoading || 
    invoices?.isLoading || 
    bills?.isLoading
  )
  
  // Handle refresh
  const handleRefresh = async () => {
    if (!isDemoMode) {
      await syncStatus.sync()
    }
    setLastRefresh(new Date())
  }
  
  useEffect(() => {
    setLastRefresh(new Date())
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Get data based on mode
  const currentCash = isDemoMode ? (demoData?.currentCash || 0) : (dashboardMetrics?.metrics?.currentCash || 0)
  const receivables = isDemoMode 
    ? (demoData?.invoices.reduce((sum, inv) => sum + inv.balance, 0) || 0) 
    : (dashboardMetrics?.metrics?.receivables || 0)
  const payables = isDemoMode
    ? (demoData?.bills.reduce((sum, bill) => sum + bill.balance, 0) || 0)
    : (dashboardMetrics?.metrics?.payables || 0)
  const forecastData = isDemoMode ? demoData?.forecast : cashFlow?.forecast
  const invoicesList = isDemoMode ? demoData?.invoices : invoices?.invoices
  const billsList = isDemoMode ? demoData?.bills : bills?.bills

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6" data-testid="dashboard-loaded">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">QuickBooks Dashboard</h1>
          <p className="text-gray-600">
            {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsDemoMode(!isDemoMode)}
            title={isDemoMode ? "Switch to Live Data" : "Switch to Demo Mode"}
          >
            {isDemoMode ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            <span className="ml-2">{isDemoMode ? "Demo Mode" : "Live Mode"}</span>
          </Button>
          <Button onClick={handleRefresh} disabled={syncStatus.isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Sync Error Alert */}
      {syncStatus.error && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {syncStatus.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cash Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold cash-position">
              {formatCurrency(currentCash)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(receivables)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(payables)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics?.metrics?.forecast ? '42 days' : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      {forecastData && forecastData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>13-Week Cash Flow Forecast</CardTitle>
            <CardDescription>Projected Cash Position</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekNumber" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="projectedBalance" stroke="#8884d8" name="Projected Balance" />
                <Line type="monotone" dataKey="expectedReceivables" stroke="#82ca9d" name="Expected Receivables" />
                <Line type="monotone" dataKey="expectedPayables" stroke="#ef4444" name="Expected Payables" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Outstanding customer invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesList?.slice(0, 5).map((invoice: any) => (
                  <TableRow key={invoice.invoiceId}>
                    <TableCell>{invoice.invoiceId || invoice.invoiceNumber || '--'}</TableCell>
                    <TableCell>{invoice.customerName || '--'}</TableCell>
                    <TableCell>{formatCurrency(invoice.totalAmt || 0)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        invoice.balance > 0 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {invoice.balance > 0 ? 'Pending' : 'Paid'}
                      </span>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No invoices to display
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>Outstanding vendor bills</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billsList?.slice(0, 5).map((bill: any) => (
                  <TableRow key={bill.billId}>
                    <TableCell>{bill.billId || '--'}</TableCell>
                    <TableCell>{bill.vendorName || '--'}</TableCell>
                    <TableCell>{formatCurrency(bill.totalAmt || 0)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        bill.balance > 0 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {bill.balance > 0 ? 'Pending' : 'Paid'}
                      </span>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No bills to display
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}