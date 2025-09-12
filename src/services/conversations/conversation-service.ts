// src/services/conversations/conversation-service.ts

import { createClient } from '@/lib/supabase/client'
import type { Conversation, Message, Customer } from '@/types/conversation.types'

export class ConversationService {
  private supabase = createClient()

  constructor() {
    // Check Supabase connection on init
    this.checkConnection()
  }

  /**
   * Check Supabase connection
   */
  private async checkConnection() {
    try {
      console.log('🔍 Checking Supabase connection...')
      
      // Try a simple query first
      const { error: pingError } = await this.supabase
        .from('conversations')
        .select('id')
        .limit(1)
        .single()
      
      if (pingError && pingError.code !== 'PGRST116') { // PGRST116 = no rows, which is OK
        console.error('❌ Supabase connection check failed:', {
          code: pingError.code,
          message: pingError.message,
          details: pingError.details,
          hint: pingError.hint
        })
        
        // Check if tables exist
        const { data: tables, error: tableError } = await this.supabase
          .rpc('get_tables', {}) // This won't work but will give us info
          .single()
        
        console.log('Troubleshooting tips:')
        console.log('1. Check if tables exist in Supabase Dashboard')
        console.log('2. Check RLS policies (try disabling temporarily)')
        console.log('3. Verify environment variables are correct')
        console.log('4. Make sure you ran the migration SQL')
      } else {
        console.log('✅ Supabase connection successful')
        
        // Count records
        const { count: convCount } = await this.supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
        
        const { count: msgCount } = await this.supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
        
        console.log(`📊 Database stats: ${convCount || 0} conversations, ${msgCount || 0} messages`)
      }
    } catch (err) {
      console.error('❌ Failed to initialize Supabase:', err)
    }
  }

  /**
   * Get all conversations with latest message and customer info
   */
  async getConversations(filters?: {
    status?: string
    platform?: string
    limit?: number
  }) {
    try {
      console.log('Starting getConversations...')
      
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

      console.log('Executing query...')
      const { data: conversations, error } = await query

      if (error) {
        console.error('Error fetching conversations - Details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        })
        return []
      }

      console.log(`Found ${conversations?.length || 0} conversations`)

      if (!conversations || conversations.length === 0) {
        console.log('No conversations found in database')
        return []
      }

      // For each conversation, fetch related data separately
      console.log('Enriching conversations with customer and message data...')
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Get customer data if customer_id exists
          let customer = null
          if (conv.customer_id) {
            const { data: customerData, error: customerError } = await this.supabase
              .from('customers')
              .select('*')
              .eq('id', conv.customer_id)
              .single()
            
            if (customerError) {
              console.log(`Could not fetch customer ${conv.customer_id}:`, customerError.message)
            }
            customer = customerData
          }

          // Get last message
          let lastMessage = null
          const { data: messages, error: messageError } = await this.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (messageError) {
            console.log(`Could not fetch messages for conversation ${conv.id}:`, messageError.message)
          }
          
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

      console.log('Successfully enriched conversations')
      
      // Transform data to match our types
      return enrichedConversations.map(conv => this.transformConversation(conv))
    } catch (error) {
      console.error('Unexpected error in getConversations:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return []
    }
  }

  /**
   * Get single conversation by ID
   */
  async getConversation(conversationId: string) {
    try {
      // Get conversation
      const { data: conversation, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) {
        console.error('Error fetching conversation:', error)
        return null
      }

      if (!conversation) {
        return null
      }

      // Get customer if exists
      let customer = null
      if (conversation.customer_id) {
        const { data: customerData } = await this.supabase
          .from('customers')
          .select('*')
          .eq('id', conversation.customer_id)
          .single()
        
        customer = customerData
      }

      // Get messages
      const { data: messages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      return this.transformConversation({
        ...conversation,
        customer,
        messages: messages || []
      })
    } catch (error) {
      console.error('Error in getConversation:', error)
      return null
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit = 50) {
    try {
      console.log(`Fetching messages for conversation: ${conversationId}`)
      
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error fetching messages - Details:', {
          conversationId,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        })
        return []
      }

      console.log(`Found ${data?.length || 0} messages`)
      
      if (!data || data.length === 0) {
        console.log('No messages found for this conversation')
        return []
      }

      return (data || []).map(msg => this.transformMessage(msg))
    } catch (error) {
      console.error('Unexpected error in getMessages:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
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
        sender_id: 'current_user', // Should get from auth
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

      // Get current conversation to update message count
      const { data: conv } = await this.supabase
        .from('conversations')
        .select('message_count')
        .eq('id', conversationId)
        .single()

      // Update conversation last message and increment count
      await this.supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (conv?.message_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

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
   * Subscribe to real-time updates for all conversations
   */
  subscribeToAllConversations(
    onNewConversation: (conversation: Conversation) => void,
    onUpdateConversation: (conversation: Conversation) => void
  ) {
    console.log('📡 Setting up real-time subscription for conversations...')
    
    const channel = this.supabase
      .channel('all-conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        async (payload) => {
          console.log('🆕 New conversation received:', payload.new)
          
          // Enrich the conversation data
          const enrichedConv = await this.enrichConversation(payload.new)
          const transformed = this.transformConversation(enrichedConv)
          onNewConversation(transformed)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        async (payload) => {
          console.log('🔄 Conversation updated:', payload.new)
          
          // Enrich the conversation data
          const enrichedConv = await this.enrichConversation(payload.new)
          const transformed = this.transformConversation(enrichedConv)
          onUpdateConversation(transformed)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for conversations')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error')
        }
      })

    return () => {
      console.log('🔌 Unsubscribing from real-time conversations')
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to new messages across all conversations
   */
  subscribeToAllMessages(
    onNewMessage: (message: Message, conversationId: string) => void
  ) {
    console.log('📡 Setting up real-time subscription for all messages...')
    
    const channel = this.supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('💬 New message received:', payload.new)
          const message = this.transformMessage(payload.new)
          onNewMessage(message, payload.new.conversation_id)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for messages')
        }
      })

    return () => {
      console.log('🔌 Unsubscribing from real-time messages')
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Helper to enrich conversation with customer and last message
   */
  private async enrichConversation(conversation: any) {
    let customer = null
    if (conversation.customer_id) {
      const { data: customerData } = await this.supabase
        .from('customers')
        .select('*')
        .eq('id', conversation.customer_id)
        .single()
      
      customer = customerData
    }

    let lastMessage = null
    const { data: messages } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (messages && messages.length > 0) {
      lastMessage = messages[0]
    }

    return {
      ...conversation,
      customer,
      last_message: lastMessage
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ) {
    console.log(`📡 Subscribing to conversation: ${conversationId}`)
    
    const channel = this.supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload)
          onMessage(this.transformMessage(payload.new))
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Transform database record to Conversation type
   */
  private transformConversation(data: any): Conversation {
    if (!data) return null as any

    // Get customer data - handle both nested and flat structure
    const customer = data.customer || data.customers || null
    const lastMessage = Array.isArray(data.last_message) 
      ? data.last_message[0] 
      : data.last_message
    const messages = data.messages || []

    // Handle customer name - extract from platform if no customer record
    let customerName = 'Unknown Customer'
    let customerId = data.customer_id || 'unknown'
    
    if (customer && customer.name) {
      customerName = customer.name
      customerId = customer.id
    } else if (data.platform_conversation_id) {
      // Try to extract from platform_conversation_id
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
        last_contact_at: customer?.last_contact_at || data.last_message_at,
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
      last_message_at: data.last_message_at,
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
export const conversationService = new ConversationService()