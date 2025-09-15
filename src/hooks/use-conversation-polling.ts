// src/hooks/use-conversation-polling.ts

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Conversation } from '@/types/conversation.types'
import { conversationPollingService } from '@/services/conversations/conversation-polling-service'

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
  const [error, setError] = useState<string | null>(null)
  
  // Tracking refs
  const lastCheckRef = useRef<{
    conversationId: string | null
    messageTime: string | null
    conversationCount: number
  }>({
    conversationId: null,
    messageTime: null,
    conversationCount: 0
  })
  
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)
  const conversationMapRef = useRef<Map<string, Conversation>>(new Map())

  // Load conversations with change detection
  const loadConversations = useCallback(async () => {
    try {
      // Only show loading on very first load
      if (isFirstLoadRef.current) {
        setLoading(true)
        setError(null)
      }
      
      console.log('[useConversationPolling] Loading conversations...')
      
      const result = await conversationPollingService.getConversationsWithCheck({
        limit: 50
      })
      
      // Detect changes only after first load
      if (!isFirstLoadRef.current && result.conversations.length > 0) {
        const latestConv = result.conversations[0]
        
        // Check for new conversation
        const isNewConversation = !conversationMapRef.current.has(latestConv.id)
        
        if (isNewConversation) {
          console.log('[useConversationPolling] New conversation detected:', latestConv.customer.name)
          conversationMapRef.current.set(latestConv.id, latestConv)
          
          if (onNewConversation) {
            onNewConversation(latestConv)
          }
        } else {
          // Check for new message in existing conversation
          const existingConv = conversationMapRef.current.get(latestConv.id)
          
          if (existingConv && latestConv.last_message_at && existingConv.last_message_at) {
            const hasNewMessage = new Date(latestConv.last_message_at) > new Date(existingConv.last_message_at)
            
            if (hasNewMessage) {
              console.log('[useConversationPolling] New message in conversation:', latestConv.customer.name)
              conversationMapRef.current.set(latestConv.id, latestConv)
              
              if (onNewMessage) {
                onNewMessage(latestConv)
              }
            }
          }
        }
        
        // Update all conversations in map
        result.conversations.forEach(conv => {
          conversationMapRef.current.set(conv.id, conv)
        })
      } else if (isFirstLoadRef.current) {
        // Initialize conversation map on first load
        result.conversations.forEach(conv => {
          conversationMapRef.current.set(conv.id, conv)
        })
      }
      
      // Update state with sorted conversations
      setConversations(result.conversations)
      
      // Update tracking
      if (result.conversations.length > 0) {
        const latest = result.conversations[0]
        lastCheckRef.current = {
          conversationId: latest.id,
          messageTime: latest.last_message_at || null,
          conversationCount: result.conversations.length
        }
      }
      
      // Mark first load as complete
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false
        setLoading(false)
      }
      
    } catch (error) {
      console.error('[useConversationPolling] Error loading conversations:', error)
      setError(error instanceof Error ? error.message : 'Failed to load conversations')
      
      if (isFirstLoadRef.current) {
        setLoading(false)
        isFirstLoadRef.current = false
      }
    }
  }, [onNewConversation, onNewMessage])

  // Update single conversation
  const updateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, ...updates }
          : conv
      )
      
      // Update in map as well
      const conv = conversationMapRef.current.get(conversationId)
      if (conv) {
        conversationMapRef.current.set(conversationId, { ...conv, ...updates })
      }
      
      return updated
    })
  }, [])

  // Move conversation to top of list
  const moveToTop = useCallback((conversationId: string) => {
    setConversations(prev => {
      const index = prev.findIndex(c => c.id === conversationId)
      if (index === -1 || index === 0) return prev
      
      const conversation = prev[index]
      const newList = [...prev]
      newList.splice(index, 1)
      
      // Update with new timestamp to keep it at top
      const updatedConversation = {
        ...conversation,
        last_message_at: new Date().toISOString()
      }
      
      // Update in map
      conversationMapRef.current.set(conversationId, updatedConversation)
      
      return [updatedConversation, ...newList]
    })
  }, [])

  // Add new conversation
  const addConversation = useCallback((conversation: Conversation) => {
    // Add to map
    conversationMapRef.current.set(conversation.id, conversation)
    
    // Add to list at top
    setConversations(prev => {
      // Check if already exists
      const exists = prev.some(c => c.id === conversation.id)
      if (exists) {
        return prev
      }
      
      return [conversation, ...prev]
    })
  }, [])

  // Remove conversation
  const removeConversation = useCallback((conversationId: string) => {
    // Remove from map
    conversationMapRef.current.delete(conversationId)
    
    // Remove from list
    setConversations(prev => prev.filter(c => c.id !== conversationId))
  }, [])

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await conversationPollingService.markAsRead(conversationId)
      
      // Update local state
      updateConversation(conversationId, {
        unread_count: 0
      })
    } catch (error) {
      console.error('[useConversationPolling] Error marking as read:', error)
    }
  }, [updateConversation])

  // Setup polling
  useEffect(() => {
    // Clear existing timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    if (!enabled) {
      return
    }

    // Initial load
    console.log('[useConversationPolling] Starting polling...')
    loadConversations()

    // Setup polling loop
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
      console.log('[useConversationPolling] Stopping polling...')
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [enabled, pollingInterval, loadConversations])

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)
  }, [conversations])

  // Get conversation by ID
  const getConversation = useCallback((conversationId: string) => {
    return conversationMapRef.current.get(conversationId) || null
  }, [])

  // Search conversations
  const searchConversations = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()
    return conversations.filter(conv => {
      return (
        conv.customer.name.toLowerCase().includes(lowerQuery) ||
        conv.last_message?.content.text?.toLowerCase().includes(lowerQuery) ||
        conv.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
    })
  }, [conversations])

  // Filter conversations by status
  const filterByStatus = useCallback((status: string) => {
    if (status === 'all') return conversations
    return conversations.filter(conv => conv.status === status)
  }, [conversations])

  // Filter conversations by platform
  const filterByPlatform = useCallback((platform: string) => {
    if (platform === 'all') return conversations
    return conversations.filter(conv => conv.platform === platform)
  }, [conversations])

  return {
    // State
    conversations,
    loading,
    error,
    
    // Actions
    updateConversation,
    moveToTop,
    addConversation,
    removeConversation,
    markAsRead,
    refresh: loadConversations,
    
    // Utilities
    getTotalUnreadCount,
    getConversation,
    searchConversations,
    filterByStatus,
    filterByPlatform
  }
}