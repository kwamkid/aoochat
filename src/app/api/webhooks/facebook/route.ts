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
    
    // Create new params object (don't modify original)
    const verifyParams = {
      'hub.mode': searchParams.get('hub.mode'),
      'hub.verify_token': searchParams.get('hub.verify_token'),
      'hub.challenge': searchParams.get('hub.challenge')
    }
    
    console.log('Facebook webhook verification:', {
      mode: verifyParams['hub.mode'],
      token: verifyParams['hub.verify_token'] ? 'provided' : 'missing',
      challenge: verifyParams['hub.challenge'] ? 'provided' : 'missing'
    })
    
    const verifiedChallenge = await webhookHandler.verifyChallenge(
      'facebook',
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
    
    // Verify signature
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.FACEBOOK_APP_SECRET
    
    if (signature && appSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')
      
      const actualSignature = signature.split('sha256=')[1]
      
      console.log('Signature verification:', {
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
    
    // Create new headers object (don't modify original)
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