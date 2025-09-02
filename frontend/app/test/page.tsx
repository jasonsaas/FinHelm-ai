'use client'

export default function TestPage() {
  const handleDirectOAuth = () => {
    // Direct OAuth URL with your credentials
    const clientId = 'ABUFXqPoGWDqAy96lWWU0wkgUGbfUJqImb0TJoZWfhHwFOD7O4'
    const redirectUri = encodeURIComponent('https://ardent-dog-632.convex.site/quickbooks/callback')
    const scope = 'com.intuit.quickbooks.accounting+openid+profile+email+phone+address'
    
    const oauthUrl = `https://sandbox-quickbooks.api.intuit.com/oauth2/v1/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&response_type=code&state=test_${Date.now()}&code_challenge=challenge_${Date.now()}&code_challenge_method=S256`
    
    console.log('Opening OAuth URL:', oauthUrl)
    window.open(oauthUrl, '_blank', 'width=700,height=600')
  }

  const handleConvexOAuth = async () => {
    try {
      console.log('Calling Convex API...')
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
      
      const data = await response.json()
      console.log('Convex response:', data)
      
      if (data.value?.authUrl) {
        window.open(data.value.authUrl, '_blank', 'width=700,height=600')
      } else {
        console.error('No auth URL in response')
        alert('Failed to get auth URL from Convex')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error)
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>QuickBooks Connection Test</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Option 1: Direct OAuth (No Dependencies)</h2>
        <button 
          onClick={handleDirectOAuth}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        >
          Connect QuickBooks (Direct)
        </button>
        <p style={{ marginTop: '10px', color: '#666' }}>
          Opens QuickBooks OAuth directly without any API calls
        </p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Option 2: Via Convex API</h2>
        <button 
          onClick={handleConvexOAuth}
          style={{
            backgroundColor: '#16a34a',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
        >
          Connect QuickBooks (Convex)
        </button>
        <p style={{ marginTop: '10px', color: '#666' }}>
          Uses Convex backend to generate OAuth URL
        </p>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f3f4f6', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Debug Info:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✓ Page rendered successfully</li>
          <li>✓ JavaScript enabled</li>
          <li>✓ Buttons are clickable</li>
          <li>✓ Console will show OAuth URL when clicked</li>
        </ul>
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Open browser console (F12) to see debug output
        </p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>← Back to Home</a>
      </div>
    </div>
  )
}