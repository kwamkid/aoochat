// src/components/messages/video-message.tsx

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Play, Download, Expand } from 'lucide-react'
import type { Platform } from '@/types/conversation.types'

interface VideoMessageProps {
  content: {
    media_url?: string
    thumbnail_url?: string
    caption?: string
    text?: string
    duration?: number
    size?: number
  }
  isOwn: boolean
  platform: Platform
  className?: string
  onClick?: () => void
}

export function VideoMessage({
  content,
  isOwn,
  platform,
  className,
  onClick
}: VideoMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const videoUrl = content.media_url
  const thumbnailUrl = content.thumbnail_url || content.media_url
  const caption = content.caption || content.text
  
  if (!videoUrl) {
    return (
      <div className={cn(
        "px-4 py-8 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Video not available]
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
      {/* Video container */}
      <div className="relative group">
        {hasError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load video
            </p>
          </div>
        ) : (
          <>
            {!isPlaying && thumbnailUrl ? (
              // Thumbnail with play button
              <div className="relative">
                <img
                  src={thumbnailUrl}
                  alt="Video thumbnail"
                  className="max-w-xs cursor-pointer"
                  style={{
                    maxWidth: '320px',
                    maxHeight: '400px',
                    objectFit: 'cover'
                  }}
                  onError={() => setHasError(true)}
                />
                
                {/* Play button overlay */}
                <button
                  onClick={() => {
                    setIsPlaying(true)
                    onClick?.()
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-gray-900 ml-1" />
                  </div>
                </button>
                
                {/* Duration badge */}
                {content.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {formatDuration(content.duration)}
                  </div>
                )}
              </div>
            ) : (
              // Video player
              <video
                src={videoUrl}
                controls
                autoPlay={isPlaying}
                className="max-w-xs"
                style={{
                  maxWidth: '320px',
                  maxHeight: '400px'
                }}
                onLoadedData={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setHasError(true)
                }}
              />
            )}
            
            {/* Action buttons on hover */}
            {!isPlaying && (
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
                  href={videoUrl}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-white/90 rounded-lg shadow-lg hover:bg-white transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
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
      
      {/* Video metadata */}
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}