'use client'

import { useState } from 'react'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12 pt-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            FinHelm Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Real-time financial insights powered by QuickBooks
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Connect Your QuickBooks Account</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Get instant access to cash flow forecasts, invoice tracking, and financial analytics.
              Connect your QuickBooks account to get started.
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect QuickBooks
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
              
              {status && (
                <p className="text-sm text-gray-500 mt-2">
                  {status}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold">Cash Flow Forecast</p>
            </div>
            <p className="text-sm text-gray-600">
              13-week rolling forecast with AI-powered predictions
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold">Real-time Sync</p>
            </div>
            <p className="text-sm text-gray-600">
              Automatic updates via webhooks for instant insights
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold">DSO Analytics</p>
            </div>
            <p className="text-sm text-gray-600">
              Track days sales outstanding and payment trends
            </p>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="bg-white rounded-lg shadow p-6 text-center mb-8">
          <p className="mb-4 text-gray-600">Already connected?</p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors">
                Go to Dashboard →
              </button>
            </Link>
            <Link href="/test">
              <button className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-6 py-2 rounded-lg font-medium transition-colors">
                Test Connection →
              </button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Convex & QuickBooks API</p>
          <p>© 2024 FinHelm.ai - Financial Intelligence Platform</p>
        </div>
      </div>
    </div>
  )
}