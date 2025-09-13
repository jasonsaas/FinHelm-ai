'use client'

import { useState } from 'react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import AgentChat from '@/components/ai/AgentChat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Bot, 
  TrendingUp, 
  DollarSign,
  BarChart3,
  Activity,
  Zap,
  Users,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

export default function AIAgentsPage() {
  const { isAuthenticated } = useConvexAuth()
  const [selectedTab, setSelectedTab] = useState('chat')
  
  // For demo purposes, use hardcoded IDs (would come from auth in production)
  const companyId = 'demo_company_id' as any
  const userId = 'demo_user_id' as any

  // Fetch agents and stats
  const agents = useQuery(api.functions.executeAgent.listAgents, { isActive: true })
  const usageStats = useQuery(
    api.functions.executeAgent.getUsageStats,
    isAuthenticated ? { companyId } : 'skip'
  )

  // Agent categories with descriptions
  const categories = [
    { 
      id: 'financial_analysis',
      name: 'Financial Analysis',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-blue-500',
      description: 'Deep financial insights and KPI monitoring'
    },
    { 
      id: 'forecasting',
      name: 'Forecasting',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-green-500',
      description: 'Predictive modeling and future projections'
    },
    { 
      id: 'compliance',
      name: 'Compliance',
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'bg-red-500',
      description: 'Risk management and regulatory monitoring'
    },
    { 
      id: 'optimization',
      name: 'Optimization',
      icon: <Zap className="h-5 w-5" />,
      color: 'bg-yellow-500',
      description: 'Cost reduction and efficiency improvements'
    },
    { 
      id: 'reporting',
      name: 'Reporting',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'bg-purple-500',
      description: 'Automated reports and data visualization'
    },
  ]

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              AI Financial Agents
            </h1>
            <p className="text-muted-foreground mt-2">
              25 specialized AI agents ready to analyze your financial data
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              {agents?.length || 0} Agents Active
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              {usageStats?.successRate ? `${(usageStats.successRate * 100).toFixed(0)}% Success Rate` : 'Loading...'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="agents">Browse Agents</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[700px]">
            <AgentChat 
              companyId={companyId}
              userId={userId}
              className="h-full"
            />
          </Card>
        </TabsContent>

        {/* Agents Browser Tab */}
        <TabsContent value="agents" className="space-y-6">
          {categories.map(category => {
            const categoryAgents = agents?.filter(a => a.category === category.id) || []
            
            return (
              <div key={category.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg text-white ${category.color}`}>
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <Badge className="ml-auto">{categoryAgents.length} agents</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAgents.map(agent => (
                    <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="text-3xl" style={{ color: agent.color }}>
                            {agent.icon}
                          </div>
                          <Badge variant="secondary">{agent.model}</Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">{agent.name}</CardTitle>
                        <CardDescription>{agent.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Capabilities:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {agent.capabilities.slice(0, 3).map((cap, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="text-primary">•</span>
                                {cap}
                              </li>
                            ))}
                            {agent.capabilities.length > 3 && (
                              <li className="text-xs italic">
                                +{agent.capabilities.length - 3} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageStats?.totalExecutions || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time interactions
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((usageStats?.totalTokens || 0) / 1000).toFixed(1)}k
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total API tokens
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(usageStats?.totalCost || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  API usage costs
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((usageStats?.cacheHitRate || 0) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cached responses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Usage Chart */}
          {usageStats?.agentUsage && Object.keys(usageStats.agentUsage).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Agent Usage Distribution</CardTitle>
                <CardDescription>
                  Most frequently used AI agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(usageStats.agentUsage)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([agentId, count]) => {
                      const agent = agents?.find(a => a.id === agentId)
                      const percentage = (count / usageStats.totalExecutions) * 100
                      
                      return (
                        <div key={agentId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{agent?.icon || '🤖'}</span>
                              <span className="text-sm font-medium">
                                {agent?.name || agentId}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {count} queries
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>
                  Average agent execution time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">
                    {((usageStats?.averageExecutionTime || 0) / 1000).toFixed(2)}s
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Includes API calls and processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
                <CardDescription>
                  Successful query completions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-3xl font-bold">
                    {((usageStats?.successRate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {usageStats?.totalExecutions || 0} total queries processed
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}