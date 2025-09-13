'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import ChatbotUI from '../../../src/components/chatbot-ui';

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://your-convex-instance.convex.cloud';
const convex = new ConvexReactClient(convexUrl);

export default function AIChatPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    // For demo/beta, we can use mock authentication
    const checkAuth = () => {
      const storedUserId = localStorage.getItem('userId') || 'demo-user';
      const storedOrgId = localStorage.getItem('organizationId') || 'demo-org';
      
      setUserId(storedUserId);
      setOrganizationId(storedOrgId);
      setIsAuthenticated(true);
    };

    checkAuth();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading AI Assistant...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  FinHelm AI CFO
                </h1>
                <span className="ml-3 px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
                  BETA
                </span>
              </div>
              
              <nav className="flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Pricing
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    router.push('/');
                  }}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Chat Interface */}
        <main className="flex-1" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="h-full max-w-7xl mx-auto">
            <div className="h-full flex">
              {/* Sidebar with Quick Actions */}
              <aside className="w-64 bg-white border-r p-4 hidden lg:block">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <QuickActionButton
                    icon="📊"
                    label="Financial Analysis"
                    action="Analyze my financial performance for this quarter"
                  />
                  <QuickActionButton
                    icon="💰"
                    label="Cash Flow Forecast"
                    action="Generate a cash flow forecast for the next 3 months"
                  />
                  <QuickActionButton
                    icon="📈"
                    label="Revenue Insights"
                    action="Show me revenue trends and growth opportunities"
                  />
                  <QuickActionButton
                    icon="💳"
                    label="Expense Review"
                    action="Review my expenses and suggest cost-saving opportunities"
                  />
                  <QuickActionButton
                    icon="🎯"
                    label="Budget Analysis"
                    action="Compare actual vs budgeted expenses"
                  />
                  <QuickActionButton
                    icon="⚠️"
                    label="Anomaly Detection"
                    action="Check for any unusual transactions or patterns"
                  />
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Pro Tip</h4>
                  <p className="text-sm text-blue-700">
                    Ask me anything about your finances! I can analyze trends, 
                    forecast cash flow, identify savings, and provide CFO-level insights.
                  </p>
                </div>
              </aside>

              {/* Chat Interface */}
              <div className="flex-1 flex flex-col">
                <ChatbotUI
                  className="h-full"
                  organizationId={organizationId}
                  userId={userId}
                />
              </div>

              {/* Right Panel - Insights */}
              <aside className="w-80 bg-white border-l p-4 hidden xl:block">
                <h3 className="font-semibold text-gray-900 mb-4">Latest Insights</h3>
                <div className="space-y-4">
                  <InsightCard
                    type="positive"
                    title="Revenue Growth"
                    value="+23%"
                    description="Month-over-month increase"
                  />
                  <InsightCard
                    type="warning"
                    title="Expense Alert"
                    value="$12,450"
                    description="Marketing spend above budget"
                  />
                  <InsightCard
                    type="neutral"
                    title="Cash Position"
                    value="$245,890"
                    description="45 days of runway"
                  />
                  <InsightCard
                    type="positive"
                    title="Collections"
                    value="92%"
                    description="On-time payment rate"
                  />
                </div>

                <div className="mt-8">
                  <h4 className="font-semibold text-gray-900 mb-3">Recent Reports</h4>
                  <div className="space-y-2">
                    <ReportLink name="P&L Statement" date="Today" />
                    <ReportLink name="Cash Flow Report" date="Yesterday" />
                    <ReportLink name="Budget Variance" date="2 days ago" />
                    <ReportLink name="AR Aging" date="3 days ago" />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>

        {/* Mobile Quick Actions (Bottom Sheet) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="flex space-x-2 overflow-x-auto">
            <MobileQuickAction icon="📊" label="Analysis" />
            <MobileQuickAction icon="💰" label="Cash Flow" />
            <MobileQuickAction icon="📈" label="Revenue" />
            <MobileQuickAction icon="💳" label="Expenses" />
            <MobileQuickAction icon="⚠️" label="Alerts" />
          </div>
        </div>
      </div>
    </ConvexProvider>
  );
}

// Component for Quick Action Buttons
function QuickActionButton({ icon, label, action }: { icon: string; label: string; action: string }) {
  const handleClick = () => {
    // This would trigger a predefined query in the chat
    const event = new CustomEvent('quickAction', { detail: { action } });
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center">
        <span className="text-xl mr-3">{icon}</span>
        <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
      </div>
    </button>
  );
}

// Component for Insight Cards
function InsightCard({ 
  type, 
  title, 
  value, 
  description 
}: { 
  type: 'positive' | 'negative' | 'warning' | 'neutral';
  title: string;
  value: string;
  description: string;
}) {
  const colorClasses = {
    positive: 'bg-green-50 text-green-900 border-green-200',
    negative: 'bg-red-50 text-red-900 border-red-200',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
    neutral: 'bg-gray-50 text-gray-900 border-gray-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[type]}`}>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-75">{description}</p>
    </div>
  );
}

// Component for Report Links
function ReportLink({ name, date }: { name: string; date: string }) {
  return (
    <button className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-700">{name}</span>
        <span className="text-xs text-gray-500">{date}</span>
      </div>
    </button>
  );
}

// Component for Mobile Quick Actions
function MobileQuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex-shrink-0 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex flex-col items-center">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-600 mt-1">{label}</span>
      </div>
    </button>
  );
}