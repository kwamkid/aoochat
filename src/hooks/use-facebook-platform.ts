// src/hooks/use-facebook-platform.ts

import { useState, useCallback } from 'react'

interface SendMessageOptions {
  conversationId: string
  message: any
  messageType?: string
}

interface FacebookProfile {
  id: string
  name: string
  firstName?: string
  lastName?: string
  profilePic?: string
  locale?: string
  timezone?: number
  gender?: string
}

export function useFacebookPlatform() {
  const [sendingMessage, setSendingMessage] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(false)
  
  /**
   * Send message via Facebook Messenger
   */
  const sendMessage = useCallback(async ({
    conversationId,
    message,
    messageType = 'text'
  }: SendMessageOptions) => {
    setSendingMessage(true)
    
    try {
      const response = await fetch('/api/platforms/facebook/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          message,
          messageType
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }
      
      console.log('Message sent successfully:', data)
      return data
      
    } catch (error) {
      console.error('Error sending Facebook message:', error)
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      }
      
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [])
  
  /**
   * Get Facebook profile
   */
  const getProfile = useCallback(async (
    userId?: string, 
    conversationId?: string
  ): Promise<FacebookProfile | null> => {
    if (!userId && !conversationId) {
      console.error('Either userId or conversationId is required')
      return null
    }
    
    setFetchingProfile(true)
    
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (conversationId) params.append('conversationId', conversationId)
      
      const response = await fetch(`/api/platforms/facebook/profile?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }
      
      console.log('Profile fetched:', data.profile)
      return data.profile
      
    } catch (error) {
      console.error('Error fetching Facebook profile:', error)
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      
      return null
    } finally {
      setFetchingProfile(false)
    }
  }, [])
  
  /**
   * Sync/refresh profile
   */
  const syncProfile = useCallback(async (customerId: string) => {
    try {
      const response = await fetch('/api/platforms/facebook/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerId })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync profile')
      }
      
      console.log('อัพเดทโปรไฟล์สำเร็จ')
      return data.profile
      
    } catch (error) {
      console.error('Error syncing Facebook profile:', error)
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      
      throw error
    }
  }, [])
  
  /**
   * Send text message helper
   */
  const sendTextMessage = useCallback(async (
    conversationId: string, 
    text: string
  ) => {
    return sendMessage({
      conversationId,
      message: { text },
      messageType: 'text'
    })
  }, [sendMessage])
  
  /**
   * Send image message helper
   */
  const sendImageMessage = useCallback(async (
    conversationId: string,
    imageUrl: string,
    caption?: string
  ) => {
    return sendMessage({
      conversationId,
      message: { url: imageUrl, caption },
      messageType: 'image'
    })
  }, [sendMessage])
  
  /**
   * Send quick replies helper
   */
  const sendQuickReplies = useCallback(async (
    conversationId: string,
    text: string,
    options: Array<{ title: string; payload: string }>
  ) => {
    return sendMessage({
      conversationId,
      message: { text, options },
      messageType: 'quick_replies'
    })
  }, [sendMessage])
  
  /**
   * Send button template helper
   */
  const sendButtons = useCallback(async (
    conversationId: string,
    text: string,
    buttons: Array<{
      type: 'url' | 'postback' | 'phone'
      title: string
      payload: string
    }>
  ) => {
    return sendMessage({
      conversationId,
      message: { text, buttons },
      messageType: 'buttons'
    })
  }, [sendMessage])
  
  /**
   * Send carousel helper
   */
  const sendCarousel = useCallback(async (
    conversationId: string,
    items: Array<{
      title: string
      subtitle?: string
      imageUrl?: string
      buttons?: Array<{
        type: 'url' | 'postback'
        title: string
        payload: string
      }>
    }>
  ) => {
    return sendMessage({
      conversationId,
      message: { items },
      messageType: 'carousel'
    })
  }, [sendMessage])
  
  return {
    // States
    sendingMessage,
    fetchingProfile,
    
    // Core functions
    sendMessage,
    getProfile,
    syncProfile,
    
    // Helper functions
    sendTextMessage,
    sendImageMessage,
    sendQuickReplies,
    sendButtons,
    sendCarousel
  }
}