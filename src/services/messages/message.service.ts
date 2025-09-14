// src/services/messages/message.service.ts

import { createClient } from '@/lib/supabase/client'
import { PlatformServiceFactory } from '@/services/platforms/platform-registry'
import type { Conversation, Message, MessageType } from '@/types/conversation.types'
import type { IPlatformService } from '@/services/platforms/platform-service.interface'

interface SendMessageParams {
  conversation: Conversation
  content: string
  type?: MessageType
  attachments?: any[]
}

interface SendMessageResult {
  success: boolean
  message?: Message
  error?: string
}

class MessageService {
  private supabase = createClient()

  /**
   * Send a message through the appropriate platform
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { conversation, content, type = 'text', attachments } = params
    
    try {
      // Get platform service
      const platformService = PlatformServiceFactory.getService(conversation.platform)
      
      if (!platformService) {
        console.error(`Platform ${conversation.platform} not supported`)
        return {
          success: false,
          error: `Platform ${conversation.platform} is not supported yet`
        }
      }
      
      // Check if we have platform_conversation_id
      if (!conversation.platform_conversation_id) {
        return {
          success: false,
          error: 'Invalid conversation ID'
        }
      }
      
      // Send through platform service
      let platformResult
      switch (type) {
        case 'text':
          platformResult = await platformService.sendTextMessage(
            conversation.platform_conversation_id,
            content
          )
          break
          
        case 'image':
          if (attachments && attachments[0]) {
            platformResult = await platformService.sendImageMessage(
              conversation.platform_conversation_id,
              attachments[0].url,
              attachments[0].caption
            )
          }
          break
          
        case 'file':
          if (attachments && attachments[0]) {
            platformResult = await platformService.sendFileMessage(
              conversation.platform_conversation_id,
              attachments[0].url,
              attachments[0].filename
            )
          }
          break
          
        default:
          platformResult = await platformService.sendMessage({
            conversationId: conversation.platform_conversation_id,
            message: { text: content },
            messageType: type
          })
      }
      
      // Store message in database
      const messageData = {
        conversation_id: conversation.id,
        platform_message_id: platformResult?.message_id,
        sender_type: 'agent',
        sender_id: 'current_user',
        sender_name: 'Agent',
        message_type: type,
        content: { text: content },
        status: 'sent',
        is_private: false,
        is_automated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: savedMessage, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()
      
      if (error) {
        console.error('Error saving message to database:', error)
        return {
          success: false,
          error: 'Failed to save message'
        }
      }
      
      // Update conversation
      await this.supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (conversation.message_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
      
      return {
        success: true,
        message: this.transformMessage(savedMessage)
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }
    }
  }
  
  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversation: Conversation, isTyping: boolean): Promise<void> {
    try {
      const platformService = PlatformServiceFactory.getService(conversation.platform)
      
      if (!platformService?.sendTypingIndicator || !conversation.platform_conversation_id) {
        return
      }
      
      await platformService.sendTypingIndicator(
        conversation.platform_conversation_id,
        isTyping
      )
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }
  
  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      // Update conversation unread count
      await this.supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)
      
      // Mark messages as read
      await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('read_at', null)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }
  
  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, conversationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('conversation_id', conversationId)
      
      if (error) {
        console.error('Error deleting message:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }
  
  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    conversationId: string,
    newContent: string
  ): Promise<Message | null> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .update({
          content: { text: newContent },
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('conversation_id', conversationId)
        .select()
        .single()
      
      if (error) {
        console.error('Error editing message:', error)
        return null
      }
      
      return this.transformMessage(data)
    } catch (error) {
      console.error('Error editing message:', error)
      return null
    }
  }
  
  /**
   * React to a message (not all platforms support this)
   */
  async reactToMessage(messageId: string, reaction: string): Promise<boolean> {
    try {
      // This would need platform-specific implementation
      console.log('React to message:', messageId, reaction)
      return false // Not implemented yet
    } catch (error) {
      console.error('Error reacting to message:', error)
      return false
    }
  }
  
  /**
   * Transform database message to Message type
   */
  private transformMessage(data: any): Message {
    return {
      id: data.id,
      conversation_id: data.conversation_id,
      platform_message_id: data.platform_message_id,
      sender_type: data.sender_type,
      sender_id: data.sender_id,
      sender_name: data.sender_name || 'Unknown',
      sender_avatar: data.sender_avatar,
      message_type: data.message_type || 'text',
      content: data.content || {},
      is_private: data.is_private || false,
      is_automated: data.is_automated || false,
      sentiment: data.sentiment,
      status: data.status || 'sent',
      delivered_at: data.delivered_at,
      read_at: data.read_at,
      error_message: data.error_message,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }
}

// Export singleton instance
export const messageService = new MessageService()