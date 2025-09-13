'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuickBooksData } from '@/app/hooks/useQuickBooksData'
import { DataFreshness } from '@/components/DataFreshness'
import { 
  Card,
  Metric,
  Text,
  Title,
  BarList,
  DonutChart,
  LineChart,
  AreaChart,
  Grid,
  Flex,
  Badge,
  ProgressBar,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@tremor/react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Download,
  Send,
  Bot,
  Users,
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Loading skeleton for KPI cards
function KPISkeleton() {
  return (
    <Card>
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    </Card>
  )
}

// Loading skeleton for charts
function ChartSkeleton() {
  return (
    <Card>
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    </Card>
  )
}

export default function EnhancedRealDashboard() {
  const { userId } = useAuth()
  const [selectedKPI, setSelectedKPI] = useState('revenue')
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: string, message: string}>>([])
  
  // Fetch real QuickBooks data
  const qbData = useQuickBooksData(userId || '')

  const handleExport = () => {
    toast.info('Exporting dashboard data...')
    // Implement export functionality
  }

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatHistory([
        ...chatHistory,
        { role: 'user', message: chatMessage },
        { role: 'ai', message: `Analyzing your QuickBooks data: Current cash is $${(qbData.metrics.currentCash / 1000).toFixed(0)}K with ${qbData.metrics.runway.toFixed(1)} months runway.` }
      ])
      setChatMessage('')
    }
  }

  if (qbData.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Loading Header */}
        <div className="mb-6">
          <Flex>
            <div>
              <Title>Financial Intelligence Dashboard</Title>
              <Text>Loading QuickBooks data...</Text>
            </div>
          </Flex>
        </div>

        {/* Loading Skeletons */}
        <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </Grid>

        <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </Grid>
      </div>
    )
  }

  if (qbData.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load QuickBooks data: {qbData.error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const kpiData = [
    {
      title: "Current Cash",
      metric: `$${(qbData.metrics.currentCash / 1000).toFixed(0)}K`,
      progress: Math.min((qbData.metrics.currentCash / 1000000) * 100, 100),
      delta: qbData.cashFlow.dailyTrends.length > 1 
        ? `${((qbData.metrics.currentCash - qbData.cashFlow.dailyTrends[0].balance) / qbData.cashFlow.dailyTrends[0].balance * 100).toFixed(1)}%`
        : "0%",
      deltaType: qbData.metrics.currentCash > (qbData.cashFlow.dailyTrends[0]?.balance || 0) ? "increase" : "decrease",
      icon: DollarSign
    },
    {
      title: "Monthly Revenue",
      metric: `$${(qbData.metrics.monthlyRevenue / 1000).toFixed(0)}K`,
      progress: Math.min((qbData.metrics.monthlyRevenue / 200000) * 100, 100),
      delta: qbData.revenueTrends.length > 1
        ? `+${((qbData.revenueTrends[qbData.revenueTrends.length - 1].revenue - qbData.revenueTrends[qbData.revenueTrends.length - 2].revenue) / qbData.revenueTrends[qbData.revenueTrends.length - 2].revenue * 100).toFixed(1)}%`
        : "+0%",
      deltaType: "increase",
      icon: TrendingUp
    },
    {
      title: "Burn Rate",
      metric: `$${(qbData.metrics.burnRate / 1000).toFixed(0)}K`,
      progress: Math.min((qbData.metrics.burnRate / 150000) * 100, 100),
      delta: `${qbData.metrics.monthlyExpenses > 0 ? '+' : ''}${((qbData.metrics.burnRate / qbData.metrics.monthlyExpenses - 1) * 100).toFixed(1)}%`,
      deltaType: qbData.metrics.burnRate > qbData.metrics.monthlyExpenses ? "increase" : "decrease",
      icon: Activity
    },
    {
      title: "Runway",
      metric: `${qbData.metrics.runway.toFixed(1)} months`,
      progress: Math.min((qbData.metrics.runway / 24) * 100, 100),
      delta: qbData.metrics.runway < 6 ? "Low runway" : "Healthy",
      deltaType: qbData.metrics.runway < 6 ? "decrease" : "increase",
      icon: AlertTriangle
    }
  ]

  const additionalKPIs = [
    {
      title: "Accounts Receivable",
      metric: `$${(qbData.metrics.accountsReceivable / 1000).toFixed(0)}K`,
      icon: TrendingUp,
      color: "blue"
    },
    {
      title: "Accounts Payable",
      metric: `$${(qbData.metrics.accountsPayable / 1000).toFixed(0)}K`,
      icon: TrendingDown,
      color: "rose"
    },
    {
      title: "Customer Count",
      metric: qbData.metrics.customerCount.toString(),
      icon: Users,
      color: "emerald"
    },
    {
      title: "Vendor Count",
      metric: qbData.metrics.vendorCount.toString(),
      icon: Building2,
      color: "amber"
    }
  ]

  // Generate AI insights based on real data
  const aiInsights = []
  
  if (qbData.metrics.runway < 6) {
    aiInsights.push({
      type: 'warning',
      title: 'Cash Flow Alert',
      message: `Based on current burn rate, you have ${qbData.metrics.runway.toFixed(1)} months of runway. Consider accelerating receivables collection or reducing expenses.`,
      priority: 'high'
    })
  }
  
  if (qbData.metrics.accountsReceivable > qbData.metrics.monthlyRevenue * 2) {
    aiInsights.push({
      type: 'opportunity',
      title: 'Collections Opportunity',
      message: `You have $${(qbData.metrics.accountsReceivable / 1000).toFixed(0)}K in outstanding receivables. Improving collections could extend runway significantly.`,
      priority: 'medium'
    })
  }
  
  if (qbData.revenueTrends.length > 1 && 
      qbData.revenueTrends[qbData.revenueTrends.length - 1].revenue > 
      qbData.revenueTrends[qbData.revenueTrends.length - 2].revenue * 1.1) {
    aiInsights.push({
      type: 'success',
      title: 'Revenue Growth',
      message: 'Revenue grew more than 10% month-over-month. Your growth strategy is working well.',
      priority: 'low'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header with Data Freshness */}
      <div className="mb-6">
        <Flex>
          <div>
            <Title>Financial Intelligence Dashboard</Title>
            <Text>Real-time QuickBooks data integration</Text>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </Flex>
      </div>

      {/* Data Freshness Component */}
      <div className="mb-6">
        <DataFreshness
          lastSyncAt={qbData.lastSyncAt}
          isSyncing={qbData.isSyncing}
          syncError={qbData.error}
          onRefresh={qbData.refresh}
          onSync={qbData.triggerSync}
          showDetails={true}
        />
      </div>

      {/* AI Insights Alerts */}
      {aiInsights.length > 0 && (
        <div className="mb-6 space-y-3">
          {aiInsights.map((insight, i) => (
            <Alert key={i} className={`border-l-4 ${
              insight.type === 'warning' ? 'border-l-yellow-500' :
              insight.type === 'opportunity' ? 'border-l-blue-500' :
              'border-l-green-500'
            }`}>
              <div className="flex items-start gap-2">
                {insight.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> :
                 insight.type === 'opportunity' ? <Info className="h-5 w-5 text-blue-500" /> :
                 <CheckCircle className="h-5 w-5 text-green-500" />}
                <div>
                  <p className="font-semibold">{insight.title}</p>
                  <AlertDescription>{insight.message}</AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
        {kpiData.map((item) => (
          <Card key={item.title} decoration="top" decorationColor={item.deltaType === 'increase' ? 'emerald' : 'rose'}>
            <Flex>
              <div className="w-full">
                <Flex alignItems="start">
                  <div>
                    <Text>{item.title}</Text>
                    <Metric>{item.metric}</Metric>
                  </div>
                  <Badge icon={item.icon} color={item.deltaType === 'increase' ? 'emerald' : 'rose'}>
                    {item.delta}
                  </Badge>
                </Flex>
                <ProgressBar value={item.progress} className="mt-3" />
              </div>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Additional Metrics */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mb-6">
        {additionalKPIs.map((kpi) => (
          <Card key={kpi.title}>
            <Flex alignItems="start">
              <div>
                <Text>{kpi.title}</Text>
                <Metric>{kpi.metric}</Metric>
              </div>
              <Badge icon={kpi.icon} color={kpi.color} />
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6 mb-6">
        {/* Cash Flow Forecast */}
        <Card>
          <Title>13-Week Cash Flow Forecast</Title>
          <Text>QuickBooks projected cash position</Text>
          {qbData.cashFlow.forecast.length > 0 ? (
            <AreaChart
              className="h-72 mt-4"
              data={qbData.cashFlow.forecast}
              index="weekNumber"
              categories={["projectedBalance", "expectedReceivables", "expectedPayables"]}
              colors={["blue", "emerald", "rose"]}
              valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
              showLegend={true}
              showAnimation={true}
            />
          ) : (
            <div className="h-72 mt-4 flex items-center justify-center text-gray-500">
              No forecast data available
            </div>
          )}
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <Title>Expense Categories</Title>
          <Text>Monthly spending distribution from QuickBooks</Text>
          {qbData.expenseBreakdown.length > 0 ? (
            <DonutChart
              className="h-72 mt-4"
              data={qbData.expenseBreakdown.map(cat => ({
                name: cat.category,
                value: cat.amount
              }))}
              category="value"
              index="name"
              valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
              colors={["slate", "violet", "indigo", "rose", "cyan", "amber"]}
              showAnimation={true}
            />
          ) : (
            <div className="h-72 mt-4 flex items-center justify-center text-gray-500">
              No expense data available
            </div>
          )}
        </Card>
      </Grid>

      {/* Detailed Analytics Tabs */}
      <Card className="mb-6">
        <TabGroup>
          <TabList>
            <Tab>Revenue Analytics</Tab>
            <Tab>Account Hierarchy</Tab>
            <Tab>Recent Transactions</Tab>
            <Tab>Cash Flow Trends</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="mt-6">
                <Title>Revenue Trends (QuickBooks)</Title>
                {qbData.revenueTrends.length > 0 ? (
                  <LineChart
                    className="h-72 mt-4"
                    data={qbData.revenueTrends}
                    index="month"
                    categories={["revenue"]}
                    colors={["emerald"]}
                    valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
                    showAnimation={true}
                  />
                ) : (
                  <div className="h-72 mt-4 flex items-center justify-center text-gray-500">
                    No revenue data available
                  </div>
                )}
              </div>
            </TabPanel>
            
            <TabPanel>
              <div className="mt-6 space-y-4">
                <Title>Chart of Accounts (QuickBooks)</Title>
                {qbData.accounts.length > 0 ? (
                  qbData.accounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                      <Flex>
                        <div>
                          <Text className="font-semibold">{account.name}</Text>
                          <Text className="text-gray-500">{account.type}</Text>
                        </div>
                        <Metric className="text-right">
                          ${(account.balance / 1000).toFixed(0)}K
                        </Metric>
                      </Flex>
                      {account.children && account.children.length > 0 && (
                        <div className="mt-3 ml-6 space-y-2">
                          {account.children.map((child: any) => (
                            <Flex key={child.id || child._id}>
                              <Text>{child.name}</Text>
                              <Text className="font-medium">
                                ${((child.currentBalance || child.balance || 0) / 1000).toFixed(0)}K
                              </Text>
                            </Flex>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No account hierarchy available
                  </div>
                )}
              </div>
            </TabPanel>

            <TabPanel>
              <div className="mt-6">
                <Title>Recent QuickBooks Transactions</Title>
                <div className="mt-4 space-y-3">
                  {qbData.transactions.length > 0 ? (
                    qbData.transactions.map((transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-4">
                        <Flex>
                          <div>
                            <Text className="font-semibold">{transaction.description}</Text>
                            <Text className="text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                            </Text>
                            {(transaction.vendorName || transaction.customerName) && (
                              <Text className="text-gray-500 text-sm">
                                {transaction.vendorName ? `Vendor: ${transaction.vendorName}` : `Customer: ${transaction.customerName}`}
                              </Text>
                            )}
                          </div>
                          <Metric className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                            {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                          </Metric>
                        </Flex>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No recent transactions available
                    </div>
                  )}
                </div>
              </div>
            </TabPanel>

            <TabPanel>
              <div className="mt-6">
                <Title>Daily Cash Flow Trends</Title>
                {qbData.cashFlow.dailyTrends.length > 0 ? (
                  <AreaChart
                    className="h-72 mt-4"
                    data={qbData.cashFlow.dailyTrends}
                    index="date"
                    categories={["inflow", "outflow"]}
                    colors={["emerald", "rose"]}
                    valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
                    showAnimation={true}
                  />
                ) : (
                  <div className="h-72 mt-4 flex items-center justify-center text-gray-500">
                    No cash flow trend data available
                  </div>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>

      {/* AI Chat Interface */}
      <UICard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Financial Advisor
          </CardTitle>
          <CardDescription>Ask questions about your QuickBooks data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 border rounded-lg p-4 mb-4 overflow-y-auto bg-gray-50">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Ask me about your QuickBooks data!</p>
                <p className="text-sm mt-2">Try: "What are my biggest expenses?" or "How can I improve cash flow?"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your QuickBooks data..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </UICard>
    </div>
  )
}