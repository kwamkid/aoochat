// src/app/api/webhooks/facebook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { handleFacebookWebhook } from '@/lib/platforms/facebook/webhook-handler'
import crypto from 'crypto'

/**
 * GET - Verify webhook subscription from Facebook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  // ตรวจสอบ token
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }
  
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST - Handle incoming webhook from Facebook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Optional: Verify signature (สำหรับ production)
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-hub-signature-256')
      if (signature) {
        const rawBody = JSON.stringify(body)
        const expectedSig = crypto
          .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
          .update(rawBody)
          .digest('hex')
        
        const actualSig = signature.split('sha256=')[1]
        if (expectedSig !== actualSig) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
        }
      }
    }
    
    // Process webhook
    await handleFacebookWebhook(body)
    
    // Facebook ต้องการ response 200 เสมอ
    return NextResponse.json({ received: true }, { status: 200 })
    
  } catch (error) {
    console.error('Webhook error:', error)
    // ยังคง return 200 เพื่อไม่ให้ Facebook retry
    return NextResponse.json({ received: true }, { status: 200 })
  }
}