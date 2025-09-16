// src/config/message-types.config.ts

import type { Platform } from '@/types/conversation.types'

/**
 * Message type definitions and platform support matrix
 */

export interface MessageTypeConfig {
  id: string
  name: string
  description: string
  icon: string
  supportedPlatforms: Platform[]
  features: {
    sendable: boolean      // Can send this type
    receivable: boolean    // Can receive this type
    hasCaption?: boolean   // Supports caption/text
    hasButtons?: boolean   // Supports action buttons
    hasQuickReplies?: boolean
    maxSize?: number       // Max file size in MB
    allowedFormats?: string[] // File extensions or MIME types
  }
  // Platform-specific configurations
  platformConfig?: {
    [key in Platform]?: {
      apiField?: string     // Field name in API
      maxSize?: number      // Platform-specific size limit
      restrictions?: string[]
      transform?: (content: any) => any // Transform function
    }
  }
}

export const MESSAGE_TYPES: Record<string, MessageTypeConfig> = {
  // Basic Message Types
  text: {
    id: 'text',
    name: 'Text Message',
    description: 'Plain text message',
    icon: '💬',
    supportedPlatforms: ['facebook', 'instagram', 'line', 'whatsapp', 'shopee', 'lazada', 'tiktok'],
    features: {
      sendable: true,
      receivable: true,
      maxSize: 0.005 // 5000 characters ~5KB
    }
  },
  
  image: {
    id: 'image',
    name: 'Image',
    description: 'Photo or image file',
    icon: '🖼️',
    supportedPlatforms: ['facebook', 'instagram', 'line', 'whatsapp', 'shopee', 'lazada', 'tiktok'],
    features: {
      sendable: true,
      receivable: true,
      hasCaption: true,
      maxSize: 25, // 25MB default
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    },
    platformConfig: {
      facebook: { maxSize: 25 },
      instagram: { maxSize: 8 },
      line: { maxSize: 10 },
      whatsapp: { maxSize: 5 },
      shopee: { maxSize: 2 },
      lazada: { maxSize: 2 },
      tiktok: { maxSize: 10 }
    }
  },
  
  video: {
    id: 'video',
    name: 'Video',
    description: 'Video file',
    icon: '🎥',
    supportedPlatforms: ['facebook', 'instagram', 'line', 'whatsapp', 'tiktok'],
    features: {
      sendable: true,
      receivable: true,
      hasCaption: true,
      maxSize: 100,
      allowedFormats: ['mp4', 'avi', 'mov', 'mkv']
    },
    platformConfig: {
      facebook: { maxSize: 100 },
      instagram: { maxSize: 100 },
      line: { maxSize: 200 },
      whatsapp: { maxSize: 16 },
      tiktok: { maxSize: 50 }
    }
  },
  
  audio: {
    id: 'audio',
    name: 'Audio',
    description: 'Audio or voice message',
    icon: '🎵',
    supportedPlatforms: ['facebook', 'instagram', 'line', 'whatsapp'],
    features: {
      sendable: true,
      receivable: true,
      maxSize: 25,
      allowedFormats: ['mp3', 'ogg', 'wav', 'm4a', 'aac']
    },
    platformConfig: {
      facebook: { maxSize: 25 },
      instagram: { maxSize: 25 },
      line: { maxSize: 200, apiField: 'audio' },
      whatsapp: { maxSize: 16, allowedFormats: ['ogg', 'mp3'] }
    }
  },
  
  file: {
    id: 'file',
    name: 'File',
    description: 'Document or file attachment',
    icon: '📎',
    supportedPlatforms: ['facebook', 'whatsapp', 'line'],
    features: {
      sendable: true,
      receivable: true,
      maxSize: 25,
      allowedFormats: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip']
    },
    platformConfig: {
      facebook: { maxSize: 25 },
      whatsapp: { maxSize: 100 },
      line: { maxSize: 200 }
    }
  },
  
  sticker: {
    id: 'sticker',
    name: 'Sticker',
    description: 'Sticker or animated sticker',
    icon: '😄',
    supportedPlatforms: ['facebook', 'instagram', 'line', 'whatsapp', 'shopee'],
    features: {
      sendable: true,
      receivable: true
    },
    platformConfig: {
      line: {
        restrictions: ['Must use LINE sticker IDs']
      },
      whatsapp: {
        allowedFormats: ['webp'],
        restrictions: ['Must be 512x512 pixels']
      }
    }
  },
  
  location: {
    id: 'location',
    name: 'Location',
    description: 'GPS location sharing',
    icon: '📍',
    supportedPlatforms: ['facebook', 'line', 'whatsapp'],
    features: {
      sendable: true,
      receivable: true
    }
  },
  
  contact: {
    id: 'contact',
    name: 'Contact',
    description: 'Contact card sharing',
    icon: '👤',
    supportedPlatforms: ['whatsapp'],
    features: {
      sendable: true,
      receivable: true
    }
  },
  
  // E-commerce Types
  product: {
    id: 'product',
    name: 'Product',
    description: 'Product catalog item',
    icon: '🛍️',
    supportedPlatforms: ['facebook', 'instagram', 'whatsapp', 'shopee', 'lazada', 'tiktok'],
    features: {
      sendable: true,
      receivable: true,
      hasButtons: true
    }
  },
  
  order: {
    id: 'order',
    name: 'Order',
    description: 'Order information',
    icon: '📦',
    supportedPlatforms: ['shopee', 'lazada', 'tiktok'],
    features: {
      sendable: false,
      receivable: true
    }
  },
  
  // Rich Message Types
  carousel: {
    id: 'carousel',
    name: 'Carousel',
    description: 'Multiple cards in horizontal scroll',
    icon: '🎠',
    supportedPlatforms: ['facebook', 'line', 'whatsapp'],
    features: {
      sendable: true,
      receivable: true,
      hasButtons: true
    }
  },
  
  buttons: {
    id: 'buttons',
    name: 'Button Template',
    description: 'Message with action buttons',
    icon: '🔘',
    supportedPlatforms: ['facebook', 'whatsapp', 'line'],
    features: {
      sendable: true,
      receivable: true,
      hasButtons: true
    }
  },
  
  quickReply: {
    id: 'quickReply',
    name: 'Quick Reply',
    description: 'Message with quick reply options',
    icon: '⚡',
    supportedPlatforms: ['facebook', 'instagram', 'whatsapp', 'line'],
    features: {
      sendable: true,
      receivable: true,
      hasQuickReplies: true
    }
  },
  
  flex: {
    id: 'flex',
    name: 'LINE Flex Message',
    description: 'Flexible layout message for LINE',
    icon: '📐',
    supportedPlatforms: ['line'],
    features: {
      sendable: true,
      receivable: true,
      hasButtons: true
    }
  },
  
  template: {
    id: 'template',
    name: 'Template Message',
    description: 'Pre-approved template message',
    icon: '📋',
    supportedPlatforms: ['facebook', 'whatsapp'],
    features: {
      sendable: true,
      receivable: true,
      hasButtons: true
    }
  }
}

