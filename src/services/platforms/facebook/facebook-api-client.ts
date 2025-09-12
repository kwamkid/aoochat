// src/services/platforms/facebook/facebook-api-client.ts

import { PlatformAPIClient, PlatformCredentials } from '@/types/webhook.types'

export class FacebookAPIClient implements PlatformAPIClient {
  platform = 'facebook' as const
  credentials: PlatformCredentials
  private baseUrl = 'https://graph.facebook.com/v18.0'
  
  constructor(credentials?: PlatformCredentials) {
    this.credentials = credentials || {
      platform: 'facebook',
      accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET
    }
  }
  
  /**
   * Send a message to Facebook user
   */
  async sendMessage(recipientId: string, message: any): Promise<any> {
    try {
      console.log('Sending Facebook message to:', recipientId)
      console.log('Message content:', message)
      
      const url = `${this.baseUrl}/me/messages`
      
      const payload = {
        recipient: { id: recipientId },
        message: message,
        messaging_type: 'RESPONSE' // Can be RESPONSE, UPDATE, or MESSAGE_TAG
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          access_token: this.credentials.accessToken
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Facebook API error:', data)
        throw new Error(data.error?.message || 'Failed to send message')
      }
      
      console.log('Message sent successfully:', data)
      return data
    } catch (error) {
      console.error('Error sending Facebook message:', error)
      throw error
    }
  }
  
