// src/hooks/use-message-service.ts

import { useState, useCallback } from 'react'
import type { Message, MessageType } from '@/types/conversation.types'
import { toast } from 'sonner'

interface UseMessageServiceOptions {
  conversationId?: string | null
  platform?: string
  onMessageSent?: (message: Message) => void
  onMessageFailed?: (error: Error) => void
}

export function useMessageService(options?: UseMessageServiceOptions | null) {
  // Handle null or undefined options
  const safeOptions = options || {}
  
  const {
    conversationId = null,
    platform,
    onMessageSent,
    onMessageFailed
  } = safeOptions
  
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Send message via platform API
   */
  const sendMessage = useCallback(async (
    content: string,
    type: MessageType = 'text',
    options?: {
      media_url?: string
      buttons?: any[]
      quick_replies?: any[]
      file_name?: string
      file_size?: number
      thumbnail_url?: string
      caption?: string
      url?: string
      filename?: string
    }
  ) => {
    if (!conversationId) {
      console.error('No conversation selected')
      return null
    }

    if (!content.trim() && type === 'text') {
      console.error('Empty message')
      return null
    }

    setSending(true)
    setError(null)

    try {
      console.log(`Sending ${type} message to conversation ${conversationId}`)

      // Determine the endpoint based on platform
      let endpoint = '/api/messages/send'
      
      // For Facebook, use the Facebook-specific endpoint
      if (platform === 'facebook') {
        endpoint = '/api/platforms/facebook/send'
      }

      // Prepare message payload
      const payload: any = {
        conversationId,
        messageType: type,
        message: type === 'text' ? { text: content } : {
          text: content,
          ...options
        }
      }

      // Send the message
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      // Log response details for debugging
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || errorData.details || `Failed to send message: ${response.status}`)
      }

      const data = await response.json()
      console.log('Message sent successfully:', data)

      // Transform response to Message type
      const sentMessage: Message = data.message || {
        id: data.messageId || `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: 'current_user',
        sender_name: 'Agent',
        message_type: type,
        content: {
          text: content,
          ...options
        },
        status: 'sent',
        is_private: false,
        is_automated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Notify success
      if (onMessageSent) {
        onMessageSent(sentMessage)
      }

      return sentMessage

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      console.error('Error sending message:', errorMessage)
      setError(errorMessage)
      
      // Show error toast
      toast.error(errorMessage)
      
      // Notify failure
      if (onMessageFailed) {
        onMessageFailed(err instanceof Error ? err : new Error(errorMessage))
      }
      
      return null
    } finally {
      setSending(false)
    }
  }, [conversationId, platform, onMessageSent, onMessageFailed])

  /**
   * Send quick reply
   */
  const sendQuickReply = useCallback(async (
    text: string,
    options: Array<{ title: string; payload: string }>
  ) => {
    return sendMessage(text, 'text', { quick_replies: options })
  }, [sendMessage])

  /**
   * Send image
   */
  const sendImage = useCallback(async (
    imageUrl: string,
    caption?: string
  ) => {
    return sendMessage(caption || '', 'image', { media_url: imageUrl })
  }, [sendMessage])

  /**
   * Send file
   */
  const sendFile = useCallback(async (
    fileUrl: string,
    filename?: string
  ) => {
    return sendMessage(filename || 'File', 'file', { 
      media_url: fileUrl,
      file_name: filename 
    })
  }, [sendMessage])

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!conversationId || messageIds.length === 0) return

    try {
      const response = await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          messageIds
        })
      })

      if (!response.ok) {
        console.error('Failed to mark messages as read')
      }
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }, [conversationId])

  /**
   * Delete message
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      toast.success('Message deleted')
      return true
    } catch (err) {
      console.error('Error deleting message:', err)
      toast.error('Failed to delete message')
      return false
    }
  }, [])

  /**
   * Edit message (if supported by platform)
   */
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: { text: newContent }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to edit message')
      }

      toast.success('Message edited')
      return true
    } catch (err) {
      console.error('Error editing message:', err)
      toast.error('This platform does not support message editing')
      return false
    }
  }, [])

  /**
   * React to message (if supported by platform)
   */
  const reactToMessage = useCallback(async (messageId: string, reaction: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reaction })
      })

      if (!response.ok) {
        throw new Error('Failed to react to message')
      }

      return true
    } catch (err) {
      console.error('Error reacting to message:', err)
      return false
    }
  }, [])

  return {
    sendMessage,
    sendQuickReply,
    sendImage,
    sendFile,
    markAsRead,
    deleteMessage,
    editMessage,
    reactToMessage,
    sending,
    error
  }
}