// src/hooks/use-message-polling.ts

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Message } from '@/types/conversation.types'
import { conversationPollingService } from '@/services/conversations/conversation-polling-service'

interface UseMessagePollingOptions {
  conversationId: string | null
  onNewMessage?: (message: Message) => void
  pollingInterval?: number
  enabled?: boolean
  initialLimit?: number
}

export function useMessagePolling({
  conversationId,
  onNewMessage,
  pollingInterval = 2000,
  enabled = true,
  initialLimit = 30
}: UseMessagePollingOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  
  const lastMessageIdRef = useRef<string | null>(null)
  const messageIdsSetRef = useRef<Set<string>>(new Set())
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)
  const currentConversationIdRef = useRef<string | null>(null)

  // Load initial messages (newest first, limited to initialLimit)
  const loadMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      console.log(`Loading initial ${initialLimit} messages for conversation: ${conversationId}`)
      setLoading(true)
      
      // Load only the most recent messages
      const data = await conversationPollingService.getMessagesPaginated(
        conversationId,
        initialLimit,
        0
      )
      
      // Reset tracking on full reload
      messageIdsSetRef.current.clear()
      const uniqueMessages = data.filter(msg => {
        if (messageIdsSetRef.current.has(msg.id)) {
          return false
        }
        messageIdsSetRef.current.add(msg.id)
        return true
      })
      
      console.log(`Loaded ${uniqueMessages.length} initial messages`)
      setMessages(uniqueMessages)
      setOffset(uniqueMessages.length)
      setHasMore(uniqueMessages.length >= initialLimit)
      
      // Update last message ID (the newest message)
      if (uniqueMessages.length > 0) {
        lastMessageIdRef.current = uniqueMessages[uniqueMessages.length - 1].id
        console.log(`Last message ID set to: ${lastMessageIdRef.current}`)
      }
      
      isFirstLoadRef.current = false
    } catch (error) {
      console.error('Error loading messages:', error)
      isFirstLoadRef.current = false
    } finally {
      setLoading(false)
    }
  }, [conversationId, initialLimit])

  // Load more older messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || loadingMore) return

    try {
      console.log(`Loading more messages from offset: ${offset}`)
      setLoadingMore(true)
      
      // Load older messages
      const olderMessages = await conversationPollingService.getMessagesPaginated(
        conversationId,
        20, // Load 20 more at a time
        offset
      )
      
      // Filter out duplicates
      const uniqueOlderMessages = olderMessages.filter(msg => {
        if (messageIdsSetRef.current.has(msg.id)) {
          return false
        }
        messageIdsSetRef.current.add(msg.id)
        return true
      })
      
      console.log(`Loaded ${uniqueOlderMessages.length} older messages`)
      
      if (uniqueOlderMessages.length > 0) {
        // Prepend older messages to the beginning
        setMessages(prev => [...uniqueOlderMessages, ...prev])
        setOffset(prev => prev + uniqueOlderMessages.length)
      }
      
      // Check if there are more messages to load
      setHasMore(uniqueOlderMessages.length >= 20)
      
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, offset, hasMore, loadingMore])

  // Poll for new messages
  const pollNewMessages = useCallback(async () => {
    if (!conversationId || !enabled) return

    try {
      console.log(`Polling messages for conversation: ${conversationId}`)
      console.log(`Last message ID: ${lastMessageIdRef.current}`)
      
      const newMessages = await conversationPollingService.pollMessages(
        conversationId,
        lastMessageIdRef.current || undefined
      )
      
      console.log(`Found ${newMessages.length} new messages`)
      
      if (newMessages.length > 0) {
        // Filter out duplicates
        const uniqueNewMessages = newMessages.filter(msg => {
          if (messageIdsSetRef.current.has(msg.id)) {
            console.log(`Duplicate message filtered: ${msg.id}`)
            return false
          }
          messageIdsSetRef.current.add(msg.id)
          return true
        })
        
        console.log(`${uniqueNewMessages.length} unique new messages to add`)
        
        if (uniqueNewMessages.length > 0) {
          setMessages(prev => {
            console.log(`Current messages: ${prev.length}, Adding: ${uniqueNewMessages.length}`)
            const updated = [...prev, ...uniqueNewMessages]
            
            // Update last message ID
            lastMessageIdRef.current = uniqueNewMessages[uniqueNewMessages.length - 1].id
            
            return updated
          })
          
          // Notify about new messages
          uniqueNewMessages.forEach(msg => {
            if (msg.sender_type !== 'agent' && onNewMessage) {
              console.log('Notifying about new customer message')
              onNewMessage(msg)
            }
          })
        }
      }
    } catch (error) {
      console.error('Error polling messages:', error)
    }
  }, [conversationId, enabled, onNewMessage])

  // Add message manually (for optimistic updates)
  const addMessage = useCallback((message: Message) => {
    // Check if message already exists
    if (!messageIdsSetRef.current.has(message.id)) {
      messageIdsSetRef.current.add(message.id)
      setMessages(prev => [...prev, message])
      
      // Don't update lastMessageIdRef for temporary messages
      if (!message.id.startsWith('temp-')) {
        lastMessageIdRef.current = message.id
      }
      
      // Update offset for pagination
      setOffset(prev => prev + 1)
    }
  }, [])

  // Replace temporary message with real one
  const replaceMessage = useCallback((tempId: string, realMessage: Message) => {
    setMessages(prev => {
      // Remove temp message
      const filtered = prev.filter(msg => msg.id !== tempId)
      
      // Check if real message already exists
      if (messageIdsSetRef.current.has(realMessage.id)) {
        return filtered
      }
      
      // Remove temp ID and add real ID
      messageIdsSetRef.current.delete(tempId)
      messageIdsSetRef.current.add(realMessage.id)
      lastMessageIdRef.current = realMessage.id
      
      // Add real message at the end
      return [...filtered, realMessage]
    })
  }, [])

  // Setup polling
  useEffect(() => {
    // Clear previous polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    // If conversation changed, reset everything
    if (currentConversationIdRef.current !== conversationId) {
      console.log(`Conversation changed from ${currentConversationIdRef.current} to ${conversationId}`)
      currentConversationIdRef.current = conversationId
      setMessages([])
      setOffset(0)
      setHasMore(true)
      messageIdsSetRef.current.clear()
      lastMessageIdRef.current = null
      isFirstLoadRef.current = true
      
      if (conversationId) {
        // Load initial messages for new conversation
        loadMessages()
      }
    }

    // Setup polling after initial load
    if (conversationId && enabled && !isFirstLoadRef.current) {
      const poll = () => {
        pollNewMessages()
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
      }
      
      // Start polling
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
    }

    // Cleanup
    return () => {
      if (pollingTimeoutRef.current) {
        console.log('Clearing message polling timeout')
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [conversationId, enabled, pollingInterval, loadMessages, pollNewMessages])

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    addMessage,
    replaceMessage,
    loadMoreMessages,
    refresh: loadMessages
  }
}