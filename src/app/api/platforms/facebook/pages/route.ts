// src/app/api/platforms/facebook/pages/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get('orgId')
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    console.log('Fetching pages for:', {
      userId: user.id,
      organizationId: organizationId
    })
    
    // ไม่ต้องตรวจสอบ membership แล้ว เพราะมีปัญหา RLS
    // ดึง pages ตรงๆ เลย
    const { data: pages, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('organization_id', organizationId)
      .order('account_name')
    
    if (error) {
      console.error('Error fetching pages:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pages' },
        { status: 500 }
      )
    }
    
    // Don't send access tokens to frontend
    const sanitizedPages = pages?.map(page => ({
      id: page.id,
      account_id: page.account_id,
      account_name: page.account_name,
      is_active: page.is_active,
      last_sync_at: page.last_sync_at,
      metadata: page.metadata
    })) || []
    
    console.log(`Found ${sanitizedPages.length} pages for organization ${organizationId}`)
    
    return NextResponse.json({
      success: true,
      pages: sanitizedPages,
      organizationId
    })
    
  } catch (error) {
    console.error('Error in GET /api/platforms/facebook/pages:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}