// src/app/api/platforms/facebook/connect/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Step 1: Redirect user to Facebook OAuth
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  
  if (action === 'auth') {
    // Build Facebook OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/facebook/connect?action=callback`,
      scope: 'pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata',
      response_type: 'code',
      state: crypto.randomUUID() // For security
    })
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params}`
    
    return NextResponse.redirect(authUrl)
  }
  
  // Step 2: Handle OAuth callback
  if (action === 'callback') {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code missing' },
        { status: 400 }
      )
    }
    
    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${process.env.FACEBOOK_APP_ID}` +
        `&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/facebook/connect?action=callback` +
        `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
        `&code=${code}`
      )
      
      const tokenData = await tokenResponse.json()
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token')
      }
      
      // Store user access token temporarily (or in session)
      // Then redirect to page selection UI
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/platforms/facebook?token=${tokenData.access_token}`
      )
      
    } catch (error) {
      console.error('OAuth error:', error)
      return NextResponse.json(
        { error: 'OAuth failed' },
        { status: 500 }
      )
    }
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/**
 * Get list of Facebook Pages for the user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userAccessToken } = body
    
    if (!userAccessToken) {
      return NextResponse.json(
        { error: 'User access token required' },
        { status: 400 }
      )
    }
    
    // Get list of pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`
    )
    
    const pagesData = await pagesResponse.json()
    
    if (!pagesData.data) {
      throw new Error('Failed to get pages')
    }
    
    // Transform pages data
    const pages = pagesData.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      access_token: page.access_token, // This is the page access token
      tasks: page.tasks, // Permissions this user has on the page
      instagram_business_account: page.instagram_business_account
    }))
    
    return NextResponse.json({
      success: true,
      pages
    })
    
  } catch (error) {
    console.error('Error getting pages:', error)
    return NextResponse.json(
      { error: 'Failed to get pages' },
      { status: 500 }
    )
  }
}

/**
 * Save selected pages to database
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { pages } = body // Array of selected pages with their tokens
    
    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Pages array required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get current user/organization
    // For now, we'll use a default organization ID
    const organizationId = 'default-org-id' // Should get from session
    
    // Save each page
    const savedPages = []
    for (const page of pages) {
      // Check if page already exists
      const { data: existing } = await supabase
        .from('platform_accounts')
        .select('id')
        .eq('platform', 'facebook')
        .eq('account_id', page.id)
        .eq('organization_id', organizationId)
        .single()
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('platform_accounts')
          .update({
            account_name: page.name,
            access_token: page.access_token, // Should encrypt this
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()
        
        if (!error) savedPages.push(data)
      } else {
        // Create new
        const { data, error } = await supabase
          .from('platform_accounts')
          .insert({
            organization_id: organizationId,
            platform: 'facebook',
            account_id: page.id,
            account_name: page.name,
            access_token: page.access_token, // Should encrypt this
            is_active: true,
            metadata: {
              category: page.category,
              permissions: page.tasks
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (!error) savedPages.push(data)
      }
    }
    
    return NextResponse.json({
      success: true,
      pages: savedPages
    })
    
  } catch (error) {
    console.error('Error saving pages:', error)
    return NextResponse.json(
      { error: 'Failed to save pages' },
      { status: 500 }
    )
  }
}

/**
 * Toggle page active status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, isActive } = body
    
    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('platform_accounts')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      page: data
    })
    
  } catch (error) {
    console.error('Error toggling page:', error)
    return NextResponse.json(
      { error: 'Failed to toggle page' },
      { status: 500 }
    )
  }
}