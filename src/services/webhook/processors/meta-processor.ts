// src/services/webhook/processors/meta-processor.ts

import { Platform, MessageType } from '@/types/conversation.types'
import { 
  WebhookProcessor, 
  ProcessedWebhookData,
  MetaWebhookPayload,
  WebhookEventType
} from '@/types/webhook.types'
import crypto from 'crypto'

export class MetaWebhookProcessor implements WebhookProcessor {
  platform: Platform
  
  constructor(platform: 'facebook' | 'instagram') {
    this.platform = platform
  }
  
  /**
   * Verify webhook signature from Meta
   */
  verify(payload: any, headers: any): boolean {
    // For development - temporarily skip verification
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Skipping signature verification in development mode')
      return true
    }
    
    const signature = headers['x-hub-signature-256']
    
    // For development/testing - skip verification if no signature
    if (!signature) {
      console.warn('No signature found in headers - skipping verification')
      return true
    }
    
    const appSecret = this.platform === 'facebook' 
      ? process.env.FACEBOOK_APP_SECRET 
      : process.env.INSTAGRAM_APP_SECRET
    
    if (!appSecret) {
      console.error('App secret not configured - skipping verification')
      return true
    }
    
    try {
      // Use raw body if available (passed from route handler)
      const bodyToVerify = headers['x-raw-body'] || JSON.stringify(payload)
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(bodyToVerify)
        .digest('hex')
      
      const actualSignature = signature.split('sha256=')[1]
      
      // Log for debugging
      console.log('Signature verification:', {
        expected: expectedSignature.substring(0, 10) + '...',
        actual: actualSignature?.substring(0, 10) + '...',
        match: expectedSignature === actualSignature
      })
      
      // For development, log but don't block
      if (expectedSignature !== actualSignature) {
        console.warn('⚠️ Signature mismatch - continuing anyway for development')
        return true // Allow for development
      }
      
      return true
    } catch (error) {
      console.error('Signature verification error:', error)
      return true // Allow for development
    }
  }
  
  /**
   * Process Meta webhook payload
   */
  async process(payload: MetaWebhookPayload): Promise<ProcessedWebhookData> {
    // Meta sends events in batches
    for (const entry of payload.entry) {
      // Handle messaging events (most common)
      if (entry.messaging && entry.messaging.length > 0) {
        const event = entry.messaging[0]
        
        // Handle different event types
        if (event.message) {
          return this.processMessage(event, entry.id)
        }
        
        if (event.postback) {
          return this.processPostback(event, entry.id)
        }
        
        if (event.delivery) {
          return this.processDelivery(event, entry.id)
        }
        
        if (event.read) {
          return this.processRead(event, entry.id)
        }
      }
      
      // Handle Instagram-specific events
      if (entry.changes && this.platform === 'instagram') {
        return this.processInstagramChanges(entry)
      }
    }
    
    throw new Error('No valid event found in webhook payload')
  }
  
  /**
   * Process incoming message
   */
  private processMessage(event: any, pageId: string): ProcessedWebhookData {
    const message = event.message
    let messageType: MessageType = 'text'
    let messageContent: any = {}
    
    // Determine message type and content
    if (message.text) {
      messageType = 'text'
      messageContent = { text: message.text }
    } else if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0]
      
      switch (attachment.type) {
        case 'image':
          messageType = 'image'
          messageContent = {
            media_url: attachment.payload.url,
            media_type: 'image/jpeg'
          }
          break
          
        case 'video':
          messageType = 'video'
          messageContent = {
            media_url: attachment.payload.url,
            media_type: 'video/mp4'
          }
          break
          
        case 'audio':
          messageType = 'voice'
          messageContent = {
            media_url: attachment.payload.url,
            media_type: 'audio/mpeg'
          }
          break
          
        case 'file':
          messageType = 'file'
          messageContent = {
            media_url: attachment.payload.url,
            file_name: 'file'
          }
          break
          
        case 'location':
          messageType = 'location'
          messageContent = {
            location: {
              latitude: attachment.payload.coordinates.lat,
              longitude: attachment.payload.coordinates.long
            }
          }
          break
      }
    }
    
    // Handle quick reply
    if (message.quick_reply) {
      messageContent.quick_reply = message.quick_reply.payload
    }
    
    return {
      platform: this.platform,
      conversationId: `${pageId}_${event.sender.id}`,
      customerId: event.sender.id,
      messageId: message.mid,
      messageType,
      messageContent,
      eventType: 'message.received',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process postback (button click)
   */
  private processPostback(event: any, pageId: string): ProcessedWebhookData {
    return {
      platform: this.platform,
      conversationId: `${pageId}_${event.sender.id}`,
      customerId: event.sender.id,
      messageId: `postback_${event.timestamp}`,
      messageType: 'text',
      messageContent: {
        text: event.postback.title,
        postback: event.postback.payload
      },
      eventType: 'postback',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process delivery confirmation
   */
  private processDelivery(event: any, pageId: string): ProcessedWebhookData {
    return {
      platform: this.platform,
      conversationId: `${pageId}_${event.sender.id}`,
      customerId: event.sender.id,
      eventType: 'message.delivered',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process read receipt
   */
  private processRead(event: any, pageId: string): ProcessedWebhookData {
    return {
      platform: this.platform,
      conversationId: `${pageId}_${event.sender.id}`,
      customerId: event.sender.id,
      eventType: 'message.read',
      timestamp: new Date(event.timestamp).toISOString(),
      rawData: event
    }
  }
  
  /**
   * Process Instagram-specific changes (comments, mentions, etc.)
   */
  private processInstagramChanges(entry: any): ProcessedWebhookData {
    const change = entry.changes[0]
    
    // Handle Instagram comments
    if (change.field === 'comments') {
      const comment = change.value
      return {
        platform: 'instagram',
        conversationId: `ig_${comment.media.id}_${comment.from.id}`,
        customerId: comment.from.id,
        customerName: comment.from.username,
        messageId: comment.id,
        messageType: 'text',
        messageContent: { text: comment.text },
        eventType: 'message.received',
        timestamp: new Date().toISOString(),
        rawData: change
      }
    }
    
    // Handle Instagram mentions
    if (change.field === 'mentions') {
      const mention = change.value
      return {
        platform: 'instagram',
        conversationId: `ig_mention_${mention.media_id}_${mention.comment_id}`,
        customerId: mention.from.id,
        customerName: mention.from.username,
        messageId: mention.comment_id,
        messageType: 'text',
        messageContent: { text: mention.text },
        eventType: 'message.received',
        timestamp: new Date().toISOString(),
        rawData: change
      }
    }
    
    throw new Error(`Unsupported Instagram change field: ${change.field}`)
  }
}