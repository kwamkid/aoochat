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
  const lastMessageTimeRef = useRef<string | null>(null)
  const messageIdsSetRef = useRef<Set<string>>(new Set())
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoadRef = useRef(true)
  const currentConversationIdRef = useRef<string | null>(null)
  const tempMessageMapRef = useRef<Map<string, string>>(new Map())

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      console.log(`[loadMessages] Loading initial messages for: ${conversationId}`)
      setLoading(true)
      
      const data = await conversationPollingService.getMessagesPaginated(
        conversationId,
        initialLimit,
        0
      )
      
      // Reset tracking
      messageIdsSetRef.current.clear()
      tempMessageMapRef.current.clear()
      
      const uniqueMessages = data.filter(msg => {
        if (messageIdsSetRef.current.has(msg.id)) {
          return false
        }
        messageIdsSetRef.current.add(msg.id)
        return true
      })
      
      console.log(`[loadMessages] Loaded ${uniqueMessages.length} messages`)
      setMessages(uniqueMessages)
      setOffset(uniqueMessages.length)
      setHasMore(uniqueMessages.length >= initialLimit)
      
      // Update tracking
      if (uniqueMessages.length > 0) {
        const lastMsg = uniqueMessages[uniqueMessages.length - 1]
        lastMessageIdRef.current = lastMsg.id
        lastMessageTimeRef.current = lastMsg.created_at
        console.log(`[loadMessages] Last message: ${lastMsg.id} at ${lastMsg.created_at}`)
      }
      
      isFirstLoadRef.current = false
    } catch (error) {
      console.error('[loadMessages] Error:', error)
      isFirstLoadRef.current = false
    } finally {
      setLoading(false)
    }
  }, [conversationId, initialLimit])

  // Load more older messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || loadingMore) return

    try {
      console.log(`[loadMoreMessages] Loading from offset: ${offset}`)
      setLoadingMore(true)
      
      const olderMessages = await conversationPollingService.getMessagesPaginated(
        conversationId,
        20,
        offset
      )
      
      const uniqueOlderMessages = olderMessages.filter(msg => {
        if (messageIdsSetRef.current.has(msg.id)) {
          return false
        }
        messageIdsSetRef.current.add(msg.id)
        return true
      })
      
      if (uniqueOlderMessages.length > 0) {
        setMessages(prev => [...uniqueOlderMessages, ...prev])
        setOffset(prev => prev + uniqueOlderMessages.length)
      }
      
      setHasMore(uniqueOlderMessages.length >= 20)
    } catch (error) {
      console.error('[loadMoreMessages] Error:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, offset, hasMore, loadingMore])

  // Poll for new messages using the service's new method
  const pollNewMessages = useCallback(async () => {
    if (!conversationId || !enabled) return

    try {
      const sinceTime = lastMessageTimeRef.current
      console.log(`[pollNewMessages] Polling since: ${sinceTime}`)
      
      // Use the existing pollMessages method with lastMessageId
      let newMessages: Message[] = []
      
      if (lastMessageIdRef.current) {
        // Use the existing pollMessages method
        newMessages = await conversationPollingService.pollMessages(
          conversationId,
          lastMessageIdRef.current
        )
      } else {
        // Get all messages if no last message
        newMessages = await conversationPollingService.pollMessages(
          conversationId
        )
      }
      
      if (newMessages.length > 0) {
        console.log(`[pollNewMessages] Found ${newMessages.length} new messages`)
        
        setMessages(prev => {
          const updatedMessages = [...prev]
          let hasChanges = false
          
          newMessages.forEach((newMsg: Message) => {
            // Skip if already exists
            if (messageIdsSetRef.current.has(newMsg.id)) {
              return
            }
            
            // For agent messages, try to replace temp message
            if (newMsg.sender_type === 'agent') {
              const tempIndex = updatedMessages.findIndex(msg => {
                if (!msg.id.startsWith('temp-')) return false
                if (msg.sender_type !== newMsg.sender_type) return false
                if (msg.content.text !== newMsg.content.text) return false
                if (tempMessageMapRef.current.has(msg.id)) return false
                
                const timeDiff = Math.abs(
                  new Date(msg.created_at).getTime() - 
                  new Date(newMsg.created_at).getTime()
                )
                return timeDiff < 10000
              })
              
              if (tempIndex !== -1) {
                const tempId = updatedMessages[tempIndex].id
                console.log(`[pollNewMessages] Replacing temp ${tempId} with ${newMsg.id}`)
                updatedMessages[tempIndex] = newMsg
                messageIdsSetRef.current.delete(tempId)
                messageIdsSetRef.current.add(newMsg.id)
                tempMessageMapRef.current.set(tempId, newMsg.id)
                hasChanges = true
                return
              }
            }
            
            // Add as new message
            console.log(`[pollNewMessages] Adding new message: ${newMsg.id} from ${newMsg.sender_type}`)
            updatedMessages.push(newMsg)
            messageIdsSetRef.current.add(newMsg.id)
            hasChanges = true
            
            // Update last message tracking
            lastMessageIdRef.current = newMsg.id
            lastMessageTimeRef.current = newMsg.created_at
            
            // Notify for customer messages
            if (newMsg.sender_type === 'customer' && onNewMessage) {
              onNewMessage(newMsg)
            }
          })
          
          console.log(`[pollNewMessages] Changes made: ${hasChanges}`)
          return hasChanges ? updatedMessages : prev
        })
      }
    } catch (error) {
      console.error('[pollNewMessages] Error:', error)
    }
  }, [conversationId, enabled, onNewMessage])

  // Add optimistic message
  const addMessage = useCallback((message: Message) => {
    console.log(`[addMessage] Adding optimistic: ${message.id}`)
    
    if (messageIdsSetRef.current.has(message.id)) {
      return
    }
    
    messageIdsSetRef.current.add(message.id)
    setMessages(prev => [...prev, message])
    setOffset(prev => prev + 1)
  }, [])

  // Replace temp message with real one
  const replaceMessage = useCallback((tempId: string, realMessage: Message) => {
    console.log(`[replaceMessage] Replacing ${tempId} with ${realMessage.id}`)
    
    setMessages(prev => {
      const tempIndex = prev.findIndex(msg => msg.id === tempId)
      
      if (tempIndex === -1) {
        // Temp not found, add real message if not exists
        if (!messageIdsSetRef.current.has(realMessage.id)) {
          messageIdsSetRef.current.add(realMessage.id)
          tempMessageMapRef.current.set(tempId, realMessage.id)
          lastMessageIdRef.current = realMessage.id
          lastMessageTimeRef.current = realMessage.created_at
          return [...prev, realMessage]
        }
        return prev
      }
      
      // Replace temp with real
      const newMessages = [...prev]
      newMessages[tempIndex] = realMessage
      
      messageIdsSetRef.current.delete(tempId)
      messageIdsSetRef.current.add(realMessage.id)
      tempMessageMapRef.current.set(tempId, realMessage.id)
      lastMessageIdRef.current = realMessage.id
      lastMessageTimeRef.current = realMessage.created_at
      
      return newMessages
    })
  }, [])

  // Setup polling
  useEffect(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    // Reset on conversation change
    if (currentConversationIdRef.current !== conversationId) {
      console.log(`[useEffect] Conversation changed to: ${conversationId}`)
      currentConversationIdRef.current = conversationId
      setMessages([])
      setOffset(0)
      setHasMore(true)
      messageIdsSetRef.current.clear()
      tempMessageMapRef.current.clear()
      lastMessageIdRef.current = null
      lastMessageTimeRef.current = null
      isFirstLoadRef.current = true
      
      if (conversationId) {
        loadMessages()
      }
    }

    // Setup polling
    if (conversationId && enabled && !isFirstLoadRef.current) {
      const poll = () => {
        pollNewMessages()
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
      }
      
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
    }

    return () => {
      if (pollingTimeoutRef.current) {
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