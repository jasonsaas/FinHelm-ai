'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  DollarSign,
  AlertCircle,
  BarChart3,
  Calendar,
  Receipt,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentId?: string
  agentName?: string
  timestamp: number
  data?: any
  confidence?: number
  isLoading?: boolean
}

// Priority agents configuration
const PRIORITY_AGENTS = [
  {
    id: 'cash_flow_forecast',
    name: 'Cash Flow Forecast',
    description: '13-week rolling cash flow predictions',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    sampleQueries: [
      'What is my cash position for the next 13 weeks?',
      'When will I run out of cash?',
      'Show me weekly cash flow projections'
    ]
  },
  {
    id: 'collections',
    name: 'Collections Agent',
    description: 'AR aging and collection priorities',
    icon: Receipt,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    sampleQueries: [
      'Show me overdue invoices',
      'Which customers should I contact first?',
      'Generate collection email templates'
    ]
  },
  {
    id: 'anomaly_detection',
    name: 'Anomaly Detection',
    description: 'Identify unusual transactions and patterns',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    sampleQueries: [
      'Find duplicate payments',
      'Show me unusual transactions',
      'Detect statistical outliers in spending'
    ]
  },
  {
    id: 'month_end_close',
    name: 'Month-End Close',
    description: 'Close checklist and reconciliation status',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    sampleQueries: [
      'What tasks remain for month-end close?',
      'Show me unreconciled transactions',
      'Generate adjusting journal entries'
    ]
  },
  {
    id: 'budget_vs_actual',
    name: 'Budget vs Actual',
    description: 'Variance analysis and budget performance',
    icon: BarChart3,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    sampleQueries: [
      'Show me budget variances',
      'Which accounts are over budget?',
      'Analyze YTD budget performance'
    ]
  }
]

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('cash_flow_forecast')
  const [isExecuting, setIsExecuting] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useConvexAuth()

  // Get user's first company (simplified for demo)
  const companies = useQuery(api.companies.getCompanies, isAuthenticated ? {} : 'skip')
  const companyId = companies?.[0]?._id
  const userId = companies?.[0]?.userId as Id<'users'> | undefined

  // Priority agent mutations
  const executeCashFlow = useMutation(api.ai.priorityAgents.executeCashFlowForecast)
  const executeCollections = useMutation(api.ai.priorityAgents.executeCollections)
  const executeAnomaly = useMutation(api.ai.priorityAgents.executeAnomalyDetection)
  const executeMonthEnd = useMutation(api.ai.priorityAgents.executeMonthEndClose)
  const executeBudget = useMutation(api.ai.priorityAgents.executeBudgetVsActual)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isExecuting || !companyId || !userId) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    const agent = PRIORITY_AGENTS.find(a => a.id === selectedAgent)
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: `${agent?.name} is analyzing your request...`,
      agentId: selectedAgent,
      agentName: agent?.name,
      timestamp: Date.now(),
      isLoading: true,
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInput('')
    setIsExecuting(true)

    try {
      let response: any

      // Execute the appropriate agent
      switch (selectedAgent) {
        case 'cash_flow_forecast':
          response = await executeCashFlow({
            companyId,
            userId,
            query: input,
            weeks: 13
          })
          break
        case 'collections':
          response = await executeCollections({
            companyId,
            userId,
            query: input
          })
          break
        case 'anomaly_detection':
          response = await executeAnomaly({
            companyId,
            userId,
            query: input
          })
          break
        case 'month_end_close':
          response = await executeMonthEnd({
            companyId,
            userId,
            query: input
          })
          break
        case 'budget_vs_actual':
          response = await executeBudget({
            companyId,
            userId,
            query: input
          })
          break
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content || 'Analysis complete. Check the data below.',
        agentId: selectedAgent,
        agentName: agent?.name,
        timestamp: Date.now(),
        data: response,
        confidence: response.confidence,
      }

      setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMessage))
      setLastSync(new Date())
    } catch (error) {
      console.error('Error executing agent:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        agentId: selectedAgent,
        agentName: agent?.name,
        timestamp: Date.now(),
      }
      setMessages(prev => prev.filter(m => !m.isLoading).concat(errorMessage))
    } finally {
      setIsExecuting(false)
    }
  }

  const renderMessageContent = (message: Message) => {
    if (message.isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message.content}</span>
        </div>
      )
    }

    // Render agent-specific data visualizations
    if (message.data && message.role === 'assistant') {
      const agent = PRIORITY_AGENTS.find(a => a.id === message.agentId)
      
      return (
        <div className="space-y-4">
          <p className="text-gray-800">{message.content}</p>
          
          {/* Confidence Score */}
          {message.confidence !== undefined && (
            <div className="flex items-center space-x-2">
              <Badge variant={message.confidence > 0.8 ? 'default' : 'secondary'}>
                Confidence: {(message.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          )}

          {/* Cash Flow Projections */}
          {message.agentId === 'cash_flow_forecast' && message.data.projections && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">13-Week Cash Flow Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {message.data.projections.slice(0, 5).map((week: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>Week {week.week}</span>
                      <span className={cn(
                        'font-medium',
                        week.endingBalance > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        ${week.endingBalance.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                {message.data.metrics && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                    <div>Min Cash: ${message.data.metrics.minCash.toFixed(2)}</div>
                    <div>Max Cash: ${message.data.metrics.maxCash.toFixed(2)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Collections Aging */}
          {message.agentId === 'collections' && message.data.metrics && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">AR Aging Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current</span>
                    <span>{message.data.metrics.current} invoices</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1-30 days</span>
                    <span className="text-yellow-600">{message.data.metrics.thirtyDays} invoices</span>
                  </div>
                  <div className="flex justify-between">
                    <span>31-60 days</span>
                    <span className="text-orange-600">{message.data.metrics.sixtyDays} invoices</span>
                  </div>
                  <div className="flex justify-between">
                    <span>90+ days</span>
                    <span className="text-red-600">{message.data.metrics.overNinetyDays} invoices</span>
                  </div>
                </div>
                {message.data.totalOverdue && (
                  <div className="mt-3 pt-3 border-t text-sm font-medium">
                    Total Overdue: ${message.data.totalOverdue.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Anomalies Detected */}
          {message.agentId === 'anomaly_detection' && message.data.anomalies && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Anomalies Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {message.data.anomalies.slice(0, 3).map((anomaly: any, idx: number) => (
                    <Alert key={idx} className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <div className="font-medium">{anomaly.type}</div>
                        <div className="text-gray-600">{anomaly.description}</div>
                        <Badge 
                          variant={anomaly.severity === 'HIGH' ? 'destructive' : 'secondary'}
                          className="mt-1"
                        >
                          {anomaly.severity}
                        </Badge>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
                {message.data.riskScore !== undefined && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    Risk Score: {message.data.riskScore}/100
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Month-End Checklist */}
          {message.agentId === 'month_end_close' && message.data.checklist && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Month-End Close Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {message.data.checklist.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {item.status === 'Complete' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{item.task}</span>
                      </div>
                      <Badge variant={item.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                        {item.items} items
                      </Badge>
                    </div>
                  ))}
                </div>
                {message.data.metrics && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    Progress: {message.data.metrics.completedTasks}/{message.data.metrics.totalTasks} tasks
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Budget Variance */}
          {message.agentId === 'budget_vs_actual' && message.data.metrics && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Budget Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Budget</span>
                    <span>${message.data.metrics.totalBudget?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Actual</span>
                    <span>${message.data.metrics.totalActual?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Variance</span>
                    <span className={cn(
                      message.data.metrics.totalVariance > 0 ? 'text-red-600' : 'text-green-600'
                    )}>
                      ${Math.abs(message.data.metrics.totalVariance || 0).toFixed(2)} 
                      ({Math.abs(message.data.metrics.variancePercent || 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                  <div>{message.data.metrics.accountsOverBudget} accounts over budget</div>
                  <div>{message.data.metrics.accountsOnTarget} accounts on target</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )
    }

    return <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to use the AI chat features</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>No Company Connected</CardTitle>
            <CardDescription>Please connect your QuickBooks account first</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-3">AI Financial Agents</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select an agent to analyze your QuickBooks data
          </p>
        </div>

        <div className="space-y-2">
          {PRIORITY_AGENTS.map((agent) => {
            const Icon = agent.icon
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  selectedAgent === agent.id
                    ? `${agent.bgColor} border-2 border-current`
                    : 'hover:bg-gray-50 border-2 border-transparent'
                )}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={cn('h-5 w-5 mt-0.5', agent.color)} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{agent.description}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {lastSync && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Last sync</span>
              <span>{lastSync.toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {(() => {
                const agent = PRIORITY_AGENTS.find(a => a.id === selectedAgent)
                const Icon = agent?.icon || Bot
                return (
                  <>
                    <div className={cn('p-2 rounded-lg', agent?.bgColor)}>
                      <Icon className={cn('h-5 w-5', agent?.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent?.name}</h3>
                      <p className="text-xs text-gray-600">{agent?.description}</p>
                    </div>
                  </>
                )
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessages([])}
              disabled={messages.length === 0}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Ask me about your financial data
              </p>
              <div className="space-y-2 max-w-md mx-auto">
                {PRIORITY_AGENTS.find(a => a.id === selectedAgent)?.sampleQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(query)}
                    className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-gray-400 inline mr-2" />
                    {query}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'flex space-x-3 max-w-2xl',
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'rounded-lg px-4 py-2',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200'
                      )}
                    >
                      {renderMessageContent(message)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your financial data..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isExecuting}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isExecuting}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}