  /**
   * Send typing indicator
   */
  async sendTypingIndicator(recipientId: string, isTyping: boolean): Promise<void> {
    try {
      const url = `${this.baseUrl}/me/messages`
      
      const payload = {
        recipient: { id: recipientId },
        sender_action: isTyping ? 'typing_on' : 'typing_off'
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          access_token: this.credentials.accessToken
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to send typing indicator:', error)
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }
  
  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/me/messages`
      
      const payload = {
        recipient: { id: messageId },
        sender_action: 'mark_seen'
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          access_token: this.credentials.accessToken
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to mark as read:', error)
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }
  
  /**
   * Get user profile from Facebook
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      console.log('Fetching Facebook profile for:', userId)
      
      // Fields to request from Facebook
      const fields = [
        'id',
        'name',
        'first_name',
        'last_name',
        'profile_pic',
        'locale',
        'timezone',
        'gender'
      ].join(',')
      
      const url = `${this.baseUrl}/${userId}?fields=${fields}&access_token=${this.credentials.accessToken}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Facebook API error:', data)
        throw new Error(data.error?.message || 'Failed to get user profile')
      }
      
      console.log('Facebook profile fetched:', data)
      
      // Transform to our standard format
      return {
        id: data.id,
        name: data.name,
        firstName: data.first_name,
        lastName: data.last_name,
        profilePic: data.profile_pic,
        locale: data.locale,
        timezone: data.timezone,
        gender: data.gender,
        platform: 'facebook',
        raw: data
      }
    } catch (error) {
      console.error('Error fetching Facebook profile:', error)
      throw error
    }
  }
  
  /**
   * Get page information
   */
  async getPageInfo(): Promise<any> {
    try {
      const url = `${this.baseUrl}/me?fields=id,name,picture&access_token=${this.credentials.accessToken}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get page info')
      }
      
      return data
    } catch (error) {
      console.error('Error fetching page info:', error)
      throw error
    }
  }
  
  /**
   * Upload media (simplified version using URL only)
   * For file uploads in browser environment, use uploadMediaFromUrl instead
   */
  async uploadMedia(file: any, mimeType: string): Promise<string> {
    // In browser environment, we can't easily handle Buffer
    // Redirect to URL-based upload
    if (typeof file === 'string') {
      return this.uploadMediaFromUrl(file, this.getAttachmentTypeFromMime(mimeType))
    }
    
    // For File/Blob objects in browser
    if (file instanceof File || file instanceof Blob) {
      // Convert to data URL and upload
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string
            const attachmentId = await this.uploadMediaFromUrl(
              dataUrl, 
              this.getAttachmentTypeFromMime(mimeType)
            )
            resolve(attachmentId)
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
    
    // For other types, try to upload as URL
    console.warn('Unsupported file type for upload, attempting as URL')
    return this.uploadMediaFromUrl(file, this.getAttachmentTypeFromMime(mimeType))
  }
  
  /**
   * Upload media from URL (recommended method)
   */
  async uploadMediaFromUrl(mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'file'): Promise<string> {
    try {
      const url = `${this.baseUrl}/me/message_attachments`
      
      const payload = {
        message: {
          attachment: {
            type: mediaType,
            payload: {
              url: mediaUrl,
              is_reusable: true
            }
          }
        },
        access_token: this.credentials.accessToken
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to upload media from URL')
      }
      
      return data.attachment_id
    } catch (error) {
      console.error('Error uploading media from URL:', error)
      throw error
    }
  }
  
  /**
   * Get media URL (not needed for Facebook, media is sent directly)
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    // Facebook doesn't provide direct media URLs
    // Media is accessed through attachment_id
    return mediaId
  }
  
  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/me?access_token=${this.credentials.accessToken}`
      const response = await fetch(url)
      return response.ok
    } catch (error) {
      console.error('Error validating credentials:', error)
      return false
    }
  }
  
  /**
   * Subscribe webhook
   */
  async subscribeWebhook(callbackUrl: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/${this.credentials.appId}/subscriptions`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          object: 'page',
          callback_url: callbackUrl,
          fields: 'messages,messaging_postbacks,messaging_optins',
          verify_token: process.env.META_VERIFY_TOKEN,
          access_token: `${this.credentials.appId}|${this.credentials.appSecret}`
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to subscribe webhook')
      }
    } catch (error) {
      console.error('Error subscribing webhook:', error)
      throw error
    }
  }
  
  /**
   * Unsubscribe webhook
   */
  async unsubscribeWebhook(): Promise<void> {
    try {
      const url = `${this.baseUrl}/${this.credentials.appId}/subscriptions`
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          object: 'page',
          access_token: `${this.credentials.appId}|${this.credentials.appSecret}`
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to unsubscribe webhook')
      }
    } catch (error) {
      console.error('Error unsubscribing webhook:', error)
      throw error
    }
  }
  
  /**
   * Refresh access token (for user access tokens, not page tokens)
   */
  async refreshAccessToken(): Promise<string> {
    try {
      const url = `${this.baseUrl}/oauth/access_token`
      
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.credentials.appId!,
        client_secret: this.credentials.appSecret!,
        fb_exchange_token: this.credentials.accessToken!
      })
      
      const response = await fetch(`${url}?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to refresh token')
      }
      
      this.credentials.accessToken = data.access_token
      return data.access_token
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw error
    }
  }
  
  /**
   * Send image using URL
   */
  async sendImageMessage(recipientId: string, imageUrl: string, isReusable = false): Promise<any> {
    const message = {
      attachment: {
        type: 'image',
        payload: {
          url: imageUrl,
          is_reusable: isReusable
        }
      }
    }
    
    return this.sendMessage(recipientId, message)
  }
  
  /**
   * Send video using URL
   */
  async sendVideoMessage(recipientId: string, videoUrl: string, isReusable = false): Promise<any> {
    const message = {
      attachment: {
        type: 'video',
        payload: {
          url: videoUrl,
          is_reusable: isReusable
        }
      }
    }
    
    return this.sendMessage(recipientId, message)
  }
  
  /**
   * Send file using URL
   */
  async sendFileMessage(recipientId: string, fileUrl: string, isReusable = false): Promise<any> {
    const message = {
      attachment: {
        type: 'file',
        payload: {
          url: fileUrl,
          is_reusable: isReusable
        }
      }
    }
    
    return this.sendMessage(recipientId, message)
  }
  
  /**
   * Send audio using URL
   */
  async sendAudioMessage(recipientId: string, audioUrl: string, isReusable = false): Promise<any> {
    const message = {
      attachment: {
        type: 'audio',
        payload: {
          url: audioUrl,
          is_reusable: isReusable
        }
      }
    }
    
    return this.sendMessage(recipientId, message)
  }
  
  /**
   * Helper: Get attachment type from MIME type
   */
  private getAttachmentTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'file'
  }
}

// Export singleton instance
export const facebookAPIClient = new FacebookAPIClient()