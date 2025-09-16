// src/components/conversations/platform-avatar.tsx
"use client"

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Platform } from '@/types/conversation.types'
import { usePlatformTheme } from '@/hooks/use-platform-info'
import {
  Facebook,
  Instagram,
  MessageSquare,
  Send,
  ShoppingBag,
  Music,
  Hash,
  CheckCircle,
  User
} from 'lucide-react'

interface PlatformAvatarProps {
  platform: Platform
  pageAvatar?: string | null
  pageName?: string
  customerAvatar?: string | null
  customerName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showPlatformBadge?: boolean
  showPageInfo?: boolean
  showVerified?: boolean
  isVerified?: boolean
  className?: string
}

// Platform icon components
const PlatformIcons: Record<Platform, React.FC<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  line: MessageSquare,
  whatsapp: Send,
  shopee: ShoppingBag,
  lazada: ShoppingBag,
  tiktok: Music
}

export function PlatformAvatar({
  platform,
  pageAvatar,
  pageName,
  customerAvatar,
  customerName,
  size = 'md',
  showPlatformBadge = true,
  showPageInfo = false,
  showVerified = false,
  isVerified = false,
  className
}: PlatformAvatarProps) {
  const theme = usePlatformTheme(platform)
  const PlatformIcon = PlatformIcons[platform]
  const [imageError, setImageError] = useState(false)
  
  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-10 h-10',
      text: 'text-sm',
      badge: 'w-5 h-5',
      badgeIcon: 'w-3 h-3',
      pageInfo: 'w-6 h-6',
      verified: 'w-3 h-3'
    },
    md: {
      container: 'w-12 h-12',
      text: 'text-base',
      badge: 'w-6 h-6',
      badgeIcon: 'w-3.5 h-3.5',
      pageInfo: 'w-8 h-8',
      verified: 'w-4 h-4'
    },
    lg: {
      container: 'w-16 h-16',
      text: 'text-lg',
      badge: 'w-7 h-7',
      badgeIcon: 'w-4 h-4',
      pageInfo: 'w-10 h-10',
      verified: 'w-5 h-5'
    },
    xl: {
      container: 'w-20 h-20',
      text: 'text-xl',
      badge: 'w-8 h-8',
      badgeIcon: 'w-5 h-5',
      pageInfo: 'w-12 h-12',
      verified: 'w-6 h-6'
    }
  }
  
  const config = sizeConfig[size]
  
  // Get display avatar and name
  const displayAvatar = customerAvatar || pageAvatar
  const displayName = customerName || pageName || 'Unknown'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  
  return (
    <div className={cn('relative inline-block', className)}>
      {/* Main Avatar */}
      <div className={cn(
        'rounded-full overflow-hidden flex items-center justify-center',
        config.container,
        !displayAvatar && cn(
          'bg-gradient-to-br',
          theme.gradient
        )
      )}>
        {displayAvatar && !imageError ? (
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={cn('text-white font-medium', config.text)}>
            {initials}
          </span>
        )}
      </div>
      
      {/* Platform Badge */}
      {showPlatformBadge && (
        <div className={cn(
          'absolute -bottom-1 -right-1 rounded-full flex items-center justify-center text-white shadow-sm',
          config.badge,
          theme.bgColor
        )}>
          <PlatformIcon className={config.badgeIcon} />
        </div>
      )}
      
      {/* Page Info Badge (Top Left) */}
      {showPageInfo && pageAvatar && (
        <div className={cn(
          'absolute -top-1 -left-1 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm',
          config.pageInfo
        )}>
          <img
            src={pageAvatar}
            alt={pageName || 'Page'}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Verified Badge */}
      {showVerified && isVerified && (
        <div className="absolute -top-0.5 -right-0.5">
          <div className="relative">
            <CheckCircle className={cn(
              'text-blue-500 fill-white',
              config.verified
            )} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Conversation Avatar - Shows both page and customer
 */
export function ConversationAvatar({
  platform,
  pageAvatar,
  pageName,
  customerAvatar,
  customerName,
  isVerified,
  size = 'md',
  className
}: {
  platform: Platform
  pageAvatar?: string | null
  pageName?: string
  customerAvatar?: string | null
  customerName?: string
  isVerified?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const theme = usePlatformTheme(platform)
  const PlatformIcon = PlatformIcons[platform]
  
  const sizeConfig = {
    sm: {
      container: 'w-10 h-10',
      page: 'w-6 h-6 -top-1 -left-1',
      platform: 'w-5 h-5 -bottom-1 -right-1',
      text: 'text-xs'
    },
    md: {
      container: 'w-12 h-12',
      page: 'w-7 h-7 -top-1 -left-1',
      platform: 'w-6 h-6 -bottom-1 -right-1',
      text: 'text-sm'
    },
    lg: {
      container: 'w-16 h-16',
      page: 'w-9 h-9 -top-1.5 -left-1.5',
      platform: 'w-7 h-7 -bottom-1.5 -right-1.5',
      text: 'text-base'
    }
  }
  
  const config = sizeConfig[size]
  const [customerImageError, setCustomerImageError] = useState(false)
  const [pageImageError, setPageImageError] = useState(false)
  
  const initials = (customerName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  
  return (
    <div className={cn('relative inline-block', className)}>
      {/* Customer Avatar (Main) */}
      <div className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600',
        config.container
      )}>
        {customerAvatar && !customerImageError ? (
          <img
            src={customerAvatar}
            alt={customerName || 'Customer'}
            className="w-full h-full object-cover"
            onError={() => setCustomerImageError(true)}
          />
        ) : (
          <span className={cn('text-white font-medium', config.text)}>
            {initials}
          </span>
        )}
      </div>
      
      {/* Page Avatar (Top Left) */}
      {pageAvatar && (
        <div className={cn(
          'absolute rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-md',
          config.page
        )}>
          {!pageImageError ? (
            <img
              src={pageAvatar}
              alt={pageName || 'Page'}
              className="w-full h-full object-cover"
              onError={() => setPageImageError(true)}
            />
          ) : (
            <div className={cn(
              'w-full h-full flex items-center justify-center text-white',
              theme.bgColor
            )}>
              <PlatformIcon className="w-3/5 h-3/5" />
            </div>
          )}
        </div>
      )}
      
      {/* Platform Badge (Bottom Right) */}
      <div className={cn(
        'absolute rounded-full flex items-center justify-center text-white shadow-md',
        config.platform,
        theme.bgColor
      )}>
        <PlatformIcon className="w-3/5 h-3/5" />
      </div>
      
      {/* Verified Badge */}
      {isVerified && (
        <div className="absolute top-0 right-0">
          <CheckCircle className="w-4 h-4 text-blue-500 fill-white" />
        </div>
      )}
    </div>
  )
}