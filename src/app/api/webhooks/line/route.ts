// src/app/api/webhooks/line/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { webhookHandler } from '@/services/webhook/webhook-handler'

/**
 * POST /api/webhooks/line
 * Handle incoming webhook from LINE
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body text first
    const rawBody = await request.text()
    
    // Parse JSON
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error('Failed to parse LINE webhook body:', e)
      return NextResponse.json({ success: true }, { status: 200 })
    }
    
    // Create new headers object (don't modify original)
    const headersObj: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    
    // Add raw body for signature verification
    headersObj['x-raw-body'] = rawBody
    
    const result = await webhookHandler.processWebhook(
      'line',
      body,
      headersObj
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