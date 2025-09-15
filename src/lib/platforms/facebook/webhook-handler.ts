// src/lib/platforms/facebook/webhook-handler.ts

import { createClient } from '@supabase/supabase-js'
import type { FacebookWebhookEvent } from '@/types/facebook.types'

// สร้าง Supabase client แบบ service role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function handleFacebookWebhook(payload: any) {
  try {
    // Facebook ส่ง events มาเป็น array
    for (const entry of payload.entry) {
      const pageId = entry.id
      
      if (!entry.messaging || entry.messaging.length === 0) {
        continue
      }
      
      for (const event of entry.messaging) {
        await processEvent(pageId, event)
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Webhook error:', error)
    return { success: false, error }
  }
}

async function processEvent(pageId: string, event: FacebookWebhookEvent) {
  const senderId = event.sender.id
  const conversationId = `${pageId}_${senderId}`
  
  // 1. หา หรือ สร้าง conversation
  const conversation = await findOrCreateConversation(pageId, conversationId, senderId)
  
  // 2. บันทึก message (ถ้ามี)
  if (event.message) {
    await saveMessage(conversation.id, event)
  }
  
  // 3. Update conversation timestamp
  await updateConversationTimestamp(conversation.id)
}

async function findOrCreateConversation(
  pageId: string, 
  conversationId: string, 
  senderId: string
) {
  // ค้นหา conversation ที่มีอยู่
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('platform', 'facebook')
    .eq('platform_conversation_id', conversationId)
    .single()
  
  if (existing) {
    return existing
  }
  
  // ถ้าไม่มี ให้สร้างใหม่
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      platform: 'facebook',
      platform_conversation_id: conversationId,
      platform_account_id: pageId,
      status: 'new',
      priority: 'normal',
      message_count: 0,
      unread_count: 0
    })
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return newConv
}

async function saveMessage(conversationId: string, event: FacebookWebhookEvent) {
  const messageData = {
    conversation_id: conversationId,
    platform_message_id: event.message?.mid,
    sender_type: 'customer',
    sender_id: event.sender.id,
    message_type: 'text',
    content: {
      text: event.message?.text || '',
      attachments: event.message?.attachments
    },
    status: 'delivered',
    created_at: new Date(event.timestamp).toISOString()
  }
  
  await supabase
    .from('messages')
    .insert(messageData)
}

async function updateConversationTimestamp(conversationId: string) {
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: supabase.rpc('increment', { x: 1 }),
      message_count: supabase.rpc('increment', { x: 1 })
    })
    .eq('id', conversationId)
}