// src/services/database/messages.ts

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const messagesDB = {
  /**
   * ดึงข้อความใน conversation
   */
  async list(conversationId: string, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }
    
    return data || []
  },
  
  /**
   * ส่งข้อความ
   */
  async send(conversationId: string, text: string) {
    const messageData = {
      conversation_id: conversationId,
      sender_type: 'agent',
      sender_id: 'current_user',
      message_type: 'text',
      content: { text },
      status: 'sent'
    }
    
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()
    
    if (error) {
      console.error('Error sending message:', error)
      return null
    }
    
    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: supabase.rpc('increment', { x: 1 })
      })
      .eq('id', conversationId)
    
    return data
  },
  
  /**
   * ลบข้อความ
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
    
    return !error
  }
}