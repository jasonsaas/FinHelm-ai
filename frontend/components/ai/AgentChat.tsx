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
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  DollarSign,
  AlertCircle,
  BarChart3,
  Settings,
  History,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentId?: string
  agentName?: string
  timestamp: number
  charts?: any[]
  insights?: string[]
  recommendations?: string[]
  confidence?: number
  isLoading?: boolean
}

interface AgentChatProps {
  companyId: Id<'companies'>
  userId: Id<'users'>
  className?: string
}

export default function AgentChat({ companyId, userId, className }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('cfo_copilot')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useConvexAuth()

  // Convex hooks
  const agents = useQuery(api.functions.executeAgent.listAgents, { isActive: true })
  const createSession = useMutation(api.functions.executeAgent.createSession)
  const executeAgent = useMutation(api.ai['agent-executor'].executeAgent)
  const sessionHistory = useQuery(
    api.functions.executeAgent.getHistory,
    sessionId ? { companyId, sessionId, limit: 50 } : 'skip'
  )

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Create session on mount
  useEffect(() => {
    if (isAuthenticated && !sessionId) {
      createSession({ companyId, userId, title: 'AI Agent Chat' })
        .then(result => setSessionId(result.sessionId))
        .catch(console.error)
    }
  }, [isAuthenticated, sessionId, companyId, userId])

  // Load session history
  useEffect(() => {
    if (sessionHistory) {
      const historyMessages: Message[] = sessionHistory.map(exec => [
        {
          id: `${exec._id}-query`,
          role: 'user' as const,
          content: exec.query,
          timestamp: exec.createdAt,
        },
        {
          id: `${exec._id}-response`,
          role: 'assistant' as const,
          content: exec.response.content,
          agentId: exec.agentId,
          agentName: agents?.find(a => a.id === exec.agentId)?.name,
          timestamp: exec.createdAt,
          charts: exec.response.charts,
          insights: exec.response.insights,
          recommendations: exec.response.recommendations,
          confidence: exec.response.confidence,
        }
      ]).flat()
      
      if (historyMessages.length > 0 && messages.length === 0) {
        setMessages(historyMessages)
      }
    }
  }, [sessionHistory, agents])

  const handleSendMessage = async () => {
    if (!input.trim() || isExecuting) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: 'Analyzing your request...',
      agentId: selectedAgent,
      agentName: agents?.find(a => a.id === selectedAgent)?.name,
      timestamp: Date.now(),
      isLoading: true,
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInput('')
    setIsExecuting(true)

    try {
      const response = await executeAgent({
        companyId,
        userId,
        agentType: selectedAgent,
        query: input,
        sessionId: sessionId || undefined,
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        agentId: selectedAgent,
        agentName: agents?.find(a => a.id === selectedAgent)?.name,
        timestamp: Date.now(),
        charts: response.charts,
        insights: response.insights,
        recommendations: response.recommendations,
        confidence: response.confidence,
      }

      setMessages(prev => 
        prev.filter(msg => !msg.isLoading).concat(assistantMessage)
      )
    } catch (error) {
      console.error('Failed to execute agent:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        agentId: selectedAgent,
        agentName: agents?.find(a => a.id === selectedAgent)?.name,
        timestamp: Date.now(),
      }

      setMessages(prev => 
        prev.filter(msg => !msg.isLoading).concat(errorMessage)
      )
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Group agents by category
  const agentCategories = agents?.reduce((acc, agent) => {
    if (!acc[agent.category]) {
      acc[agent.category] = []
    }
    acc[agent.category].push(agent)
    return acc
  }, {} as Record<string, typeof agents>)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial_analysis': return <DollarSign className="h-4 w-4" />
      case 'forecasting': return <TrendingUp className="h-4 w-4" />
      case 'compliance': return <AlertCircle className="h-4 w-4" />
      case 'optimization': return <Settings className="h-4 w-4" />
      case 'reporting': return <BarChart3 className="h-4 w-4" />
      default: return <Bot className="h-4 w-4" />
    }
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* Agent Selector Sidebar */}
      <div className="w-80 border-r bg-gray-50/50 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">AI Agents</h3>
          <p className="text-sm text-muted-foreground">
            Select an agent to assist you
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {agentCategories && Object.entries(agentCategories).map(([category, categoryAgents]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                  {getCategoryIcon(category)}
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {categoryAgents.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {categoryAgents.map(agent => (
                    <Card
                      key={agent.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selectedAgent === agent.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <CardHeader className="p-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="text-2xl"
                            style={{ color: agent.color }}
                          >
                            {agent.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm">
                              {agent.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {agent.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {agents?.find(a => a.id === selectedAgent) && (
                <>
                  <div
                    className="text-3xl"
                    style={{ color: agents.find(a => a.id === selectedAgent)?.color }}
                  >
                    {agents.find(a => a.id === selectedAgent)?.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {agents.find(a => a.id === selectedAgent)?.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Powered by {agents.find(a => a.id === selectedAgent)?.model}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
              {sessionId && (
                <Button variant="ghost" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ask me anything about your financial data. I can help with analysis,
                  forecasting, optimization, and more.
                </p>
                <div className="mt-6 space-y-2">
                  <p className="text-xs text-muted-foreground">Try asking:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "What's my cash runway?",
                      "Show me expense trends",
                      "Find cost savings",
                      "Analyze my receivables"
                    ].map(suggestion => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        style={{ backgroundColor: agents?.find(a => a.id === message.agentId)?.color + '20' }}
                      >
                        <span style={{ fontSize: '1.2em' }}>
                          {agents?.find(a => a.id === message.agentId)?.icon || '🤖'}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg p-3',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {message.insights && message.insights.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Key Insights
                            </h4>
                            <ul className="text-sm space-y-1">
                              {message.insights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-blue-600 dark:text-blue-400">•</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {message.recommendations && message.recommendations.length > 0 && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                            <ul className="text-sm space-y-1">
                              {message.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-green-600 dark:text-green-400">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {message.confidence !== undefined && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Confidence: {Math.round(message.confidence * 100)}%
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-white">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${agents?.find(a => a.id === selectedAgent)?.name || 'the AI agent'} a question...`}
              className="flex-1 resize-none rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              disabled={isExecuting}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isExecuting}
              size="lg"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-2">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}