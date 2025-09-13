'use client';

import { useRouter } from 'next/navigation';

export default function AILandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your AI CFO is Ready
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get instant financial insights, cash flow forecasts, and CFO-level analysis 
            powered by AI and your QuickBooks data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => router.push('/ai/chat')}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Start AI Chat Session
            </button>
            <button
              onClick={() => router.push('/ai/demo')}
              className="px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg border border-gray-200"
            >
              Try Demo (No Login)
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center items-center space-x-8 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">95%</div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">24/7</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">10s</div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          What Your AI CFO Can Do
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon="📊"
            title="Financial Analysis"
            description="Get instant P&L analysis, balance sheet insights, and performance metrics"
          />
          <FeatureCard
            icon="💰"
            title="Cash Flow Forecasting"
            description="Predict cash positions, identify gaps, and optimize working capital"
          />
          <FeatureCard
            icon="📈"
            title="Revenue Optimization"
            description="Identify growth opportunities and revenue leakage points"
          />
          <FeatureCard
            icon="💳"
            title="Expense Management"
            description="Find cost savings, reduce waste, and optimize spending"
          />
          <FeatureCard
            icon="🎯"
            title="Budget Planning"
            description="Create and track budgets with variance analysis"
          />
          <FeatureCard
            icon="⚠️"
            title="Anomaly Detection"
            description="Catch unusual transactions and potential issues early"
          />
        </div>
      </div>

      {/* Sample Queries */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Try These Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <SampleQuery text="What's my cash runway at current burn rate?" />
            <SampleQuery text="Show me revenue trends for the last 6 months" />
            <SampleQuery text="Which expenses can I cut to save 20%?" />
            <SampleQuery text="Compare this quarter to last quarter" />
            <SampleQuery text="What are my top 5 customers by revenue?" />
            <SampleQuery text="Forecast my cash position for next 3 months" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Financial Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of businesses using AI to make smarter financial decisions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/pricing')}
              className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => router.push('/ai/demo')}
              className="px-8 py-4 bg-blue-700 text-white text-lg font-semibold rounded-lg hover:bg-blue-800 transition-colors border border-blue-500"
            >
              Try Demo First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function SampleQuery({ text }: { text: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
      <div className="flex items-center">
        <span className="text-gray-400 mr-3">💬</span>
        <span className="text-gray-700">{text}</span>
      </div>
    </div>
  );
}