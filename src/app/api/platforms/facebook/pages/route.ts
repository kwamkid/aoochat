// src/app/api/platforms/facebook/pages/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - Get connected Facebook pages
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const organizationId = searchParams.get('orgId')
  
  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: 'Organization ID required' },
      { status: 400 }
    )
  }
  
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }
  
  // Get pages
  const { data: pages, error } = await supabase
    .from('platform_accounts')
    .select('id, account_id, account_name, is_active, last_sync_at, metadata')
    .eq('platform', 'facebook')
    .eq('organization_id', organizationId)
    .order('account_name')
  
  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({
    success: true,
    pages: pages || []
  })
}

/**
 * PATCH - Toggle page active status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, isActive, organizationId } = body
    
    if (!pageId || !organizationId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Update page status
    const { error } = await supabase
      .from('platform_accounts')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
      .eq('organization_id', organizationId)
    
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update page' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}