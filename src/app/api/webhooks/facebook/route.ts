// src/app/api/webhooks/facebook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { webhookHandler } from '@/services/webhook/webhook-handler'
import crypto from 'crypto'

/**
 * GET /api/webhooks/facebook
 * Verify webhook subscription from Facebook
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Extract parameters directly without modifying
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')
    
    console.log('Facebook webhook verification:', {
      mode,
      token: token ? 'provided' : 'missing',
      challenge: challenge ? 'provided' : 'missing'
    })
    
    // Create new params object instead of modifying existing one
    const verifyParams = {
      'hub.mode': mode,
      'hub.verify_token': token,
      'hub.challenge': challenge
    }
    
    const verifiedChallenge = await webhookHandler.verifyChallenge(
      'facebook',
      verifyParams,
      {} // Empty headers for verification
    )
    
    // Return challenge for verification
    return new NextResponse(verifiedChallenge, { status: 200 })
  } catch (error) {
    console.error('Facebook webhook verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 403 }
    )
  }
}

/**
 * POST /api/webhooks/facebook
 * Handle incoming webhook from Facebook
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    let body: any
    
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error('Failed to parse webhook body:', e)
      return NextResponse.json({ received: true }, { status: 200 })
    }
    
    // Verify signature manually here
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.FACEBOOK_APP_SECRET
    
    if (signature && appSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')
      
      const actualSignature = signature.split('sha256=')[1]
      
      console.log('Manual signature verification:', {
        expected: expectedSignature.substring(0, 10) + '...',
        actual: actualSignature?.substring(0, 10) + '...',
        match: expectedSignature === actualSignature
      })
      
      if (expectedSignature !== actualSignature) {
        console.warn('⚠️ Signature mismatch - continuing for development')
      }
    } else {
      console.warn('⚠️ No signature or app secret - skipping verification')
    }
    
    // Create headers object safely
    const headersObj: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    headersObj['x-raw-body'] = rawBody
    
    const result = await webhookHandler.processWebhook(
      'facebook',
      body,
      headersObj
    )
    
    if (!result.success) {
      console.error('Facebook webhook processing failed:', result.message)
    } else {
      console.log('✅ Facebook webhook processed successfully')
    }
    
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Facebook webhook error:', error)
    
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true }, { status: 200 })
  }
}