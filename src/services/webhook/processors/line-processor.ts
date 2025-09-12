// src/services/webhook/processors/line-processor.ts

import { MessageType } from '@/types/conversation.types'
import { 
  WebhookProcessor, 
  ProcessedWebhookData,
  LineWebhookPayload,
  WebhookEventType
} from '@/types/webhook.types'
import crypto from 'crypto'

export class LineWebhookProcessor implements WebhookProcessor {
  platform = 'line' as const
  
  /**
   * Verify LINE webhook signature
   */
  verify(payload: any, headers: any): boolean {
    const channelSecret = process.env.LINE_CHANNEL_SECRET
    const signature = headers['x-line-signature']
    
    if (!channelSecret || !signature) {
      console.error('Missing channel secret or signature')
      return false
    }
    
    // Calculate expected signature
    const body = JSON.stringify(payload)
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64')
    
    // Compare signatures
    return signature === hash
  }
  
  /**
   * Process LINE webhook payload
   */
  async process(payload: LineWebhookPayload): Promise<ProcessedWebhookData> {
    // LINE sends events in array
    for (const event of payload.events) {
      // Skip standby events
      if (event.mode === 'standby') {
        continue
      }
      
      // Handle different event types
      switch (event.type) {
        case 'message':
          return this.processMessage(event)
          
        case 'postback':
          return this.processPostback(event)
          
        case 'follow':
          return this.processFollow(event)
          
        case 'unfollow':
          return this.processUnfollow(event)
          
        default:
          console.log(`Unhandled LINE event type: ${event.type}`)
      }
    }
    
    throw new Error('No valid event found in LINE webhook payload')
  }
  
  /**
   * Process LINE message event
   */
  private processMessage(event: any): ProcessedWebhookData {
    const message = event.message
    let messageType: MessageType = 'text'
    let messageContent: any = {}
    
    // Determine message type and content
    switch (message.type) {
      case 'text':
        messageType = 'text'
        messageContent = { text: message.text }
        break
        
      case 'image':
        messageType = 'image'
        messageContent = {
          media_id: message.id,
          media_type: 'image/jpeg'
        }
        break
        
      case 'video':
        messageType = 'video'
        messageContent = {
          media_id: message.id,
          media_type: 'video/mp4',
          duration: message.duration
        }
        break
        
      case 'audio':
        messageType = 'voice'
        messageContent = {
          media_id: message.id,
          media_type: 'audio/m4a',
          duration: message.duration
        }
        break
        
      case 'file':
        messageType = 'file'
        messageContent = {
          media_id: message.id,
          file_name: message.fileName,
          file_size: message.fileSize
        }
        break
        
      case 'location':
        messageType = 'location'
        messageContent = {
          location: {
            latitude: message.latitude,
            longitude: message.longitude,
            address: message.address,
            title: message.title
          }
        }
        break
        
      case 'sticker':
        messageType = 'sticker'
        messageContent = {
          sticker: {
            packageId: message.packageId,
            stickerId: message.stickerId,
            stickerResourceType: message.stickerResourceType
          }
        }
        break
    }
    
    // Get user ID based on source type
    const userId = event.source.userId || event.source.groupId || event.source.roomId
    
    return {
      platform: 'line',
      conversationId: `line_${userId}`,
      customerId: userId,
      messageId: message.id,
      messageType,
      messageContent,
      eventType: 'message.received',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process LINE postback event
   */
  private processPostback(event: any): ProcessedWebhookData {
    const userId = event.source.userId || event.source.groupId || event.source.roomId
    
    // Parse postback data (could be JSON or string)
    let postbackData: any
    try {
      postbackData = JSON.parse(event.postback.data)
    } catch {
      postbackData = event.postback.data
    }
    
    return {
      platform: 'line',
      conversationId: `line_${userId}`,
      customerId: userId,
      messageId: `postback_${event.timestamp}`,
      messageType: 'text',
      messageContent: {
        text: typeof postbackData === 'object' ? postbackData.text : postbackData,
        postback: event.postback.data,
        params: event.postback.params
      },
      eventType: 'postback',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process LINE follow event (user added bot as friend)
   */
  private processFollow(event: any): ProcessedWebhookData {
    const userId = event.source.userId
    
    return {
      platform: 'line',
      conversationId: `line_${userId}`,
      customerId: userId,
      eventType: 'user.subscribed',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process LINE unfollow event (user blocked/removed bot)
   */
  private processUnfollow(event: any): ProcessedWebhookData {
    const userId = event.source.userId
    
    return {
      platform: 'line',
      conversationId: `line_${userId}`,
      customerId: userId,
      eventType: 'user.unsubscribed',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
}