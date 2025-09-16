// src/components/conversations/chat-view.tsx
"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send as SendIcon, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Info,
  Image,
  FileText,
  Mic,
  StopCircle,
  MessageCircle,
  ArrowDown,
  CheckCircle,
  Archive,
  Trash2,
  UserPlus,
  Tag as TagIcon,
  Flag,
  VolumeX,
  Clock as ClockIcon,
  MapPin,
  Video,
  Camera,
  File
} from "lucide-react"
import { cn, formatMessageTime, formatDateSeparator, useDateFormatter } from "@/lib/utils"
import { format } from "date-fns"
import type { Conversation, Message, MessageType, SenderType } from "@/types/conversation.types"
import { ConversationAvatar } from './platform-avatar'
import { usePlatformInfo, usePlatformTheme } from '@/hooks/use-platform-info'
import { MessageRenderer } from '@/components/messages/message-renderer'
import { 
  getSendableMessageTypes, 
  isMessageTypeSupported,
  MESSAGE_TYPES 
} from '@/config/message-types.config'

// Tooltip Component
const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="invisible group-hover:visible absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap
        bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </div>
  )
}

// Message Status Component
const MessageStatus = ({ status, onRetry, isLastMessage }: { 
  status: Message['status']; 
  onRetry?: () => void;
  isLastMessage?: boolean;
}) => {
  if (!isLastMessage) return null
  
  switch (status) {
    case 'sending':
      return <span className="text-xs text-muted-foreground animate-pulse">sending...</span>
    case 'sent':
    case 'delivered':
      return <span className="text-xs text-muted-foreground">sent</span>
    case 'read':
      return <span className="text-xs text-blue-500">read</span>
    case 'failed':
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs text-red-500">failed</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-red-500 underline hover:text-red-600 ml-1"
            >
              retry
            </button>
          )}
        </div>
      )
    default:
      return null
  }
}

interface ChatViewProps {
  conversation: Conversation | null
  messages: Message[]
  onSendMessage: (content: string, type?: MessageType) => void
  onResendMessage?: (message: Message) => void
  onLoadMore?: () => void
  loading?: boolean
  hasMore?: boolean
  onScroll?: () => void
  platformFeatures?: {
    supportsQuickReplies?: boolean
    supportsCarousel?: boolean
  }
}

