// src/app/api/webhooks/whatsapp/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { webhookHandler } from '@/services/webhook/webhook-handler'

/**
 * GET /api/webhooks/whatsapp
 * Verify webhook subscription from WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Extract parameters directly
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')
    
    // Create params object for webhook handler
    const params = {
      'hub.mode': mode,
      'hub.verify_token': token,
      'hub.challenge': challenge
    }
    
    const verifiedChallenge = await webhookHandler.verifyChallenge(
      'whatsapp',
      params,
      Object.fromEntries(request.headers.entries())
    )
    
    // Return challenge for verification
    return new NextResponse(verifiedChallenge, { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 403 }
    )
  }
}

/**
 * POST /api/webhooks/whatsapp
 * Handle incoming webhook from WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers = Object.fromEntries(request.headers.entries())
    
    const result = await webhookHandler.processWebhook(
      'whatsapp',
      body,
      headers
    )
    
    if (!result.success) {
      console.error('WhatsApp webhook processing failed:', result.message)
    }
    
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true }, { status: 200 })
  }
}