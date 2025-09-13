// src/services/platforms/platform-service.interface.ts

import type { Platform, Message, Conversation } from '@/types/conversation.types'

/**
 * Platform-specific message options
 */
export interface SendMessageOptions {
  conversationId: string
  message: any
  messageType?: string
  options?: Record<string, any>
}

/**
 * Platform user profile
 */
export interface PlatformProfile {
  id: string
  name: string
  firstName?: string
  lastName?: string
  profilePic?: string
  email?: string
  phone?: string
  locale?: string
  timezone?: string | number
  gender?: string
  platform: Platform
  raw?: any
}

/**
 * Platform service interface that all platforms must implement
 */
export interface IPlatformService {
  platform: Platform
  
  // Message operations
  sendMessage(options: SendMessageOptions): Promise<any>
  sendTextMessage(conversationId: string, text: string): Promise<any>
  sendImageMessage(conversationId: string, imageUrl: string, caption?: string): Promise<any>
  sendFileMessage(conversationId: string, fileUrl: string, filename?: string): Promise<any>
  
  // Profile operations
  getProfile(userId: string): Promise<PlatformProfile | null>
  syncProfile(customerId: string): Promise<PlatformProfile | null>
  
  // Media operations
  uploadMedia?(file: any, mimeType: string): Promise<string>
  getMediaUrl?(mediaId: string): Promise<string>
  
  // Status operations
  sendTypingIndicator?(conversationId: string, isTyping: boolean): Promise<void>
  markAsRead?(messageId: string): Promise<void>
  
  // Platform-specific features
  sendQuickReplies?(conversationId: string, text: string, options: any[]): Promise<any>
  sendButtons?(conversationId: string, text: string, buttons: any[]): Promise<any>
  sendCarousel?(conversationId: string, items: any[]): Promise<any>
}

/**
 * Platform service factory
 */
export class PlatformServiceFactory {
  private static services: Map<Platform, IPlatformService> = new Map()
  
  /**
   * Register a platform service
   */
  static register(platform: Platform, service: IPlatformService) {
    this.services.set(platform, service)
  }
  
  /**
   * Get service for a platform
   */
  static getService(platform: Platform): IPlatformService | null {
    return this.services.get(platform) || null
  }
  
  /**
   * Check if platform is supported
   */
  static isSupported(platform: Platform): boolean {
    return this.services.has(platform)
  }
  
  /**
   * Get all registered platforms
   */
  static getRegisteredPlatforms(): Platform[] {
    return Array.from(this.services.keys())
  }
}