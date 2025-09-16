// src/components/messages/text-message.tsx

import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface TextMessageProps {
  content: {
    text?: string
    formatting?: {
      bold?: boolean
      italic?: boolean
      underline?: boolean
    }
  }
  isOwn: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  className?: string
  onRetry?: () => void
}

export function TextMessage({
  content,
  isOwn,
  status,
  className,
  onRetry
}: TextMessageProps) {
  const isFailed = status === 'failed'
  
  return (
    <div className={cn(
      "px-4 py-2 rounded-2xl relative",
      isOwn 
        ? isFailed 
          ? "bg-red-500/20 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700"
          : "bg-brand-500 text-white" 
        : "bg-muted",
      status === 'sending' && "opacity-70",
      className
    )}>
      {/* Text content with formatting */}
      <p className={cn(
        "whitespace-pre-wrap break-words",
        content.formatting?.bold && "font-bold",
        content.formatting?.italic && "italic",
        content.formatting?.underline && "underline"
      )}>
        {content.text}
      </p>
      
      {/* Failed status indicator */}
      {isFailed && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-xs text-red-500">Failed to send</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-red-500 underline hover:text-red-600 ml-1"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}