'use client'

import { useState } from 'react'

export default function ConnectPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>('')

  const connectQuickBooks = async () => {
    setIsLoading(true)
    setStatus('Generating OAuth URL...')
    
    try {
      // Call Convex directly to generate the OAuth URL
      const response = await fetch('https://ardent-dog-632.convex.cloud/api/mutation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'quickbooks/oauth:generateAuthUrl',
          args: {}
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate OAuth URL')
      }

      const data = await response.json()
      
      if (data.status === 'success' && data.value?.authUrl) {
        setStatus('Opening QuickBooks authorization...')
        window.open(data.value.authUrl, '_blank', 'width=700,height=600')
        setStatus('Complete the authorization in the popup window')
      } else {
        // Fallback to direct URL
        setStatus('Using direct OAuth URL...')
        const directUrl = 'https://sandbox-quickbooks.api.intuit.com/oauth2/v1/authorize?client_id=ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4&scope=com.intuit.quickbooks.accounting+openid+profile+email+phone+address&redirect_uri=https%3A%2F%2Fardent-dog-632.convex.site%2Fquickbooks%2Fcallback&response_type=code&state=direct_auth&code_challenge=direct_challenge&code_challenge_method=S256'
        window.open(directUrl, '_blank', 'width=700,height=600')
      }
    } catch (error) {
      console.error('Error:', error)
      setStatus('Using fallback OAuth URL...')
      // Use direct OAuth URL as fallback
      const fallbackUrl = 'https://sandbox-quickbooks.api.intuit.com/oauth2/v1/authorize?client_id=ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4&scope=com.intuit.quickbooks.accounting+openid+profile+email+phone+address&redirect_uri=https%3A%2F%2Fardent-dog-632.convex.site%2Fquickbooks%2Fcallback&response_type=code&state=fallback_auth&code_challenge=fallback_challenge&code_challenge_method=S256'
      window.open(fallbackUrl, '_blank', 'width=700,height=600')
      setStatus('Complete the authorization in the popup window')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect to QuickBooks
          </h1>
          <p className="text-gray-600 mb-8">
            Authorize FinHelm to access your QuickBooks data
          </p>

          <div className="space-y-4">
            <button
              data-testid="connect-quickbooks"
              onClick={connectQuickBooks}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Connect QuickBooks
                </>
              )}
            </button>

            {status && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{status}</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>QuickBooks login page opens in a new window</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Enter your sandbox credentials</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Select a test company to connect</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Authorize FinHelm to access your data</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>You'll be redirected back automatically</span>
              </li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>✓ Callback Ready:</strong> The OAuth callback handler is deployed at{' '}
              <code className="bg-green-100 px-1 rounded">https://ardent-dog-632.convex.site/quickbooks/callback</code>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            Already connected? Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}