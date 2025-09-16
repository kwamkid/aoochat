// src/config/message-types.config.ts

import { Platform, MessageType } from '@/types/conversation.types'
import { Image, Video, FileText, Smile, Mic, MapPin, User, ShoppingBag, Layout } from 'lucide-react'

export interface MessageTypeConfig {
  id: MessageType
  name: string
  icon: any
  enabled: boolean
  sendable: boolean // Can send this type
  receivable: boolean // Can receive this type
  platformConfig?: {
    [key in Platform]?: {
      supported: boolean
      maxSize?: number // MB
      formats?: string[]
    }
  }
}

// Define all message types with their configurations
export const MESSAGE_TYPES: MessageTypeConfig[] = [
  {
    id: 'text',
    name: 'Text',
    icon: null,
    enabled: true,
    sendable: true,
    receivable: true,
    platformConfig: {
      facebook: { supported: true },
      instagram: { supported: true },
      line: { supported: true },
      whatsapp: { supported: true },
      shopee: { supported: true },
      lazada: { supported: true },
      tiktok: { supported: true }
    }
  },
  {
    id: 'image',
    name: 'Image',
    icon: Image,
    enabled: true,
    sendable: true, // Phase 1
    receivable: true,
    platformConfig: {
      facebook: { supported: true, maxSize: 25, formats: ['jpg', 'jpeg', 'png', 'gif'] },
      instagram: { supported: true, maxSize: 8, formats: ['jpg', 'jpeg', 'png'] },
      line: { supported: true, maxSize: 10, formats: ['jpg', 'jpeg', 'png'] },
      whatsapp: { supported: true, maxSize: 5, formats: ['jpg', 'jpeg', 'png'] },
      shopee: { supported: true, maxSize: 5, formats: ['jpg', 'jpeg', 'png'] },
      lazada: { supported: true, maxSize: 5, formats: ['jpg', 'jpeg', 'png'] },
      tiktok: { supported: true, maxSize: 10, formats: ['jpg', 'jpeg', 'png'] }
    }
  },
  {
    id: 'video',
    name: 'Video',
    icon: Video,
    enabled: true,
    sendable: true, // Phase 1
    receivable: true,
    platformConfig: {
      facebook: { supported: true, maxSize: 100, formats: ['mp4', 'mov'] },
      instagram: { supported: true, maxSize: 100, formats: ['mp4', 'mov'] },
      line: { supported: true, maxSize: 200, formats: ['mp4'] },
      whatsapp: { supported: true, maxSize: 16, formats: ['mp4', '3gp'] },
      shopee: { supported: false },
      lazada: { supported: false },
      tiktok: { supported: true, maxSize: 50, formats: ['mp4'] }
    }
  },
  {
    id: 'file',
    name: 'File',
    icon: FileText,
    enabled: true,
    sendable: true, // Phase 1
    receivable: true,
    platformConfig: {
      facebook: { supported: true, maxSize: 25 },
      instagram: { supported: false },
      line: { supported: true, maxSize: 100 },
      whatsapp: { supported: true, maxSize: 100 },
      shopee: { supported: false },
      lazada: { supported: false },
      tiktok: { supported: false }
    }
  },
  {
    id: 'sticker',
    name: 'Sticker',
    icon: Smile,
    enabled: true,
    sendable: true, // Phase 1
    receivable: true,
    platformConfig: {
      facebook: { supported: true },
      instagram: { supported: true },
      line: { supported: true },
      whatsapp: { supported: false },
      shopee: { supported: true },
      lazada: { supported: false },
      tiktok: { supported: false }
    }
  },
  {
    id: 'voice',
    name: 'Voice',
    icon: Mic,
    enabled: true,
    sendable: false, // Phase 2
    receivable: true,
    platformConfig: {
      facebook: { supported: true, maxSize: 25 },
      instagram: { supported: true, maxSize: 25 },
      line: { supported: true, maxSize: 200 },
      whatsapp: { supported: true, maxSize: 16 },
      shopee: { supported: false },
      lazada: { supported: false },
      tiktok: { supported: false }
    }
  },
  {
    id: 'location',
    name: 'Location',
    icon: MapPin,
    enabled: true,
    sendable: false, // Phase 2
    receivable: true,
    platformConfig: {
      facebook: { supported: true },
      instagram: { supported: false },
      line: { supported: true },
      whatsapp: { supported: true },
      shopee: { supported: false },
      lazada: { supported: false },
      tiktok: { supported: false }
    }
  },
  {
    id: 'contact',
    name: 'Contact',
    icon: User,
    enabled: true,
    sendable: false, // Phase 2
    receivable: true,
    platformConfig: {
      facebook: { supported: false },
      instagram: { supported: false },
      line: { supported: false },
      whatsapp: { supported: true },
      shopee: { supported: false },
      lazada: { supported: false },
      tiktok: { supported: false }
    }
  },
  {
    id: 'product',
    name: 'Product',
    icon: ShoppingBag,
    enabled: true,
    sendable: false, // Phase 2
    receivable: true,
    platformConfig: {
      facebook: { supported: true },
      instagram: { supported: true },
      line: { supported: false },
      whatsapp: { supported: true },
      shopee: { supported: true },
      lazada: { supported: true },
      tiktok: { supported: true }
    }
  },
  {
    id: 'rich_message',
    name: 'Rich Message',
    icon: Layout,
    enabled: true,
    sendable: false, // Phase 2
    receivable: true,
    platformConfig: {
      facebook: { supported: true },
      instagram: { supported: true },
      line: { supported: true },
      whatsapp: { supported: true },
      shopee: { supported: false },
      lazada: { supported: false },
      tiktok: { supported: false }
    }
  }
]

/**
 * Get message types that can be sent for a specific platform
 */
export function getSendableMessageTypes(platform: Platform): MessageTypeConfig[] {
  return MESSAGE_TYPES.filter(type => {
    return (
      type.enabled &&
      type.sendable &&
      type.platformConfig?.[platform]?.supported
    )
  })
}

/**
 * Get message types that can be received for a specific platform
 */
export function getReceivableMessageTypes(platform: Platform): MessageTypeConfig[] {
  return MESSAGE_TYPES.filter(type => {
    return (
      type.enabled &&
      type.receivable &&
      type.platformConfig?.[platform]?.supported
    )
  })
}

/**
 * Check if a message type is supported for sending on a platform
 */
export function isMessageTypeSupported(
  platform: Platform,
  messageType: MessageType,
  forSending: boolean = true
): boolean {
  const typeConfig = MESSAGE_TYPES.find(t => t.id === messageType)
  if (!typeConfig) return false
  
  return (
    typeConfig.enabled &&
    (forSending ? typeConfig.sendable : typeConfig.receivable) &&
    (typeConfig.platformConfig?.[platform]?.supported ?? false)
  )
}

/**
 * Get maximum file size for a message type on a platform
 */
export function getMaxFileSize(platform: Platform, messageType: MessageType): number | undefined {
  const typeConfig = MESSAGE_TYPES.find(t => t.id === messageType)
  return typeConfig?.platformConfig?.[platform]?.maxSize
}

/**
 * Get supported file formats for a message type on a platform
 */
export function getSupportedFormats(platform: Platform, messageType: MessageType): string[] | undefined {
  const typeConfig = MESSAGE_TYPES.find(t => t.id === messageType)
  return typeConfig?.platformConfig?.[platform]?.formats
}