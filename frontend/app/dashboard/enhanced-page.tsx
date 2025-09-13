'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
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
  CategoryBar
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
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EnhancedDashboard() {
  const [selectedKPI, setSelectedKPI] = useState('revenue')
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: string, message: string}>>([])
  
  // Fetch data from Convex
  const financialData = useQuery(api.finHelmTest.finHelmTest)
  const accountHierarchy = useQuery(api.finHelmTest.getAccountHierarchy)
  const recentTransactions = useQuery(api.finHelmTest.getRecentTransactions, { limit: 10 })
  
  if (!financialData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  const kpiData = [
    {
      title: "Current Cash",
      metric: `$${(financialData.summary.currentCash / 1000).toFixed(0)}K`,
      progress: 75,
      delta: "+12%",
      deltaType: "increase",
      icon: DollarSign
    },
    {
      title: "Monthly Revenue",
      metric: `$${(financialData.summary.revenue.current / 1000).toFixed(0)}K`,
      progress: 85,
      delta: `+${financialData.summary.revenue.growth.toFixed(1)}%`,
      deltaType: "increase",
      icon: TrendingUp
    },
    {
      title: "Burn Rate",
      metric: `$${(financialData.summary.monthlyBurnRate / 1000).toFixed(0)}K`,
      progress: 45,
      delta: `+${financialData.summary.expenses.growth.toFixed(1)}%`,
      deltaType: "increase",
      icon: Activity
    },
    {
      title: "Runway",
      metric: `${financialData.summary.runwayMonths.toFixed(1)} months`,
      progress: 60,
      delta: "-0.5 months",
      deltaType: "decrease",
      icon: AlertTriangle
    }
  ]

  const categoryData = financialData.recentTransactions
    .filter(t => t.amount < 0)
    .reduce((acc: any[], transaction) => {
      const existing = acc.find(item => item.name === transaction.category)
      if (existing) {
        existing.value += Math.abs(transaction.amount)
      } else {
        acc.push({ name: transaction.category, value: Math.abs(transaction.amount) })
      }
      return acc
    }, [])
    .sort((a, b) => b.value - a.value)

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatHistory([
        ...chatHistory,
        { role: 'user', message: chatMessage },
        { role: 'ai', message: 'Analyzing your financial data...' }
      ])
      setChatMessage('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Flex>
          <div>
            <Title>Financial Intelligence Dashboard</Title>
            <Text>Powered by AI-driven insights from your Convex backend</Text>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </Flex>
      </div>

      {/* AI Insights Alerts */}
      <div className="mb-6 space-y-3">
        {financialData.aiInsights.map((insight, i) => (
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

      {/* Main Content Grid */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6 mb-6">
        {/* Cash Flow Forecast */}
        <Card>
          <Title>13-Week Cash Flow Forecast</Title>
          <Text>AI-predicted cash position</Text>
          <AreaChart
            className="h-72 mt-4"
            data={financialData.cashFlow.forecast}
            index="weekNumber"
            categories={["projectedBalance", "expectedReceivables", "expectedPayables"]}
            colors={["blue", "emerald", "rose"]}
            valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
            showLegend={true}
            showAnimation={true}
          />
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <Title>Expense Categories</Title>
          <Text>Monthly spending distribution</Text>
          <DonutChart
            className="h-72 mt-4"
            data={categoryData}
            category="value"
            index="name"
            valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
            colors={["slate", "violet", "indigo", "rose", "cyan", "amber"]}
            showAnimation={true}
          />
        </Card>
      </Grid>

      {/* Detailed Analytics Tabs */}
      <Card className="mb-6">
        <TabGroup>
          <TabList>
            <Tab>Revenue Analytics</Tab>
            <Tab>Account Hierarchy</Tab>
            <Tab>Recent Transactions</Tab>
            <Tab>KPI Metrics</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="mt-6">
                <Title>Revenue Trends</Title>
                <LineChart
                  className="h-72 mt-4"
                  data={[
                    { month: 'Jan', revenue: 95000, target: 100000 },
                    { month: 'Feb', revenue: 102000, target: 105000 },
                    { month: 'Mar', revenue: 110000, target: 110000 },
                    { month: 'Apr', revenue: 125000, target: 115000 },
                  ]}
                  index="month"
                  categories={["revenue", "target"]}
                  colors={["emerald", "gray"]}
                  valueFormatter={(number: number) => `$${(number / 1000).toFixed(0)}K`}
                  showAnimation={true}
                />
              </div>
            </TabPanel>
            
            <TabPanel>
              <div className="mt-6 space-y-4">
                <Title>Chart of Accounts</Title>
                {financialData.accountHierarchy.map((account) => (
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
                    {account.children && (
                      <div className="mt-3 ml-6 space-y-2">
                        {account.children.map((child) => (
                          <Flex key={child.id}>
                            <Text>{child.name}</Text>
                            <Text className="font-medium">
                              ${(child.balance / 1000).toFixed(0)}K
                            </Text>
                          </Flex>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabPanel>

            <TabPanel>
              <div className="mt-6">
                <Title>Recent Transactions</Title>
                <div className="mt-4 space-y-3">
                  {financialData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <Flex>
                        <div>
                          <Text className="font-semibold">{transaction.description}</Text>
                          <Text className="text-gray-500">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                          </Text>
                        </div>
                        <Metric className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                        </Metric>
                      </Flex>
                    </div>
                  ))}
                </div>
              </div>
            </TabPanel>

            <TabPanel>
              <div className="mt-6">
                <Title>Key Performance Indicators</Title>
                <Grid numItemsSm={2} numItemsLg={3} className="gap-4 mt-4">
                  <Card>
                    <Text>Days Sales Outstanding</Text>
                    <Metric>{financialData.kpis.dso} days</Metric>
                  </Card>
                  <Card>
                    <Text>Current Ratio</Text>
                    <Metric>{financialData.kpis.currentRatio}</Metric>
                  </Card>
                  <Card>
                    <Text>Gross Margin</Text>
                    <Metric>{financialData.kpis.grossMargin}%</Metric>
                  </Card>
                  <Card>
                    <Text>Operating Margin</Text>
                    <Metric>{financialData.kpis.operatingMargin}%</Metric>
                  </Card>
                  <Card>
                    <Text>Working Capital</Text>
                    <Metric>${(financialData.kpis.workingCapital / 1000).toFixed(0)}K</Metric>
                  </Card>
                  <Card>
                    <Text>Quick Ratio</Text>
                    <Metric>{financialData.kpis.quickRatio}</Metric>
                  </Card>
                </Grid>
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
          <CardDescription>Ask questions about your financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 border rounded-lg p-4 mb-4 overflow-y-auto bg-gray-50">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Ask me anything about your finances!</p>
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
              placeholder="Type your question..."
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