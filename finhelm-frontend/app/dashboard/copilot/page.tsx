"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Send, Bot, User, Copy, Trash2, Check, Lightbulb, 
  TrendingUp, AlertTriangle, Target, FileText, 
  Brain, Zap, ChevronRight, Clock, Star,
  BarChart3, DollarSign, Activity, ArrowUp, ArrowDown
} from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Types for the copilot system
interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  visualizations?: any[];
  actions?: any[];
  suggestions?: any[];
  confidence?: number;
}

interface ProactiveInsight {
  id: string;
  type: "opportunity" | "risk" | "trend" | "anomaly" | "optimization";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: string;
  confidence: number;
  suggestedActions: string[];
}

interface ContextualSuggestion {
  text: string;
  action: string;
  type: "command" | "query" | "optimization" | "analysis";
  priority?: "high" | "medium" | "low";
}

// Enhanced command suggestions with descriptions
const COMMAND_SUGGESTIONS = [
  {
    command: "/forecast cash_flow",
    description: "Generate cash flow projections with scenario analysis",
    category: "forecasting",
    icon: TrendingUp,
    example: "/forecast cash_flow next_quarter"
  },
  {
    command: "/compare this_month vs last_month",
    description: "Compare financial metrics between periods",
    category: "analysis",
    icon: BarChart3,
    example: "/compare Q3 vs Q2 revenue"
  },
  {
    command: "/optimize working_capital",
    description: "Get optimization suggestions for specific metrics",
    category: "optimization",
    icon: Target,
    example: "/optimize vendor_payments"
  },
  {
    command: "/report executive_summary",
    description: "Generate instant financial reports",
    category: "reporting",
    icon: FileText,
    example: "/report board_deck"
  },
  {
    command: "/alert cash_runway 60",
    description: "Set up intelligent monitoring and alerts",
    category: "monitoring",
    icon: AlertTriangle,
    example: "/alert expense_variance 15%"
  }
];

// Smart query suggestions
const SMART_QUERIES = [
  "What are my biggest expense drivers this month?",
  "How is my cash runway looking?",
  "Show me revenue trends vs last year",
  "Are there any anomalies in my expenses?",
  "What's driving my margin improvement?",
  "Analyze my customer concentration risk",
  "Show working capital optimization opportunities"
];

// Typewriter effect hook
function useTypewriter(text: string, speed: number = 30) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    setDisplayText("");
    setIsComplete(false);
    let index = 0;
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isComplete };
}

// Insight Card Component
function InsightCard({ insight, onActionClick }: { 
  insight: ProactiveInsight; 
  onActionClick: (action: string) => void;
}) {
  const priorityColors = {
    critical: "border-red-500 bg-red-50",
    high: "border-orange-500 bg-orange-50",
    medium: "border-yellow-500 bg-yellow-50",
    low: "border-blue-500 bg-blue-50"
  };

  const typeIcons = {
    opportunity: TrendingUp,
    risk: AlertTriangle,
    trend: Activity,
    anomaly: Zap,
    optimization: Target
  };

  const Icon = typeIcons[insight.type];

  return (
    <div className={`p-4 rounded-lg border-l-4 ${priorityColors[insight.priority]} mb-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <h4 className="font-semibold text-sm text-gray-800">{insight.title}</h4>
          <span className="text-xs px-2 py-1 bg-white rounded-full border">
            {Math.round(insight.confidence * 100)}% confident
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
      <p className="text-sm font-medium text-green-600 mb-3">{insight.impact}</p>
      
      <div className="flex flex-wrap gap-1">
        {insight.suggestedActions.slice(0, 2).map((action, index) => (
          <button
            key={index}
            onClick={() => onActionClick(action)}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

// Visualization Component
function VisualizationDisplay({ visualization }: { visualization: any }) {
  const renderChart = () => {
    switch (visualization.type) {
      case "line_chart":
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">{visualization.title}</h4>
            <div className="h-32 flex items-end justify-between gap-1">
              {visualization.data?.slice(0, 6).map((point: any, index: number) => (
                <div key={index} className="flex-1 bg-blue-500 rounded-t" 
                     style={{ height: `${Math.random() * 80 + 20}%` }}>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {visualization.metadata?.confidence_interval && 
                `Confidence: ${visualization.metadata.confidence_interval}%`}
            </div>
          </div>
        );
      
      case "comparison_chart":
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">{visualization.title}</h4>
            <div className="space-y-2">
              {visualization.periods?.map((period: string, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{period}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-blue-500 rounded" style={{ width: `${60 + index * 20}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-600">${(150 + index * 30)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">{visualization.title}</h4>
            <p className="text-sm text-gray-600">Visualization data ready for display</p>
          </div>
        );
    }
  };

  return (
    <div className="mt-3">
      {renderChart()}
    </div>
  );
}