export const ChatView = React.forwardRef<HTMLDivElement, ChatViewProps>(({
  conversation,
  messages,
  onSendMessage,
  onResendMessage,
  onLoadMore,
  loading = false,
  hasMore = false,
  onScroll,
  platformFeatures
}, ref) => {
  const [messageInput, setMessageInput] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [selectedMediaType, setSelectedMediaType] = useState<MessageType>('text')
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: string } | null>(null)
  
  // Get sendable message types for current platform
  const sendableTypes = conversation ? getSendableMessageTypes(conversation.platform) : []
  
  // Extract page ID for platform info
  const pageId = conversation?.platform_conversation_id?.split('_')[0]
  const customerId = conversation?.customer.platform_identities[conversation?.platform || 'facebook']?.id
  
  // Get platform info and theme
  const { pageInfo, customerInfo } = usePlatformInfo({
    platform: conversation?.platform || 'facebook',
    pageId: pageId || null,
    customerId: customerId || null,
    enabled: !!conversation
  })
  
  const platformTheme = usePlatformTheme(conversation?.platform || 'facebook')

  // Use date formatter hook
  const { formatMessage, formatSeparator } = useDateFormatter({ locale: 'th' })
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)
  const previousScrollHeightRef = useRef(0)

  // Use provided ref or local ref
  const containerRef = ref || messageContainerRef

  // Auto scroll to bottom only for new messages
  useEffect(() => {
    if (!isLoadingMoreRef.current && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages.length])

  // Maintain scroll position when loading more
  useEffect(() => {
    if (isLoadingMoreRef.current && containerRef && 'current' in containerRef && containerRef.current) {
      const scrollContainer = containerRef.current
      const newScrollHeight = scrollContainer.scrollHeight
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current
      scrollContainer.scrollTop = scrollDiff
      isLoadingMoreRef.current = false
    }
  }, [messages, containerRef])

  // Check if near bottom for scroll button
  useEffect(() => {
    const checkScrollPosition = () => {
      if (containerRef && 'current' in containerRef && containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight
        setShowScrollToBottom(distanceFromBottom > 200)
      }
    }

    const container = containerRef && 'current' in containerRef ? containerRef.current : null
    if (container) {
      container.addEventListener('scroll', checkScrollPosition)
      return () => container.removeEventListener('scroll', checkScrollPosition)
    }
  }, [containerRef])

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.options-menu-container')) {
        setShowOptionsMenu(false)
      }
      if (!target.closest('.attach-menu-container')) {
        setShowAttachMenu(false)
      }
    }

    if (showOptionsMenu || showAttachMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showOptionsMenu, showAttachMenu])

  const scrollToBottom = (force = false) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: force ? "auto" : "smooth" 
    })
  }

  const handleSend = async () => {
    if (messageInput.trim() && conversation) {
      onSendMessage(messageInput.trim(), 'text')
      setMessageInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: MessageType) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      console.log(`Selected ${type} file:`, file)
      
      // Here you would upload the file and get a URL
      // For now, we'll use a local URL (in real app, upload to storage)
      const fileUrl = URL.createObjectURL(file)
      
      // Send the message with the file
      if (type === 'image') {
        onSendMessage(fileUrl, 'image')
      } else if (type === 'video') {
        onSendMessage(fileUrl, 'video')
      } else if (type === 'file') {
        onSendMessage(fileUrl, 'file')
      }
      
      // Reset input
      e.target.value = ''
      setShowAttachMenu(false)
    }
  }

  const handleMediaClick = (url: string, type: string) => {
    setLightboxMedia({ url, type })
  }

  const formatMessageDate = (date: string) => {
    return formatMessage(date)
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(message)
    return acc
  }, {} as Record<string, Message[]>)

  // Find last agent message
  const lastAgentMessageId = [...messages].reverse().find(m => m.sender_type === 'agent')?.id

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">เลือกการสนทนา</h3>
          <p className="text-sm text-muted-foreground mt-2">
            เลือกการสนทนาจากรายการด้านซ้ายเพื่อเริ่มแชท
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConversationAvatar
              platform={conversation.platform}
              pageAvatar={pageInfo?.pageAvatar}
              pageName={pageInfo?.pageName}
              customerAvatar={customerInfo?.profilePic || conversation.customer.avatar_url}
              customerName={customerInfo?.name || conversation.customer.name}
              isVerified={pageInfo?.pageVerified}
              size="md"
            />
            
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {customerInfo?.name || conversation.customer.name}
                {pageInfo?.pageVerified && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
              </h3>
              
              <p className="text-sm text-muted-foreground">
                ใช้งานล่าสุด {formatMessageDate(conversation.customer.last_contact_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Customer Info Button */}
            <Tooltip content="ดูข้อมูลลูกค้า">
              <button 
                onClick={() => {
                  const event = new CustomEvent('toggleCustomerInfo')
                  window.dispatchEvent(event)
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </Tooltip>
            
            {/* More Options */}
            <div className="relative options-menu-container">
              <Tooltip content="ตัวเลือกเพิ่มเติม">
                <button 
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </Tooltip>
              
              {/* Options Dropdown Menu */}
              <AnimatePresence>
                {showOptionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-56 bg-card border rounded-lg shadow-lg py-1 z-50"
                  >
                    <button className="w-full px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                      <UserPlus className="w-4 h-4" />
                      มอบหมายให้เจ้าหน้าที่
                    </button>
                    <button className="w-full px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                      <TagIcon className="w-4 h-4" />
                      เพิ่มแท็ก
                    </button>
                    <button className="w-full px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                      <Flag className="w-4 h-4" />
                      ตั้งลำดับความสำคัญ
                    </button>
                    <button className="w-full px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                      <ClockIcon className="w-4 h-4" />
                      เลื่อนการแจ้งเตือน
                    </button>
                    <div className="border-t my-1" />
                    <button className="w-full px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                      <VolumeX className="w-4 h-4" />
                      ปิดการแจ้งเตือน
                    </button>
                    <button className="w-full px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                      <Archive className="w-4 h-4" />
                      เก็บถาวร
                    </button>
                    <div className="border-t my-1" />
                    <button className="w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors flex items-center gap-3">
                      <Trash2 className="w-4 h-4" />
                      ลบการสนทนา
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        onScroll={() => {
          if (containerRef && 'current' in containerRef && containerRef.current && !isLoadingMoreRef.current) {
            const { scrollTop } = containerRef.current
            
            if (scrollTop < 100 && hasMore && !loading && onLoadMore) {
              isLoadingMoreRef.current = true
              previousScrollHeightRef.current = containerRef.current.scrollHeight
              onLoadMore()
            }
          }
          
          if (onScroll) onScroll()
        }}
      >
        {/* Load More */}
        {hasMore && (
          <div className="text-center py-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">กำลังโหลดข้อความเก่า...</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onLoadMore && containerRef && 'current' in containerRef && containerRef.current) {
                    isLoadingMoreRef.current = true
                    previousScrollHeightRef.current = containerRef.current.scrollHeight
                    onLoadMore()
                  }
                }}
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
              >
                โหลดข้อความเก่า
              </button>
            )}
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">
                {formatSeparator(date)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            {msgs.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                platform={conversation.platform}
                isOwn={message.sender_type === 'agent'}
                showAvatar={index === 0 || msgs[index - 1]?.sender_id !== message.sender_id}
                isLastAgentMessage={message.id === lastAgentMessageId}
                onRetry={() => onResendMessage?.(message)}
                onMediaClick={handleMediaClick}
              />
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-24 right-6 w-10 h-10 bg-card border rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="px-4 py-3 border-t bg-card">
        <div className="flex items-stretch gap-2">
          {/* Attachment Button */}
          <div className="relative flex items-center attach-menu-container">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-14 left-0 bg-card border rounded-lg shadow-lg p-2 min-w-[200px] z-10"
                >
                  {/* Show only supported message types for this platform */}
                  {sendableTypes.filter(type => type.id !== 'text').map(type => {
                    const Icon = type.id === 'image' ? Image :
                                type.id === 'video' ? Video :
                                type.id === 'audio' ? Mic :
                                type.id === 'location' ? MapPin :
                                FileText
                    
                    return (
                      <button 
                        key={type.id}
                        onClick={() => {
                          if (type.id === 'image') {
                            imageInputRef.current?.click()
                          } else if (type.id === 'video') {
                            videoInputRef.current?.click()
                          } else if (type.id === 'file') {
                            fileInputRef.current?.click()
                          }
                          // Add handlers for other types
                          setShowAttachMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{type.name}</span>
                        {type.platformConfig?.[conversation.platform]?.maxSize && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            max {type.platformConfig[conversation.platform].maxSize}MB
                          </span>
                        )}
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message Input Field */}
          <div className="flex-1 relative flex items-center">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="พิมพ์ข้อความ..."
              className="w-full h-11 px-4 py-2.5 pr-12 bg-muted/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all overflow-hidden"
              style={{ lineHeight: '1.5' }}
              rows={1}
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 p-1.5 hover:bg-background rounded transition-colors"
            >
              <Smile className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Send/Voice Button */}
          <div className="flex items-center">
            {messageInput.trim() ? (
              <button
                onClick={handleSend}
                className="h-11 w-11 flex items-center justify-center bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-lg transition-colors",
                  isRecording 
                    ? "bg-red-500 text-white animate-pulse" 
                    : "hover:bg-muted"
                )}
              >
                {isRecording ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Quick Replies */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {['สวัสดีครับ', 'รอสักครู่นะครับ', 'ขอบคุณครับ', 'ยินดีให้บริการครับ'].map((reply) => (
            <button
              key={reply}
              onClick={() => setMessageInput(reply)}
              className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-full whitespace-nowrap transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>
      
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'video')}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'file')}
      />
      
      {/* Lightbox for media viewing */}
      <AnimatePresence>
        {lightboxMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxMedia(null)}
          >
            <button
              onClick={() => setLightboxMedia(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.url}
                alt="Full size"
                className="max-w-full max-h-full object-contain"
              />
            ) : lightboxMedia.type === 'video' ? (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

ChatView.displayName = 'ChatView'

// Message Bubble Component (Updated to use MessageRenderer)
function MessageBubble({
  message,
  platform,
  isOwn,
  showAvatar,
  isLastAgentMessage,
  onRetry,
  onMediaClick
}: {
  message: Message
  platform: any
  isOwn: boolean
  showAvatar: boolean
  isLastAgentMessage?: boolean
  onRetry?: () => void
  onMediaClick?: (url: string, type: string) => void
}) {
  const { formatMessage } = useDateFormatter({ locale: 'th' })

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "flex gap-2 pb-3",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Customer avatar */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs">👤</span>
        </div>
      )}
      
      {!isOwn && !showAvatar && <div className="w-8" />}
      
      <div className={cn(
        "max-w-xs lg:max-w-md flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        <Tooltip content={formatMessage(message.created_at)}>
          <div className={cn(
            "relative cursor-default",
            message.is_private && "border-2 border-yellow-300 dark:border-yellow-700 rounded-2xl p-1"
          )}>
            {/* Private message indicator */}
            {message.is_private && (
              <div className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300 px-3 pb-1">
                <span>🔒</span>
                <span>โน้ตภายใน</span>
              </div>
            )}
            
            {/* Use MessageRenderer for all message types */}
            <MessageRenderer
              message={message}
              platform={platform}
              isOwn={isOwn}
              onRetry={onRetry}
              onMediaClick={onMediaClick}
            />
          </div>
        </Tooltip>
        
        {/* Status for last agent message only */}
        {isOwn && isLastAgentMessage && (
          <div className={cn(
            "flex items-center gap-2 mt-1 px-1 text-xs text-muted-foreground",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}>
            <MessageStatus 
              status={message.status} 
              onRetry={onRetry} 
              isLastMessage={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}