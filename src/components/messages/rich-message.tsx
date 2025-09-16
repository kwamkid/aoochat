// src/components/messages/rich-message.tsx

import React from 'react'
import { cn } from '@/lib/utils'
import { Layout, ChevronRight, ExternalLink } from 'lucide-react'
import type { Platform } from '@/types/conversation.types'

interface RichMessageProps {
  content: any
  messageType: string
  platform: Platform
  className?: string
}

export function RichMessage({
  content,
  messageType,
  platform,
  className
}: RichMessageProps) {
  // For now, show a placeholder for rich messages
  // This will be enhanced in Phase 2
  
  // Handle carousel
  if (messageType === 'carousel' && content.carousel) {
    return (
      <div className={cn(
        "rounded-2xl overflow-hidden",
        className
      )}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide p-2">
          {content.carousel.map((item: any, index: number) => (
            <div 
              key={index}
              className="min-w-[200px] bg-white dark:bg-gray-800 border rounded-lg overflow-hidden"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-3">
                <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.subtitle}
                  </p>
                )}
                {item.buttons && (
                  <div className="space-y-1">
                    {item.buttons.map((btn: any, btnIndex: number) => (
                      <button
                        key={btnIndex}
                        className="w-full text-xs px-2 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
                      >
                        {btn.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Handle button template
  if (messageType === 'buttons' && content.buttons) {
    return (
      <div className={cn(
        "rounded-2xl bg-white dark:bg-gray-800 border p-4",
        className
      )}>
        {content.text && (
          <p className="mb-3">{content.text}</p>
        )}
        <div className="space-y-2">
          {content.buttons.map((button: any, index: number) => (
            <button
              key={index}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <span className="text-sm">{button.title}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    )
  }
  
  // Handle quick replies
  if (content.quick_replies) {
    return (
      <div className={cn(
        "rounded-2xl",
        className
      )}>
        {content.text && (
          <div className="px-4 py-2 bg-muted rounded-2xl mb-2">
            <p>{content.text}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {content.quick_replies.map((reply: any, index: number) => (
            <button
              key={index}
              className="px-3 py-1.5 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-full text-sm hover:bg-brand-100 dark:hover:bg-brand-950/50 transition-colors"
            >
              {reply.image_url && (
                <img
                  src={reply.image_url}
                  alt=""
                  className="inline-block w-4 h-4 mr-1"
                />
              )}
              {reply.title}
            </button>
          ))}
        </div>
      </div>
    )
  }
  
  // Default rich message placeholder
  return (
    <div className={cn(
      "px-4 py-3 rounded-2xl bg-muted/50",
      className
    )}>
      <div className="flex items-center gap-2">
        <Layout className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          [{messageType === 'flex' ? 'LINE Flex Message' : 
            messageType === 'template' ? 'Template Message' :
            'Rich Message'}]
        </span>
      </div>
      {content.text && (
        <p className="mt-2 text-sm">{content.text}</p>
      )}
    </div>
  )
}