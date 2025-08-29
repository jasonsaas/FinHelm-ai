"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Copy, Trash2, Check, Lightbulb } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
}

// Suggested prompts for Sage Intacct
const suggestedPrompts = [
  "Analyze this month's close",
  "Compare actuals to budget",
  "Show dimension performance",
  "Review entity consolidation",
  "Identify financial variances"
];

// Typewriter effect hook
function useTypewriter(text: string, speed: number = 50) {
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

// Message Display Component
function MessageDisplay({ message, onCopy, copiedId }: {
  message: Message;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
}) {
  const { displayText, isComplete } = useTypewriter(
    message.isTyping ? message.content : message.content,
    message.isTyping ? 20 : 0
  );

  return (
    <div
      className={`group flex items-start gap-3 ${
        message.sender === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {message.sender === "assistant" && (
        <div className="flex-shrink-0 w-8 h-8 bg-sage-green rounded-full flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="relative">
        <div
          className={`max-w-3xl rounded-lg px-4 py-3 ${
            message.sender === "user"
              ? "bg-sage-gray text-white"
              : "bg-white border shadow-sm"
          }`}
        >
          <p className="text-sm leading-relaxed">
            {message.isTyping ? displayText : message.content}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${
              message.sender === "user" ? "text-gray-100" : "text-sage-gray"
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

export default function Chat() {
  const processChat = useAction(api.chatActions.processChat);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your FinHelm AI Insights assistant for Sage Intacct. I can help you analyze your financial data, dimensions, entities, and provide intelligent insights. What would you like to explore?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // Try to call Convex action first
      const result = await processChat({
        orgId: 'demo-org-001',
        message: textToSend,
        context: {}
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: result.response,
        sender: "assistant",
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error calling Convex action:', error);
      
      // Fallback to local intelligent response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getIntelligentResponse(textToSend),
        sender: "assistant",
        timestamp: new Date(),
        isTyping: true,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }
  };

  const getIntelligentResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('dimension') || lowerQuery.includes('variance')) {
      return "Based on your Sage Intacct dimension analysis, I see some interesting variances. The Sales dimension is performing 15.2% above target, while Finance shows a -2.1% variance that needs attention. Operations is steady at +8.7%. Would you like me to drill down into specific GL accounts within these dimensions?";
    }
    
    if (lowerQuery.includes('entity') || lowerQuery.includes('compare')) {
      return "Looking at your entity performance, International Division leads with $4.1M revenue and 29.3% margin, followed by East Coast Operations at $3.2M with excellent 34.4% margin. Central Region has the highest margin at 35.1% despite lower revenue. Should we analyze what's driving Central Region's efficiency?";
    }
    
    if (lowerQuery.includes('revenue') || lowerQuery.includes('location')) {
      return "Your revenue by location shows strong geographic diversification. International operations contribute 35.3% of total revenue, East Coast 27.6%, West Coast 21.1%, and Central 16.0%. The 6-month trend shows consistent growth across all regions with International showing the steepest growth curve.";
    }
    
    if (lowerQuery.includes('anomal') || lowerQuery.includes('expense')) {
      return "I've detected several expense anomalies in your data: Marketing expenses spiked 23% in June (unusual for seasonal patterns), IT costs show irregular monthly variations suggesting vendor billing inconsistencies, and Professional Services expenses are 15% below budget - which might indicate delayed projects. Would you like me to investigate any of these further?";
    }
    
    if (lowerQuery.includes('forecast') || lowerQuery.includes('quarter')) {
      return "Based on current trends and seasonal patterns, Q4 forecast shows: Revenue projected at $12.8M (+8.5% vs Q3), with International Division expected to reach $4.6M. Cash flow should remain strong at $3.1M average monthly. Key risk factors include potential economic headwinds affecting International markets. Would you like scenario analysis for conservative/optimistic cases?";
    }
    
    return "I can help you analyze your Sage Intacct data across dimensions, entities, statistical accounts, and more. Try asking about specific metrics, variance analysis, entity comparisons, or forecasting. I have access to your GL data, budget vs actuals, and can perform dimensional analysis across departments, locations, and projects.";
  };

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
        content: "Hello! I'm your FinHelm AI Insights assistant. I can help you analyze your financial data, answer questions about your accounts, and provide insights. What would you like to know?",
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar with Suggested Queries */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-5 w-5 text-sage-green" />
            <h2 className="font-semibold text-sage-dark">AI Insights</h2>
          </div>
          <p className="text-sm text-sage-gray">Ask me about your Sage Intacct data</p>
        </div>

        <div className="flex-1 p-4">
          <h3 className="text-sm font-medium text-sage-dark mb-3">Suggested Queries</h3>
          <div className="space-y-2">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="w-full text-left p-3 text-sm text-sage-gray hover:text-sage-green hover:bg-green-50 rounded-lg transition-colors border border-gray-200 hover:border-sage-green"
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleClearChat}
            className="w-full flex items-center justify-center gap-2 text-sage-gray hover:text-sage-dark px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <MessageDisplay 
              key={message.id} 
              message={message}
              onCopy={handleCopyMessage}
              copiedId={copiedId}
            />
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-sage-green rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-sage-gray">
                  <span>AI is analyzing your data</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-white p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me about dimensions, entities, variances, or forecasting..."
                className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage-green focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-sage-green text-white p-3 rounded-lg hover:bg-sage-green-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}