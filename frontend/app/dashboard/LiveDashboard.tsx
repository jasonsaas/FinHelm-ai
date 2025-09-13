'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Activity,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  useLiveQuickBooksData,
  useDashboardMetrics,
  useRecentTransactions,
  useCashFlow,
  useSyncStatus,
  useCompanyList,
  useWebhookSync
} from '@/app/hooks/useLiveQuickBooks'
import { Id } from '@/convex/_generated/dataModel'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SyncStatusBadge({ status, lastSyncAt }: { status: string; lastSyncAt?: number }) {
  const statusConfig = {
    connected: { color: 'bg-green-500', icon: CheckCircle, text: 'Connected' },
    syncing: { color: 'bg-blue-500', icon: RefreshCw, text: 'Syncing...' },
    error: { color: 'bg-red-500', icon: XCircle, text: 'Error' },
    disconnected: { color: 'bg-gray-500', icon: XCircle, text: 'Disconnected' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
      {lastSyncAt && (
        <span className="text-sm text-gray-500">
          Last sync: {formatTime(lastSyncAt)}
        </span>
      )}
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon,
  format = 'currency' 
}: { 
  title: string; 
  value: number; 
  change?: number; 
  icon: any;
  format?: 'currency' | 'number' | 'percent';
}) {
  const formattedValue = format === 'currency' 
    ? formatCurrency(value)
    : format === 'percent'
    ? `${value.toFixed(1)}%`
    : value.toLocaleString();

  const isPositive = change && change > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LiveDashboard() {
  const { userId } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"companies"> | undefined>();
  
  const { companies } = useCompanyList(userId || undefined);
  const { 
    accounts, 
    invoices, 
    customers, 
    bills, 
    vendors,
    transactions,
    syncStatus: dataStatus,
    lastSyncAt: dataLastSync
  } = useLiveQuickBooksData(selectedCompanyId);
  
  const { 
    metrics, 
    recentAnomalies 
  } = useDashboardMetrics(selectedCompanyId);
  
  const { 
    currentCash,
    forecast,
    summary: cashFlowSummary
  } = useCashFlow(selectedCompanyId);
  
  const { 
    syncStatus, 
    lastSyncAt,
    isAutoRefreshEnabled,
    toggleAutoRefresh
  } = useSyncStatus(selectedCompanyId);
  
  const { 
    triggerSync, 
    isSyncing, 
    syncError 
  } = useWebhookSync(selectedCompanyId);

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id);
    }
  }, [companies, selectedCompanyId]);

  const cashFlowData = forecast.map((week, index) => ({
    week: `Week ${week.weekNumber}`,
    receivables: week.expectedReceivables,
    payables: week.expectedPayables,
    balance: week.projectedBalance,
  }));

  const accountTypeDistribution = accounts.reduce((acc, account) => {
    const type = account.accountType || 'Other';
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += Math.abs(account.currentBalance || 0);
    } else {
      acc.push({ name: type, value: Math.abs(account.currentBalance || 0) });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const recentInvoices = invoices.slice(0, 5);
  const recentBills = bills.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live Dashboard</h1>
          <p className="text-gray-600">Real-time financial insights</p>
        </div>
        
        <div className="flex items-center gap-4">
          <SyncStatusBadge status={syncStatus} lastSyncAt={lastSyncAt} />
          
          <Button
            onClick={() => triggerSync('full_sync')}
            disabled={isSyncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          <Button
            onClick={toggleAutoRefresh}
            variant="outline"
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh: {isAutoRefreshEnabled ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {syncError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      )}

      {companies.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {companies.map(company => (
                <Button
                  key={company._id}
                  variant={selectedCompanyId === company._id ? 'default' : 'outline'}
                  onClick={() => setSelectedCompanyId(company._id)}
                >
                  {company.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue (30d)"
          value={metrics.totalRevenue}
          change={12.5}
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Expenses (30d)"
          value={metrics.totalExpenses}
          change={-8.3}
          icon={TrendingDown}
        />
        <MetricCard
          title="Net Income"
          value={metrics.netIncome}
          change={24.1}
          icon={DollarSign}
        />
        <MetricCard
          title="Cash Position"
          value={currentCash}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Accounts Receivable"
          value={metrics.accountsReceivable}
          icon={Users}
        />
        <MetricCard
          title="Accounts Payable"
          value={metrics.accountsPayable}
          icon={FileText}
        />
        <MetricCard
          title="Working Capital"
          value={metrics.accountsReceivable - metrics.accountsPayable}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>13-Week Cash Flow Forecast</CardTitle>
            <CardDescription>
              Projected cash position based on receivables and payables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Projected Balance"
                />
                <Line 
                  type="monotone" 
                  dataKey="receivables" 
                  stroke="#3b82f6" 
                  strokeDasharray="5 5"
                  name="Expected Receivables"
                />
                <Line 
                  type="monotone" 
                  dataKey="payables" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  name="Expected Payables"
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Ending Cash:</span>
                  <span className="ml-2 font-semibold">
                    {formatCurrency(cashFlowSummary.endingCash)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Lowest Point:</span>
                  <span className={`ml-2 font-semibold ${
                    cashFlowSummary.lowestProjectedBalance < 0 ? 'text-red-600' : ''
                  }`}>
                    {formatCurrency(cashFlowSummary.lowestProjectedBalance)}
                  </span>
                </div>
              </div>
              {cashFlowSummary.weeksWithNegativeBalance > 0 && (
                <Alert className="mt-2" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {cashFlowSummary.weeksWithNegativeBalance} weeks with projected negative balance
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Distribution</CardTitle>
            <CardDescription>
              Balance distribution across account types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={accountTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {accountTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
          <TabsTrigger value="bills">Recent Bills</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Latest customer invoices ({invoices.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-medium">
                        {invoice.docNumber}
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{formatDate(invoice.txnDate)}</TableCell>
                      <TableCell>
                        {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(invoice.balance)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' :
                          invoice.status === 'overdue' ? 'destructive' :
                          'secondary'
                        }>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>
                Latest vendor bills ({bills.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBills.map((bill) => (
                    <TableRow key={bill._id}>
                      <TableCell className="font-medium">
                        {bill.docNumber || 'N/A'}
                      </TableCell>
                      <TableCell>{bill.vendorName}</TableCell>
                      <TableCell>{formatDate(bill.txnDate)}</TableCell>
                      <TableCell>
                        {bill.dueDate ? formatDate(bill.dueDate) : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(bill.balance)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          bill.status === 'paid' ? 'default' :
                          bill.status === 'overdue' ? 'destructive' :
                          'secondary'
                        }>
                          {bill.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="anomalies">
          <Card>
            <CardHeader>
              <CardTitle>Recent Anomalies</CardTitle>
              <CardDescription>
                AI-detected unusual patterns and potential issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAnomalies.length > 0 ? (
                <div className="space-y-4">
                  {recentAnomalies.map((anomaly) => (
                    <Alert key={anomaly._id} variant={
                      anomaly.severity === 'high' ? 'destructive' : 'default'
                    }>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{anomaly.description}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {anomaly.recommendation}
                            </p>
                          </div>
                          <Badge variant={
                            anomaly.severity === 'high' ? 'destructive' :
                            anomaly.severity === 'medium' ? 'default' :
                            'secondary'
                          }>
                            {anomaly.severity}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No anomalies detected</p>
                  <p className="text-sm mt-2">Your financial data looks healthy!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}