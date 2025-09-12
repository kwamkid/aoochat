// src/services/conversations/conversation-polling-service.ts

import { createClient } from '@/lib/supabase/client'
import type { Conversation, Message, Customer } from '@/types/conversation.types'

export class ConversationPollingService {
  private supabase = createClient()
  private lastCheckTime: string | null = null
  private lastConversationId: string | null = null

  constructor() {
    // Initialize last check time
    this.lastCheckTime = localStorage.getItem('lastCheckTime') || new Date().toISOString()
    this.lastConversationId = localStorage.getItem('lastConversationId')
  }

  /**
   * Get all conversations with polling check for new ones
   */
  async getConversationsWithCheck(filters?: {
    status?: string
    platform?: string
    limit?: number
  }) {
    const conversations = await this.getConversations(filters)
    
    // Check for new conversations/messages
    if (conversations.length > 0) {
      const latestConv = conversations[0]
      const hasNewActivity = this.checkForNewActivity(latestConv)
      
      // Update tracking
      if (latestConv.last_message_at) {
        this.lastCheckTime = latestConv.last_message_at
        localStorage.setItem('lastCheckTime', this.lastCheckTime)
      }
      
      if (latestConv.id !== this.lastConversationId) {
        this.lastConversationId = latestConv.id
        localStorage.setItem('lastConversationId', latestConv.id)
      }
      
      return { conversations, hasNewActivity, latestConversation: latestConv }
    }
    
    return { conversations, hasNewActivity: false, latestConversation: null }
  }

  /**
   * Check if there's new activity
   */
  private checkForNewActivity(latestConv: Conversation): boolean {
    // Check if this is a new conversation
    if (this.lastConversationId && latestConv.id !== this.lastConversationId) {
      return true
    }
    
    // Check if there's a new message
    if (this.lastCheckTime && latestConv.last_message_at) {
      return new Date(latestConv.last_message_at) > new Date(this.lastCheckTime)
    }
    
    return false
  }

