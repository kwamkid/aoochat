// src/hooks/use-platform-info.ts

import { useState, useEffect } from 'react'
import { Platform } from '@/types/conversation.types'
import { 
  platformServiceManager, 
  PlatformInfo, 
  CustomerPlatformInfo 
} from '@/services/platforms/platform-service-manager'

interface UsePlatformInfoOptions {
  platform: Platform
  pageId?: string | null
  customerId?: string | null
  enabled?: boolean
}

export function usePlatformInfo({
  platform,
  pageId,
  customerId,
  enabled = true
}: UsePlatformInfoOptions) {
  const [pageInfo, setPageInfo] = useState<PlatformInfo | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerPlatformInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch page info
  useEffect(() => {
    if (!enabled || !pageId) return
    
    const fetchPageInfo = async () => {
      try {
        setLoading(true)
        const info = await platformServiceManager.getPageInfo(platform, pageId)
        setPageInfo(info)
      } catch (err) {
        console.error('Error fetching page info:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch page info')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPageInfo()
  }, [platform, pageId, enabled])
  
  // Fetch customer info
  useEffect(() => {
    if (!enabled || !customerId) return
    
    const fetchCustomerInfo = async () => {
      try {
        const info = await platformServiceManager.getCustomerInfo(platform, customerId)
        setCustomerInfo(info)
      } catch (err) {
        console.error('Error fetching customer info:', err)
      }
    }
    
    fetchCustomerInfo()
  }, [platform, customerId, enabled])
  
  return {
    pageInfo,
    customerInfo,
    loading,
    error,
    refresh: async () => {
      if (pageId) {
        const info = await platformServiceManager.getPageInfo(platform, pageId)
        setPageInfo(info)
      }
      if (customerId) {
        const info = await platformServiceManager.getCustomerInfo(platform, customerId)
        setCustomerInfo(info)
      }
    }
  }
}

/**
 * Get platform colors and styles
 */
export function usePlatformTheme(platform: Platform) {
  const themes = {
    facebook: {
      primary: '#1877F2',
      secondary: '#42B883',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-500',
      hoverBg: 'hover:bg-blue-50',
      darkBg: 'dark:bg-blue-950/20',
      darkText: 'dark:text-blue-400',
      icon: '📘'
    },
    instagram: {
      primary: '#E4405F',
      secondary: '#FCAF45',
      gradient: 'from-purple-500 via-pink-500 to-orange-400',
      bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500',
      textColor: 'text-pink-600',
      borderColor: 'border-pink-500',
      hoverBg: 'hover:bg-pink-50',
      darkBg: 'dark:bg-pink-950/20',
      darkText: 'dark:text-pink-400',
      icon: '📷'
    },
    line: {
      primary: '#00C300',
      secondary: '#4CAF50',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500',
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      hoverBg: 'hover:bg-green-50',
      darkBg: 'dark:bg-green-950/20',
      darkText: 'dark:text-green-400',
      icon: '💬'
    },
    whatsapp: {
      primary: '#25D366',
      secondary: '#128C7E',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-600',
      textColor: 'text-green-600',
      borderColor: 'border-green-600',
      hoverBg: 'hover:bg-green-50',
      darkBg: 'dark:bg-green-950/20',
      darkText: 'dark:text-green-400',
      icon: '💚'
    },
    shopee: {
      primary: '#EE4D2D',
      secondary: '#FF6633',
      gradient: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-500',
      hoverBg: 'hover:bg-orange-50',
      darkBg: 'dark:bg-orange-950/20',
      darkText: 'dark:text-orange-400',
      icon: '🛍️'
    },
    lazada: {
      primary: '#0F146D',
      secondary: '#F57224',
      gradient: 'from-blue-600 to-orange-500',
      bgColor: 'bg-blue-600',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-600',
      hoverBg: 'hover:bg-blue-50',
      darkBg: 'dark:bg-blue-950/20',
      darkText: 'dark:text-blue-400',
      icon: '🛒'
    },
    tiktok: {
      primary: '#000000',
      secondary: '#FF0050',
      gradient: 'from-black to-pink-600',
      bgColor: 'bg-black',
      textColor: 'text-black',
      borderColor: 'border-black',
      hoverBg: 'hover:bg-gray-50',
      darkBg: 'dark:bg-gray-950/20',
      darkText: 'dark:text-gray-400',
      icon: '🎵'
    }
  }
  
  return themes[platform] || themes.facebook
}