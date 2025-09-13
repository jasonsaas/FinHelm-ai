'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Bot, Building2, ChartBar, CircleDollarSign, FileText, LineChart, PieChart, Shield, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState('')

  const handleConnect = async () => {
    setIsConnecting(true)
    setStatus('Connecting...')
    
    // Try Convex API first, then fallback to direct URL
    try {
      const response = await fetch('https://ardent-dog-632.convex.cloud/api/mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'quickbooks/oauth:generateAuthUrl',
          args: {}
        })
      })
      
      const data = await response.json()
      if (data.value?.authUrl) {
        window.open(data.value.authUrl, '_blank', 'width=700,height=600')
        setStatus('Complete authorization in the popup window')
      } else {
        throw new Error('No auth URL received')
      }
    } catch (error) {
      console.error('Convex error, using direct URL:', error)
      // Fallback to direct OAuth URL
      const directUrl = 'https://sandbox-quickbooks.api.intuit.com/oauth2/v1/authorize?client_id=ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4&scope=com.intuit.quickbooks.accounting+openid+profile+email+phone+address&redirect_uri=https%3A%2F%2Fardent-dog-632.convex.site%2Fquickbooks%2Fcallback&response_type=code&state=direct_' + Date.now() + '&code_challenge=challenge_' + Date.now() + '&code_challenge_method=S256'
      window.open(directUrl, '_blank', 'width=700,height=600')
      setStatus('Complete authorization in the popup window')
    } finally {
      setIsConnecting(false)
    }
  }

  const features = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Cash Flow Forecasting",
      description: "AI-powered 13-week rolling forecasts with accuracy tracking"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Revenue Analytics",
      description: "Track MRR, ARR, churn rates, and customer lifetime value"
    },
    {
      icon: <CircleDollarSign className="h-6 w-6" />,
      title: "Expense Management",
      description: "Categorize, analyze, and optimize your spending patterns"
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "AI Financial Advisor",
      description: "Get personalized insights and recommendations from 25+ specialized agents"
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      title: "Multi-Entity Support",
      description: "Manage multiple companies and subsidiaries in one platform"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Bank-Grade Security",
      description: "SOC 2 compliant with end-to-end encryption"
    }
  ]

  const metrics = [
    { label: "Active Users", value: "2,450+", growth: "+12%" },
    { label: "Transactions Analyzed", value: "$2.5B+", growth: "+25%" },
    { label: "AI Predictions Made", value: "10M+", growth: "+40%" },
    { label: "Time Saved Weekly", value: "15 hrs", growth: "+18%" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FinHelm.ai
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/integrations">
                <Button variant="ghost">Integrations</Button>
              </Link>
              <Link href="/auth">
                <Button>Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Powered by Advanced AI & Machine Learning</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Financial Intelligence
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              for Modern Businesses
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Transform your financial data into actionable insights with our suite of 25+ specialized AI agents.
            Connect QuickBooks, Sage Intacct, or use our powerful API.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                View Demo Dashboard
              </Button>
            </Link>
          </div>
          {status && (
            <p className="text-sm text-gray-500 mt-4">
              {status}
            </p>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {metrics.map((metric, i) => (
            <Card key={i} className="border-gray-200">
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-2">{metric.label}</p>
                <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-sm text-green-600 mt-2">{metric.growth} this month</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need for Financial Excellence</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines real-time data sync, AI analysis, and predictive modeling to give you unprecedented financial visibility.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg text-blue-600">
                      {feature.icon}
                    </div>
                    <span className="text-lg">{feature.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Agents Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-12 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">25+ Specialized AI Agents at Your Service</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Each agent is trained on millions of financial transactions and optimized for specific tasks.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Cash Flow Analyst",
              "Tax Optimizer",
              "Revenue Forecaster",
              "Expense Auditor",
              "Risk Assessor",
              "Growth Strategist",
              "Compliance Monitor",
              "Investment Advisor"
            ].map((agent, i) => (
              <div key={i} className="bg-white rounded-lg p-4 text-center">
                <Bot className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">{agent}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-900 rounded-2xl p-12 text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Financial Operations?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using FinHelm.ai to make smarter financial decisions.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleConnect}
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-gray-900">
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t pt-12 pb-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/dashboard">Dashboard</Link></li>
                <li><Link href="/integrations">Integrations</Link></li>
                <li><Link href="#">API Docs</Link></li>
                <li><Link href="#">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#">About Us</Link></li>
                <li><Link href="#">Careers</Link></li>
                <li><Link href="#">Blog</Link></li>
                <li><Link href="#">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#">Documentation</Link></li>
                <li><Link href="#">Support</Link></li>
                <li><Link href="#">Status</Link></li>
                <li><Link href="#">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#">Privacy Policy</Link></li>
                <li><Link href="#">Terms of Service</Link></li>
                <li><Link href="#">GDPR</Link></li>
                <li><Link href="#">SOC 2</Link></li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-8 border-t text-gray-500">
            <p>© 2024 FinHelm.ai - Powered by Convex & AI</p>
          </div>
        </footer>
      </div>
    </div>
  )
}