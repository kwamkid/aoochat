// src/services/webhook/processors/facebook-processor.ts

import { MessageType } from '@/types/conversation.types'

interface FacebookAttachment {
  type: string
  payload: {
    url?: string
    sticker_id?: string | number  // ← รองรับทั้ง string และ number
    coordinates?: { lat: number; long: number }
    title?: string
    [key: string]: any
  }
}

interface FacebookMessage {
  mid: string
  text?: string
  attachments?: FacebookAttachment[]
  quick_reply?: {
    payload: string
  }
  is_echo?: boolean
}

export interface ProcessedMessage {
  messageType: MessageType
  content: any
  platformMessageId: string
}

/**
 * Facebook Message Processor
 * Detects correct message type from Facebook webhook payload
 */
export class FacebookMessageProcessor {
  
  /**
   * Process Facebook message and detect the correct message type
   */
  static processMessage(message: FacebookMessage): ProcessedMessage {
    let messageType: MessageType = 'text'
    let processedContent: any = {
      text: message.text || ''
    }

    // Process attachments
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0]
      const payload = attachment.payload || {}

      // Detect message type from attachment
      switch (attachment.type) {
        case 'image':
          // Check if it's a sticker
          if (payload.sticker_id) {
            messageType = 'sticker'
            processedContent = {
              text: message.text || '',
              sticker_id: String(payload.sticker_id), // ← Convert to string
              sticker_url: payload.url,
              media_url: payload.url,
              // Keep original for reference
              attachments: message.attachments
            }
            console.log('[FacebookProcessor] Detected STICKER:', payload.sticker_id)
          } else {
            // Regular image
            messageType = 'image'
            processedContent = {
              text: message.text || '',
              media_url: payload.url,
              caption: message.text,
              attachments: message.attachments
            }
            console.log('[FacebookProcessor] Detected IMAGE')
          }
          break

        case 'video':
          messageType = 'video'
          processedContent = {
            text: message.text || '',
            media_url: payload.url,
            caption: message.text,
            attachments: message.attachments
          }
          console.log('[FacebookProcessor] Detected VIDEO')
          break

        case 'audio':
          messageType = 'audio'
          processedContent = {
            text: message.text || '',
            media_url: payload.url,
            audio_url: payload.url,
            attachments: message.attachments
          }
          console.log('[FacebookProcessor] Detected AUDIO')
          break

        case 'file':
          messageType = 'file'
          processedContent = {
            text: message.text || '',
            media_url: payload.url,
            file_url: payload.url,
            file_name: payload.title,
            attachments: message.attachments
          }
          console.log('[FacebookProcessor] Detected FILE')
          break

        case 'location':
          messageType = 'location'
          processedContent = {
            text: message.text || '',
            latitude: payload.coordinates?.lat,
            longitude: payload.coordinates?.long,
            location: {
              latitude: payload.coordinates?.lat,
              longitude: payload.coordinates?.long
            },
            attachments: message.attachments
          }
          console.log('[FacebookProcessor] Detected LOCATION')
          break

        case 'fallback':
          // Fallback attachment (unsupported type)
          console.log('[FacebookProcessor] Fallback attachment:', attachment)
          messageType = 'text'
          processedContent = {
            text: message.text || `[Unsupported attachment]`,
            attachments: message.attachments
          }
          break

        default:
          // Unknown attachment type
          console.log('[FacebookProcessor] Unknown attachment type:', attachment.type)
          messageType = 'text'
          processedContent = {
            text: message.text || '',
            attachments: message.attachments
          }
      }
    } else if (message.text) {
      // Text only message
      messageType = 'text'
      processedContent = {
        text: message.text
      }
      console.log('[FacebookProcessor] Detected TEXT only')
    }

    // Handle quick reply
    if (message.quick_reply) {
      processedContent.quick_reply = message.quick_reply
      console.log('[FacebookProcessor] Has quick reply:', message.quick_reply.payload)
    }

    return {
      messageType,
      content: processedContent,
      platformMessageId: message.mid
    }
  }

  /**
   * Process postback (button clicks)
   */
  static processPostback(postback: any) {
    return {
      type: 'postback',
      payload: postback.payload,
      title: postback.title,
      referral: postback.referral
    }
  }

  /**
   * Process delivery confirmation
   */
  static processDelivery(delivery: any) {
    return {
      type: 'delivery',
      messageIds: delivery.mids,
      watermark: delivery.watermark
    }
  }

  /**
   * Process read confirmation
   */
  static processRead(read: any) {
    return {
      type: 'read',
      watermark: read.watermark
    }
  }

  /**
   * Check if message is from page (echo)
   */
  static isEchoMessage(message: FacebookMessage): boolean {
    return !!message.is_echo
  }
}

// Export for backward compatibility
export const processFacebookMessage = FacebookMessageProcessor.processMessage