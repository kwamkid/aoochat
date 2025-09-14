// src/app/api/platforms/facebook/connect/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Facebook OAuth configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '765754886426074'
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''
const FACEBOOK_API_VERSION = 'v18.0'

// Get the base URL dynamically
function getBaseUrl(request: NextRequest): string {
  // In production, use your actual domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  }
  
  // In development, use the request URL
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

/**
 * GET handler for Facebook OAuth
 * - action=auth: Redirect to Facebook OAuth
 * - action=callback: Handle OAuth callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const baseUrl = getBaseUrl(request)
  
  // Action: Start OAuth flow
  if (action === 'auth') {
    const state = crypto.randomUUID()
    
    // Store state in cookie for verification
    const response = NextResponse.redirect(
      `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(`${baseUrl}/api/platforms/facebook/connect?action=callback`)}&` +
      `scope=pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata&` +
      `response_type=code&` +
      `state=${state}`
    )
    
    // Set state cookie
    response.cookies.set('fb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    return response
  }
  
  // Action: Handle OAuth callback
  if (action === 'callback') {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    // Handle user cancellation
    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings/platforms?error=${error}`)
    }
    
    // Verify state
    const storedState = request.cookies.get('fb_oauth_state')?.value
    if (!state || state !== storedState) {
      return NextResponse.redirect(`${baseUrl}/settings/platforms?error=invalid_state`)
    }
    
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/settings/platforms?error=no_code`)
    }
    
    try {
      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token?` +
        `client_id=${FACEBOOK_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(`${baseUrl}/api/platforms/facebook/connect?action=callback`)}&` +
        `client_secret=${FACEBOOK_APP_SECRET}&` +
        `code=${code}`
      
      const tokenResponse = await fetch(tokenUrl)
      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok || tokenData.error) {
        console.error('Token exchange error:', tokenData.error)
        return NextResponse.redirect(`${baseUrl}/settings/platforms?error=token_exchange_failed`)
      }
      
      const userAccessToken = tokenData.access_token
      
      // Redirect back to settings with token (temporary - should store in DB)
      return NextResponse.redirect(
        `${baseUrl}/settings/platforms?token=${userAccessToken}&platform=facebook`
      )
      
    } catch (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(`${baseUrl}/settings/platforms?error=oauth_failed`)
    }
  }
  
  // Invalid action
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/**
 * POST handler for saving Facebook pages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAccessToken } = body
    
    if (!userAccessToken) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 400 })
    }
    
    // Get user's Facebook pages
    const pagesUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?access_token=${userAccessToken}`
    const pagesResponse = await fetch(pagesUrl)
    const pagesData = await pagesResponse.json()
    
    if (!pagesResponse.ok || pagesData.error) {
      console.error('Error fetching pages:', pagesData.error)
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }
    
    // Transform pages data
    const pages = pagesData.data.map((page: any) => ({
      id: page.id,
      account_id: page.id,
      account_name: page.name,
      category: page.category,
      access_token: page.access_token,
      is_active: false,
      metadata: {
        tasks: page.tasks,
        category_list: page.category_list
      }
    }))
    
    return NextResponse.json({ success: true, pages })
    
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT handler for saving selected pages to database
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { pages } = body
    
    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json({ error: 'Invalid pages data' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user/organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Save pages to database
    for (const page of pages) {
      const { error } = await supabase
        .from('platform_accounts')
        .upsert({
          platform: 'facebook',
          account_id: page.account_id,
          account_name: page.account_name,
          access_token: page.access_token,
          is_active: true,
          metadata: page.metadata || {},
          last_sync_at: new Date().toISOString()
        }, {
          onConflict: 'platform,account_id'
        })
      
      if (error) {
        console.error('Error saving page:', error)
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in PUT handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH handler for updating page status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, isActive } = body
    
    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user's organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('platform_accounts')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
      .eq('organization_id', userData.organization_id)
    
    if (error) {
      console.error('Error updating page:', error)
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in PATCH handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}