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
import { useFacebookPlatform } from "@/hooks/use-facebook-platform"
import { safeExecute } from "@/lib/debug-params"

// Remove any params or searchParams - this is a client component
export default function ConversationsPage() {
  console.log('[ConversationsPage] Rendering')
  
  // All state management
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showCustomerInfo, setShowCustomerInfo] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Use Facebook platform hook
  const { sendTextMessage } = useFacebookPlatform()

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
              icon: '/icon.png'
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
    addMessage,
    replaceMessage
  } = useMessagePolling({
    conversationId: selectedConversation?.id || null,
    onNewMessage: (message) => {
      safeExecute(() => {
        // Play sound for new customer messages
        if (message.sender_type === 'customer') {
          playNotificationSound()
        }
      }, 'useMessagePolling onNewMessage')
    },
    enabled: !!selectedConversation
  })

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
        conversationPollingService.markAsRead(selectedConversation.id).catch(console.error)
        
        if (isMobileView) {
          setShowMobileChat(true)
        }
      }, 'Handle conversation selection')
    }
  }, [selectedConversation, isMobileView])

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return

    await safeExecute(async () => {
      try {
        setSendingMessage(true)
        
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
        
        // Check if it's Facebook platform
        if (selectedConversation.platform === 'facebook') {
          try {
            // Send via Facebook API
            const result = await sendTextMessage(selectedConversation.id, content)
            
            // DON'T add the message here - wait for it to come from webhook/polling
            // Just update the conversation metadata
            updateConversation(selectedConversation.id, {
              last_message_at: new Date().toISOString(),
              message_count: selectedConversation.message_count + 1
            })
            
            // Move to top
            moveToTop(selectedConversation.id)
            
            // Remove the optimistic message when real one arrives
            // For now, just mark it as sent
            const updatedMessage = { ...optimisticMessage, status: 'sent' as const }
            replaceMessage(optimisticMessage.id, updatedMessage)
            
            console.log('Message sent successfully via Facebook')
            
          } catch (error) {
            console.error('Error sending Facebook message:', error)
            
            // Update optimistic message to failed
            const failedMessage = { ...optimisticMessage, status: 'failed' as const }
            replaceMessage(optimisticMessage.id, failedMessage)
            
            // Show error in console instead of toast
            console.error('ส่งข้อความไม่สำเร็จ - กรุณาลองใหม่อีกครั้ง')
          }
        } else {
          // For other platforms, send normally
          const sentMessage = await conversationPollingService.sendMessage(
            selectedConversation.id,
            content
          )
          
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
            const failedMessage = { ...optimisticMessage, status: 'failed' as const }
            replaceMessage(optimisticMessage.id, failedMessage)
            console.error('Failed to send message')
          }
        }
      } catch (error) {
        console.error('Error sending message:', error)
        // Show error in console instead of toast
        console.error('Failed to send message - check console for details')
      } finally {
        setSendingMessage(false)
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
                  conversation={selectedConversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  typing={sendingMessage}
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
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onLoadMore={loadMoreMessages}
            loading={messagesLoadingMore}
            hasMore={hasMoreMessages}
            typing={sendingMessage}
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