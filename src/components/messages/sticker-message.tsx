// src/components/messages/sticker-message.tsx

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Platform } from '@/types/conversation.types'

interface StickerMessageProps {
  content: {
    sticker_id?: string
    sticker_url?: string
    media_url?: string
    package_id?: string
    text?: string
  }
  platform: Platform
  className?: string
}

export function StickerMessage({
  content,
  platform,
  className
}: StickerMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  // Get sticker URL based on platform
  const getStickerUrl = () => {
    if (content.sticker_url || content.media_url) {
      return content.sticker_url || content.media_url
    }
    
    // LINE sticker URL format
    if (platform === 'line' && content.sticker_id) {
      return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${content.sticker_id}/android/sticker.png`
    }
    
    return null
  }
  
  const stickerUrl = getStickerUrl()
  
  if (!stickerUrl) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Sticker]
        </p>
      </div>
    )
  }
  
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden inline-block",
      className
    )}>
      <div className="relative">
        {/* Loading state */}
        {isLoading && (
          <div className="w-32 h-32 bg-muted animate-pulse rounded-lg" />
        )}
        
        {/* Error state */}
        {hasError ? (
          <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
            <span className="text-4xl">😊</span>
          </div>
        ) : (
          <img
            src={stickerUrl}
            alt="Sticker"
            className={cn(
              "max-w-[120px] max-h-[120px]",
              isLoading && "hidden"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          />
        )}
        
        {/* Platform badge */}
        {platform === 'line' && content.package_id && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded">
            LINE
          </div>
        )}
      </div>
    </div>
  )
}