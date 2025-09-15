// src/services/database/conversations.ts

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const conversationsDB = {
  /**
   * ดึงรายการ conversations
   */
  async list(organizationId?: string) {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          content,
          sender_type,
          created_at
        )
      `)
      .order('last_message_at', { ascending: false })
      .limit(50)
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }
    
    return data || []
  },
  
  /**
   * ดึง conversation เดียว
   */
  async get(id: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching conversation:', error)
      return null
    }
    
    return data
  },
  
  /**
   * Update conversation
   */
  async update(id: string, updates: any) {
    const { error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
    
    return !error
  },
  
  /**
   * Mark as read
   */
  async markAsRead(id: string) {
    return this.update(id, {
      unread_count: 0,
      status: 'open'
    })
  }
}