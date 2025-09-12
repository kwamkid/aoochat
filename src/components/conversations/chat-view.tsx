// src/components/conversations/chat-view.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send as SendIcon, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Info,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Image,
  FileText,
  Download,
  X,
  Mic,
  StopCircle,
  Hash,
  User,
  Bot,
  Shield,
  Star,
  Archive,
  Trash2,
  Forward,
  Reply,
  MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { th } from "date-fns/locale"
import type { Conversation, Message, MessageType, SenderType } from "@/types/conversation.types"

// Message Status Icon
const MessageStatus = ({ status }: { status: Message['status'] }) => {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-muted-foreground" />
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" />
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-red-500" />
    default:
      return null
  }
}

// Sender Icon
const SenderIcon = ({ type }: { type: SenderType }) => {
  switch (type) {
    case 'agent':
      return <User className="w-3 h-3" />
    case 'bot':
      return <Bot className="w-3 h-3" />
    case 'system':
      return <Shield className="w-3 h-3" />
    default:
      return null
  }
}

interface ChatViewProps {
  conversation: Conversation | null
  messages: Message[]
  onSendMessage: (content: string, type?: MessageType) => void
  onLoadMore?: () => void
  loading?: boolean
  hasMore?: boolean
  typing?: boolean
}

export function ChatView({
  conversation,
  messages,
  onSendMessage,
  onLoadMore,
  loading = false,
  hasMore = false,
  typing = false
}: ChatViewProps) {
  const [messageInput, setMessageInput] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = () => {
    if (messageInput.trim()) {
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
      // Handle file upload
      console.log('Files selected:', files)
    }
  }

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date)
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm')
    } else if (isYesterday(messageDate)) {
      return `เมื่อวาน ${format(messageDate, 'HH:mm')}`
    }
    return format(messageDate, 'd MMM yyyy HH:mm', { locale: th })
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
    <div className="flex-1 flex flex-col h-full">
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
              {conversation.customer.tags.includes('vip') && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {typing ? (
                <span className="flex items-center gap-1">
                  <span className="animate-pulse">กำลังพิมพ์</span>
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </span>
              ) : (
                `ใช้งานล่าสุด ${formatMessageDate(conversation.customer.last_contact_at)}`
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
            >
              {loading ? "กำลังโหลด..." : "โหลดข้อความเก่า"}
            </button>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">
                {isToday(new Date(date)) 
                  ? 'วันนี้' 
                  : isYesterday(new Date(date))
                  ? 'เมื่อวาน'
                  : format(new Date(date), 'd MMMM yyyy', { locale: th })
                }
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
                isSelected={selectedMessages.includes(message.id)}
                onSelect={() => {
                  setSelectedMessages(prev => 
                    prev.includes(message.id) 
                      ? prev.filter(id => id !== message.id)
                      : [...prev, message.id]
                  )
                }}
              />
            ))}
          </div>
        ))}

        {/* Typing Indicator */}
        {typing && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Messages Actions */}
      <AnimatePresence>
        {selectedMessages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between"
          >
            <span className="text-sm font-medium">
              เลือก {selectedMessages.length} ข้อความ
            </span>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Reply className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Forward className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Star className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setSelectedMessages([])}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="px-4 py-3 border-t bg-card">
        <div className="flex items-stretch gap-2">
          {/* Attachment Button with Menu */}
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
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}

// Message Bubble Component
function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isSelected,
  onSelect
}: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <p className="whitespace-pre-wrap break-words">
            {message.content.text}
          </p>
        )
      case 'image':
        return (
          <div className="relative">
            <img 
              src={message.content.media_url} 
              alt="Image"
              className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
            />
            {message.content.text && (
              <p className="mt-2">{message.content.text}</p>
            )}
          </div>
        )
      case 'file':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2 group",
        isOwn ? "justify-end" : "justify-start",
        isSelected && "bg-brand-50/30 dark:bg-brand-950/10 -mx-2 px-2 py-1 rounded-lg"
      )}
      onClick={onSelect}
    >
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      {!isOwn && !showAvatar && <div className="w-8" />}
      
      <div className={cn(
        "max-w-xs lg:max-w-md",
        isOwn ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-4 py-2 rounded-2xl",
          isOwn 
            ? "bg-brand-500 text-white" 
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
          
          {message.content.quick_replies && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.content.quick_replies.map((reply, index) => (
                <button
                  key={index}
                  className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  {reply.title}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {message.sender_type !== 'customer' && (
            <SenderIcon type={message.sender_type} />
          )}
          {isOwn && <MessageStatus status={message.status} />}
          {message.is_automated && (
            <Bot className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </motion.div>
  )
}