import Link from "next/link";
import { TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">FinHelm.ai</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered financial intelligence for modern businesses. Connect your QuickBooks data and get instant insights.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <TrendingUp className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
            <p className="text-gray-600">Real-time financial insights powered by AI</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <Shield className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure Integration</h3>
            <p className="text-gray-600">Enterprise-grade security for your financial data</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Interactive Dashboard</h3>
            <p className="text-gray-600">Comprehensive views of your business metrics</p>
          </div>
        </div>

        <div className="text-center">
          <Link 
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Access Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
