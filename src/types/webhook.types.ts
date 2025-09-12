// src/types/webhook.types.ts

import { Platform, MessageType } from './conversation.types'

// =====================================================
// BASE WEBHOOK TYPES
// =====================================================

export interface WebhookEvent {
  id: string
  platform: Platform
  type: WebhookEventType
  timestamp: string
  data: any
  signature?: string
}

export type WebhookEventType = 
  | 'message.received'
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'message.failed'
  | 'conversation.started'
  | 'conversation.ended'
  | 'user.subscribed'
  | 'user.unsubscribed'
  | 'postback'
  | 'quick_reply'

export interface WebhookResponse {
  success: boolean
  message?: string
  data?: any
}

// =====================================================
// PLATFORM-SPECIFIC WEBHOOK PAYLOADS
// =====================================================

// Facebook/Instagram Webhook
export interface MetaWebhookPayload {
  object: 'page' | 'instagram'
  entry: Array<{
    id: string
    time: number
    messaging?: Array<{
      sender: { id: string }
      recipient: { id: string }
      timestamp: number
      message?: {
        mid: string
        text?: string
        attachments?: Array<{
          type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'fallback'
          payload: {
            url?: string
            coordinates?: { lat: number; long: number }
          }
        }>
        quick_reply?: {
          payload: string
        }
      }
      postback?: {
        title: string
        payload: string
      }
      delivery?: {
        mids: string[]
        watermark: number
      }
      read?: {
        watermark: number
      }
    }>
    changes?: Array<{
      field: string
      value: any
    }>
  }>
}

// LINE Webhook
export interface LineWebhookPayload {
  destination: string
  events: Array<{
    type: 'message' | 'follow' | 'unfollow' | 'postback' | 'join' | 'leave'
    mode: 'active' | 'standby'
    timestamp: number
    source: {
      type: 'user' | 'group' | 'room'
      userId?: string
      groupId?: string
      roomId?: string
    }
    replyToken?: string
    message?: {
      id: string
      type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker'
      text?: string
      fileName?: string
      fileSize?: number
      duration?: number
      title?: string
      address?: string
      latitude?: number
      longitude?: number
      packageId?: string
      stickerId?: string
      stickerResourceType?: string
    }
    postback?: {
      data: string
      params?: any
    }
  }>
}

// WhatsApp Webhook
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: 'whatsapp'
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: {
            name: string
          }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'button' | 'interactive'
          text?: {
            body: string
          }
          image?: {
            caption?: string
            mime_type: string
            sha256: string
            id: string
          }
          document?: {
            caption?: string
            filename: string
            mime_type: string
            sha256: string
            id: string
          }
          audio?: {
            mime_type: string
            sha256: string
            id: string
          }
          video?: {
            caption?: string
            mime_type: string
            sha256: string
            id: string
          }
          location?: {
            latitude: number
            longitude: number
            name?: string
            address?: string
          }
          button?: {
            text: string
            payload: string
          }
          interactive?: {
            type: 'list_reply' | 'button_reply'
            list_reply?: {
              id: string
              title: string
              description?: string
            }
            button_reply?: {
              id: string
              title: string
            }
          }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{
            code: number
            title: string
          }>
        }>
      }
      field: string
    }>
  }>
}

// Shopee Webhook
export interface ShopeeWebhookPayload {
  shop_id: number
  timestamp: number
  type: 'message' | 'order_status' | 'product_inquiry'
  data: {
    conversation_id: string
    message_id?: string
    sender_id: string
    sender_name?: string
    content?: {
      text?: string
      image_url?: string
      product_id?: string
      order_id?: string
    }
    metadata?: any
  }
}

// =====================================================
// WEBHOOK PROCESSORS
// =====================================================

export interface WebhookProcessor {
  platform: Platform
  verify(params: any, headers: any): boolean
  process(payload: any): Promise<ProcessedWebhookData>
}

export interface ProcessedWebhookData {
  platform: Platform
  conversationId: string
  customerId: string
  customerName?: string
  messageId?: string
  messageType?: MessageType
  messageContent?: any
  eventType: WebhookEventType
  timestamp: string
  rawData?: any
}

// =====================================================
// PLATFORM CREDENTIALS
// =====================================================

export interface PlatformCredentials {
  platform: Platform
  appId?: string
  appSecret?: string
  accessToken?: string
  refreshToken?: string
  channelId?: string
  channelSecret?: string
  channelAccessToken?: string
  webhookVerifyToken?: string
  webhookSecret?: string
  apiKey?: string
  apiSecret?: string
  phoneNumberId?: string
  businessAccountId?: string
  expiresAt?: string
  scopes?: string[]
}

// =====================================================
// API CLIENTS
// =====================================================

export interface PlatformAPIClient {
  platform: Platform
  credentials: PlatformCredentials
  
  // Message Operations
  sendMessage(recipientId: string, message: any): Promise<any>
  sendTypingIndicator(recipientId: string, isTyping: boolean): Promise<void>
  markAsRead(messageId: string): Promise<void>
  
  // User Operations
  getUserProfile(userId: string): Promise<any>
  
  // Media Operations
  uploadMedia?(file: Buffer, mimeType: string): Promise<string>
  getMediaUrl?(mediaId: string): Promise<string>
  
  // Webhook Operations
  subscribeWebhook?(callbackUrl: string): Promise<void>
  unsubscribeWebhook?(): Promise<void>
  
  // Auth Operations
  refreshAccessToken?(): Promise<string>
  validateCredentials(): Promise<boolean>
}

// =====================================================
// MESSAGE BUILDERS
// =====================================================

export interface MessageBuilder {
  text(content: string): any
  image(url: string, caption?: string): any
  file(url: string, filename?: string): any
  video(url: string, caption?: string): any
  audio(url: string): any
  location(lat: number, lng: number, title?: string): any
  quickReplies(text: string, options: QuickReplyOption[]): any
  buttons(text: string, buttons: ButtonOption[]): any
  carousel(items: CarouselItem[]): any
}

export interface QuickReplyOption {
  title: string
  payload: string
  imageUrl?: string
}

export interface ButtonOption {
  type: 'postback' | 'url' | 'phone' | 'email'
  title: string
  payload: string
}

export interface CarouselItem {
  title: string
  subtitle?: string
  imageUrl?: string
  buttons?: ButtonOption[]
  defaultAction?: {
    type: 'url'
    url: string
  }
}

// =====================================================
// RATE LIMITING
// =====================================================

export interface RateLimitConfig {
  platform: Platform
  maxRequests: number
  windowMs: number
  maxBurst?: number
}

export interface RateLimitStatus {
  remaining: number
  reset: Date
  total: number
}