// src/app/(dashboard)/conversations/page.tsx
"use client"

import { useState, useEffect } from "react"
import { ConversationList } from "@/components/conversations/conversation-list"
import { ChatView } from "@/components/conversations/chat-view"
import { CustomerInfo } from "@/components/conversations/customer-info"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react"
import type { Conversation, Message } from "@/types/conversation.types"

// Mock data - ในอนาคตจะดึงจาก Supabase
const mockConversations: Conversation[] = [
  {
    id: "1",
    customer: {
      id: "c1",
      name: "สมชาย ใจดี",
      email: "somchai@example.com",
      phone: "0812345678",
      avatar_url: undefined,
      platform_identities: {
        facebook: { id: "fb123", username: "somchai.jaidee" }
      },
      tags: ["vip", "repeat_buyer"],
      last_contact_at: new Date().toISOString(),
      total_conversations: 5,
      total_spent: 15000,
      engagement_score: 85,
      created_at: "2024-01-01T00:00:00Z"
    },
    platform: "facebook",
    subject: "สอบถามสินค้า iPhone 15 Pro",
    status: "open",
    priority: "high",
    channel_type: "direct_message",
    assigned_to: {
      id: "a1",
      name: "Agent Smith",
      avatar_url: undefined
    },
    last_message: {
      id: "m1",
      conversation_id: "1",
      sender_type: "customer",
      sender_id: "c1",
      sender_name: "สมชาย ใจดี",
      message_type: "text",
      content: { text: "สินค้ายังมีในสต็อกไหมครับ?" },
      is_private: false,
      is_automated: false,
      status: "delivered",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    last_message_at: new Date().toISOString(),
    message_count: 12,
    unread_count: 3,
    tags: ["product_inquiry", "iphone"],
    is_archived: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    customer: {
      id: "c2",
      name: "สมหญิง รักสวย",
      email: "somying@example.com",
      avatar_url: undefined,
      platform_identities: {
        line: { id: "U456", displayName: "Somying" }
      },
      tags: ["new_customer"],
      last_contact_at: new Date(Date.now() - 3600000).toISOString(),
      total_conversations: 1,
      total_spent: 0,
      engagement_score: 60,
      created_at: "2024-01-15T00:00:00Z"
    },
    platform: "line",
    subject: "ขอข้อมูลการจัดส่ง",
    status: "new",
    priority: "normal",
    channel_type: "direct_message",
    last_message: {
      id: "m2",
      conversation_id: "2",
      sender_type: "customer",
      sender_id: "c2",
      sender_name: "สมหญิง รักสวย",
      message_type: "text",
      content: { text: "จัดส่งฟรีไหมคะ?" },
      is_private: false,
      is_automated: false,
      status: "delivered",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    message_count: 3,
    unread_count: 1,
    tags: ["shipping_inquiry"],
    is_archived: false,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "3",
    customer: {
      id: "c3",
      name: "วิชัย ขยันทำงาน",
      phone: "0898765432",
      avatar_url: undefined,
      platform_identities: {
        instagram: { id: "ig789", username: "wichai_work" }
      },
      tags: ["prospect"],
      last_contact_at: new Date(Date.now() - 86400000).toISOString(),
      total_conversations: 2,
      total_spent: 5000,
      engagement_score: 70,
      created_at: "2024-01-10T00:00:00Z"
    },
    platform: "instagram",
    subject: "ติดตามคำสั่งซื้อ #12345",
    status: "pending",
    priority: "normal",
    channel_type: "direct_message",
    last_message: {
      id: "m3",
      conversation_id: "3",
      sender_type: "agent",
      sender_id: "a1",
      sender_name: "Agent Smith",
      message_type: "text",
      content: { text: "เรียนคุณวิชัย สินค้าของคุณอยู่ระหว่างการจัดส่งค่ะ" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    message_count: 8,
    unread_count: 0,
    tags: ["order_tracking"],
    is_archived: false,
    created_at: "2024-01-10T00:00:00Z",
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
]

const mockMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "msg1",
      conversation_id: "1",
      sender_type: "customer",
      sender_id: "c1",
      sender_name: "สมชาย ใจดี",
      message_type: "text",
      content: { text: "สวัสดีครับ อยากสอบถามเรื่อง iPhone 15 Pro ครับ" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "msg2",
      conversation_id: "1",
      sender_type: "agent",
      sender_id: "a1",
      sender_name: "Agent Smith",
      message_type: "text",
      content: { text: "สวัสดีค่ะ คุณสมชาย ยินดีให้บริการค่ะ สนใจรุ่นไหนคะ?" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 7000000).toISOString(),
      updated_at: new Date(Date.now() - 7000000).toISOString()
    },
    {
      id: "msg3",
      conversation_id: "1",
      sender_type: "customer",
      sender_id: "c1",
      sender_name: "สมชาย ใจดี",
      message_type: "text",
      content: { text: "สนใจรุ่น Pro Max สีดำ 256GB ครับ" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 6800000).toISOString(),
      updated_at: new Date(Date.now() - 6800000).toISOString()
    },
    {
      id: "msg4",
      conversation_id: "1",
      sender_type: "agent",
      sender_id: "a1",
      sender_name: "Agent Smith",
      message_type: "image",
      content: { 
        media_url: "https://via.placeholder.com/300x200",
        text: "นี่คือรูปสินค้าค่ะ"
      },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 6600000).toISOString(),
      updated_at: new Date(Date.now() - 6600000).toISOString()
    },
    {
      id: "msg5",
      conversation_id: "1",
      sender_type: "system",
      sender_id: "system",
      sender_name: "System",
      message_type: "text",
      content: { text: "📌 ลูกค้าถูกแท็กเป็น VIP" },
      is_private: true,
      is_automated: true,
      status: "read",
      created_at: new Date(Date.now() - 6400000).toISOString(),
      updated_at: new Date(Date.now() - 6400000).toISOString()
    },
    {
      id: "msg6",
      conversation_id: "1",
      sender_type: "customer",
      sender_id: "c1",
      sender_name: "สมชาย ใจดี",
      message_type: "text",
      content: { text: "สินค้ายังมีในสต็อกไหมครับ?" },
      is_private: false,
      is_automated: false,
      status: "delivered",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  "2": [
    {
      id: "msg7",
      conversation_id: "2",
      sender_type: "customer",
      sender_id: "c2",
      sender_name: "สมหญิง รักสวย",
      message_type: "text",
      content: { text: "สวัสดีค่ะ" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 4000000).toISOString(),
      updated_at: new Date(Date.now() - 4000000).toISOString()
    },
    {
      id: "msg8",
      conversation_id: "2",
      sender_type: "bot",
      sender_id: "bot",
      sender_name: "AooBot",
      message_type: "text",
      content: { 
        text: "สวัสดีค่ะ ยินดีต้อนรับสู่ AooShop ค่ะ มีอะไรให้ช่วยไหมคะ?",
        quick_replies: [
          { title: "ดูสินค้า", payload: "view_products" },
          { title: "ติดต่อพนักงาน", payload: "contact_agent" },
          { title: "ตรวจสอบคำสั่งซื้อ", payload: "check_order" }
        ]
      },
      is_private: false,
      is_automated: true,
      status: "read",
      created_at: new Date(Date.now() - 3900000).toISOString(),
      updated_at: new Date(Date.now() - 3900000).toISOString()
    },
    {
      id: "msg9",
      conversation_id: "2",
      sender_type: "customer",
      sender_id: "c2",
      sender_name: "สมหญิง รักสวย",
      message_type: "text",
      content: { text: "จัดส่งฟรีไหมคะ?" },
      is_private: false,
      is_automated: false,
      status: "delivered",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  "3": [
    {
      id: "msg10",
      conversation_id: "3",
      sender_type: "customer",
      sender_id: "c3",
      sender_name: "วิชัย ขยันทำงาน",
      message_type: "text",
      content: { text: "ขอเช็คสถานะคำสั่งซื้อ #12345 หน่อยครับ" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 100000000).toISOString(),
      updated_at: new Date(Date.now() - 100000000).toISOString()
    },
    {
      id: "msg11",
      conversation_id: "3",
      sender_type: "agent",
      sender_id: "a1",
      sender_name: "Agent Smith",
      message_type: "text",
      content: { text: "เรียนคุณวิชัย สินค้าของคุณอยู่ระหว่างการจัดส่งค่ะ" },
      is_private: false,
      is_automated: false,
      status: "read",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ]
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showCustomerInfo, setShowCustomerInfo] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      setMessages(mockMessages[selectedConversation.id] || [])
      if (isMobileView) {
        setShowMobileChat(true)
      }
    }
  }, [selectedConversation, isMobileView])

  const handleSendMessage = (content: string) => {
    if (!selectedConversation) return

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_type: "agent",
      sender_id: "a1",
      sender_name: "Agent Smith",
      message_type: "text",
      content: { text: content },
      is_private: false,
      is_automated: false,
      status: "sent",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, newMessage])

    // Update conversation's last message
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation.id
        ? { 
            ...conv, 
            last_message: newMessage,
            last_message_at: newMessage.created_at,
            message_count: conv.message_count + 1
          }
        : conv
    ))

    // Simulate message status update
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id
          ? { ...msg, status: "delivered" as const }
          : msg
      ))
    }, 1000)

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id
          ? { ...msg, status: "read" as const }
          : msg
      ))
    }, 2000)
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
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelect={(conv) => {
                  setSelectedConversation(conv)
                  setShowMobileChat(true)
                }}
              />
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
                  onClick={() => setShowMobileChat(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium">กลับ</span>
              </div>
              
              <ChatView
                conversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                typing={false}
              />
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
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelect={setSelectedConversation}
        />
      </div>

      {/* Chat View - Center Panel */}
      <div className="flex-1 flex bg-background">
        <ChatView
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          typing={false}
        />
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
              onClose={() => setShowCustomerInfo(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Customer Info Button */}
      {selectedConversation && (
        <button
          onClick={() => setShowCustomerInfo(!showCustomerInfo)}
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