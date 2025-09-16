// src/app/(dashboard)/conversations/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { ConversationList } from "@/components/conversations/conversation-list"
import { ChatView } from "@/components/conversations/chat-view"
import { CustomerInfo } from "@/components/conversations/customer-info"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, MessageCircle, Loader2 } from "lucide-react"
import type { Conversation, Message } from "@/types/conversation.types"
import { conversationPollingService } from "@/services/conversations/conversation-polling-service"
import { useConversationPolling } from "@/hooks/use-conversation-polling"
import { useMessagePolling } from "@/hooks/use-message-polling"
import { useMessageService } from "@/hooks/use-message-service"
import { useConversationScroll } from "@/hooks/use-conversation-scroll"
import { useConversationRealtime, useSupabaseRealtime } from "@/hooks/use-supabase-realtime"
import { safeExecute } from "@/lib/utils"
import { toast } from "sonner"

export default function ConversationsPage() {
  console.log('[ConversationsPage] Rendering')
  
  // State management
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showCustomerInfo, setShowCustomerInfo] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Scroll management
  const {
    containerRef,
    scrollToBottom,
    scrollToMessage,
    isNearBottom,
    handleScroll: handleScrollEvent,
    maintainScrollPosition
  } = useConversationScroll({
    autoScrollToBottom: true,
    scrollThreshold: 100,
    smoothScroll: true
  })

  // Message service for selected conversation
  const {
    sending,
    sendMessage,
    markAsRead,
    deleteMessage
  } = useMessageService({
    conversationId: selectedConversation?.id || null,
    platform: selectedConversation?.platform,
    onMessageSent: (message: Message) => {
      console.log('Message sent successfully:', message)
    },
    onMessageFailed: (error: Error) => {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  })

  // Helper function to play notification sound
  const playNotificationSound = useCallback(() => {
    safeExecute(() => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.value = 0.1
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
      } catch (e) {
        console.log('Could not play sound:', e)
      }
    }, 'playNotificationSound')
  }, [])

  // Use conversation polling hook (โหลดครั้งแรกอย่างเดียว ไม่ polling)
  const {
    conversations,
    loading: conversationsLoading,
    updateConversation,
    moveToTop,
    refresh: loadConversations
  } = useConversationPolling({
    pollingInterval: 0, // ปิด polling (0 = disabled)
    enabled: true, // เปิดให้โหลดครั้งแรก แต่ไม่ polling เพราะ interval = 0
    onNewConversation: (conversation) => {
      safeExecute(() => {
        console.log('New conversation:', conversation.customer.name)
        playNotificationSound()
        // Set unread count for new conversation
        if (conversation.id !== selectedConversation?.id) {
          updateLocalUnread(conversation.id, 1)
        }
      }, 'onNewConversation callback')
    },
    onNewMessage: (conversation) => {
      safeExecute(() => {
        // Only notify and mark unread if not the current conversation
        if (conversation.id !== selectedConversation?.id) {
          console.log('New message from:', conversation.customer.name)
          playNotificationSound()
          // Update local unread count
          const currentUnread = localUnreadCounts[conversation.id] || 0
          updateLocalUnread(conversation.id, currentUnread + 1)
        }
      }, 'onNewMessage callback')
    }
  })

  // Load conversations once on mount
  useEffect(() => {
    console.log('[ConversationsPage] Initial load')
    loadConversations()
  }, [])

  // Use message polling hook
  const {
    messages,
    loading: messagesLoading,
    loadingMore: messagesLoadingMore,
    hasMore: hasMoreMessages,
    addMessage,
    replaceMessage,
    loadMoreMessages
  } = useMessagePolling({
    conversationId: selectedConversation?.id || null,
    pollingInterval: 30000, // Poll every 30 seconds
    onNewMessage: (message) => {
      safeExecute(() => {
        // Play sound for new customer messages
        if (message.sender_type === 'customer') {
          playNotificationSound()
          
          // Auto scroll to bottom if near bottom
          if (isNearBottom()) {
            setTimeout(() => scrollToBottom(), 100)
          }
        }
      }, 'useMessagePolling onNewMessage')
    },
    enabled: !!selectedConversation
  })

  // ✨ Realtime for selected conversation
  useConversationRealtime(selectedConversation?.id || null, {
    onNewMessage: (message) => {
      safeExecute(() => {
        console.log('[Realtime] New message received:', message)
        
        // Check if message already exists (prevent duplicates)
        const existingMessageIndex = messages.findIndex(m => m.id === message.id)
        if (existingMessageIndex === -1) {
          // Add new message
          addMessage(message)
          
          // Update conversation
          if (selectedConversation) {
            updateConversation(selectedConversation.id, {
              last_message: message,
              last_message_at: message.created_at,
              message_count: (selectedConversation.message_count || 0) + 1,
              // Don't increase unread for selected conversation
              unread_count: 0
            })
            
            // Move to top if customer message
            if (message.sender_type === 'customer') {
              moveToTop(selectedConversation.id)
              playNotificationSound()
              
              // Auto scroll if near bottom
              if (isNearBottom()) {
                setTimeout(() => scrollToBottom(), 100)
              }
            }
          }
        } else {
          console.log('[Realtime] Message already exists, skipping:', message.id)
        }
      }, 'Realtime onNewMessage')
    },
    onMessageUpdate: (message) => {
      safeExecute(() => {
        console.log('[Realtime] Message updated:', message)
        // Smooth update without flicker
        replaceMessage(message.id, message)
      }, 'Realtime onMessageUpdate')
    },
    onMessageDelete: (messageId) => {
      safeExecute(() => {
        console.log('[Realtime] Message deleted:', messageId)
      }, 'Realtime onMessageDelete')
    },
    enabled: !!selectedConversation
  })

  // ✨ Global realtime for all conversations
  useSupabaseRealtime({
    onConversationUpdate: (conversationData) => {
      safeExecute(() => {
        console.log('[Realtime] Conversation updated:', conversationData)
        
        // Update conversation in list
        if (conversationData.id) {
          updateConversation(conversationData.id, conversationData)
        }
      }, 'Global Realtime onConversationUpdate')
    },
    onMessageInsert: (message) => {
      safeExecute(() => {
        console.log('[Realtime] New message inserted:', message)
        
        // Update conversation with new message
        const conv = conversations.find(c => c.id === message.conversation_id)
        if (conv) {
          // Update last message preview
          updateConversation(message.conversation_id, {
            last_message: message,
            last_message_at: message.created_at,
            message_count: (conv.message_count || 0) + 1
          })
          
          // Update unread count if not selected conversation
          if (message.conversation_id !== selectedConversation?.id && message.sender_type === 'customer') {
            const currentUnread = localUnreadCounts[message.conversation_id] || 0
            updateLocalUnread(message.conversation_id, currentUnread + 1)
            playNotificationSound()
          }
          
          // Move to top if customer message
          if (message.sender_type === 'customer') {
            moveToTop(message.conversation_id)
          }
        } else {
          // New conversation - reload conversations
          console.log('[Realtime] New conversation detected, reloading...')
          loadConversations()
        }
      }, 'Global Realtime onMessageInsert')
    }
  })

  // Handle scroll for loading more messages
  const handleScroll = useCallback(() => {
    handleScrollEvent()
    
    // Load more when scrolled to top
    const container = containerRef.current
    if (container && container.scrollTop < 100 && hasMoreMessages && !messagesLoadingMore) {
      maintainScrollPosition(async () => {
        await loadMoreMessages()
      })
    }
  }, [handleScrollEvent, hasMoreMessages, messagesLoadingMore, loadMoreMessages, maintainScrollPosition, containerRef])

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      safeExecute(() => {
        setIsMobileView(window.innerWidth < 768)
      }, 'checkMobile')
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Local unread count tracking (เก็บใน memory แทน database)
  const [localUnreadCounts, setLocalUnreadCounts] = useState<Record<string, number>>({})
  
  // ✨ Update conversation with local unread count
  const updateLocalUnread = useCallback((conversationId: string, count: number) => {
    setLocalUnreadCounts(prev => ({
      ...prev,
      [conversationId]: count
    }))
  }, [])
  
  // ✨ Clear unread when selecting conversation
  const handleConversationSelect = useCallback((conversation: Conversation) => {
    safeExecute(() => {
      setSelectedConversation(conversation)
      
      // Clear local unread count
      updateLocalUnread(conversation.id, 0)
      
      // Mark as read in database (optional)
      if (conversation.unread_count > 0 || localUnreadCounts[conversation.id] > 0) {
        conversationPollingService.markAsRead(conversation.id)
      }
      
      if (isMobileView) {
        setShowMobileChat(true)
      }
      
      // Scroll to bottom when conversation changes
      setTimeout(() => scrollToBottom(true), 100)
    }, 'Handle conversation selection')
  }, [isMobileView, scrollToBottom, localUnreadCounts, updateLocalUnread])

  // ✨ Event listeners for test buttons
  useEffect(() => {
    const handleSimulateUnread = (event: CustomEvent) => {
      const { conversationId, unreadCount } = event.detail
      updateLocalUnread(conversationId, unreadCount)
    }
    
    const handleRefresh = () => {
      console.log('[ConversationsPage] Manual refresh triggered')
      loadConversations()
    }
    
    window.addEventListener('simulateUnread', handleSimulateUnread as any)
    window.addEventListener('refreshConversations', handleRefresh as any)
    
    return () => {
      window.removeEventListener('simulateUnread', handleSimulateUnread as any)
      window.removeEventListener('refreshConversations', handleRefresh as any)
    }
  }, [updateLocalUnread, loadConversations])
  
  // ✨ Merge local unread counts with conversations
  const conversationsWithUnread = conversations.map(conv => ({
    ...conv,
    unread_count: localUnreadCounts[conv.id] || conv.unread_count || 0
  }))

  // Update unread count when receiving new messages
  useEffect(() => {
    if (!selectedConversation) return
    
    // Clear unread for selected conversation
    if (selectedConversation.unread_count > 0) {
      updateConversation(selectedConversation.id, {
        unread_count: 0
      })
    }
  }, [selectedConversation, messages, updateConversation])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && !messagesLoadingMore) {
      // Only auto-scroll if user is near bottom
      if (isNearBottom()) {
        scrollToBottom()
      }
    }
  }, [messages.length, messagesLoadingMore, isNearBottom, scrollToBottom])

  // Handle send message - non-blocking for multiple messages
  const handleSendMessage = async (content: string, retryMessageId?: string) => {
    if (!selectedConversation || !content.trim()) return

    // Generate unique ID for this message
    const tempMessageId = retryMessageId || `temp-${Date.now()}-${Math.random()}`
    
    // Add optimistic message immediately (or update if retrying)
    const optimisticMessage: Message = {
      id: tempMessageId,
      conversation_id: selectedConversation.id,
      sender_type: "agent",
      sender_id: "current_user",
      sender_name: "You",
      message_type: "text",
      content: { text: content },
      is_private: false,
      is_automated: false,
      status: "sending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    if (retryMessageId) {
      // Update existing message to sending status
      replaceMessage(retryMessageId, optimisticMessage)
    } else {
      // Add new optimistic message
      addMessage(optimisticMessage)
      // Scroll to bottom for new messages
      setTimeout(() => scrollToBottom(), 100)
    }
    
    // Send message asynchronously (non-blocking)
    safeExecute(async () => {
      // Send message through message service
      const sentMessage = await sendMessage(content, 'text')
      
      if (sentMessage) {
        // Replace optimistic message with real one
        replaceMessage(tempMessageId, sentMessage)
        
        // Update conversation's last message
        updateConversation(selectedConversation.id, {
          last_message: sentMessage,
          last_message_at: sentMessage.created_at,
          message_count: selectedConversation.message_count + 1
        })
        
        // Move to top
        moveToTop(selectedConversation.id)
      } else {
        // Update optimistic message to failed
        const failedMessage = { 
          ...optimisticMessage, 
          status: 'failed' as const, 
          error_message: 'Failed to send message' 
        }
        replaceMessage(tempMessageId, failedMessage)
      }
    }, 'handleSendMessage-async')
  }

  // Mobile view - show either list or chat
  if (isMobileView) {
    return (
      <div className="h-screen -mt-16 pt-16 flex flex-col">
        <AnimatePresence mode="wait">
          {!showMobileChat ? (
            <motion.div
              key="list"
              initial={{ x: 0 }}
              exit={{ x: -100 }}
              className="flex-1"
            >
              {conversationsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
              ) : (
                <ConversationList
                  conversations={conversationsWithUnread}
                  selectedId={selectedConversation?.id}
                  onSelect={handleConversationSelect}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ x: 100 }}
              animate={{ x: 0 }}
              exit={{ x: 100 }}
              className="flex-1 flex flex-col"
            >
              {/* Mobile Chat Header with Back Button */}
              <div className="px-4 py-2 border-b bg-card flex items-center gap-2">
                <button
                  onClick={() => safeExecute(() => setShowMobileChat(false), 'Mobile back button')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium">กลับ</span>
              </div>
              
              {messagesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
              ) : (
                <ChatView
                  ref={containerRef}
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onLoadMore={loadMoreMessages}
                  loading={messagesLoadingMore}
                  hasMore={hasMoreMessages}
                  onScroll={handleScroll}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Desktop view - split layout with full height
  return (
    <div className="h-screen -mt-16 pt-16 flex bg-background">
      {/* Conversation List - Left Panel */}
      <div className="w-96 border-r flex-shrink-0 bg-card">
        {conversationsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">ยังไม่มีการสนทนา</h3>
            <p className="text-sm text-muted-foreground">
              เมื่อมีลูกค้าส่งข้อความมา การสนทนาจะแสดงที่นี่
            </p>
          </div>
        ) : (
          <ConversationList
            conversations={conversationsWithUnread}
            selectedId={selectedConversation?.id}
            onSelect={handleConversationSelect}
          />
        )}
      </div>

      {/* Chat View - Center Panel */}
      <div className="flex-1 flex bg-background">
        {messagesLoading && selectedConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <ChatView
            ref={containerRef}
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onResendMessage={(message) => handleSendMessage(message.content.text || '', message.id)}
            onLoadMore={loadMoreMessages}
            loading={messagesLoadingMore}
            hasMore={hasMoreMessages}
            onScroll={handleScroll}
          />
        )}
      </div>

      {/* Customer Info - Right Panel */}
      <AnimatePresence>
        {showCustomerInfo && selectedConversation && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l bg-card overflow-hidden"
          >
            <CustomerInfo
              customer={selectedConversation.customer}
              conversation={selectedConversation}
              onClose={() => safeExecute(() => setShowCustomerInfo(false), 'Close customer info')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Customer Info Button */}
      {selectedConversation && (
        <button
          onClick={() => safeExecute(() => setShowCustomerInfo(!showCustomerInfo), 'Toggle customer info')}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-card border-l border-t border-b rounded-l-lg shadow-md transition-all hover:bg-muted z-10",
            showCustomerInfo ? "right-80" : "right-0"
          )}
        >
          {showCustomerInfo ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}