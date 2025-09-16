// src/types/conversation.types.ts

export type Platform = 'facebook' | 'instagram' | 'line' | 'whatsapp' | 'shopee' | 'lazada' | 'tiktok'

// Updated MessageType to include all types
export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'file' 
  | 'audio'
  | 'voice' 
  | 'location' 
  | 'sticker' 
  | 'contact'
  | 'product' 
  | 'rich_message'
  | 'template'
  | 'carousel'
  | 'buttons'
  | 'flex'

export type ConversationStatus = 'new' | 'open' | 'pending' | 'resolved' | 'spam'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type SenderType = 'customer' | 'agent' | 'system' | 'bot'

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  avatar_url?: string
  platform_identities: {
    [key in Platform]?: {
      id: string
      username?: string
      displayName?: string
    }
  }
  tags: string[]
  last_contact_at: string
  total_conversations: number
  total_spent?: number
  engagement_score: number
  created_at: string
}

export interface Conversation {
  id: string
  customer: Customer
  platform: Platform
  platform_conversation_id?: string
  subject?: string
  status: ConversationStatus
  priority: Priority
  channel_type?: string
  assigned_to?: {
    id: string
    name: string
    avatar_url?: string
  }
  last_message?: Message
  last_message_at: string
  first_response_at?: string
  message_count: number
  unread_count: number
  tags: string[]
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  platform_message_id?: string
  sender_type: SenderType
  sender_id: string
  sender_name: string
  sender_avatar?: string
  message_type: MessageType
  content: MessageContent
  is_private: boolean
  is_automated: boolean
  sentiment?: 'positive' | 'neutral' | 'negative'
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  delivered_at?: string
  read_at?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface MessageContent {
  // Text content
  text?: string
  
  // Media URLs
  media_url?: string
  media_type?: string
  thumbnail_url?: string
  url?: string
  
  // File information
  file_name?: string
  file_size?: number
  file_url?: string
  file_type?: string
  
  // Audio/Voice
  audio_url?: string
  duration?: number
  
  // Sticker
  sticker_id?: string
  sticker_url?: string
  package_id?: string
  
  // Location
  location?: {
    latitude: number
    longitude: number
    address?: string
    name?: string
  }
  latitude?: number
  longitude?: number
  address?: string
  
  // Contact
  contact?: {
    name: string
    phone?: string
    email?: string
    organization?: string
  }
  
  // Product
  product?: {
    id: string
    name: string
    price: number
    currency: string
    image_url?: string
    url?: string
    description?: string
  }
  product_id?: string
  
  // Interactive elements
  buttons?: Array<{
    type: 'url' | 'postback' | 'phone' | 'email'
    title: string
    payload: string
  }>
  
  quick_replies?: Array<{
    title: string
    payload: string
    image_url?: string
  }>
  
  // Rich message / Template
  template_type?: string
  elements?: Array<any>
  
  // Carousel
  carousel?: Array<{
    title: string
    subtitle?: string
    image_url?: string
    buttons?: Array<{
      type: string
      title: string
      payload: string
    }>
  }>
  
  // Facebook specific - attachments format
  attachments?: Array<{
    type: string
    payload: {
      url?: string
      sticker_id?: string
      coordinates?: { lat: number; long: number }
      [key: string]: any
    }
  }>
  
  // Additional metadata
  caption?: string
  is_sensitive?: boolean
  width?: number
  height?: number
  size?: number
}

export interface QuickReply {
  id: string
  title: string
  content: string
  category?: string
  shortcuts?: string[]
  usage_count: number
}

export interface ConversationFilter {
  status?: ConversationStatus[]
  platform?: Platform[]
  priority?: Priority[]
  assigned_to?: string
  tags?: string[]
  search?: string
  date_from?: string
  date_to?: string
  has_unread?: boolean
  is_archived?: boolean
}