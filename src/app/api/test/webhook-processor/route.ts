// src/app/api/test/webhook-processor/route.ts
// ใช้ทดสอบการ process message

import { NextRequest, NextResponse } from 'next/server'
import { FacebookMessageProcessor } from '@/services/webhook/processors/facebook-processor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Test data - sticker
    const stickerMessage = {
      mid: 'test_sticker_001',
      text: '',
      attachments: [{
        type: 'image',
        payload: {
          url: 'https://scontent.xx.fbcdn.net/...',
          sticker_id: 369239263222822  // number is OK now
        }
      }]
    }
    
    // Test data - image
    const imageMessage = {
      mid: 'test_image_001',
      text: '',
      attachments: [{
        type: 'image',
        payload: {
          url: 'https://scontent.xx.fbcdn.net/...'
          // No sticker_id = regular image
        }
      }]
    }
    
    // Process with FacebookMessageProcessor
    const stickerResult = FacebookMessageProcessor.processMessage(stickerMessage)
    const imageResult = FacebookMessageProcessor.processMessage(imageMessage)
    
    // Test with custom message if provided
    let customResult = null
    if (body.message) {
      customResult = FacebookMessageProcessor.processMessage(body.message)
    }
    
    return NextResponse.json({
      success: true,
      test_results: {
        sticker: {
          detected_type: stickerResult.messageType,
          has_sticker_id: !!stickerResult.content.sticker_id,
          content: stickerResult.content
        },
        image: {
          detected_type: imageResult.messageType,
          has_sticker_id: !!imageResult.content.sticker_id,
          content: imageResult.content
        },
        custom: customResult ? {
          detected_type: customResult.messageType,
          content: customResult.content
        } : null
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Test with GET request
export async function GET() {
  return NextResponse.json({
    instructions: 'Send POST request with optional message object to test',
    example: {
      message: {
        mid: 'your_message_id',
        text: '',
        attachments: [{
          type: 'image',
          payload: {
            url: 'https://...',
            sticker_id: 123456
          }
        }]
      }
    }
  })
}