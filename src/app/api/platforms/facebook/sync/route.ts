// src/app/api/platforms/facebook/sync/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/platforms/facebook/sync
 * Sync page data and subscribe to webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId } = body
    
    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID required' },
        { status: 400 }
      )
    }
    
    console.log('Syncing Facebook page:', pageId)
    
    const supabase = await createClient()
    
    // Get page details from database
    const { data: pageAccount, error: fetchError } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('account_id', pageId)
      .single()
    
    if (fetchError || !pageAccount) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }
    
    const accessToken = pageAccount.access_token
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No access token for this page' },
        { status: 400 }
      )
    }
    
    try {
      // 1. Get updated page information
      const pageInfo = await fetchPageInfo(pageId, accessToken)
      
      // 2. Subscribe page to webhook
      const webhookSubscribed = await subscribePageToWebhook(pageId, accessToken)
      
      // 3. Get page insights (optional)
      const insights = await fetchPageInsights(pageId, accessToken)
      
      // 4. Check if Instagram is connected
      const instagramAccount = await checkInstagramConnection(pageId, accessToken)
      
      // 5. Update database with latest info
      const { error: updateError } = await supabase
        .from('platform_accounts')
        .update({
          account_name: pageInfo.name,
          account_avatar: pageInfo.picture?.data?.url,
          metadata: {
            ...pageAccount.metadata,
            category: pageInfo.category,
            category_list: pageInfo.category_list,
            about: pageInfo.about,
            fan_count: pageInfo.fan_count,
            followers_count: pageInfo.followers_count,
            is_verified: pageInfo.is_verified,
            is_published: pageInfo.is_published,
            instagram_business_account: instagramAccount,
            insights: insights,
            webhook_subscribed: webhookSubscribed,
            webhook_subscribed_at: webhookSubscribed ? new Date().toISOString() : null
          },
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', pageAccount.id)
      
      if (updateError) {
        console.error('Error updating page info:', updateError)
      }
      
      return NextResponse.json({
        success: true,
        data: {
          page: pageInfo,
          webhook_subscribed: webhookSubscribed,
          instagram_connected: !!instagramAccount,
          insights: insights
        }
      })
      
    } catch (apiError: any) {
      console.error('Facebook API error:', apiError)
      
      // Check if token expired
      if (apiError.message?.includes('OAuthException') || apiError.message?.includes('expired')) {
        // Mark page as needing re-authentication
        await supabase
          .from('platform_accounts')
          .update({
            is_active: false,
            metadata: {
              ...pageAccount.metadata,
              error: 'Token expired - needs re-authentication',
              error_at: new Date().toISOString()
            }
          })
          .eq('id', pageAccount.id)
        
        return NextResponse.json(
          { success: false, error: 'Token expired. Please reconnect the page.' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: apiError.message || 'Failed to sync page' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in sync endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Fetch page information from Facebook
 */
async function fetchPageInfo(pageId: string, accessToken: string) {
  const fields = [
    'id',
    'name',
    'about',
    'category',
    'category_list',
    'picture.type(large)',
    'cover',
    'fan_count',
    'followers_count',
    'is_verified',
    'is_published',
    'link',
    'username',
    'website',
    'emails',
    'phone'
  ].join(',')
  
  const url = `https://graph.facebook.com/v18.0/${pageId}?fields=${fields}&access_token=${accessToken}`
  
  const response = await fetch(url)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to fetch page info')
  }
  
  return data
}

/**
 * Subscribe page to webhook for receiving messages
 */
async function subscribePageToWebhook(pageId: string, accessToken: string) {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`
    
    // Subscribe to webhook events
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
          'message_reactions',
          'inbox_labels'
        ].join(','),
        access_token: accessToken
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Failed to subscribe webhook:', data)
      return false
    }
    
    console.log(`Page ${pageId} subscribed to webhook successfully`)
    
    // Verify subscription
    const verifyUrl = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?access_token=${accessToken}`
    const verifyResponse = await fetch(verifyUrl)
    const verifyData = await verifyResponse.json()
    
    console.log('Webhook subscription status:', verifyData)
    
    return true
  } catch (error) {
    console.error('Error subscribing to webhook:', error)
    return false
  }
}

/**
 * Fetch page insights (analytics)
 */
async function fetchPageInsights(pageId: string, accessToken: string) {
  try {
    const metrics = [
      'page_fans',
      'page_views_total',
      'page_engaged_users',
      'page_post_engagements',
      'page_impressions'
    ].join(',')
    
    const url = `https://graph.facebook.com/v18.0/${pageId}/insights?metric=${metrics}&period=day&access_token=${accessToken}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Failed to fetch insights:', data)
      return null
    }
    
    // Transform insights data
    const insights: any = {}
    data.data?.forEach((metric: any) => {
      insights[metric.name] = metric.values?.[0]?.value || 0
    })
    
    return insights
  } catch (error) {
    console.error('Error fetching insights:', error)
    return null
  }
}

/**
 * Check if Instagram Business Account is connected
 */
async function checkInstagramConnection(pageId: string, accessToken: string) {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${accessToken}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Failed to check Instagram connection:', data)
      return null
    }
    
    return data.instagram_business_account || null
  } catch (error) {
    console.error('Error checking Instagram connection:', error)
    return null
  }
}

/**
 * GET /api/platforms/facebook/sync/status
 * Check webhook subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pageId = searchParams.get('pageId')
    
    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get page from database
    const { data: pageAccount, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('account_id', pageId)
      .single()
    
    if (error || !pageAccount) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }
    
    const accessToken = pageAccount.access_token
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No access token' },
        { status: 400 }
      )
    }
    
    // Check webhook subscription status
    const url = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?access_token=${accessToken}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to check status' },
        { status: 500 }
      )
    }
    
    // Check if our app is in the list
    const isSubscribed = data.data?.some((app: any) => 
      app.id === process.env.FACEBOOK_APP_ID
    )
    
    return NextResponse.json({
      success: true,
      subscribed: isSubscribed,
      apps: data.data,
      page: {
        id: pageAccount.account_id,
        name: pageAccount.account_name,
        last_sync: pageAccount.last_sync_at
      }
    })
    
  } catch (error) {
    console.error('Error checking webhook status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}