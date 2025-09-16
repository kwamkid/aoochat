// src/components/messages/message-renderer.tsx

import React from 'react'
import type { Message, Platform } from '@/types/conversation.types'
import { TextMessage } from './text-message'
import { ImageMessage } from './image-message'
import { VideoMessage } from './video-message'
import { FileMessage } from './file-message'
import { AudioMessage } from './audio-message'
import { StickerMessage } from './sticker-message'
import { LocationMessage } from './location-message'
import { ContactMessage } from './contact-message'
import { ProductMessage } from './product-message'
import { RichMessage } from './rich-message'
import { cn } from '@/lib/utils'

interface MessageRendererProps {
  message: Message
  platform: Platform
  isOwn: boolean
  className?: string
  onRetry?: () => void
  onMediaClick?: (url: string, type: string) => void
  onProductClick?: (productId: string) => void
  onLocationClick?: (lat: number, lng: number) => void
}

/**
 * Transform message content from database format to component format
 */
function transformMessageContent(message: Message): any {
  const content = message.content || {}
  
  // Handle Facebook/Instagram attachments format
  if (content.attachments && Array.isArray(content.attachments) && content.attachments.length > 0) {
    const attachment = content.attachments[0]
    const payload = attachment.payload || {}
    
    // Check if it's a sticker (has sticker_id)
    if (payload.sticker_id && attachment.type === 'image') {
      // It's a sticker
      return {
        sticker_id: payload.sticker_id,
        sticker_url: payload.url,
        media_url: payload.url,
        text: content.text
      }
    }
    
    // Regular attachment (image, video, file, etc.)
    return {
      media_url: payload.url,
      url: payload.url,
      text: content.text,
      caption: content.text,
      file_name: payload.title,
      file_size: payload.size,
      ...payload // Include all other payload fields
    }
  }
  
  // Already in the expected format or text message
  if (content.media_url || content.url || content.text !== undefined) {
    return content
  }
  
  // Fallback
  return {
    text: typeof content === 'string' ? content : JSON.stringify(content)
  }
}

/**
 * Central message renderer that handles all message types
 */
export function MessageRenderer({
  message,
  platform,
  isOwn,
  className,
  onRetry,
  onMediaClick,
  onProductClick,
  onLocationClick
}: MessageRendererProps) {
  
  // Transform content to handle attachments format
  const transformedContent = transformMessageContent(message)
  
  // Detect actual message type from content if needed
  let messageType = message.message_type
  
  // Auto-detect sticker from Facebook attachments
  if (platform === 'facebook' || platform === 'instagram') {
    if (transformedContent.sticker_id || 
        (message.content?.attachments?.[0]?.payload?.sticker_id)) {
      messageType = 'sticker'
    }
  }
  
  // Check if platform supports this message type
  const isSupported = isPlatformSupported(platform, messageType)
  
  if (!isSupported) {
    return (
      <div className={cn(
        "px-4 py-2 rounded-2xl bg-muted/50 italic text-muted-foreground",
        className
      )}>
        Message type "{messageType}" not supported on {platform}
      </div>
    )
  }
  
  // Render based on message type
  switch (messageType) {
    case 'text':
      return (
        <TextMessage
          content={transformedContent}
          isOwn={isOwn}
          status={message.status}
          className={className}
          onRetry={onRetry}
        />
      )
      
    case 'image':
      return (
        <ImageMessage
          content={transformedContent}
          isOwn={isOwn}
          platform={platform}
          className={className}
          onClick={() => {
            const url = transformedContent.media_url || transformedContent.url
            if (url) onMediaClick?.(url, 'image')
          }}
        />
      )
      
    case 'video':
      return (
        <VideoMessage
          content={transformedContent}
          isOwn={isOwn}
          platform={platform}
          className={className}
          onClick={() => {
            const url = transformedContent.media_url || transformedContent.url
            if (url) onMediaClick?.(url, 'video')
          }}
        />
      )
      
    case 'file':
      return (
        <FileMessage
          content={transformedContent}
          isOwn={isOwn}
          className={className}
        />
      )
      
    case 'audio':
    case 'voice':
      return (
        <AudioMessage
          content={transformedContent}
          isOwn={isOwn}
          platform={platform}
          className={className}
        />
      )
      
    case 'sticker':
      return (
        <StickerMessage
          content={transformedContent}
          platform={platform}
          className={className}
        />
      )
      
    case 'location':
      return (
        <LocationMessage
          content={message.content}
          isOwn={isOwn}
          className={className}
          onClick={() => {
            if (message.content.latitude && message.content.longitude) {
              onLocationClick?.(message.content.latitude, message.content.longitude)
            }
          }}
        />
      )
      
    case 'contact':
      return (
        <ContactMessage
          content={message.content}
          isOwn={isOwn}
          platform={platform}
          className={className}
        />
      )
      
    case 'product':
      return (
        <ProductMessage
          content={message.content}
          platform={platform}
          className={className}
          onClick={() => onProductClick?.(message.content.product_id!)}
        />
      )
      
    case 'rich_message':
    case 'template':
    case 'carousel':
    case 'buttons':
    case 'flex': // LINE Flex Message
      return (
        <RichMessage
          content={message.content}
          messageType={message.message_type}
          platform={platform}
          className={className}
        />
      )
      
    default:
      // Fallback for unknown types
      return (
        <div className={cn(
          "px-4 py-2 rounded-2xl",
          isOwn ? "bg-brand-500 text-white" : "bg-muted",
          className
        )}>
          <p className="text-sm opacity-75">
            [{message.message_type}]
          </p>
          {message.content.text && (
            <p>{message.content.text}</p>
          )}
        </div>
      )
  }
}

/**
 * Check if platform supports specific message type
 */
function isPlatformSupported(platform: Platform, messageType: string): boolean {
  const supportMatrix: Record<Platform, string[]> = {
    facebook: [
      'text', 'image', 'video', 'file', 'audio', 'sticker', 
      'location', 'template', 'buttons', 'carousel', 'product'
    ],
    instagram: [
      'text', 'image', 'video', 'audio', 'sticker', 
      'product', 'rich_message'
    ],
    line: [
      'text', 'image', 'video', 'audio', 'sticker', 
      'location', 'flex', 'template', 'carousel'
    ],
    whatsapp: [
      'text', 'image', 'video', 'file', 'audio', 
      'location', 'contact', 'template', 'buttons', 'product'
    ],
    shopee: [
      'text', 'image', 'product', 'sticker'
    ],
    lazada: [
      'text', 'image', 'product'
    ],
    tiktok: [
      'text', 'image', 'video', 'product'
    ]
  }
  
  return supportMatrix[platform]?.includes(messageType) ?? false
}