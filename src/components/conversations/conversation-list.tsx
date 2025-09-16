// src/components/conversations/conversation-list.tsx
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  Filter, 
  MessageCircle, 
  Clock, 
  CheckCheck,
  Circle,
  AlertCircle,
  Star,
  Archive,
  MoreVertical,
  Facebook,
  Instagram,
  Send,
  MessageSquare,
  ShoppingBag,
  Music,
  Hash
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import type { Conversation, Platform, ConversationStatus, Priority } from "@/types/conversation.types"
import { ConversationAvatar } from './platform-avatar'
import { usePlatformInfo } from '@/hooks/use-platform-info'

// Platform Icons
const PlatformIcon = ({ platform, className }: { platform: Platform; className?: string }) => {
  const icons: Record<Platform, React.ReactElement> = {
    facebook: <Facebook className={className} />,
    instagram: <Instagram className={className} />,
    line: <MessageSquare className={className} />,
    whatsapp: <Send className={className} />,
    shopee: <ShoppingBag className={className} />,
    lazada: <ShoppingBag className={className} />,
    tiktok: <Music className={className} />
  }
  return icons[platform] || <MessageCircle className={className} />
}

// Platform Colors
const getPlatformColor = (platform: Platform) => {
  const colors: Record<Platform, string> = {
    facebook: "bg-blue-500",
    instagram: "bg-gradient-to-br from-purple-600 to-pink-500",
    line: "bg-green-500",
    whatsapp: "bg-green-600",
    shopee: "bg-orange-500",
    lazada: "bg-blue-600",
    tiktok: "bg-black"
  }
  return colors[platform] || "bg-gray-500"
}

// Status Badge
const StatusBadge = ({ status }: { status: ConversationStatus }) => {
  const config = {
    new: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "ใหม่" },
    open: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "เปิด" },
    pending: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "รอดำเนินการ" },
    resolved: { color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", label: "แก้ไขแล้ว" },
    spam: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "สแปม" }
  }
  
  const { color, label } = config[status]
  
  return (
    <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", color)}>
      {label}
    </span>
  )
}

// Priority Icon
const PriorityIcon = ({ priority }: { priority: Priority }) => {
  if (priority === 'urgent') {
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }
  if (priority === 'high') {
    return <AlertCircle className="w-4 h-4 text-orange-500" />
  }
  return null
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId?: string
  onSelect: (conversation: Conversation) => void
  onLoadMore?: () => void
  loading?: boolean
  hasMore?: boolean
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onLoadMore,
  loading = false,
  hasMore = false
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<ConversationStatus | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Status filter
    if (filterStatus !== 'all' && conv.status !== filterStatus) {
      return false
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        conv.customer.name.toLowerCase().includes(query) ||
        conv.subject?.toLowerCase().includes(query) ||
        conv.last_message?.content.text?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    const date = new Date(conv.last_message_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let group = 'เก่ากว่า'
    if (date.toDateString() === today.toDateString()) {
      group = 'วันนี้'
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'เมื่อวาน'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      group = 'สัปดาห์นี้'
    }
    
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(conv)
    return acc
  }, {} as Record<string, Conversation[]>)

  const groupOrder = ['วันนี้', 'เมื่อวาน', 'สัปดาห์นี้', 'เก่ากว่า']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">การสนทนา</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showFilters ? "bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "hover:bg-muted"
              )}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, ข้อความ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>
        
        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 flex flex-wrap gap-2 overflow-hidden"
            >
              {(['all', 'new', 'open', 'pending', 'resolved'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    filterStatus === status
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {status === 'all' ? 'ทั้งหมด' : <StatusBadge status={status} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedConversations)
          .sort((a, b) => groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0]))
          .map(([group, convs]) => (
            <div key={group}>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                {group}
              </div>
              {convs.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onClick={() => onSelect(conversation)}
                />
              ))}
            </div>
          ))}
        
        {filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">ไม่พบการสนทนา</p>
          </div>
        )}
        
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
            >
              {loading ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Individual Conversation Item
function ConversationItem({
  conversation,
  isSelected,
  onClick
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const hasUnread = conversation.unread_count > 0
  const timeAgo = formatDistanceToNow(new Date(conversation.last_message_at), { 
    addSuffix: true,
    locale: th 
  })
  
  // Extract page ID from platform_conversation_id
  const pageId = conversation.platform_conversation_id?.split('_')[0]
  
  // Get platform info
  const { pageInfo } = usePlatformInfo({
    platform: conversation.platform,
    pageId: pageId || null,
    customerId: conversation.customer.platform_identities[conversation.platform]?.id || null
  })

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-all text-left border-l-2",
        isSelected 
          ? "bg-brand-50/50 dark:bg-brand-950/20 border-brand-500" 
          : "border-transparent",
        hasUnread && "bg-brand-50/30 dark:bg-brand-950/10"
      )}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Enhanced Avatar with Page and Platform */}
      <div className="relative flex-shrink-0">
        <ConversationAvatar
          platform={conversation.platform}
          pageAvatar={pageInfo?.pageAvatar}
          pageName={pageInfo?.pageName}
          customerAvatar={conversation.customer.avatar_url}
          customerName={conversation.customer.name}
          isVerified={pageInfo?.pageVerified}
          size="md"
        />
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-medium truncate",
              hasUnread && "text-foreground"
            )}>
              {conversation.customer.name}
            </h3>
            <PriorityIcon priority={conversation.priority} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo}
          </span>
        </div>
        
        <p className={cn(
          "text-sm truncate mb-1",
          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {conversation.last_message?.content.text || "ส่งรูปภาพ"}
        </p>
        
        <div className="flex items-center gap-2">
          <StatusBadge status={conversation.status} />
          {conversation.tags.slice(0, 2).map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {conversation.unread_count > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}