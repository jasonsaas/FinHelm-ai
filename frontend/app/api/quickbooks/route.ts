import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const realmId = searchParams.get('realmId')
  const error = searchParams.get('error')
  
  // Handle error
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${error}`, request.url)
    )
  }
  
  // Validate parameters
  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/?error=missing_parameters', request.url)
    )
  }
  
  // The actual token exchange is handled by the Convex callback endpoint
  // This route is just for local development fallback
  
  // Redirect to dashboard after successful auth
  return NextResponse.redirect(
    new URL('/dashboard?connected=true', request.url)
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle token refresh requests
    if (body.action === 'refresh') {
      // Token refresh is handled by Convex
      return NextResponse.json({ 
        success: true, 
        message: 'Token refresh handled by Convex' 
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Unknown action' 
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Invalid request' 
    }, { status: 400 })
  }
}