  /**
   * Get all conversations
   */
  async getConversations(filters?: {
    status?: string
    platform?: string
    limit?: number
  }) {
    try {
      console.log('Polling for conversations...')
      
      // First, get conversations
      let query = this.supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.platform) {
        query = query.eq('platform', filters.platform)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data: conversations, error } = await query

      if (error) {
        console.error('Error fetching conversations:', error)
        return []
      }

      if (!conversations || conversations.length === 0) {
        return []
      }

      // Enrich conversations with customer and message data
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Get customer data if customer_id exists
          let customer = null
          if (conv.customer_id) {
            const { data: customerData } = await this.supabase
              .from('customers')
              .select('*')
              .eq('id', conv.customer_id)
              .single()
            
            customer = customerData
          }

          // Get last message
          let lastMessage = null
          const { data: messages } = await this.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (messages && messages.length > 0) {
            lastMessage = messages[0]
          }

          return {
            ...conv,
            customer,
            last_message: lastMessage
          }
        })
      )
      
      return enrichedConversations.map(conv => this.transformConversation(conv))
    } catch (error) {
      console.error('Error in getConversations:', error)
      return []
    }
  }

  /**
   * Get messages for a conversation with polling
   */
  async getMessages(conversationId: string, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error fetching messages:', error)
        return []
      }

      return (data || []).map(msg => this.transformMessage(msg))
    } catch (error) {
      console.error('Error in getMessages:', error)
      return []
    }
  }

  /**
   * Get messages with pagination support
   * Returns messages in chronological order (oldest to newest)
   */
  async getMessagesPaginated(conversationId: string, limit = 30, offset = 0) {
    try {
      console.log(`Getting paginated messages: limit=${limit}, offset=${offset}`)
      
      // First, get total count
      const { count } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
      
      const totalMessages = count || 0
      console.log(`Total messages in conversation: ${totalMessages}`)
      
      // Calculate the actual offset from the end
      // We want to get the newest messages first
      const startIndex = Math.max(0, totalMessages - offset - limit)
      const endIndex = totalMessages - offset - 1
      
      console.log(`Fetching messages from index ${startIndex} to ${endIndex}`)
      
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(startIndex, endIndex)

      if (error) {
        console.error('Error fetching paginated messages:', error)
        return []
      }

      const messages = (data || []).map(msg => this.transformMessage(msg))
      console.log(`Fetched ${messages.length} messages`)
      
      return messages
    } catch (error) {
      console.error('Error in getMessagesPaginated:', error)
      return []
    }
  }

  /**
   * Poll for new messages in a conversation
   */
  async pollMessages(conversationId: string, lastMessageId?: string) {
    try {
      console.log(`[Service] Polling messages for ${conversationId}, after ${lastMessageId}`)
      
      let query = this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (lastMessageId) {
        // Get messages newer than the last known message
        const { data: lastMsg } = await this.supabase
          .from('messages')
          .select('created_at')
          .eq('id', lastMessageId)
          .single()
        
        if (lastMsg) {
          console.log(`[Service] Getting messages after ${lastMsg.created_at}`)
          query = query.gt('created_at', lastMsg.created_at)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('[Service] Error polling messages:', error)
        return []
      }

      console.log(`[Service] Found ${data?.length || 0} new messages`)
      
      // Reverse to get chronological order
      const messages = (data || []).map(msg => this.transformMessage(msg)).reverse()
      
      if (messages.length > 0) {
        console.log(`[Service] Returning messages:`, messages.map(m => ({
          id: m.id,
          sender_type: m.sender_type,
          text: m.content?.text?.substring(0, 30)
        })))
      }
      
      return messages
    } catch (error) {
      console.error('[Service] Error in pollMessages:', error)
      return []
    }
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId: string, content: string, type = 'text') {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: 'current_user',
        sender_name: 'Agent',
        message_type: type,
        content: { text: content },
        status: 'sent',
        is_private: false,
        is_automated: false
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        return null
      }

      // Update conversation's last message time and count
      const { data: conv } = await this.supabase
        .from('conversations')
        .select('message_count')
        .eq('id', conversationId)
        .single()

      const { error: updateError } = await this.supabase
        .from('conversations')
        .update({
          last_message_at: data.created_at,
          message_count: (conv?.message_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (updateError) {
        console.error('Error updating conversation:', updateError)
      }

      return this.transformMessage(data)
    } catch (error) {
      console.error('Error in sendMessage:', error)
      return null
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string) {
    try {
      await this.supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)

      await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('read_at', null)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  /**
   * Transform database record to Conversation type
   */
  private transformConversation(data: any): Conversation {
    if (!data) return null as any

    const customer = data.customer || null
    const lastMessage = Array.isArray(data.last_message) 
      ? data.last_message[0] 
      : data.last_message
    const messages = data.messages || []

    let customerName = 'Unknown Customer'
    let customerId = data.customer_id || 'unknown'
    
    if (customer && customer.name) {
      customerName = customer.name
      customerId = customer.id
    } else if (data.platform_conversation_id) {
      const parts = data.platform_conversation_id.split('_')
      if (parts.length > 1) {
        customerId = parts[parts.length - 1]
        customerName = `Customer ${customerId.substring(0, 6)}`
      }
    }

    return {
      id: data.id,
      customer: {
        id: customerId,
        name: customerName,
        email: customer?.email,
        phone: customer?.phone,
        avatar_url: customer?.avatar_url,
        platform_identities: customer?.platform_identities || {},
        tags: customer?.tags || [],
        last_contact_at: customer?.last_contact_at || data.last_message_at || data.created_at,
        total_conversations: customer?.total_conversations || 1,
        total_spent: customer?.total_spent || 0,
        engagement_score: customer?.engagement_score || 50,
        created_at: customer?.created_at || data.created_at
      },
      platform: data.platform,
      platform_conversation_id: data.platform_conversation_id,
      subject: data.subject || `${data.platform} Conversation`,
      status: data.status || 'new',
      priority: data.priority || 'normal',
      channel_type: data.channel_type || 'direct_message',
      assigned_to: data.assigned_to ? {
        id: data.assigned_to,
        name: 'Agent',
        avatar_url: undefined
      } : undefined,
      last_message: lastMessage ? this.transformMessage(lastMessage) : undefined,
      last_message_at: data.last_message_at || data.created_at,
      first_response_at: data.first_response_at,
      message_count: data.message_count || messages.length || 0,
      unread_count: data.unread_count || 0,
      tags: data.tags || [],
      is_archived: data.is_archived || false,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  /**
   * Transform database record to Message type
   */
  private transformMessage(data: any): Message {
    if (!data) return null as any

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
export const conversationPollingService = new ConversationPollingService()