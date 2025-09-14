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
import { useConversationScroll } from "@/lib/conversation-manager"
import { safeExecute } from "@/lib/debug-params"
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
    sendTypingIndicator,
    markAsRead,
    deleteMessage
  } = useMessageService(selectedConversation)

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

  // Use conversation polling hook
  const {
    conversations,
    loading: conversationsLoading,
    updateConversation,
    moveToTop
  } = useConversationPolling({
    onNewConversation: (conversation) => {
      safeExecute(() => {
        console.log('New conversation:', conversation.customer.name)
        playNotificationSound()
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('New conversation!', {
              body: `${conversation.customer.name}: ${conversation.last_message?.content?.text || 'New message'}`,
              icon: '/favicon.ico'
            })
          } catch (e) {
            console.log('Could not show notification:', e)
          }
        }
      }, 'onNewConversation callback')
    },
    onNewMessage: (conversation) => {
      safeExecute(() => {
        // Only notify if not the current conversation
        if (conversation.id !== selectedConversation?.id) {
          console.log('New message from:', conversation.customer.name)
          playNotificationSound()
        }
      }, 'onNewMessage callback')
    }
  })

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

  // Request notification permission on mount
  useEffect(() => {
    safeExecute(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(console.log)
      }
    }, 'Request notification permission')
  }, [])

  // Handle conversation selection
  useEffect(() => {
    if (selectedConversation) {
      safeExecute(() => {
        // Mark as read
        markAsRead()
        
        if (isMobileView) {
          setShowMobileChat(true)
        }
        
        // Scroll to bottom when conversation changes
        setTimeout(() => scrollToBottom(true), 100)
      }, 'Handle conversation selection')
    }
  }, [selectedConversation, isMobileView, scrollToBottom, markAsRead])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && !messagesLoadingMore) {
      // Only auto-scroll if user is near bottom
      if (isNearBottom()) {
        scrollToBottom()
      }
    }
  }, [messages.length, messagesLoadingMore, isNearBottom, scrollToBottom])

  // Handle send message with message service
  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return

    await safeExecute(async () => {
      // Add optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
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
      
      addMessage(optimisticMessage)
      
      // Send message through message service
      const sentMessage = await sendMessage(content, 'text')
      
      if (sentMessage) {
        // Replace optimistic message with real one
        replaceMessage(optimisticMessage.id, sentMessage)
        
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
        const failedMessage = { ...optimisticMessage, status: 'failed' as const, error_message: 'Failed to send message' }
        replaceMessage(optimisticMessage.id, failedMessage)
      }
    }, 'handleSendMessage')
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
                  conversations={conversations}
                  selectedId={selectedConversation?.id}
                  onSelect={(conv) => {
                    safeExecute(() => {
                      setSelectedConversation(conv)
                      setShowMobileChat(true)
                    }, 'Mobile conversation select')
                  }}
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
                  typing={sending}
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
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={(conv) => safeExecute(() => setSelectedConversation(conv), 'Desktop conversation select')}
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
            onLoadMore={loadMoreMessages}
            loading={messagesLoadingMore}
            hasMore={hasMoreMessages}
            typing={sending}
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