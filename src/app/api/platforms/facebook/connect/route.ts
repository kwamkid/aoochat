// src/app/api/platforms/facebook/connect/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Facebook OAuth configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '765754886426074'
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''
const FACEBOOK_API_VERSION = 'v18.0'

// Get the base URL dynamically
function getBaseUrl(request: NextRequest): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  }
  
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

/**
 * Subscribe page to webhook automatically
 */
async function subscribePageToWebhook(pageId: string, accessToken: string): Promise<boolean> {
  try {
    console.log(`Auto-subscribing page ${pageId} to webhook...`)
    
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pageId}/subscribed_apps`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: [
          'messages',
          'messaging_postbacks',
          'messaging_optins',
          'message_deliveries',
          'message_reads',
          'messaging_payments',
          'messaging_pre_checkouts',
          'messaging_checkout_updates',
          'messaging_handovers',
          'messaging_policy_enforcement',
          'message_reactions'
        ].join(','),
        access_token: accessToken
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error(`Failed to subscribe page ${pageId}:`, data.error)
      return false
    }
    
    console.log(`✅ Page ${pageId} subscribed to webhook successfully`)
    return true
  } catch (error) {
    console.error(`Error subscribing page ${pageId}:`, error)
    return false
  }
}

/**
 * GET handler for Facebook OAuth
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const baseUrl = getBaseUrl(request)
  
  // Action: Start OAuth flow
  if (action === 'auth') {
    const state = crypto.randomUUID()
    const organizationId = searchParams.get('orgId')
    
    // Store state and orgId in cookie for verification
    const response = NextResponse.redirect(
      `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(`${baseUrl}/api/platforms/facebook/connect?action=callback`)}&` +
      `scope=pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata&` +
      `response_type=code&` +
      `state=${state}`
    )
    
    // Set cookies
    response.cookies.set('fb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    if (organizationId) {
      response.cookies.set('fb_oauth_org_id', organizationId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10 // 10 minutes
      })
    }
    
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
    const storedOrgId = request.cookies.get('fb_oauth_org_id')?.value
    
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
      
      // Get user's Facebook pages
      const pagesUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?access_token=${userAccessToken}`
      const pagesResponse = await fetch(pagesUrl)
      const pagesData = await pagesResponse.json()
      
      if (!pagesResponse.ok || pagesData.error) {
        console.error('Error fetching pages:', pagesData.error)
        return NextResponse.redirect(`${baseUrl}/settings/platforms?error=pages_fetch_failed`)
      }
      
      // Save pages to database if we have organization ID
      if (storedOrgId && pagesData.data && pagesData.data.length > 0) {
        const supabase = await createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          return NextResponse.redirect(`${baseUrl}/settings/platforms?error=not_authenticated`)
        }
        
        let subscribedCount = 0
        
        // Save each page to database
        for (const page of pagesData.data) {
          const { error: saveError } = await supabase
            .from('platform_accounts')
            .upsert({
              organization_id: storedOrgId,
              platform: 'facebook',
              account_id: page.id,
              account_name: page.name,
              access_token: page.access_token,
              is_active: true, // Auto-activate
              metadata: {
                category: page.category,
                tasks: page.tasks,
                category_list: page.category_list
              },
              last_sync_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,platform,account_id'
            })
          
          if (saveError) {
            console.error('Error saving page:', saveError)
          } else {
            // Auto-subscribe page to webhook after saving
            const subscribed = await subscribePageToWebhook(page.id, page.access_token)
            if (subscribed) {
              subscribedCount++
            }
          }
        }
        
        // Clear cookies
        const response = NextResponse.redirect(
          `${baseUrl}/settings/platforms?success=true&pages=${pagesData.data.length}&subscribed=${subscribedCount}`
        )
        response.cookies.delete('fb_oauth_state')
        response.cookies.delete('fb_oauth_org_id')
        
        return response
      }
      
      // If no org ID, redirect with token for manual processing
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
 * POST handler for manually saving pages (when token is passed from frontend)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== POST Request Started ===')
    const body = await request.json()
    const { userAccessToken, organizationId } = body
    
    console.log('Request params:', {
      hasToken: !!userAccessToken,
      tokenLength: userAccessToken?.length,
      organizationId
    })
    
    if (!userAccessToken || !organizationId) {
      console.error('Missing required fields')
      return NextResponse.json({ 
        error: 'Missing required fields (token or organizationId)' 
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('User not authenticated')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('Fetching Facebook pages...')
    
    // Get user's Facebook pages with more fields
    const fields = 'id,name,category,access_token,tasks,category_list,is_published,is_webhooks_subscribed'
    const pagesUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?fields=${fields}&access_token=${userAccessToken}`
    console.log('Facebook API URL:', pagesUrl.replace(userAccessToken, 'TOKEN_HIDDEN'))
    
    const pagesResponse = await fetch(pagesUrl)
    const pagesData = await pagesResponse.json()
    
    console.log('Facebook API Response:', {
      ok: pagesResponse.ok,
      status: pagesResponse.status,
      hasData: !!pagesData.data,
      pageCount: pagesData.data?.length || 0,
      error: pagesData.error
    })
    
    // Log raw response for debugging
    console.log('Raw Facebook Response:', JSON.stringify(pagesData, null, 2))
    
    if (!pagesResponse.ok || pagesData.error) {
      console.error('Error fetching pages from Facebook:', pagesData.error)
      return NextResponse.json({ 
        error: 'Failed to fetch pages from Facebook',
        details: pagesData.error,
        errorMessage: pagesData.error?.message,
        errorType: pagesData.error?.type
      }, { status: 500 })
    }
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('No pages found for this user')
      return NextResponse.json({ 
        success: true,
        pages: [],
        count: 0,
        message: 'No Facebook pages found. Make sure you have admin access to at least one Facebook page.'
      })
    }
    
    // Transform pages data
    const pages = pagesData.data.map((page: any) => {
      console.log('Processing page:', {
        id: page.id,
        name: page.name,
        category: page.category,
        hasAccessToken: !!page.access_token
      })
      
      return {
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
      }
    })
    
    console.log(`=== POST Response: Found ${pages.length} pages ===`)
    
    return NextResponse.json({ 
      success: true, 
      pages,
      count: pages.length,
      pageNames: pages.map((p: any) => p.account_name)
    })
    
  } catch (error) {
    console.error('=== Error in POST handler ===')
    console.error(error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT handler for saving selected pages to database
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('=== PUT Request Started ===')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { pages, organizationId } = body
    
    if (!pages || !Array.isArray(pages)) {
      console.error('Invalid pages data:', pages)
      return NextResponse.json({ 
        error: 'Invalid pages data' 
      }, { status: 400 })
    }
    
    if (!organizationId) {
      console.error('Missing organizationId')
      return NextResponse.json({ 
        error: 'Missing organizationId' 
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth error', details: authError.message }, { status: 401 })
    }
    
    if (!user) {
      console.error('No user found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)
    console.log(`Attempting to save ${pages.length} pages for organization ${organizationId}`)
    
    // Save pages to database
    const savedPages = []
    const errors = []
    let subscribedCount = 0
    
    for (const page of pages) {
      // Check if page has required fields
      if (!page.account_id || !page.account_name) {
        console.error('Invalid page data:', page)
        errors.push({ 
          page: page.account_name || 'Unknown', 
          error: 'Missing required fields (account_id or account_name)' 
        })
        continue
      }
      
      // Prepare page data
      const pageData = {
        organization_id: organizationId,
        platform: 'facebook' as const,
        account_id: page.account_id,
        account_name: page.account_name,
        access_token: page.access_token || '',
        is_active: true,
        metadata: page.metadata || {},
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Attempting to save page:', {
        name: pageData.account_name,
        id: pageData.account_id,
        org: pageData.organization_id
      })
      
      try {
        // Try using regular client first (since RLS is disabled)
        const { data, error } = await supabase
          .from('platform_accounts')
          .upsert(pageData, {
            onConflict: 'organization_id,platform,account_id',
            ignoreDuplicates: false
          })
          .select()
          .single()
        
        if (error) {
          console.error('Supabase error saving page:', {
            page: page.account_name,
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          
          // Try direct insert if upsert fails
          console.log('Trying direct insert...')
          const { data: insertData, error: insertError } = await supabase
            .from('platform_accounts')
            .insert(pageData)
            .select()
            .single()
          
          if (insertError) {
            console.error('Insert also failed:', insertError)
            errors.push({ 
              page: page.account_name, 
              error: insertError.message,
              code: insertError.code 
            })
          } else if (insertData) {
            savedPages.push(insertData)
            console.log(`✅ Saved page via insert: ${page.account_name}`)
            
            // Auto-subscribe to webhook after saving
            if (page.access_token) {
              const subscribed = await subscribePageToWebhook(page.account_id, page.access_token)
              if (subscribed) subscribedCount++
            }
          }
        } else if (data) {
          savedPages.push(data)
          console.log(`✅ Saved page via upsert: ${page.account_name}`)
          
          // Auto-subscribe to webhook after saving
          if (page.access_token) {
            const subscribed = await subscribePageToWebhook(page.account_id, page.access_token)
            if (subscribed) subscribedCount++
          }
        } else {
          console.warn('No data returned from upsert, but no error either')
          errors.push({ 
            page: page.account_name, 
            error: 'No data returned from database' 
          })
        }
      } catch (dbError) {
        console.error('Database operation error:', dbError)
        errors.push({ 
          page: page.account_name, 
          error: dbError instanceof Error ? dbError.message : 'Unknown database error' 
        })
      }
    }
    
    // Final result
    console.log('=== Save Operation Complete ===')
    console.log(`Successfully saved: ${savedPages.length}`)
    console.log(`Successfully subscribed: ${subscribedCount}`)
    console.log(`Errors: ${errors.length}`)
    if (errors.length > 0) {
      console.log('Error details:', errors)
    }
    
    // Always return detailed response for debugging
    return NextResponse.json({ 
      success: savedPages.length > 0 || errors.length === 0,
      savedCount: savedPages.length,
      subscribedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      savedPages: savedPages.map(p => ({ 
        id: p.account_id, 
        name: p.account_name,
        dbId: p.id 
      })),
      debug: {
        requestedPages: pages.length,
        organizationId,
        userId: user?.id
      }
    })
    
  } catch (error) {
    console.error('=== Fatal Error in PUT handler ===')
    console.error(error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * PATCH handler for updating page status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, isActive, organizationId } = body
    
    if (!pageId || !organizationId || typeof isActive !== 'boolean') {
      return NextResponse.json({ 
        error: 'Invalid request data' 
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get page details first to get access token
    const { data: page } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
      .eq('organization_id', organizationId)
      .single()
    
    if (page && isActive && page.access_token) {
      // If activating, subscribe to webhook
      await subscribePageToWebhook(pageId, page.access_token)
    }
    
    const { data, error } = await supabase
      .from('platform_accounts')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
      .eq('organization_id', organizationId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating page:', error)
      return NextResponse.json({ 
        error: 'Failed to update page',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log(`Updated page ${pageId} - active: ${isActive}`)
    
    return NextResponse.json({ 
      success: true,
      page: data
    })
    
  } catch (error) {
    console.error('Error in PATCH handler:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE handler for removing page connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const organizationId = searchParams.get('orgId')
    
    if (!pageId || !organizationId) {
      return NextResponse.json({ 
        error: 'Page ID and Organization ID required' 
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('platform_accounts')
      .delete()
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
      .eq('organization_id', organizationId)
    
    if (error) {
      console.error('Error deleting page:', error)
      return NextResponse.json({ 
        error: 'Failed to delete page',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log(`Deleted page ${pageId} from organization ${organizationId}`)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in DELETE handler:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}