// src/services/platforms/facebook/facebook.service.ts

import type { IPlatformService, SendMessageOptions, PlatformProfile } from '../platform-service.interface'
import { facebookAPIClient } from './facebook-api-client'
import { facebookMessageBuilder } from './facebook-message-builder'

export class FacebookService implements IPlatformService {
  platform = 'facebook' as const
  
  /**
   * Send a message via Facebook
   */
  async sendMessage(options: SendMessageOptions): Promise<any> {
    const { conversationId, message, messageType = 'text' } = options
    
    console.log('FacebookService: Sending message', { conversationId, messageType })
    
    // Extract recipient ID from conversation ID
    // Format: pageId_userId
    const parts = conversationId.split('_')
    const recipientId = parts[parts.length - 1]
    
    if (!recipientId) {
      throw new Error('Invalid conversation ID format')
    }
    
    // Build message based on type
    let fbMessage: any
    
    switch (messageType) {
      case 'text':
        fbMessage = facebookMessageBuilder.text(message.text || message)
        break
        
      case 'image':
        fbMessage = facebookMessageBuilder.image(message.url, message.caption)
        break
        
      case 'video':
        fbMessage = facebookMessageBuilder.video(message.url, message.caption)
        break
        
      case 'file':
        fbMessage = facebookMessageBuilder.file(message.url, message.filename)
        break
        
      case 'quick_replies':
        fbMessage = facebookMessageBuilder.quickReplies(message.text, message.options)
        break
        
      case 'buttons':
        fbMessage = facebookMessageBuilder.buttons(message.text, message.buttons)
        break
        
      case 'carousel':
        fbMessage = facebookMessageBuilder.carousel(message.items)
        break
        
      default:
        fbMessage = facebookMessageBuilder.text(message.text || JSON.stringify(message))
    }
    
    // Send typing indicator
    await this.sendTypingIndicator(recipientId, true)
    
    try {
      // Handle array of messages (e.g., caption + image)
      const results = []
      if (Array.isArray(fbMessage)) {
        for (const msg of fbMessage) {
          const result = await facebookAPIClient.sendMessage(recipientId, msg)
          results.push(result)
          // Small delay between messages
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } else {
        const result = await facebookAPIClient.sendMessage(recipientId, fbMessage)
        results.push(result)
      }
      
      return results[0]
    } finally {
      // Turn off typing indicator
      await this.sendTypingIndicator(recipientId, false)
    }
  }
  
  /**
   * Send text message
   */
  async sendTextMessage(conversationId: string, text: string): Promise<any> {
    return this.sendMessage({
      conversationId,
      message: { text },
      messageType: 'text'
    })
  }
  
  /**
   * Send image message
   */
  async sendImageMessage(conversationId: string, imageUrl: string, caption?: string): Promise<any> {
    return this.sendMessage({
      conversationId,
      message: { url: imageUrl, caption },
      messageType: 'image'
    })
  }
  
  /**
   * Send file message
   */
  async sendFileMessage(conversationId: string, fileUrl: string, filename?: string): Promise<any> {
    return this.sendMessage({
      conversationId,
      message: { url: fileUrl, filename },
      messageType: 'file'
    })
  }
  
  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<PlatformProfile | null> {
    try {
      const profile = await facebookAPIClient.getUserProfile(userId)
      return profile
    } catch (error) {
      console.error('Error getting Facebook profile:', error)
      return null
    }
  }
  
  /**
   * Sync customer profile
   */
  async syncProfile(customerId: string): Promise<PlatformProfile | null> {
    // This would need to look up the Facebook user ID from customer record
    // For now, return null
    console.log('Sync profile for customer:', customerId)
    return null
  }
  
  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    // Extract recipient ID
    const parts = conversationId.split('_')
    const recipientId = parts[parts.length - 1]
    
    if (recipientId) {
      await facebookAPIClient.sendTypingIndicator(recipientId, isTyping)
    }
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await facebookAPIClient.markAsRead(messageId)
  }
  
  /**
   * Send quick replies
   */
  async sendQuickReplies(conversationId: string, text: string, options: any[]): Promise<any> {
    return this.sendMessage({
      conversationId,
      message: { text, options },
      messageType: 'quick_replies'
    })
  }
  
  /**
   * Send buttons
   */
  async sendButtons(conversationId: string, text: string, buttons: any[]): Promise<any> {
    return this.sendMessage({
      conversationId,
      message: { text, buttons },
      messageType: 'buttons'
    })
  }
  
  /**
   * Send carousel
   */
  async sendCarousel(conversationId: string, items: any[]): Promise<any> {
    return this.sendMessage({
      conversationId,
      message: { items },
      messageType: 'carousel'
    })
  }
  
  /**
   * Upload media
   */
  async uploadMedia(file: any, mimeType: string): Promise<string> {
    return facebookAPIClient.uploadMedia(file, mimeType)
  }
  
  /**
   * Get media URL
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    return facebookAPIClient.getMediaUrl(mediaId)
  }
}

// Create and export singleton instance
export const facebookService = new FacebookService()