// Action Button Component
function ActionButton({ action, onExecute }: { 
  action: any; 
  onExecute: (action: string) => void; 
}) {
  return (
    <button
      onClick={() => onExecute(action.action)}
      disabled={action.disabled}
      className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-colors ${
        action.type === "primary"
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      } ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {action.label}
      {action.impact && <span className="text-xs opacity-75">({action.impact})</span>}
    </button>
  );
}

// Message Display Component
function MessageDisplay({ 
  message, 
  onCopy, 
  copiedId, 
  onActionExecute 
}: {
  message: Message;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  onActionExecute: (action: string) => void;
}) {
  const { displayText, isComplete } = useTypewriter(
    message.isTyping ? message.content : message.content,
    message.isTyping ? 20 : 0
  );

  return (
    <div className={`group flex items-start gap-3 ${
      message.sender === "user" ? "justify-end" : "justify-start"
    }`}>
      {message.sender === "assistant" && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <Brain className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="relative max-w-4xl">
        <div className={`rounded-lg px-4 py-3 ${
          message.sender === "user"
            ? "bg-gray-600 text-white"
            : "bg-white border shadow-sm"
        }`}>
          <p className="text-sm leading-relaxed">
            {message.isTyping ? displayText : message.content}
            {message.confidence && (
              <span className="ml-2 text-xs opacity-75">
                ({Math.round(message.confidence * 100)}% confident)
              </span>
            )}
          </p>
          
          {/* Visualizations */}
          {message.visualizations && message.visualizations.length > 0 && isComplete && (
            <div className="mt-3 space-y-3">
              {message.visualizations.map((viz, index) => (
                <VisualizationDisplay key={index} visualization={viz} />
              ))}
            </div>
          )}
          
          {/* Action Buttons */}
          {message.actions && message.actions.length > 0 && isComplete && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.actions.map((action: any, index: number) => (
                <ActionButton 
                  key={index} 
                  action={action} 
                  onExecute={onActionExecute}
                />
              ))}
            </div>
          )}
          
          {/* Suggestions */}
          {message.suggestions && message.suggestions.length > 0 && isComplete && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {message.suggestions.map((suggestion: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => onActionExecute(suggestion.action || suggestion.text)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${
              message.sender === "user" ? "text-gray-100" : "text-gray-500"
            }`}>
              {message.timestamp.toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </p>
            
            {message.sender === "assistant" && isComplete && (
              <button
                onClick={() => onCopy(message.content, message.id)}
                className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-100 rounded transition-all"
                title="Copy message"
              >
                {copiedId === message.id ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {message.sender === "user" && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}

// Main Copilot Component
export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your FinHelm CFO Copilot. I can help you with financial analysis using natural language queries, specialized commands, and provide proactive insights. Try asking me anything about your finances or use commands like /forecast, /compare, /optimize, /report, or /alert.",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convex hooks
  const processNLQuery = useAction(api.copilot.nlpProcessor.parseNaturalLanguageQuery);
  const executeCommand = useAction(api.copilot.commandExecutor.executeCommand);
  const getProactiveInsights = useAction(api.copilot.contextEngine.generateProactiveInsights);
  const getContextualResponse = useAction(api.copilot.contextEngine.getContextualResponse);
  const userContext = useQuery(api.copilot.contextEngine.getUserContext, { organizationId: "demo-org-001" });
  const dataContext = useQuery(api.copilot.contextEngine.getDataContext, { organizationId: "demo-org-001" });

  // Load proactive insights
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  
  useEffect(() => {
    const loadInsights = async () => {
      if (dataContext) {
        try {
          const newInsights = await getProactiveInsights({
            organizationId: "demo-org-001",
            userContext,
            dataContext,
            triggerEvent: "session_start"
          });
          setInsights(newInsights);
        } catch (error) {
          console.error("Failed to load insights:", error);
        }
      }
    };

    loadInsights();
  }, [dataContext, userContext, getProactiveInsights]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      let response;
      
      // Check if it's a command
      if (textToSend.startsWith('/')) {
        // Parse and execute command
        const parsedQuery = await processNLQuery({
          query: textToSend,
          context: {
            organizationId: "demo-org-001",
            userId: "demo-user",
            previousQueries: messages.slice(-5).map(m => m.content)
          }
        });

        if (parsedQuery.type === "command" && parsedQuery.command) {
          const commandResult = await executeCommand({
            command: parsedQuery.command,
            context: {
              organizationId: "demo-org-001",
              userId: "demo-user"
            }
          });

          response = {
            response: commandResult.success 
              ? `Command executed successfully: ${JSON.stringify(commandResult.result, null, 2)}`
              : `Command failed: ${commandResult.error}`,
            visualizations: commandResult.visualizations || [],
            actions: commandResult.actions || [],
            suggestions: commandResult.followUpSuggestions?.map(s => ({ text: s, action: s })) || [],
            confidence: 0.9
          };
        }
      } else {
        // Natural language query
        response = await getContextualResponse({
          query: textToSend,
          organizationId: "demo-org-001",
          userContext: userContext || {},
          dataContext: dataContext || {},
          conversationHistory: messages.slice(-5).map(m => m.content)
        });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: "assistant",
        timestamp: new Date(),
        isTyping: true,
        visualizations: response.visualizations,
        actions: response.actions,
        suggestions: response.suggestions,
        confidence: response.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Fallback response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getIntelligentFallback(textToSend),
        sender: "assistant",
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionExecute = useCallback((action: string) => {
    handleSendMessage(action);
  }, []);

  const handleCopyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        content: "Hello! I'm your FinHelm CFO Copilot. How can I help you with your financial analysis today?",
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Insights & Commands */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">CFO Copilot</h2>
          </div>
          <p className="text-sm text-gray-600">AI-powered financial insights & commands</p>
        </div>

        {/* Proactive Insights */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-1">
                <Lightbulb className="h-4 w-4" />
                Proactive Insights
              </h3>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {insights.length}
              </span>
            </div>
            
            <div className="space-y-3 mb-6">
              {insights.slice(0, 3).map((insight) => (
                <InsightCard 
                  key={insight.id} 
                  insight={insight} 
                  onActionClick={handleActionExecute}
                />
              ))}
            </div>

            {/* Command Reference */}
            <div className="mb-4">
              <button
                onClick={() => setShowCommands(!showCommands)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 mb-3"
              >
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  Commands
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform ${showCommands ? 'rotate-90' : ''}`} />
              </button>
              
              {showCommands && (
                <div className="space-y-2">
                  {COMMAND_SUGGESTIONS.map((cmd, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      <button
                        onClick={() => handleSendMessage(cmd.example)}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {cmd.command}
                      </button>
                      <p className="text-gray-600 mt-1">{cmd.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Queries */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-1">
                <Star className="h-4 w-4" />
                Smart Queries
              </h3>
              <div className="space-y-1">
                {SMART_QUERIES.slice(0, 5).map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(query)}
                    className="w-full text-left text-xs p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    disabled={isLoading}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clear Chat Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleClearChat}
            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <MessageDisplay 
              key={message.id} 
              message={message}
              onCopy={handleCopyMessage}
              copiedId={copiedId}
              onActionExecute={handleActionExecute}
            />
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>AI is analyzing your request</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="flex items-end gap-3 max-w-4xl">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about your finances or use commands like /forecast, /compare, /optimize, /report..."
                className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">
                  Try: "What's my cash runway?" or "/forecast cash_flow"
                </div>
                <div className="text-xs text-gray-400">
                  Enter to send • Shift+Enter for new line
                </div>
              </div>
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback responses for when Convex calls fail
function getIntelligentFallback(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('/forecast')) {
    return "I'd generate a comprehensive forecast analysis here, including scenario modeling, confidence intervals, and key assumptions. The forecast would show projected cash flows, revenue trends, and potential risks with actionable recommendations.";
  }
  
  if (lowerQuery.includes('/compare')) {
    return "I'd provide a detailed period comparison showing variance analysis, trend identification, and key performance drivers. This would include visual charts and insights into what's driving the changes.";
  }
  
  if (lowerQuery.includes('/optimize')) {
    return "I'd analyze optimization opportunities with specific recommendations, estimated impact, and implementation timelines. This would include prioritized action items and potential ROI calculations.";
  }
  
  if (lowerQuery.includes('/report')) {
    return "I'd generate an instant financial report with executive summaries, key metrics, and downloadable formats. The report would be tailored to your specific needs and stakeholder requirements.";
  }
  
  if (lowerQuery.includes('cash')) {
    return "Your current cash position shows strong liquidity with opportunities for optimization. I can help you analyze cash flow patterns, runway calculations, and working capital efficiency.";
  }
  
  return "I understand your request and would provide comprehensive financial analysis with actionable insights. I can help with forecasting, comparisons, optimizations, reporting, and proactive monitoring of your financial metrics.";
}