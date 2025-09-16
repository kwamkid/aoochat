// src/components/messages/image-message.tsx

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Download, Expand, Eye, EyeOff } from 'lucide-react'
import type { Platform } from '@/types/conversation.types'

interface ImageMessageProps {
  content: {
    media_url?: string
    thumbnail_url?: string
    caption?: string
    text?: string
    width?: number
    height?: number
    size?: number
    is_sensitive?: boolean
  }
  isOwn: boolean
  platform: Platform
  className?: string
  onClick?: () => void
}

export function ImageMessage({
  content,
  isOwn,
  platform,
  className,
  onClick
}: ImageMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showSensitive, setShowSensitive] = useState(false)
  
  const imageUrl = content.thumbnail_url || content.media_url
  const caption = content.caption || content.text
  const isSensitive = content.is_sensitive
  
  if (!imageUrl) {
    return (
      <div className={cn(
        "px-4 py-8 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Image not available]
        </p>
      </div>
    )
  }
  
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      isOwn ? "bg-brand-500/10" : "bg-muted/50",
      className
    )}>
      {/* Image container */}
      <div className="relative group">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        
        {/* Error state */}
        {hasError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load image
            </p>
          </div>
        ) : (
          <>
            {/* Sensitive content overlay */}
            {isSensitive && !showSensitive && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSensitive(true)
                  }}
                  className="flex flex-col items-center gap-2 text-white"
                >
                  <EyeOff className="w-8 h-8" />
                  <span className="text-sm">Sensitive content</span>
                  <span className="text-xs opacity-75">Click to view</span>
                </button>
              </div>
            )}
            
            {/* Image */}
            <img
              src={imageUrl}
              alt="Image message"
              className={cn(
                "max-w-xs cursor-pointer transition-all",
                "group-hover:opacity-90",
                isLoading && "invisible"
              )}
              style={{
                maxWidth: content.width ? `${Math.min(content.width, 320)}px` : '320px',
                maxHeight: '400px',
                objectFit: 'cover'
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setHasError(true)
              }}
              onClick={onClick}
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
            
            {/* Action buttons on hover */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={(e) => {
                    e.stopPropagation()
                    onClick?.()
                }}
                className="p-2 bg-white/90 rounded-lg shadow-lg hover:bg-white transition-colors"
                title="View full size"
              >
                <Expand className="w-4 h-4" />
              </button>
              <a
                href={content.media_url}
                download
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-white/90 rounded-lg shadow-lg hover:bg-white transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
            
            {/* Platform indicator for stickers */}
            {platform === 'line' && content.media_url?.includes('stickershop.line') && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                LINE Sticker
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Caption */}
      {caption && (
        <div className={cn(
          "px-3 py-2",
          isOwn ? "text-brand-900 dark:text-brand-100" : "text-foreground"
        )}>
          <p className="text-sm">{caption}</p>
        </div>
      )}
      
      {/* Image metadata */}
      {content.size && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground">
            {formatFileSize(content.size)}
          </p>
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}