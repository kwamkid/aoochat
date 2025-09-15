// src/services/platforms/facebook/facebook-api-client.ts

class FacebookAPIClient {
  private baseUrl = 'https://graph.facebook.com/v18.0'
  private pageAccessToken: string | null = null

  /**
   * Set page access token for API calls
   */
  setPageAccessToken(token: string) {
    this.pageAccessToken = token
  }

  /**
   * Get page access token from database
   */
  async getPageAccessToken(pageId: string): Promise<string | null> {
    try {
      // Import dynamically to avoid server/client issues
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('platform_accounts')
        .select('access_token')
        .eq('platform', 'facebook')
        .eq('account_id', pageId)
        .single()
      
      if (error || !data?.access_token) {
        console.error('Failed to get page access token:', error)
        return null
      }
      
      this.pageAccessToken = data.access_token
      return data.access_token
    } catch (error) {
      console.error('Error getting page access token:', error)
      return null
    }
  }

  /**
   * Send a message to Facebook user
   */
  async sendMessage(recipientId: string, message: any): Promise<any> {
    if (!this.pageAccessToken) {
      throw new Error('No page access token available')
    }

    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message,
          messaging_type: 'RESPONSE',
          access_token: this.pageAccessToken
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to send message')
      }

      const data = await response.json()
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
    if (!this.pageAccessToken) {
      throw new Error('No page access token available')
    }

    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: isTyping ? 'typing_on' : 'typing_off',
          access_token: this.pageAccessToken
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
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<any> {
    if (!this.pageAccessToken) {
      // Try to get from environment variable as fallback
      const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      if (!token) {
        throw new Error('No page access token available')
      }
      this.pageAccessToken = token
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${userId}?fields=id,name,first_name,last_name,profile_pic,locale,timezone,gender&access_token=${this.pageAccessToken}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to get user profile')
      }

      const data = await response.json()
      
      // Transform to our format
      return {
        id: data.id,
        name: data.name,
        firstName: data.first_name,
        lastName: data.last_name,
        profilePic: data.profile_pic,
        locale: data.locale,
        timezone: data.timezone,
        gender: data.gender
      }
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    if (!this.pageAccessToken) {
      throw new Error('No page access token available')
    }

    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: messageId },
          sender_action: 'mark_seen',
          access_token: this.pageAccessToken
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
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string, limit = 20): Promise<any[]> {
    if (!this.pageAccessToken) {
      throw new Error('No page access token available')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${conversationId}/messages?fields=id,message,created_time,from,to&limit=${limit}&access_token=${this.pageAccessToken}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to get messages')
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error getting conversation messages:', error)
      return []
    }
  }

  /**
   * Upload media and get attachment ID
   */
  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'video' | 'file'): Promise<string> {
    if (!this.pageAccessToken) {
      throw new Error('No page access token available')
    }

    try {
      const response = await fetch(`${this.baseUrl}/me/message_attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            attachment: {
              type: mediaType,
              payload: {
                url: mediaUrl,
                is_reusable: true
              }
            }
          },
          access_token: this.pageAccessToken
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to upload media')
      }

      const data = await response.json()
      return data.attachment_id
    } catch (error) {
      console.error('Error uploading media:', error)
      throw error
    }
  }
}

// Export singleton instance
export const facebookAPIClient = new FacebookAPIClient()