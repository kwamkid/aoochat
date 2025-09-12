// src/hooks/use-conversation-polling.ts

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Conversation } from '@/types/conversation.types'
import { conversationPollingService } from '@/services/conversations/conversation-polling-service'
import { toast } from 'sonner'

interface UseConversationPollingOptions {
  onNewConversation?: (conversation: Conversation) => void
  onNewMessage?: (conversation: Conversation) => void
  pollingInterval?: number
  enabled?: boolean
}

export function useConversationPolling({
  onNewConversation,
  onNewMessage,
  pollingInterval = 3000,
  enabled = true
}: UseConversationPollingOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const lastCheckRef = useRef<{
    conversationId: string | null
    messageTime: string | null
  }>({
    conversationId: null,
    messageTime: null
  })
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)

  // Load conversations with change detection
  const loadConversations = useCallback(async () => {
    try {
      // Only show loading on very first load
      if (isFirstLoadRef.current) {
        setLoading(true)
      }
      
      const result = await conversationPollingService.getConversationsWithCheck({
        limit: 50
      })
      
      // Only detect changes after first load
      if (!isFirstLoadRef.current && result.hasNewActivity && result.latestConversation) {
        const latest = result.latestConversation
        
        // Check if it's a completely new conversation
        const isNewConversation = !conversations.find(c => c.id === latest.id)
        
        if (isNewConversation && onNewConversation) {
          onNewConversation(latest)
        } else if (onNewMessage) {
          // Check if existing conversation has new message
          const existing = conversations.find(c => c.id === latest.id)
          if (existing && latest.last_message_at && existing.last_message_at) {
            if (new Date(latest.last_message_at) > new Date(existing.last_message_at)) {
              onNewMessage(latest)
            }
          }
        }
      }
      
      // Update conversations
      setConversations(result.conversations)
      
      // Update last check references
      if (result.conversations.length > 0) {
        const latest = result.conversations[0]
        lastCheckRef.current = {
          conversationId: latest.id,
          messageTime: latest.last_message_at || null
        }
      }
      
      // Mark first load as complete
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false
        setLoading(false)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      if (isFirstLoadRef.current) {
        setLoading(false)
        isFirstLoadRef.current = false
      }
    }
  }, [conversations, onNewConversation, onNewMessage])

  // Update single conversation
  const updateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, ...updates }
        : conv
    ))
  }, [])

  // Move conversation to top
  const moveToTop = useCallback((conversationId: string) => {
    setConversations(prev => {
      const index = prev.findIndex(c => c.id === conversationId)
      if (index === -1 || index === 0) return prev
      
      const conversation = prev[index]
      const newList = [...prev]
      newList.splice(index, 1)
      return [conversation, ...newList]
    })
  }, [])

  // Setup polling - only depend on enabled and interval
  useEffect(() => {
    if (!enabled) {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
      return
    }

    // Initial load
    loadConversations()

    // Setup polling
    const poll = () => {
      pollingTimeoutRef.current = setTimeout(() => {
        loadConversations()
        poll() // Schedule next poll
      }, pollingInterval)
    }

    // Start polling after initial load
    poll()

    // Cleanup
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [enabled, pollingInterval]) // Remove loadConversations from dependencies

  return {
    conversations,
    loading,
    updateConversation,
    moveToTop,
    refresh: loadConversations
  }
}