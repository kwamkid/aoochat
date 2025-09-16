// src/services/platforms/platform-service-manager.ts

import { Platform } from '@/types/conversation.types'
import { createClient } from '@/lib/supabase/client'

export interface PlatformInfo {
  platform: Platform
  pageId?: string
  pageName?: string
  pageAvatar?: string
  pageCategory?: string
  pageFollowers?: number
  pageVerified?: boolean
}

export interface CustomerPlatformInfo {
  userId: string
  name: string
  firstName?: string
  lastName?: string
  profilePic?: string
  locale?: string
  timezone?: number
  gender?: string
}

/**
 * Base class for platform-specific services
 */
export abstract class BasePlatformService {
  protected supabase = createClient()
  
  abstract platform: Platform
  abstract getPageInfo(pageId: string): Promise<PlatformInfo | null>
  abstract getCustomerInfo(customerId: string): Promise<CustomerPlatformInfo | null>
  abstract getPageAccessToken(pageId: string): Promise<string | null>
  
  /**
   * Get platform account from database
   */
  async getPlatformAccount(accountId: string) {
    const { data, error } = await this.supabase
      .from('platform_accounts')
      .select('*')
      .eq('platform', this.platform)
      .eq('account_id', accountId)
      .single()
    
    if (error) {
      console.error(`Error fetching ${this.platform} account:`, error)
      return null
    }
    
    return data
  }
  
  /**
   * Update platform account info
   */
  async updatePlatformAccount(accountId: string, updates: any) {
    const { error } = await this.supabase
      .from('platform_accounts')
      .update(updates)
      .eq('platform', this.platform)
      .eq('account_id', accountId)
    
    if (error) {
      console.error(`Error updating ${this.platform} account:`, error)
      return false
    }
    
    return true
  }
}

/**
 * Facebook Platform Service
 */
export class FacebookPlatformService extends BasePlatformService {
  platform: Platform = 'facebook'
  private apiVersion = 'v18.0'
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`
  
  async getPageInfo(pageId: string): Promise<PlatformInfo | null> {
    try {
      // First check database
      const account = await this.getPlatformAccount(pageId)
      
      if (account?.metadata?.pageInfo) {
        return {
          platform: 'facebook',
          pageId,
          pageName: account.metadata.pageInfo.name,
          pageAvatar: account.metadata.pageInfo.picture || null,
          pageCategory: account.metadata.pageInfo.category || null,
          pageFollowers: account.metadata.pageInfo.followers || null,
          pageVerified: account.metadata.pageInfo.verified || false
        }
      }
      
      // If not in database, fetch from API
      const accessToken = account?.access_token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      if (!accessToken) return null
      
      const response = await fetch(
        `${this.baseUrl}/${pageId}?fields=id,name,picture,category,followers_count,verification_status&access_token=${accessToken}`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      const pageInfo: PlatformInfo = {
        platform: 'facebook',
        pageId: data.id,
        pageName: data.name,
        pageAvatar: data.picture?.data?.url,
        pageCategory: data.category,
        pageFollowers: data.followers_count,
        pageVerified: data.verification_status === 'verified'
      }
      
      // Cache in database
      if (account) {
        await this.updatePlatformAccount(pageId, {
          metadata: {
            ...account.metadata,
            pageInfo: {
              name: data.name,
              picture: data.picture?.data?.url,
              category: data.category,
              followers: data.followers_count,
              verified: data.verification_status === 'verified'
            }
          }
        })
      }
      
      return pageInfo
    } catch (error) {
      console.error('Error fetching Facebook page info:', error)
      return null
    }
  }
  
  async getCustomerInfo(customerId: string): Promise<CustomerPlatformInfo | null> {
    try {
      // Get any page token to fetch user info
      const { data: accounts } = await this.supabase
        .from('platform_accounts')
        .select('access_token')
        .eq('platform', 'facebook')
        .limit(1)
      
      const accessToken = accounts?.[0]?.access_token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      if (!accessToken) return null
      
      const response = await fetch(
        `${this.baseUrl}/${customerId}?fields=id,name,first_name,last_name,profile_pic,locale,timezone,gender&access_token=${accessToken}`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      return {
        userId: data.id,
        name: data.name,
        firstName: data.first_name,
        lastName: data.last_name,
        profilePic: data.profile_pic,
        locale: data.locale,
        timezone: data.timezone,
        gender: data.gender
      }
    } catch (error) {
      console.error('Error fetching Facebook customer info:', error)
      return null
    }
  }
  
  async getPageAccessToken(pageId: string): Promise<string | null> {
    const account = await this.getPlatformAccount(pageId)
    return account?.access_token || null
  }
}

/**
 * Instagram Platform Service
 */
export class InstagramPlatformService extends BasePlatformService {
  platform: Platform = 'instagram'
  private apiVersion = 'v18.0'
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`
  
