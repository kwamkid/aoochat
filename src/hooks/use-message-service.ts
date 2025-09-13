// src/hooks/use-message-service.ts

import { useState, useCallback } from 'react'
import { messageService } from '@/services/messages/message.service'
import type { Conversation, Message, MessageType } from '@/types/conversation.types'
import { toast } from 'sonner'

/**
 * Hook for message operations
 */
export function useMessageService(conversation: Conversation | null) {
  const [sending, setSending] = useState(false)
  const [typingIndicatorTimeout, setTypingIndicatorTimeout] = useState<NodeJS.Timeout | null>(null)
  
  /**
   * Send a message
   */
  const sendMessage = useCallback(async (
    content: string,
    type: MessageType = 'text',
    attachments?: any[]
  ): Promise<Message | null> => {
    if (!conversation) {
      toast.error('No conversation selected')
      return null
    }
    
    setSending(true)
    
    try {
      // Send typing indicator
      await messageService.sendTypingIndicator(conversation, true)
      
      // Send the message
      const result = await messageService.sendMessage({
        conversation,
        content,
        type,
        attachments
      })
      
      // Clear typing indicator
      await messageService.sendTypingIndicator(conversation, false)
      
      if (result.success && result.message) {
        return result.message
      } else {
        toast.error(result.error || 'Failed to send message')
        return null
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      return null
    } finally {
      setSending(false)
      // Clear typing indicator
      if (conversation) {
        await messageService.sendTypingIndicator(conversation, false)
      }
    }
  }, [conversation])
  
  /**
   * Send typing indicator with debouncing
   */
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!conversation) return
    
    // Clear existing timeout
    if (typingIndicatorTimeout) {
      clearTimeout(typingIndicatorTimeout)
      setTypingIndicatorTimeout(null)
    }
    
    if (isTyping) {
      // Send typing indicator
      messageService.sendTypingIndicator(conversation, true)
      
      // Auto-stop after 5 seconds
      const timeout = setTimeout(() => {
        messageService.sendTypingIndicator(conversation, false)
      }, 5000)
      
      setTypingIndicatorTimeout(timeout)
    } else {
      // Stop typing indicator
      messageService.sendTypingIndicator(conversation, false)
    }
  }, [conversation, typingIndicatorTimeout])
  
  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(async () => {
    if (!conversation) return
    
    try {
      await messageService.markAsRead(conversation.id)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }, [conversation])
  
  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!conversation) return false
    
    try {
      const success = await messageService.deleteMessage(messageId, conversation.id)
      
      if (success) {
        toast.success('Message deleted')
      } else {
        toast.error('Failed to delete message')
      }
      
      return success
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
      return false
    }
  }, [conversation])
  
  /**
   * Edit a message
   */
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string
  ): Promise<Message | null> => {
    if (!conversation) return null
    
    try {
      const updatedMessage = await messageService.editMessage(
        messageId,
        conversation.id,
        newContent
      )
      
      if (updatedMessage) {
        toast.success('Message edited')
      } else {
        toast.error('Failed to edit message')
      }
      
      return updatedMessage
    } catch (error) {
      console.error('Error editing message:', error)
      toast.error('Failed to edit message')
      return null
    }
  }, [conversation])
  
  /**
   * React to a message
   */
  const reactToMessage = useCallback(async (
    messageId: string,
    reaction: string
  ): Promise<boolean> => {
    try {
      const success = await messageService.reactToMessage(messageId, reaction)
      
      if (!success) {
        toast.error('Reactions not supported yet')
      }
      
      return success
    } catch (error) {
      console.error('Error reacting to message:', error)
      return false
    }
  }, [])
  
  return {
    // States
    sending,
    
    // Operations
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    deleteMessage,
    editMessage,
    reactToMessage
  }
}