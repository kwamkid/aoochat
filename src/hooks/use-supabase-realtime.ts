// src/hooks/use-supabase-realtime.ts

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Message, Conversation } from '@/types/conversation.types'

interface UseSupabaseRealtimeOptions {
  enabled?: boolean
  onMessageInsert?: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
  onMessageDelete?: (messageId: string) => void
  onConversationUpdate?: (conversation: Partial<Conversation>) => void
  onError?: (error: Error) => void
}

/**
 * Transform database record to Message type
 */
function transformMessage(data: any): Message {
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

/**
 * Hook for Supabase Realtime subscriptions
 * Listens to database changes in real-time
 */
export function useSupabaseRealtime({
  enabled = true,
  onMessageInsert,
  onMessageUpdate,
  onMessageDelete,
  onConversationUpdate,
  onError
}: UseSupabaseRealtimeOptions = {}) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled) {
      console.log('[Realtime] Disabled')
      return
    }

    console.log('[Realtime] Setting up subscriptions...')

    // Create a single channel for all subscriptions
    const channel = supabase
      .channel('conversations-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[Realtime] New message:', payload.new)
          if (onMessageInsert && payload.new) {
            onMessageInsert(transformMessage(payload.new))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[Realtime] Message updated:', payload.new)
          if (onMessageUpdate && payload.new) {
            onMessageUpdate(transformMessage(payload.new))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[Realtime] Message deleted:', payload.old)
          if (onMessageDelete && payload.old) {
            // แก้ไขตรงนี้: ตรวจสอบว่า payload.old มี id หรือไม่
            if ('id' in payload.old && typeof payload.old.id === 'string') {
              onMessageDelete(payload.old.id)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[Realtime] Conversation updated:', payload.new)
          if (onConversationUpdate && payload.new) {
            onConversationUpdate(payload.new)
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Subscription error')
          if (onError) {
            onError(new Error('Failed to subscribe to realtime changes'))
          }
        }
      })

    channelRef.current = channel

    // Cleanup function
    return () => {
      console.log('[Realtime] Cleaning up subscriptions...')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, supabase]) // Remove callback deps to prevent re-subscribing

  // Unsubscribe function
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('[Realtime] Manual unsubscribe')
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase])

  return {
    unsubscribe,
    isSubscribed: !!channelRef.current
  }
}

/**
 * Hook for conversation-specific realtime
 */
export function useConversationRealtime(
  conversationId: string | null,
  options: {
    onNewMessage?: (message: Message) => void
    onMessageUpdate?: (message: Message) => void
    onMessageDelete?: (messageId: string) => void
    enabled?: boolean
  } = {}
) {
  const { onNewMessage, onMessageUpdate, onMessageDelete, enabled = true } = options
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId || !enabled) {
      console.log('[ConversationRealtime] No conversation ID or disabled')
      return
    }

    console.log(`[ConversationRealtime] Subscribing to conversation: ${conversationId}`)

    // Create channel specific to this conversation
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[ConversationRealtime] New message in conversation:', payload.new)
          if (onNewMessage && payload.new) {
            onNewMessage(transformMessage(payload.new))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[ConversationRealtime] Message updated in conversation:', payload.new)
          if (onMessageUpdate && payload.new) {
            onMessageUpdate(transformMessage(payload.new))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[ConversationRealtime] Message deleted in conversation:', payload.old)
          if (onMessageDelete && payload.old) {
            // แก้ไขตรงนี้: ตรวจสอบว่า payload.old มี id หรือไม่
            if ('id' in payload.old && typeof payload.old.id === 'string') {
              onMessageDelete(payload.old.id)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[ConversationRealtime] Subscription status for ${conversationId}:`, status)
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      console.log(`[ConversationRealtime] Unsubscribing from conversation: ${conversationId}`)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, enabled, supabase]) // Remove callback deps

  return {
    isSubscribed: !!channelRef.current
  }
}

/**
 * Hook for presence (online status, typing indicators)
 */
export function usePresence(
  channelName: string,
  userId: string,
  options: {
    onPresenceSync?: (presences: any) => void
    onPresenceJoin?: (presence: any) => void
    onPresenceLeave?: (presence: any) => void
    enabled?: boolean
  } = {}
) {
  const { onPresenceSync, onPresenceJoin, onPresenceLeave, enabled = true } = options
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || !channelName || !userId) {
      return
    }

    console.log(`[Presence] Setting up presence for channel: ${channelName}`)

    const channel = supabase.channel(channelName)
    
    // Track user presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('[Presence] Sync:', state)
        if (onPresenceSync) {
          onPresenceSync(state)
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] Join:', { key, newPresences })
        if (onPresenceJoin) {
          onPresenceJoin({ key, newPresences })
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] Leave:', { key, leftPresences })
        if (onPresenceLeave) {
          onPresenceLeave({ key, leftPresences })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          })
          console.log('[Presence] User presence tracked')
        }
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      console.log('[Presence] Cleaning up presence')
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelName, userId, enabled, supabase])

  // Send typing indicator
  const sendTyping = useCallback(async (isTyping: boolean) => {
    if (channelRef.current) {
      await channelRef.current.track({
        user_id: userId,
        typing: isTyping,
        typed_at: new Date().toISOString()
      })
    }
  }, [userId])

  return {
    sendTyping,
    isConnected: !!channelRef.current
  }
}