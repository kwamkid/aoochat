// src/app/api/platforms/facebook/sync/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FacebookClient } from '@/lib/platforms/facebook/client'

/**
 * POST - Manual sync/re-subscribe webhook for a page
 * Optional endpoint - can be removed if not needed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, organizationId } = body
    
    if (!pageId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Page ID and Organization ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get page details
    const { data: page, error } = await supabase
      .from('platform_accounts')
      .select('access_token')
      .eq('platform', 'facebook')
      .eq('account_id', pageId)
      .eq('organization_id', organizationId)
      .single()
    
    if (error || !page?.access_token) {
      return NextResponse.json(
        { success: false, error: 'Page not found or no access token' },
        { status: 404 }
      )
    }
    
    // Re-subscribe webhook
    const fbClient = new FacebookClient()
    const subscribed = await fbClient.subscribeWebhook(pageId, page.access_token)
    
    // Update last sync time
    await supabase
      .from('platform_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
        metadata: {
          webhook_subscribed: subscribed,
          webhook_subscribed_at: subscribed ? new Date().toISOString() : null
        }
      })
      .eq('account_id', pageId)
      .eq('organization_id', organizationId)
    
    return NextResponse.json({
      success: true,
      webhook_subscribed: subscribed
    })
    
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    )
  }
}