/**
 * Get supported message types for a platform
 */
export function getSupportedMessageTypes(platform: Platform): MessageTypeConfig[] {
  return Object.values(MESSAGE_TYPES).filter(type => 
    type.supportedPlatforms.includes(platform)
  )
}

/**
 * Check if a message type is supported on a platform
 */
export function isMessageTypeSupported(
  messageType: string, 
  platform: Platform
): boolean {
  const config = MESSAGE_TYPES[messageType]
  return config ? config.supportedPlatforms.includes(platform) : false
}

/**
 * Get sendable message types for a platform
 */
export function getSendableMessageTypes(platform: Platform): MessageTypeConfig[] {
  return getSupportedMessageTypes(platform).filter(type => type.features.sendable)
}

/**
 * Transform message content for specific platform
 */
export function transformMessageForPlatform(
  messageType: string,
  content: any,
  platform: Platform
): any {
  const config = MESSAGE_TYPES[messageType]
  const platformConfig = config?.platformConfig?.[platform]
  
  if (platformConfig?.transform) {
    return platformConfig.transform(content)
  }
  
  // Default transformations based on platform
  switch (platform) {
    case 'line':
      return transformForLine(messageType, content)
    case 'whatsapp':
      return transformForWhatsApp(messageType, content)
    case 'facebook':
    case 'instagram':
      return transformForMeta(messageType, content)
    default:
      return content
  }
}

// Platform-specific transform functions
function transformForLine(messageType: string, content: any) {
  switch (messageType) {
    case 'text':
      return { type: 'text', text: content.text }
    case 'image':
      return {
        type: 'image',
        originalContentUrl: content.media_url,
        previewImageUrl: content.thumbnail_url || content.media_url
      }
    case 'video':
      return {
        type: 'video',
        originalContentUrl: content.media_url,
        previewImageUrl: content.thumbnail_url
      }
    default:
      return content
  }
}

function transformForWhatsApp(messageType: string, content: any) {
  switch (messageType) {
    case 'text':
      return { type: 'text', body: content.text }
    case 'image':
      return {
        type: 'image',
        link: content.media_url,
        caption: content.caption
      }
    case 'location':
      return {
        type: 'location',
        latitude: content.latitude,
        longitude: content.longitude,
        name: content.name,
        address: content.address
      }
    default:
      return content
  }
}

function transformForMeta(messageType: string, content: any) {
  // Facebook and Instagram use similar format
  switch (messageType) {
    case 'text':
      return { text: content.text }
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
      return {
        attachment: {
          type: messageType,
          payload: {
            url: content.media_url,
            is_reusable: true
          }
        }
      }
    default:
      return content
  }
}