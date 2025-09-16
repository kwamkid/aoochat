// src/app/api/webhooks/facebook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { webhookHandler } from '@/services/webhook/webhook-handler' // ✅ ใช้ webhook handler ใหม่
import crypto from 'crypto'

/**
 * GET - Verify webhook subscription from Facebook
 */
export async function GET(request: NextRequest) {
  console.log('🔵 [Facebook Route] Verification request')
  
  const searchParams = request.nextUrl.searchParams
  
  // สร้าง params object สำหรับ verify
  const verifyParams = {
    'hub.mode': searchParams.get('hub.mode'),
    'hub.verify_token': searchParams.get('hub.verify_token'),
    'hub.challenge': searchParams.get('hub.challenge')
  }
  
  // ใช้ webhookHandler.verifyChallenge
  const challenge = await webhookHandler.verifyChallenge('facebook', verifyParams)
  
  if (challenge) {
    console.log('✅ [Facebook Route] Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }
  
  console.log('❌ [Facebook Route] Verification failed')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST - Handle incoming webhook from Facebook
 */
export async function POST(request: NextRequest) {
  console.log('🔴 ========================================')
  console.log('🔴 [Facebook Route] Webhook received!')
  console.log('🔴 ========================================')
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)
    
    console.log('🔴 [Facebook Route] Body preview:', {
      object: body.object,
      entryCount: body.entry?.length,
      hasMessaging: !!body.entry?.[0]?.messaging,
      messagingCount: body.entry?.[0]?.messaging?.length
    })
    
    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-hub-signature-256')
      if (signature) {
        const verified = webhookHandler.verifySignature(
          'facebook',
          rawBody,
          signature
        )
        
        if (!verified) {
          console.error('❌ [Facebook Route] Invalid signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
        }
      }
    }
    
    // ✅ Process webhook with new handler
    console.log('🟢 [Facebook Route] Processing with webhookHandler...')
    const result = await webhookHandler.processWebhook('facebook', body)
    
    console.log('🟢 [Facebook Route] Process result:', {
      resultCount: result?.length || 0,
      results: result
    })
    
    // Facebook requires 200 response
    return NextResponse.json({ received: true }, { status: 200 })
    
  } catch (error) {
    console.error('❌ [Facebook Route] Error:', error)
    // Still return 200 to prevent Facebook retry
    return NextResponse.json({ received: true }, { status: 200 })
  }
}