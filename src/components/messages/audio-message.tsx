// src/components/messages/audio-message.tsx

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Download, Volume2, Mic } from 'lucide-react'
import type { Platform } from '@/types/conversation.types'

interface AudioMessageProps {
  content: {
    media_url?: string
    audio_url?: string
    duration?: number
    caption?: string
    text?: string
  }
  isOwn: boolean
  platform: Platform
  className?: string
}

export function AudioMessage({
  content,
  isOwn,
  platform,
  className
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(content.duration || 0)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const audioUrl = content.audio_url || content.media_url
  const caption = content.caption || content.text
  
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])
  
  if (!audioUrl) {
    return (
      <div className={cn(
        "px-4 py-3 rounded-2xl bg-muted/50",
        className
      )}>
        <p className="text-sm text-muted-foreground">
          [Audio not available]
        </p>
      </div>
    )
  }
  
  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }
  
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      isOwn ? "bg-brand-500/10" : "bg-muted/50",
      className
    )}>
      <div className="flex items-center gap-3 p-3">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            isOwn ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-muted hover:bg-muted/80"
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>
        
        {/* Waveform/Progress */}
        <div className="flex-1">
          {/* Audio type indicator */}
          <div className="flex items-center gap-1 mb-1">
            {platform === 'whatsapp' ? (
              <Mic className="w-3 h-3 text-muted-foreground" />
            ) : (
              <Volume2 className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {platform === 'whatsapp' ? 'Voice message' : 'Audio'}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="relative h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute left-0 top-0 h-full transition-all",
                isOwn ? "bg-brand-500" : "bg-foreground/50"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Time */}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
        </div>
        
        {/* Download button */}
        <a
          href={audioUrl}
          download
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
      
      {/* Caption */}
      {caption && (
        <div className={cn(
          "px-3 pb-2 -mt-1",
          isOwn ? "text-brand-900 dark:text-brand-100" : "text-foreground"
        )}>
          <p className="text-sm">{caption}</p>
        </div>
      )}
      
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  )
}