  async getPageInfo(pageId: string): Promise<PlatformInfo | null> {
    try {
      const account = await this.getPlatformAccount(pageId)
      
      if (account?.metadata?.pageInfo) {
        return {
          platform: 'instagram',
          pageId,
          pageName: account.metadata.pageInfo.username,
          pageAvatar: account.metadata.pageInfo.profile_picture_url,
          pageFollowers: account.metadata.pageInfo.followers_count,
          pageVerified: account.metadata.pageInfo.is_verified
        }
      }
      
      const accessToken = account?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN
      if (!accessToken) return null
      
      const response = await fetch(
        `${this.baseUrl}/${pageId}?fields=id,username,profile_picture_url,followers_count,is_verified&access_token=${accessToken}`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      return {
        platform: 'instagram',
        pageId: data.id,
        pageName: data.username,
        pageAvatar: data.profile_picture_url,
        pageFollowers: data.followers_count,
        pageVerified: data.is_verified
      }
    } catch (error) {
      console.error('Error fetching Instagram account info:', error)
      return null
    }
  }
  
  async getCustomerInfo(customerId: string): Promise<CustomerPlatformInfo | null> {
    // Instagram user profiles are more limited
    try {
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
      if (!accessToken) return null
      
      const response = await fetch(
        `${this.baseUrl}/${customerId}?fields=id,username,profile_picture_url&access_token=${accessToken}`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      return {
        userId: data.id,
        name: data.username,
        profilePic: data.profile_picture_url
      }
    } catch (error) {
      console.error('Error fetching Instagram customer info:', error)
      return null
    }
  }
  
  async getPageAccessToken(pageId: string): Promise<string | null> {
    const account = await this.getPlatformAccount(pageId)
    return account?.access_token || null
  }
}

/**
 * LINE Platform Service
 */
export class LinePlatformService extends BasePlatformService {
  platform: Platform = 'line'
  private baseUrl = 'https://api.line.me/v2'
  
  async getPageInfo(pageId: string): Promise<PlatformInfo | null> {
    try {
      const account = await this.getPlatformAccount(pageId)
      
      return {
        platform: 'line',
        pageId,
        pageName: account?.account_name || 'LINE Official Account',
        pageAvatar: account?.account_avatar || '/images/platforms/line-logo.png'
      }
    } catch (error) {
      console.error('Error fetching LINE account info:', error)
      return null
    }
  }
  
  async getCustomerInfo(customerId: string): Promise<CustomerPlatformInfo | null> {
    try {
      const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
      if (!channelToken) return null
      
      const response = await fetch(
        `${this.baseUrl}/bot/profile/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${channelToken}`
          }
        }
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      return {
        userId: customerId,
        name: data.displayName,
        profilePic: data.pictureUrl
      }
    } catch (error) {
      console.error('Error fetching LINE customer info:', error)
      return null
    }
  }
  
  async getPageAccessToken(pageId: string): Promise<string | null> {
    const account = await this.getPlatformAccount(pageId)
    return account?.access_token || null
  }
}

/**
 * WhatsApp Platform Service
 */
export class WhatsAppPlatformService extends BasePlatformService {
  platform: Platform = 'whatsapp'
  private apiVersion = 'v18.0'
  private baseUrl = `https://graph.facebook.com/${this.apiVersion}`
  
  async getPageInfo(pageId: string): Promise<PlatformInfo | null> {
    try {
      const account = await this.getPlatformAccount(pageId)
      
      return {
        platform: 'whatsapp',
        pageId,
        pageName: account?.account_name || 'WhatsApp Business',
        pageAvatar: account?.account_avatar || '/images/platforms/whatsapp-logo.png'
      }
    } catch (error) {
      console.error('Error fetching WhatsApp account info:', error)
      return null
    }
  }
  
  async getCustomerInfo(customerId: string): Promise<CustomerPlatformInfo | null> {
    // WhatsApp doesn't provide user profile info by default
    // Return basic info with phone number
    return {
      userId: customerId,
      name: customerId, // Usually phone number
      profilePic: '/images/default-avatar.png'
    }
  }
  
  async getPageAccessToken(pageId: string): Promise<string | null> {
    const account = await this.getPlatformAccount(pageId)
    return account?.access_token || null
  }
}

/**
 * Platform Service Manager
 * Factory for creating platform-specific services
 */
export class PlatformServiceManager {
  private static instance: PlatformServiceManager
  private services: Map<Platform, BasePlatformService> = new Map()
  
  private constructor() {
    // Register all platform services
    this.registerService(new FacebookPlatformService())
    this.registerService(new InstagramPlatformService())
    this.registerService(new LinePlatformService())
    this.registerService(new WhatsAppPlatformService())
  }
  
  static getInstance(): PlatformServiceManager {
    if (!PlatformServiceManager.instance) {
      PlatformServiceManager.instance = new PlatformServiceManager()
    }
    return PlatformServiceManager.instance
  }
  
  private registerService(service: BasePlatformService) {
    this.services.set(service.platform, service)
  }
  
  getService(platform: Platform): BasePlatformService | null {
    return this.services.get(platform) || null
  }
  
  async getPageInfo(platform: Platform, pageId: string): Promise<PlatformInfo | null> {
    const service = this.getService(platform)
    if (!service) return null
    return service.getPageInfo(pageId)
  }
  
  async getCustomerInfo(platform: Platform, customerId: string): Promise<CustomerPlatformInfo | null> {
    const service = this.getService(platform)
    if (!service) return null
    return service.getCustomerInfo(customerId)
  }
}

// Export singleton instance
export const platformServiceManager = PlatformServiceManager.getInstance()