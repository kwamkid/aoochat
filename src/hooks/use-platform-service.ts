// src/hooks/use-platform-service.ts

import { useState, useCallback, useMemo } from 'react'
import { PlatformServiceFactory } from '@/services/platforms/platform-registry'
import type { Platform, Conversation, Message } from '@/types/conversation.types'
import type { IPlatformService } from '@/services/platforms/platform-service.interface'
import { conversationPollingService } from '@/services/conversations/conversation-polling-service'
import { toast } from 'sonner'

/**
 * Hook for platform-specific operations
 */
export function usePlatformService(conversation: Conversation | null) {
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  
  // Get platform service
  const platformService = useMemo<IPlatformService | null>(() => {
    if (!conversation) return null
    return PlatformServiceFactory.getService(conversation.platform)
  }, [conversation?.platform])
  
  // Check if platform is supported
  const isPlatformSupported = useMemo(() => {
    if (!conversation) return false
    return PlatformServiceFactory.isSupported(conversation.platform)
  }, [conversation?.platform])
  
  /**
   * Send message through appropriate platform
   */
  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    options?: any
  ): Promise<Message | null> => {
    if (!conversation || !platformService) {
      toast.error('Platform not supported')
      return null
    }
    
    // Check if we have platform_conversation_id
    if (!conversation.platform_conversation_id) {
      toast.error('Invalid conversation ID')
      return null
    }
    
    setSendingMessage(true)
    
    try {
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        platform_message_id: undefined,
        sender_type: 'agent',
        sender_id: 'current_user',
        sender_name: 'You',
        sender_avatar: undefined,
        message_type: type,
        content: { text: content, ...options },
        is_private: false,
        is_automated: false,
        sentiment: undefined,
        status: 'sending',
        delivered_at: undefined,
        read_at: undefined,
        error_message: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Send through platform service
      let result
      switch (type) {
        case 'text':
          result = await platformService.sendTextMessage(
            conversation.platform_conversation_id,
            content
          )
          break
          
        case 'image':
          result = await platformService.sendImageMessage(
            conversation.platform_conversation_id,
            options?.url || content,
            options?.caption
          )
          break
          
        case 'file':
          result = await platformService.sendFileMessage(
            conversation.platform_conversation_id,
            options?.url || content,
            options?.filename
          )
          break
          
        default:
          result = await platformService.sendMessage({
            conversationId: conversation.platform_conversation_id,
            message: { text: content, ...options },
            messageType: type
          })
      }
      
      // Store in database
      const sentMessage = await conversationPollingService.sendMessage(
        conversation.id,
        content,
        type
      )
      
      if (sentMessage) {
        toast.success('Message sent')
        return sentMessage
      } else {
        // Update optimistic message to failed
        const failedMessage = { ...optimisticMessage, status: 'failed' as const }
        toast.error('Failed to send message')
        return failedMessage
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      return null
    } finally {
      setSendingMessage(false)
    }
  }, [conversation, platformService])
  
  /**
   * Get user profile from platform
   */
  const getProfile = useCallback(async (userId?: string) => {
    if (!platformService) {
      toast.error('Platform not supported')
      return null
    }
    
    setLoadingProfile(true)
    
    try {
      const userIdToFetch = userId || conversation?.customer?.id
      if (!userIdToFetch) {
        throw new Error('No user ID available')
      }
      
      const profile = await platformService.getProfile(userIdToFetch)
      
      if (profile) {
        toast.success('Profile loaded')
      }
      
      return profile
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
      return null
    } finally {
      setLoadingProfile(false)
    }
  }, [conversation, platformService])
  
  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!conversation || !platformService?.sendTypingIndicator) return
    
    // Check if we have platform_conversation_id
    if (!conversation.platform_conversation_id) {
      console.warn('No platform conversation ID for typing indicator')
      return
    }
    
    try {
      await platformService.sendTypingIndicator(
        conversation.platform_conversation_id,
        isTyping
      )
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }, [conversation, platformService])
  
  /**
   * Send quick replies (if supported)
   */
  const sendQuickReplies = useCallback(async (
    text: string,
    options: any[]
  ) => {
    if (!conversation || !platformService?.sendQuickReplies) {
      toast.error('Quick replies not supported on this platform')
      return null
    }
    
    // Check if we have platform_conversation_id
    if (!conversation.platform_conversation_id) {
      toast.error('Invalid conversation ID')
      return null
    }
    
    setSendingMessage(true)
    
    try {
      const result = await platformService.sendQuickReplies(
        conversation.platform_conversation_id,
        text,
        options
      )
      
      toast.success('Quick replies sent')
      return result
    } catch (error) {
      console.error('Error sending quick replies:', error)
      toast.error('Failed to send quick replies')
      return null
    } finally {
      setSendingMessage(false)
    }
  }, [conversation, platformService])
  
  /**
   * Send carousel (if supported)
   */
  const sendCarousel = useCallback(async (items: any[]) => {
    if (!conversation || !platformService?.sendCarousel) {
      toast.error('Carousel not supported on this platform')
      return null
    }
    
    // Check if we have platform_conversation_id
    if (!conversation.platform_conversation_id) {
      toast.error('Invalid conversation ID')
      return null
    }
    
    setSendingMessage(true)
    
    try {
      const result = await platformService.sendCarousel(
        conversation.platform_conversation_id,
        items
      )
      
      toast.success('Carousel sent')
      return result
    } catch (error) {
      console.error('Error sending carousel:', error)
      toast.error('Failed to send carousel')
      return null
    } finally {
      setSendingMessage(false)
    }
  }, [conversation, platformService])
  
  return {
    // States
    sendingMessage,
    loadingProfile,
    isPlatformSupported,
    
    // Platform info
    platform: conversation?.platform,
    platformService,
    
    // Operations
    sendMessage,
    getProfile,
    sendTypingIndicator,
    sendQuickReplies,
    sendCarousel,
    
    // Feature checks
    supportsQuickReplies: !!platformService?.sendQuickReplies,
    supportsCarousel: !!platformService?.sendCarousel,
    supportsTypingIndicator: !!platformService?.sendTypingIndicator,
    supportsButtons: !!platformService?.sendButtons,
  }
}