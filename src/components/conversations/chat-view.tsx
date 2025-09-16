// src/components/conversations/chat-view.tsx
"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send as SendIcon, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Info,
  Image,
  FileText,
  Download,
  X,
  Mic,
  StopCircle,
  User,
  Bot,
  Shield,
  MessageCircle,
  ArrowDown
} from "lucide-react"
import { cn, formatMessageTime, formatDateSeparator, useDateFormatter } from "@/lib/utils"
import { format } from "date-fns"
import type { Conversation, Message, MessageType, SenderType } from "@/types/conversation.types"

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

// Message Status - Only show for last message
const MessageStatus = ({ status, onRetry, isLastMessage }: { 
  status: Message['status']; 
  onRetry?: () => void;
  isLastMessage?: boolean;
}) => {
  // Only show status for the last message
  if (!isLastMessage) return null
  
  switch (status) {
    case 'sending':
      return null
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
  
  // Use date formatter hook
  const { formatMessage, formatSeparator } = useDateFormatter({ locale: 'th' })
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const scrollToBottom = (force = false) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: force ? "auto" : "smooth" 
    })
  }

  const handleSend = async () => {
    if (messageInput.trim() && conversation) {
      onSendMessage(messageInput.trim())
      setMessageInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('Files selected:', files)
    }
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
      <div className="px-6 py-4 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-medium">
              {conversation.customer.avatar_url ? (
                <img 
                  src={conversation.customer.avatar_url} 
                  alt={conversation.customer.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                conversation.customer.name[0]?.toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
          </div>
          
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              {conversation.customer.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              ใช้งานล่าสุด {formatMessageDate(conversation.customer.last_contact_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 bg-muted rounded-full">
            {conversation.platform}
          </div>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Info className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
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
                isOwn={message.sender_type === 'agent'}
                showAvatar={index === 0 || msgs[index - 1]?.sender_id !== message.sender_id}
                isLastAgentMessage={message.id === lastAgentMessageId}
                onRetry={() => onResendMessage?.(message)}
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
          <div className="relative flex items-center">
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
                  <button 
                    onClick={() => {
                      fileInputRef.current?.click()
                      setShowAttachMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Image className="w-4 h-4" />
                    <span className="text-sm">รูปภาพ</span>
                  </button>
                  <button 
                    onClick={() => {
                      fileInputRef.current?.click()
                      setShowAttachMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">ไฟล์</span>
                  </button>
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
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
})

ChatView.displayName = 'ChatView'

// Message Bubble Component
function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isLastAgentMessage,
  onRetry
}: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  isLastAgentMessage?: boolean
  onRetry?: () => void
}) {
  const { formatMessage } = useDateFormatter({ locale: 'th' })

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <p className={cn(
            "whitespace-pre-wrap break-words",
            message.status === 'failed' && "opacity-75"
          )}>
            {message.content.text}
          </p>
        )
      case 'image':
        return (
          <div className="relative">
            <img 
              src={message.content.media_url} 
              alt="Image"
              className={cn(
                "rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity",
                message.status === 'failed' && "opacity-75"
              )}
            />
            {message.content.text && (
              <p className="mt-2">{message.content.text}</p>
            )}
          </div>
        )
      case 'file':
        return (
          <div className={cn(
            "flex items-center gap-3 p-3 bg-muted/50 rounded-lg",
            message.status === 'failed' && "opacity-75"
          )}>
            <FileText className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.content.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.content.file_size}
              </p>
            </div>
            <button className="p-1 hover:bg-muted rounded transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        )
      default:
        return <p>{message.content.text || 'Unsupported message type'}</p>
    }
  }

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "flex gap-2 pb-3", // Added pb-3 for spacing between messages
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Customer avatar */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      {!isOwn && !showAvatar && <div className="w-8" />}
      
      <div className={cn(
        "max-w-xs lg:max-w-md flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        <Tooltip content={formatMessage(message.created_at)}>
          <div className={cn(
            "px-4 py-2 rounded-2xl relative cursor-default",
            isOwn 
              ? message.status === 'failed' 
                ? "bg-red-500/20 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700"
                : "bg-brand-500 text-white" 
              : "bg-muted",
            message.is_private && "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700"
          )}>
            {message.is_private && (
              <div className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300 mb-1">
                <Shield className="w-3 h-3" />
                <span>โน้ตภายใน</span>
              </div>
            )}
            
            {renderMessageContent()}
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