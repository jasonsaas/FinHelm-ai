'use client'

import { useState, useEffect } from 'react'
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
import { RefreshCw, Download } from 'lucide-react'
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

// Mock data generators
const getMockCashFlowData = () => ({
  currentCash: 150000,
  forecast: Array.from({ length: 13 }, (_, i) => ({
    week: `Week ${i + 1}`,
    projected: 150000 + Math.random() * 50000 - 25000,
    actual: i < 4 ? 150000 + Math.random() * 30000 - 15000 : null
  })),
  metrics: {
    dso: 42,
    dpo: 38,
    workingCapital: 125000
  }
})

const getMockInvoicesData = () => ({
  invoices: Array.from({ length: 5 }, (_, i) => ({
    id: `INV-${1000 + i}`,
    customer: `Customer ${i + 1}`,
    amount: Math.round(Math.random() * 10000 + 1000),
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: Math.random() > 0.5 ? 'Pending' : 'Paid'
  })),
  totalPending: 45000,
  totalOverdue: 12000
})

const getMockBillsData = () => ({
  bills: Array.from({ length: 5 }, (_, i) => ({
    id: `BILL-${2000 + i}`,
    vendor: `Vendor ${i + 1}`,
    amount: Math.round(Math.random() * 5000 + 500),
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: Math.random() > 0.5 ? 'Pending' : 'Paid'
  })),
  totalPending: 28000,
  totalOverdue: 5000
})

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [cashFlowData, setCashFlowData] = useState<any>(null)
  const [invoicesData, setInvoicesData] = useState<any>(null)
  const [billsData, setBillsData] = useState<any>(null)

  // Fetch mock data
  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setCashFlowData(getMockCashFlowData())
      setInvoicesData(getMockInvoicesData())
      setBillsData(getMockBillsData())
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">QuickBooks Dashboard</h1>
          <p className="text-gray-600">
            {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cash Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cashFlowData ? formatCurrency(cashFlowData.currentCash) : '--'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoicesData ? formatCurrency(invoicesData.totalPending) : '--'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billsData ? formatCurrency(billsData.totalPending) : '--'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DSO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cashFlowData ? `${cashFlowData.metrics.dso} days` : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      {cashFlowData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>13-Week Cash Flow Forecast</CardTitle>
            <CardDescription>Projected vs Actual Cash Position</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData.forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="projected" stroke="#8884d8" />
                <Line type="monotone" dataKey="actual" stroke="#82ca9d" />
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
                {invoicesData?.invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.id}</TableCell>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        invoice.status === 'Pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
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
                {billsData?.bills.map((bill: any) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.id}</TableCell>
                    <TableCell>{bill.vendor}</TableCell>
                    <TableCell>{formatCurrency(bill.amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        bill.status === 'Pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {bill.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}