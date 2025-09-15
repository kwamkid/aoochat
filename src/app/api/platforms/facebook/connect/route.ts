// src/app/api/platforms/facebook/connect/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FacebookClient } from '@/lib/platforms/facebook/client'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!
const FACEBOOK_API_VERSION = 'v18.0'

/**
 * GET - Handle OAuth flow
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  
  // Start OAuth
  if (action === 'auth') {
    const orgId = searchParams.get('orgId')
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/facebook/connect?action=callback`
    
    const oauthUrl = `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=pages_show_list,pages_messaging,pages_read_engagement&` +
      `state=${orgId}`
    
    return NextResponse.redirect(oauthUrl)
  }
  
  // OAuth Callback
  if (action === 'callback') {
    const code = searchParams.get('code')
    const state = searchParams.get('state') // organization_id
    const error = searchParams.get('error')
    
    if (error) {
      return NextResponse.redirect(`/settings/platforms?error=${error}`)
    }
    
    if (!code) {
      return NextResponse.redirect('/settings/platforms?error=no_code')
    }
    
    try {
      // Exchange code for token
      const tokenUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token?` +
        `client_id=${FACEBOOK_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/facebook/connect?action=callback`)}&` +
        `client_secret=${FACEBOOK_APP_SECRET}&` +
        `code=${code}`
      
      const tokenResponse = await fetch(tokenUrl)
      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed')
      }
      
      // Get pages using our client
      const fbClient = new FacebookClient()
      const pages = await fbClient.getPages(tokenData.access_token)
      
      // Save pages to database
      if (state && pages.length > 0) {
        const supabase = await createClient()
        
        for (const page of pages) {
          // Save page
          await supabase
            .from('platform_accounts')
            .upsert({
              organization_id: state,
              platform: 'facebook',
              account_id: page.id,
              account_name: page.name,
              access_token: page.access_token,
              is_active: true,
              metadata: { category: page.category }
            }, {
              onConflict: 'organization_id,platform,account_id'
            })
          
          // Auto-subscribe webhook
          await fbClient.subscribeWebhook(page.id, page.access_token)
        }
      }
      
      return NextResponse.redirect(`/settings/platforms?success=true&pages=${pages.length}`)
      
    } catch (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect('/settings/platforms?error=oauth_failed')
    }
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/**
 * DELETE - Disconnect page
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pageId = searchParams.get('pageId')
  const orgId = searchParams.get('orgId')
  
  if (!pageId || !orgId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  const supabase = await createClient()
  
  // Get page details
  const { data: page } = await supabase
    .from('platform_accounts')
    .select('access_token')
    .eq('account_id', pageId)
    .eq('organization_id', orgId)
    .single()
  
  if (page?.access_token) {
    // Unsubscribe webhook
    const fbClient = new FacebookClient()
    await fbClient.unsubscribeWebhook(pageId, page.access_token)
  }
  
  // Delete from database
  await supabase
    .from('platform_accounts')
    .delete()
    .eq('account_id', pageId)
    .eq('organization_id', orgId)
  
  return NextResponse.json({ success: true })
}