// src/lib/platforms/facebook/client.ts

import type { FacebookPage, FacebookMessage } from '@/types/facebook.types'

const API_VERSION = 'v18.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

export class FacebookClient {
  private accessToken: string | null = null
  
  constructor(accessToken?: string) {
    this.accessToken = accessToken || null
  }
  
  setAccessToken(token: string) {
    this.accessToken = token
  }
  
  /**
   * ดึงรายการ Pages ของ user
   */
  async getPages(userToken: string): Promise<FacebookPage[]> {
    const response = await fetch(
      `${BASE_URL}/me/accounts?access_token=${userToken}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch pages')
    }
    
    const data = await response.json()
    return data.data || []
  }
  
  /**
   * Subscribe page to webhook
   */
  async subscribeWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
    const response = await fetch(
      `${BASE_URL}/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks,message_reads',
          access_token: pageAccessToken
        })
      }
    )
    
    return response.ok
  }
  
  /**
   * Unsubscribe page from webhook
   */
  async unsubscribeWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
    const response = await fetch(
      `${BASE_URL}/${pageId}/subscribed_apps?access_token=${pageAccessToken}`,
      { method: 'DELETE' }
    )
    
    return response.ok
  }
  
  /**
   * ส่งข้อความกลับ
   */
  async sendMessage(recipientId: string, text: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token')
    }
    
    const response = await fetch(
      `${BASE_URL}/me/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: 'RESPONSE',
          access_token: this.accessToken
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to send message')
    }
    
    return response.json()
  }
  
  /**
   * ดึงข้อมูล user profile
   */
  async getUserProfile(userId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token')
    }
    
    const response = await fetch(
      `${BASE_URL}/${userId}?fields=name,profile_pic&access_token=${this.accessToken}`
    )
    
    if (!response.ok) {
      return null
    }
    
    return response.json()
  }
  
  /**
   * ดึงข้อความจาก conversation
   */
  async getConversationMessages(
    pageId: string, 
    userId: string,
    limit = 20
  ): Promise<FacebookMessage[]> {
    if (!this.accessToken) {
      throw new Error('No access token')
    }
    
    const conversationId = `${pageId}_${userId}`
    const response = await fetch(
      `${BASE_URL}/${conversationId}/messages?fields=id,message,created_time&limit=${limit}&access_token=${this.accessToken}`
    )
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data.data || []
  }
}