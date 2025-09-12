// src/app/api/webhooks/line/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { webhookHandler } from '@/services/webhook/webhook-handler'

/**
 * POST /api/webhooks/line
 * Handle incoming webhook from LINE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers = Object.fromEntries(request.headers.entries())
    
    const result = await webhookHandler.processWebhook(
      'line',
      body,
      headers
    )
    
    if (!result.success) {
      console.error('LINE webhook processing failed:', result.message)
    }
    
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('LINE webhook error:', error)
    
    // Still return 200 to prevent retries
    return NextResponse.json({ success: true }, { status: 200 })
  }
}