'use client'

export default function SimplePage() {
  const handleClick = () => {
    alert('Button clicked! Opening QuickBooks OAuth...')
    const oauthUrl = 'https://sandbox-quickbooks.api.intuit.com/oauth2/v1/authorize?client_id=ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4&scope=com.intuit.quickbooks.accounting+openid+profile+email+phone+address&redirect_uri=https%3A%2F%2Fardent-dog-632.convex.site%2Fquickbooks%2Fcallback&response_type=code&state=test123&code_challenge=test_challenge&code_challenge_method=S256'
    window.open(oauthUrl, '_blank')
  }

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-8">Simple Test Page</h1>
      <button 
        onClick={handleClick}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
      >
        Connect QuickBooks (Simple)
      </button>
      <p className="mt-4 text-gray-600">
        This button works without any Convex dependencies
      </p>
    </div>
  )
}