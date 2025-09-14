// src/app/api/platforms/facebook/pages/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/platforms/facebook/pages
 * Get list of connected Facebook pages
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get organization ID from session/auth
    // For now using default
    const organizationId = 'default-org-id'
    
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
    
    return NextResponse.json({
      success: true,
      pages: sanitizedPages
    })
    
  } catch (error) {
    console.error('Error in GET /api/platforms/facebook/pages:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/platforms/facebook/pages/[pageId]
 * Remove a connected page
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract pageId from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const pageId = pathParts[pathParts.length - 1]
    
    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('platform_accounts')
      .delete()
      .eq('account_id', pageId)
      .eq('platform', 'facebook')
    
    if (error) {
      console.error('Error deleting page:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete page' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Page removed successfully'
    })
    
  } catch (error) {
    console.error('Error in DELETE /api/platforms/facebook/pages:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}