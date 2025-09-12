// src/hooks/use-message-polling.ts

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Message } from '@/types/conversation.types'
import { conversationPollingService } from '@/services/conversations/conversation-polling-service'

interface UseMessagePollingOptions {
  conversationId: string | null
  onNewMessage?: (message: Message) => void
  pollingInterval?: number
  enabled?: boolean
}

export function useMessagePolling({
  conversationId,
  onNewMessage,
  pollingInterval = 2000,
  enabled = true
}: UseMessagePollingOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const lastMessageIdRef = useRef<string | null>(null)
  const messageIdsSetRef = useRef<Set<string>>(new Set())
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)
  const currentConversationIdRef = useRef<string | null>(null)

  // Poll for new messages only - declare this first
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
            return [...prev, ...uniqueNewMessages]
          })
          
          // Update last message ID
          lastMessageIdRef.current = uniqueNewMessages[uniqueNewMessages.length - 1].id
          
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

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      console.log(`Loading initial messages for conversation: ${conversationId}`)
      setLoading(true)
      const data = await conversationPollingService.getMessages(conversationId)
      
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
      
      // Update last message ID
      if (uniqueMessages.length > 0) {
        lastMessageIdRef.current = uniqueMessages[uniqueMessages.length - 1].id
        console.log(`Last message ID set to: ${lastMessageIdRef.current}`)
      }
      
      isFirstLoadRef.current = false
      
      // Start polling immediately after initial load
      if (enabled) {
        console.log('Starting message polling after initial load')
        const poll = () => {
          pollNewMessages()
          pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
        }
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      isFirstLoadRef.current = false
    } finally {
      setLoading(false)
    }
  }, [conversationId, enabled, pollingInterval, pollNewMessages])

  // Add message manually (for optimistic updates)
  const addMessage = useCallback((message: Message) => {
    if (!messageIdsSetRef.current.has(message.id)) {
      messageIdsSetRef.current.add(message.id)
      setMessages(prev => [...prev, message])
      lastMessageIdRef.current = message.id
    }
  }, [])

  // Replace temporary message with real one
  const replaceMessage = useCallback((tempId: string, realMessage: Message) => {
    setMessages(prev => {
      const filtered = prev.filter(msg => msg.id !== tempId)
      
      // Check if real message already exists
      if (messageIdsSetRef.current.has(realMessage.id)) {
        return filtered
      }
      
      messageIdsSetRef.current.delete(tempId)
      messageIdsSetRef.current.add(realMessage.id)
      lastMessageIdRef.current = realMessage.id
      
      return [...filtered, realMessage]
    })
  }, [])

  // Setup polling - fixed to prevent infinite loops
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
      messageIdsSetRef.current.clear()
      lastMessageIdRef.current = null
      isFirstLoadRef.current = true
      
      if (conversationId) {
        // Load initial messages for new conversation
        loadMessages()
      }
    }

    // Cleanup
    return () => {
      if (pollingTimeoutRef.current) {
        console.log('Clearing message polling timeout')
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [conversationId, loadMessages])

  return {
    messages,
    loading,
    addMessage,
    replaceMessage,
    refresh: loadMessages
  }
}