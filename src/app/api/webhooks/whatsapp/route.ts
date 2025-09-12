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
    
    // Extract parameters without modifying the original object
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')
    
    // Create new params object for verification
    const verifyParams = {
      'hub.mode': mode,
      'hub.verify_token': token,
      'hub.challenge': challenge
    }
    
    const verifiedChallenge = await webhookHandler.verifyChallenge(
      'whatsapp',
      verifyParams,
      {} // Empty headers for verification
    )
    
    // Return challenge for verification
    return new NextResponse(verifiedChallenge, { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
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
    // Get raw body text
    const rawBody = await request.text()
    
    // Parse JSON
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error('Failed to parse WhatsApp webhook body:', e)
      return NextResponse.json({ received: true }, { status: 200 })
    }
    
    // Create headers object without mutation
    const headersObj: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    headersObj['x-raw-body'] = rawBody
    
    const result = await webhookHandler.processWebhook(
      'whatsapp',
      body,
      headersObj
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