// src/services/platforms/facebook/facebook-api-client-v2.ts

import { PlatformAPIClient, PlatformCredentials } from '@/types/webhook.types'
import { createClient } from '@/lib/supabase/client'

export class FacebookAPIClientV2 implements PlatformAPIClient {
  platform = 'facebook' as const
  credentials: PlatformCredentials
  private baseUrl = 'https://graph.facebook.com/v18.0'
  private supabase = createClient()
  
  constructor(credentials?: PlatformCredentials) {
    // Default credentials for app-level operations
    this.credentials = credentials || {
      platform: 'facebook',
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET
    }
  }
  
  /**
   * Get page access token from database
   */
  private async getPageAccessToken(pageId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('platform_accounts')
        .select('access_token')
        .eq('platform', 'facebook')
        .eq('account_id', pageId)
        .eq('is_active', true)
        .single()
      
      if (error || !data) {
        console.error('Failed to get page access token:', error)
        return null
      }
      
      return data.access_token
    } catch (error) {
      console.error('Error getting page access token:', error)
      return null
    }
  }
  
  /**
   * Get page ID from conversation ID
   * Conversation ID format: pageId_userId
   */
  private extractPageId(conversationId: string): string {
    const parts = conversationId.split('_')
    return parts[0] // First part is page ID
  }
  
  /**
   * Send a message to Facebook user
   */
  async sendMessage(recipientId: string, message: any, pageId?: string): Promise<any> {
    try {
      // Get page access token
      let accessToken: string | null = null
      
      if (pageId) {
        accessToken = await this.getPageAccessToken(pageId)
      } else {
        // Try to extract from conversation ID format
        if (recipientId.includes('_')) {
          const extractedPageId = this.extractPageId(recipientId)
          accessToken = await this.getPageAccessToken(extractedPageId)
          
          // Extract actual recipient ID (user ID)
          const parts = recipientId.split('_')
          recipientId = parts[parts.length - 1]
        }
      }
      
      if (!accessToken) {
        throw new Error('No access token found for this page')
      }
      
      console.log('Sending Facebook message to:', recipientId)
      
      const url = `${this.baseUrl}/me/messages`
      
      const payload = {
        recipient: { id: recipientId },
        message: message,
        messaging_type: 'RESPONSE'
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          access_token: accessToken
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
  async sendTypingIndicator(recipientId: string, isTyping: boolean, pageId?: string): Promise<void> {
    try {
      // Get page access token
      let accessToken: string | null = null
      
      if (pageId) {
        accessToken = await this.getPageAccessToken(pageId)
      } else if (recipientId.includes('_')) {
        const extractedPageId = this.extractPageId(recipientId)
        accessToken = await this.getPageAccessToken(extractedPageId)
        
        // Extract actual recipient ID
        const parts = recipientId.split('_')
        recipientId = parts[parts.length - 1]
      }
      
      if (!accessToken) {
        console.warn('No access token for typing indicator')
        return
      }
      
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
          access_token: accessToken
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
   * Get user profile from Facebook
   */
  async getUserProfile(userId: string, pageId?: string): Promise<any> {
    try {
      // Get page access token
      let accessToken: string | null = null
      
      if (pageId) {
        accessToken = await this.getPageAccessToken(pageId)
      } else {
        // Try to get any active page token (fallback)
        const { data } = await this.supabase
          .from('platform_accounts')
          .select('access_token')
          .eq('platform', 'facebook')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        accessToken = data?.access_token
      }
      
      if (!accessToken) {
        throw new Error('No access token available')
      }
      
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
      
      const url = `${this.baseUrl}/${userId}?fields=${fields}&access_token=${accessToken}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Facebook API error:', data)
        throw new Error(data.error?.message || 'Failed to get user profile')
      }
      
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
   * Subscribe page to webhook
   */
  async subscribePageToWebhook(pageId: string): Promise<void> {
    try {
      const accessToken = await this.getPageAccessToken(pageId)
      if (!accessToken) {
        throw new Error('No access token for page')
      }
      
      const url = `${this.baseUrl}/${pageId}/subscribed_apps`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks,messaging_optins',
          access_token: accessToken
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to subscribe page')
      }
      
      console.log(`Page ${pageId} subscribed to webhook`)
    } catch (error) {
      console.error('Error subscribing page to webhook:', error)
      throw error
    }
  }
  
  // Keep other methods unchanged...
  async markAsRead(messageId: string): Promise<void> {
    // Implementation remains the same
  }
  
  async validateCredentials(): Promise<boolean> {
    // Check if we have at least one active page
    const { data } = await this.supabase
      .from('platform_accounts')
      .select('id')
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .limit(1)
    
    return !!data && data.length > 0
  }
}

// Export new version
export const facebookAPIClientV2 = new FacebookAPIClientV2()