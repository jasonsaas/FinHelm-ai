'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIDemoPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Welcome to FinHelm AI CFO! I'm your AI-powered financial assistant.

I can help you with:
• 📊 Financial analysis and reporting
• 💰 Cash flow forecasting
• 📈 Revenue insights and trends
• 💳 Expense optimization
• 🎯 Budget planning and tracking
• ⚠️ Anomaly detection

How can I assist you with your finances today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const cashFlowData = useQuery(
    api.aiAgents.cashFlowForecast,
    shouldFetch ? {} : "skip"
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    handleAgentQuery();
  };

  const handleAgentQuery = () => {
    setShouldFetch(true);
    if (cashFlowData) {
      console.log("Real data received:", cashFlowData);
      // Update UI with real data as needed
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                FinHelm AI CFO
              </h1>
              <span className="ml-3 px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
                DEMO
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/pricing"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started - $149/mo
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t pt-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about your finances..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <QuickPrompt text="Analyze my cash flow" onClick={setInput} />
            <QuickPrompt text="Show revenue trends" onClick={setInput} />
            <QuickPrompt text="Review expenses" onClick={setInput} />
            <QuickPrompt text="Forecast next quarter" onClick={setInput} />
          </div>
        </form>
      </main>
    </div>
  );
}

function QuickPrompt({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
    >
      {text}
    </button>
  );
}

function generateMockResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('cash flow')) {
    return `📊 **Cash Flow Analysis**

Based on your QuickBooks data:

**Current Month Performance:**
• Cash Inflows: $145,230 (+12% MoM)
• Cash Outflows: $98,450 (-5% MoM)
• Net Cash Flow: $46,780

**Key Insights:**
1. Strong collection rate at 92% this month
2. Operating expenses are well controlled
3. Positive cash position for next 45 days

**Recommendations:**
• Consider accelerating invoice collection
• Review recurring subscriptions for savings
• Maintain 60-day cash buffer

Would you like me to break down any specific category?`;
  }
  
  if (lowerQuery.includes('revenue')) {
    return `📈 **Revenue Trends & Insights**

**Performance Summary:**
• Monthly Revenue: $158,900 (+23% MoM)
• Quarterly Growth: +18% QoQ
• YTD Revenue: $1.2M (87% of target)

**Top Revenue Streams:**
1. Product Sales: $89,200 (56%)
2. Services: $45,300 (28%)
3. Subscriptions: $24,400 (16%)

**Growth Opportunities:**
• Service revenue showing strongest growth
• New customer acquisition up 31%
• Average deal size increased by $2,300

Shall I analyze any specific revenue stream in detail?`;
  }
  
  if (lowerQuery.includes('expense')) {
    return `💳 **Expense Review & Optimization**

**Monthly Expenses: $98,450**

**Breakdown by Category:**
• Payroll: $45,000 (46%)
• Marketing: $18,500 (19%)
• Operations: $15,200 (15%)
• Technology: $8,900 (9%)
• Other: $10,850 (11%)

**Cost-Saving Opportunities:**
🔴 Marketing spend 23% over budget
🟡 Software subscriptions: $3,200/mo (15 unused licenses)
🟢 Office expenses reduced by 12%

**Recommendations:**
1. Review marketing ROI by channel
2. Audit software subscriptions
3. Negotiate vendor contracts (potential 10-15% savings)

Would you like me to deep-dive into any category?`;
  }
  
  if (lowerQuery.includes('forecast')) {
    return `🔮 **Financial Forecast - Next Quarter**

**Q2 2024 Projections:**

**Revenue Forecast:**
• Conservative: $485,000
• Expected: $520,000
• Optimistic: $565,000

**Key Assumptions:**
• Current growth rate continues (20-25%)
• Seasonal adjustment for summer months
• 2 major deals in pipeline ($85K total)

**Cash Position:**
• Projected End Q2: $325,000
• Runway: 3.5 months
• Break-even expected: Month 2

**Risk Factors:**
• Customer concentration (top 3 = 45% revenue)
• Seasonal slowdown in July
• Pending contract renewals

Need me to model different scenarios?`;
  }
  
  return `I understand you're asking about "${query}". 

As your AI CFO, I can provide detailed analysis on:
• Financial performance metrics
• Cash flow management
• Revenue optimization
• Expense reduction strategies
• Budget planning and forecasting
• Financial risk assessment

To give you the most accurate insights, I'll need to connect to your QuickBooks account. 

Would you like to start with a specific financial area, or shall I provide an overall financial health assessment?`;
}