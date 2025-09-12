// src/services/webhook/processors/whatsapp-processor.ts

import { MessageType } from '@/types/conversation.types'
import { 
  WebhookProcessor, 
  ProcessedWebhookData,
  WhatsAppWebhookPayload,
  WebhookEventType
} from '@/types/webhook.types'
import crypto from 'crypto'

export class WhatsAppWebhookProcessor implements WebhookProcessor {
  platform = 'whatsapp' as const
  
  /**
   * Verify WhatsApp webhook signature
   */
  verify(payload: any, headers: any): boolean {
    const signature = headers['x-hub-signature-256']
    if (!signature) {
      console.error('No signature found in headers')
      return false
    }
    
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (!appSecret) {
      console.error('WhatsApp app secret not configured')
      return false
    }
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(JSON.stringify(payload))
      .digest('hex')
    
    const actualSignature = signature.split('sha256=')[1]
    
    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(actualSignature || '')
    )
  }
  
  /**
   * Process WhatsApp webhook payload
   */
  async process(payload: WhatsAppWebhookPayload): Promise<ProcessedWebhookData> {
    // WhatsApp sends events in batches
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value
        
        // Handle incoming messages
        if (value.messages && value.messages.length > 0) {
          return this.processMessage(value)
        }
        
        // Handle status updates
        if (value.statuses && value.statuses.length > 0) {
          return this.processStatus(value)
        }
      }
    }
    
    throw new Error('No valid event found in WhatsApp webhook payload')
  }
  
  /**
   * Process WhatsApp message
   */
  private processMessage(value: any): ProcessedWebhookData {
    const message = value.messages[0]
    const contact = value.contacts ? value.contacts[0] : null
    
    let messageType: MessageType = 'text'
    let messageContent: any = {}
    
    // Determine message type and content
    switch (message.type) {
      case 'text':
        messageType = 'text'
        messageContent = { text: message.text.body }
        break
        
      case 'image':
        messageType = 'image'
        messageContent = {
          media_id: message.image.id,
          media_type: message.image.mime_type,
          caption: message.image.caption
        }
        break
        
      case 'document':
        messageType = 'file'
        messageContent = {
          media_id: message.document.id,
          file_name: message.document.filename,
          media_type: message.document.mime_type,
          caption: message.document.caption
        }
        break
        
      case 'audio':
        messageType = 'voice'
        messageContent = {
          media_id: message.audio.id,
          media_type: message.audio.mime_type
        }
        break
        
      case 'video':
        messageType = 'video'
        messageContent = {
          media_id: message.video.id,
          media_type: message.video.mime_type,
          caption: message.video.caption
        }
        break
        
      case 'location':
        messageType = 'location'
        messageContent = {
          location: {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            name: message.location.name,
            address: message.location.address
          }
        }
        break
        
      case 'button':
        // Button reply
        messageType = 'text'
        messageContent = {
          text: message.button.text,
          button_payload: message.button.payload
        }
        break
        
      case 'interactive':
        // Interactive message reply (list or button)
        if (message.interactive.type === 'list_reply') {
          messageType = 'text'
          messageContent = {
            text: message.interactive.list_reply.title,
            list_reply_id: message.interactive.list_reply.id,
            description: message.interactive.list_reply.description
          }
        } else if (message.interactive.type === 'button_reply') {
          messageType = 'text'
          messageContent = {
            text: message.interactive.button_reply.title,
            button_reply_id: message.interactive.button_reply.id
          }
        }
        break
        
      default:
        console.log(`Unhandled WhatsApp message type: ${message.type}`)
    }
    
    return {
      platform: 'whatsapp',
      conversationId: `wa_${value.metadata.phone_number_id}_${message.from}`,
      customerId: message.from,
      customerName: contact ? contact.profile.name : undefined,
      messageId: message.id,
      messageType,
      messageContent,
      eventType: 'message.received',
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      rawData: value
    }
  }
  
  /**
   * Process WhatsApp status update
   */
  private processStatus(value: any): ProcessedWebhookData {
    const status = value.statuses[0]
    
    let eventType: WebhookEventType
    switch (status.status) {
      case 'sent':
        eventType = 'message.sent'
        break
      case 'delivered':
        eventType = 'message.delivered'
        break
      case 'read':
        eventType = 'message.read'
        break
      case 'failed':
        eventType = 'message.failed'
        break
      default:
        eventType = 'message.sent'
    }
    
    return {
      platform: 'whatsapp',
      conversationId: `wa_${value.metadata.phone_number_id}_${status.recipient_id}`,
      customerId: status.recipient_id,
      messageId: status.id,
      eventType,
      timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
      rawData: value
    }
  }
}