import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, TrendingUp, BarChart3, CheckSquare, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useChat } from '../hooks/useChat';
import type { Id } from '../../../convex/_generated/dataModel';

// Types for chatbot messages and responses
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  response?: AgentResponse;
}

export interface AgentResponse {
  summary: string;
  dataOverview: {
    totalRecords: number;
    dateRange: {
      start: number;
      end: number;
    };
    keyMetrics: Array<{
      name: string;
      value: any;
      change?: number;
      trend?: 'up' | 'down' | 'flat';
    }>;
  };
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    data?: any[];
  }>;
  actions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    automated: boolean;
    dueDate?: number;
    assignee?: string;
  }>;
}

export type OutputSegment = 'summary' | 'data' | 'patterns' | 'actions';

const SEGMENT_CONFIG = {
  summary: {
    label: 'Summary',
    icon: MessageSquare,
    color: 'blue',
  },
  data: {
    label: 'Data Overview',
    icon: BarChart3,
    color: 'green',
  },
  patterns: {
    label: 'Patterns',
    icon: TrendingUp,
    color: 'purple',
  },
  actions: {
    label: 'Actions',
    icon: CheckSquare,
    color: 'orange',
  },
};

interface ChatbotUIProps {
  className?: string;
  onSendMessage?: (message: string) => Promise<AgentResponse>;
  organizationId?: Id<"organizations">;
  userId?: Id<"users">;
  defaultAgentId?: Id<"agents">;
  sessionId?: string;
}

export function ChatbotUI({
  className,
  onSendMessage,
  organizationId,
  userId,
  defaultAgentId,
  sessionId,
}: ChatbotUIProps) {
  const [inputValue, setInputValue] = useState('');
  const [activeSegment, setActiveSegment] = useState<OutputSegment>('summary');
  
  // Use Convex chat hook
  const {
    messages: convexMessages,
    sendMessage: sendConvexMessage,
    isLoading,
    error,
    clearError,
    sessionId: currentSessionId,
    startNewSession,
  } = useChat({
    organizationId,
    userId,
    sessionId,
    agentId: defaultAgentId,
  });

  // Convert Convex messages to component format
  const messages: ChatMessage[] = convexMessages.map(msg => ({
    id: msg._id,
    type: msg.type,
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    response: msg.response,
  }));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    clearError();

    try {
      // Use provided onSendMessage handler or Convex integration
      if (onSendMessage) {
        await onSendMessage(messageContent);
      } else {
        await sendConvexMessage(messageContent);
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Error is handled by the useChat hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getLatestResponse = (): AgentResponse | null => {
    const lastMessage = messages
      .filter(m => m.type === 'assistant' && m.response)
      .pop();
    return lastMessage?.response || null;
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      if (value > 1000) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      }
      return value.toString();
    }
    return String(value);
  };

  const formatDate = (timestamp: number): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp));
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderSegmentContent = (response: AgentResponse) => {
    switch (activeSegment) {
      case 'summary':
        return (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">{response.summary}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• {response.dataOverview.totalRecords} transactions analyzed</li>
                <li>• {response.patterns.length} patterns identified</li>
                <li>• {response.actions.length} recommended actions</li>
              </ul>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {response.dataOverview.keyMetrics.map((metric, idx) => (
                <div key={idx} className="card p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{metric.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">
                      {formatValue(metric.value)}
                    </span>
                    {metric.trend && (
                      <span className="text-lg">
                        {getTrendIcon(metric.trend)}
                      </span>
                    )}
                  </div>
                  {metric.change && (
                    <p className={clsx(
                      'text-sm mt-1',
                      metric.change > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Data Range</h4>
              <div className="text-sm text-gray-600">
                <p>
                  <span className="font-medium">Period:</span> {' '}
                  {formatDate(response.dataOverview.dateRange.start)} - {' '}
                  {formatDate(response.dataOverview.dateRange.end)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Records:</span> {' '}
                  {response.dataOverview.totalRecords.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        );

      case 'patterns':
        return (
          <div className="space-y-4">
            {response.patterns.map((pattern, idx) => (
              <div key={idx} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {pattern.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-600">{pattern.description}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className={clsx(
                      'text-xs px-2 py-1 rounded-full',
                      pattern.impact === 'high' ? 'bg-red-100 text-red-800' :
                      pattern.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    )}>
                      {pattern.impact} impact
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 mr-2">Confidence:</span>
                  <span className={clsx('font-medium', getConfidenceColor(pattern.confidence))}>
                    {Math.round(pattern.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'actions':
        return (
          <div className="space-y-4">
            {response.actions.map((action, idx) => (
              <div key={idx} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="font-medium text-gray-900">
                        {action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      {action.automated && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                  <div className={clsx(
                    'text-xs px-2 py-1 rounded-full ml-4',
                    getPriorityColor(action.priority)
                  )}>
                    {action.priority}
                  </div>
                </div>
                {action.dueDate && (
                  <p className="text-xs text-gray-500">
                    Due: {formatDate(action.dueDate)}
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={clsx('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">FinHelm AI Assistant</h2>
          <div className="text-sm text-gray-500">
            {messages.length > 0 && `${messages.length} messages`}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to FinHelm AI
                </h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Ask me about your financial data, transactions, patterns, or request analysis and insights.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex',
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={clsx(
                    'max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg',
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your financial data..."
                className="input flex-1"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Segmented Output Panel */}
        {getLatestResponse() && (
          <div className="w-96 border-l border-gray-200 flex flex-col">
            {/* Segment Tabs */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
              <div className="flex">
                {(Object.keys(SEGMENT_CONFIG) as OutputSegment[]).map((segment) => {
                  const config = SEGMENT_CONFIG[segment];
                  const Icon = config.icon;
                  return (
                    <button
                      key={segment}
                      onClick={() => setActiveSegment(segment)}
                      className={clsx(
                        'flex-1 flex items-center justify-center space-x-1 px-3 py-3 text-xs font-medium transition-colors',
                        activeSegment === segment
                          ? `text-${config.color}-600 border-b-2 border-${config.color}-600 bg-white`
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Segment Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderSegmentContent(getLatestResponse()!)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock function for demonstration (will be replaced with actual Convex integration)
async function mockAgentResponse(query: string): Promise<AgentResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  return {
    summary: `Based on your query "${query}", I've analyzed your financial data and identified key insights. Your current financial position shows healthy cash flow with some areas for optimization.`,
    dataOverview: {
      totalRecords: 1247,
      dateRange: {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        { name: 'Total Revenue', value: 125000, change: 12.5, trend: 'up' },
        { name: 'Total Expenses', value: 78000, change: -3.2, trend: 'down' },
        { name: 'Net Profit', value: 47000, change: 28.7, trend: 'up' },
      ],
    },
    patterns: [
      {
        type: 'seasonal_trend',
        description: 'Revenue shows consistent growth pattern with 15% increase during Q4',
        confidence: 0.87,
        impact: 'high',
      },
      {
        type: 'expense_optimization',
        description: 'Office supplies expenses are 23% above industry average',
        confidence: 0.74,
        impact: 'medium',
      },
    ],
    actions: [
      {
        type: 'cost_optimization',
        description: 'Review vendor contracts for office supplies to reduce costs',
        priority: 'high',
        automated: false,
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
      },
      {
        type: 'revenue_analysis',
        description: 'Analyze Q4 revenue drivers for strategic planning',
        priority: 'medium',
        automated: false,
        dueDate: Date.now() + (14 * 24 * 60 * 60 * 1000),
      },
    ],
  };
}

export default ChatbotUI;