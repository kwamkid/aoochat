// src/services/webhook/webhook-handler.ts
// Version ที่แก้ปัญหา organization_id และ customer_id

import { createClient } from '@/lib/supabase/server'
import { FacebookMessageProcessor } from './processors/facebook-processor'
import type { Platform, MessageType } from '@/types/conversation.types'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

interface WebhookVerifyParams {
  'hub.mode'?: string | null
  'hub.verify_token'?: string | null
  'hub.challenge'?: string | null
  [key: string]: string | null | undefined
}

interface WebhookHeaders {
  'x-hub-signature'?: string
  'x-hub-signature-256'?: string
  'x-line-signature'?: string
  [key: string]: string | undefined
}

export class WebhookHandler {
  
  /**
   * Verify webhook challenge (for initial setup)
   */
  async verifyChallenge(
    platform: Platform,
    params: WebhookVerifyParams,
    headers?: WebhookHeaders
  ): Promise<string | null> {
    console.log(`[WebhookHandler] Verifying ${platform} webhook challenge`)
    
    switch (platform) {
      case 'facebook':
      case 'instagram':
        return this.verifyFacebookChallenge(params)
      case 'line':
        // LINE doesn't use challenge verification
        return null
      case 'whatsapp':
        return this.verifyWhatsAppChallenge(params)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Verify Facebook/Instagram webhook challenge
   */
  private verifyFacebookChallenge(params: WebhookVerifyParams): string | null {
    const mode = params['hub.mode']
    const token = params['hub.verify_token']
    const challenge = params['hub.challenge']
    
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'aoochat_verify_token_2024'
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WebhookHandler] Facebook webhook verified successfully')
      return challenge || ''
    }
    
    console.error('[WebhookHandler] Facebook webhook verification failed')
    return null
  }

  /**
   * Verify WhatsApp webhook challenge
   */
  private verifyWhatsAppChallenge(params: WebhookVerifyParams): string | null {
    const mode = params['hub.mode']
    const token = params['hub.verify_token']
    const challenge = params['hub.challenge']
    
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'aoochat_whatsapp_2024'
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WebhookHandler] WhatsApp webhook verified successfully')
      return challenge || ''
    }
    
    console.error('[WebhookHandler] WhatsApp webhook verification failed')
    return null
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    platform: Platform,
    payload: string,
    signature?: string
  ): boolean {
    if (!signature) return false
    
    switch (platform) {
      case 'facebook':
      case 'instagram':
        return this.verifyFacebookSignature(payload, signature)
      case 'line':
        return this.verifyLineSignature(payload, signature)
      case 'whatsapp':
        return this.verifyWhatsAppSignature(payload, signature)
      default:
        return false
    }
  }

  /**
   * Verify Facebook signature
   */
  private verifyFacebookSignature(payload: string, signature: string): boolean {
    const APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha256', APP_SECRET)
      .update(payload)
      .digest('hex')
    
    return signature === `sha256=${expectedSignature}`
  }

  /**
   * Verify LINE signature
   */
  private verifyLineSignature(payload: string, signature: string): boolean {
    const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha256', CHANNEL_SECRET)
      .update(payload)
      .digest('base64')
    
    return signature === expectedSignature
  }

  /**
   * Verify WhatsApp signature
   */
  private verifyWhatsAppSignature(payload: string, signature: string): boolean {
    const APP_SECRET = process.env.WHATSAPP_APP_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha256', APP_SECRET)
      .update(payload)
      .digest('hex')
    
    return signature === `sha256=${expectedSignature}`
  }

  /**
   * Process webhook based on platform
   */
  async processWebhook(
    platform: Platform, 
    payload: any, 
    supabaseClient?: SupabaseClient
  ) {
    console.log(`[WebhookHandler] Processing ${platform} webhook`)
    
    // Create supabase client if not provided
    const supabase = supabaseClient || await createClient()
    
    switch (platform) {
      case 'facebook':
      case 'instagram':
        return this.processFacebookWebhook(payload, supabase)
      case 'line':
        return this.processLineWebhook(payload, supabase)
      case 'whatsapp':
        return this.processWhatsAppWebhook(payload, supabase)
      case 'shopee':
        return this.processShopeeWebhook(payload, supabase)
      case 'lazada':
        return this.processLazadaWebhook(payload, supabase)
      case 'tiktok':
        return this.processTikTokWebhook(payload, supabase)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Process Facebook/Instagram webhook
   */
  private async processFacebookWebhook(payload: any, supabase: SupabaseClient) {
    const results = []
    
    for (const entry of payload.entry || []) {
      // Handle messaging events
      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          const result = await this.processFacebookMessaging(messaging, supabase)
          if (result) results.push(result)
        }
      }
      
      // Handle Instagram mentions/comments (future)
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments' || change.field === 'mentions') {
            console.log('[WebhookHandler] Instagram activity:', change)
          }
        }
      }
    }
    
    return results
  }

  /**
   * Process single Facebook messaging event
   */
  private async processFacebookMessaging(messaging: any, supabase: SupabaseClient) {
    const senderId = messaging.sender?.id
    const recipientId = messaging.recipient?.id // This is the Facebook Page ID

    console.log('[WebhookHandler] Processing Facebook message:', {
      senderId,
      recipientId,
      hasMessage: !!messaging.message,
      isEcho: messaging.message?.is_echo
    })
    
    // Handle incoming message (not echo)
    if (messaging.message && !messaging.message.is_echo) {
      // Process message to detect type
      const processed = FacebookMessageProcessor.processMessage(messaging.message)
      
      console.log(`[WebhookHandler] Message processed:`, {
        type: processed.messageType,
        platformMessageId: processed.platformMessageId
      })
      
      // Get organization ID first using the Facebook Page ID
      const organizationId = await this.getOrganizationId('facebook', supabase, recipientId)
      console.log('[WebhookHandler] Organization ID:', organizationId)
      
      // Get or create customer with organization ID
      const customer = await this.getOrCreateCustomer(
        'facebook', 
        senderId, 
        supabase, 
        organizationId,
        recipientId
      )
      console.log('[WebhookHandler] Customer:', { id: customer.id, name: customer.name })
      
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        'facebook',
        customer.id,
        recipientId,
        senderId,
        supabase,
        organizationId
      )
      console.log('[WebhookHandler] Conversation:', { id: conversation.id })
      
      // Save message
      const message = await this.saveMessage({
        conversation_id: conversation.id,
        platform_message_id: processed.platformMessageId,
        message_type: processed.messageType,
        content: processed.content,
        sender_type: 'customer',
        sender_id: senderId,
        sender_name: customer.name || `Customer ${senderId}`,
        status: 'delivered'
      }, supabase)
      
      // Update conversation
      await this.updateConversationLastMessage(conversation.id, message, supabase)
      
      return {
        type: 'message',
        conversationId: conversation.id,
        messageId: message.id,
        messageType: processed.messageType
      }
    }
    
    // Handle echo (our sent message)
    if (messaging.message?.is_echo) {
      console.log('[WebhookHandler] Echo message:', messaging.message.mid)
      await this.updateMessageStatus([messaging.message.mid], 'sent', supabase)
    }
    
    // Handle postback (button clicks)
    if (messaging.postback) {
      const processed = FacebookMessageProcessor.processPostback(messaging.postback)
      console.log('[WebhookHandler] Postback:', processed)
      
      const organizationId = await this.getOrganizationId('facebook', supabase, recipientId)
      const customer = await this.getOrCreateCustomer('facebook', senderId, supabase, organizationId, recipientId)
      const conversation = await this.getOrCreateConversation(
        'facebook',
        customer.id,
        recipientId,
        senderId,
        supabase,
        organizationId
      )
      
      const message = await this.saveMessage({
        conversation_id: conversation.id,
        message_type: 'text',
        content: {
          text: `Clicked: ${processed.title}`,
          postback: processed.payload
        },
        sender_type: 'customer',
        sender_id: senderId,
        sender_name: customer.name || `Customer ${senderId}`,
        status: 'delivered'
      }, supabase)
      
      return {
        type: 'postback',
        conversationId: conversation.id,
        messageId: message.id
      }
    }
    
    // Handle delivery confirmation
    if (messaging.delivery) {
      const processed = FacebookMessageProcessor.processDelivery(messaging.delivery)
      console.log('[WebhookHandler] Delivery:', processed)
      await this.updateMessageStatus(processed.messageIds, 'delivered', supabase)
    }
    
    // Handle read confirmation
    if (messaging.read) {
      const processed = FacebookMessageProcessor.processRead(messaging.read)
      console.log('[WebhookHandler] Read:', processed)
      await this.markMessagesAsRead(senderId, processed.watermark, supabase)
    }
    
    return null
  }

  /**
   * Process LINE webhook (placeholder)
   */
  private async processLineWebhook(payload: any, supabase: SupabaseClient) {
    // TODO: Implement LINE webhook processing
    return []
  }

  /**
   * Process WhatsApp webhook (placeholder)
   */
  private async processWhatsAppWebhook(payload: any, supabase: SupabaseClient) {
    // TODO: Implement WhatsApp webhook processing
    return []
  }

  /**
   * Process Shopee webhook (placeholder)
   */
  private async processShopeeWebhook(payload: any, supabase: SupabaseClient) {
    console.log('[WebhookHandler] Shopee webhook received:', payload)
    return []
  }

  /**
   * Process Lazada webhook (placeholder)
   */
  private async processLazadaWebhook(payload: any, supabase: SupabaseClient) {
    console.log('[WebhookHandler] Lazada webhook received:', payload)
    return []
  }

  /**
   * Process TikTok webhook (placeholder)
   */
  private async processTikTokWebhook(payload: any, supabase: SupabaseClient) {
    console.log('[WebhookHandler] TikTok webhook received:', payload)
    return []
  }

  /**
   * Get organization ID for platform
   * FIXED: Now properly uses pageId to find the correct organization
   */
  private async getOrganizationId(
    platform: Platform,
    supabase: SupabaseClient,
    pageId?: string
  ): Promise<string> {
    try {
      let query = supabase
        .from('platform_accounts')
        .select('organization_id')
        .eq('platform', platform)
        .eq('is_active', true)
      
      // For Facebook/Instagram, match by page ID (account_id)
      if (pageId && (platform === 'facebook' || platform === 'instagram')) {
        console.log(`[WebhookHandler] Looking for organization with pageId: ${pageId}`)
        query = query.eq('account_id', pageId)
      }
      
      const { data, error } = await query.single()
      
      if (error || !data?.organization_id) {
        console.error(`[WebhookHandler] No platform account found for ${platform} pageId: ${pageId}`)
        console.error('Error:', error)
        
        // Try to get any active account for this platform as fallback
        const { data: fallbackData } = await supabase
          .from('platform_accounts')
          .select('organization_id')
          .eq('platform', platform)
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (fallbackData?.organization_id) {
          console.warn(`[WebhookHandler] Using fallback organization: ${fallbackData.organization_id}`)
          return fallbackData.organization_id
        }
        
        throw new Error(`No active organization found for platform ${platform}`)
      }
      
      console.log(`[WebhookHandler] Found organization: ${data.organization_id} for pageId: ${pageId}`)
      return data.organization_id
    } catch (error) {
      console.error('[WebhookHandler] Error getting organization ID:', error)
      throw error
    }
  }

  /**
   * Get or create customer
   * FIXED: Now properly accepts and uses organizationId
   */
  private async getOrCreateCustomer(
    platform: Platform, 
    platformUserId: string,
    supabase: SupabaseClient,
    organizationId: string,
    pageId?: string
  ) {
    try {
      // Check existing customer with organization_id
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq(`platform_identities->${platform}->id`, platformUserId)
        .single()
      
      if (existingCustomer) {
        console.log('[WebhookHandler] Found existing customer:', existingCustomer.id)
        
        // Check if we need to update profile (no avatar or old data)
        if (!existingCustomer.avatar_url || !existingCustomer.platform_identities[platform]?.name) {
          console.log('[WebhookHandler] Customer missing profile data, fetching from Facebook...')
          await this.updateCustomerProfile(platform, platformUserId, existingCustomer.id, supabase, pageId)
        }
        
        return existingCustomer
      }
      
      // For new customer, try to get profile from Facebook first
      let profileData = null
      if (platform === 'facebook' && pageId) {
        profileData = await this.fetchFacebookProfile(platformUserId, pageId, supabase)
      }
      
      // Create new customer with profile data if available
      const customerData = {
        name: profileData?.name || `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`,
        avatar_url: profileData?.profilePic || null,
        platform_identities: {
          [platform]: { 
            id: platformUserId,
            page_id: pageId,
            ...profileData // Include all profile data
          }
        },
        organization_id: organizationId,
        last_contact_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      
      console.log('[WebhookHandler] Creating new customer with data:', {
        ...customerData,
        avatar_url: customerData.avatar_url ? 'has avatar' : 'no avatar'
      })
      
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single()
      
      if (error) {
        console.error('[WebhookHandler] Error creating customer:', error)
        throw error
      }
      
      console.log('[WebhookHandler] Created new customer:', newCustomer.id)
      return newCustomer
    } catch (error) {
      console.error('[WebhookHandler] Error in getOrCreateCustomer:', error)
      throw error
    }
  }
  
  /**
   * Fetch Facebook profile using page access token
   */
  private async fetchFacebookProfile(userId: string, pageId: string, supabase: SupabaseClient) {
    try {
      // Get page access token from platform_accounts
      const { data: platformAccount } = await supabase
        .from('platform_accounts')
        .select('access_token')
        .eq('platform', 'facebook')
        .eq('account_id', pageId)
        .single()
      
      if (!platformAccount?.access_token) {
        console.log('[WebhookHandler] No access token found for page:', pageId)
        return null
      }
      
      // Call Facebook API
      const API_VERSION = 'v18.0'
      const response = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${userId}?fields=id,name,first_name,last_name,profile_pic,locale,timezone,gender&access_token=${platformAccount.access_token}`
      )
      
      if (!response.ok) {
        console.error('[WebhookHandler] Facebook API error:', await response.text())
        return null
      }
      
      const data = await response.json()
      
      console.log('[WebhookHandler] Fetched Facebook profile:', {
        id: data.id,
        name: data.name,
        has_pic: !!data.profile_pic
      })
      
      return {
        id: data.id,
        name: data.name,
        firstName: data.first_name,
        lastName: data.last_name,
        profilePic: data.profile_pic,
        locale: data.locale,
        timezone: data.timezone,
        gender: data.gender
      }
    } catch (error) {
      console.error('[WebhookHandler] Error fetching Facebook profile:', error)
      return null
    }
  }
  
  /**
   * Update existing customer profile
   */
  private async updateCustomerProfile(
    platform: Platform,
    platformUserId: string,
    customerId: string,
    supabase: SupabaseClient,
    pageId?: string
  ) {
    try {
      if (platform !== 'facebook' || !pageId) return
      
      const profileData = await this.fetchFacebookProfile(platformUserId, pageId, supabase)
      if (!profileData) return
      
      // Update customer with new profile data
      const { error } = await supabase
        .from('customers')
        .update({
          name: profileData.name,
          avatar_url: profileData.profilePic,
          platform_identities: {
            [platform]: {
              id: platformUserId,
              page_id: pageId,
              ...profileData,
              lastUpdated: new Date().toISOString()
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
      
      if (error) {
        console.error('[WebhookHandler] Error updating customer profile:', error)
      } else {
        console.log('[WebhookHandler] Updated customer profile successfully')
      }
    } catch (error) {
      console.error('[WebhookHandler] Error in updateCustomerProfile:', error)
    }
  }

  /**
   * Get or create conversation
   * FIXED: Now properly accepts and uses organizationId
   */
  private async getOrCreateConversation(
    platform: Platform,
    customerId: string,
    pageId: string,
    userId: string,
    supabase: SupabaseClient,
    organizationId: string
  ) {
    try {
      const platform_conversation_id = `${pageId}_${userId}`
      
      // Check existing open conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('platform', platform)
        .eq('platform_conversation_id', platform_conversation_id)
        .eq('status', 'open')
        .single()
      
      if (existingConv) {
        console.log('[WebhookHandler] Found existing conversation:', existingConv.id)
        return existingConv
      }
      
      // Get platform_account UUID if needed
      let platformAccountId = null
      if (pageId) {
        const { data: platformAccount } = await supabase
          .from('platform_accounts')
          .select('id')
          .eq('platform', platform)
          .eq('account_id', pageId)
          .eq('organization_id', organizationId)
          .single()
        
        platformAccountId = platformAccount?.id
        console.log('[WebhookHandler] Platform account UUID:', platformAccountId)
      }
      
      // Create new conversation with proper IDs
      const conversationData = {
        platform,
        customer_id: customerId,
        platform_conversation_id,
        platform_account_id: platformAccountId, // Use UUID if available
        status: 'open',
        priority: 'normal',
        organization_id: organizationId, // Use the passed organizationId
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      
      console.log('[WebhookHandler] Creating new conversation with data:', conversationData)
      
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()
      
      if (error) {
        console.error('[WebhookHandler] Error creating conversation:', error)
        throw error
      }
      
      console.log('[WebhookHandler] Created new conversation:', newConv.id)
      return newConv
    } catch (error) {
      console.error('[WebhookHandler] Error in getOrCreateConversation:', error)
      throw error
    }
  }

  /**
   * Save message to database
   */
  private async saveMessage(messageData: any, supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...messageData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('[WebhookHandler] Error saving message:', error)
      throw error
    }
    
    console.log(`[WebhookHandler] Saved ${messageData.message_type} message:`, data.id)
    return data
  }

  /**
   * Update conversation with last message
   */
  private async updateConversationLastMessage(
    conversationId: string, 
    message: any,
    supabase: SupabaseClient
  ) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('message_count, unread_count')
      .eq('id', conversationId)
      .single()
    
    const { error } = await supabase
      .from('conversations')
      .update({
        last_message_at: message.created_at || new Date().toISOString(),
        message_count: (conversation?.message_count || 0) + 1,
        unread_count: (conversation?.unread_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
    
    if (error) {
      console.error('[WebhookHandler] Error updating conversation:', error)
    }
  }

  /**
   * Update message status
   */
  private async updateMessageStatus(
    messageIds: string[], 
    status: string,
    supabase: SupabaseClient
  ) {
    if (!messageIds || messageIds.length === 0) return
    
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    } else if (status === 'read') {
      updateData.read_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .in('platform_message_id', messageIds)
    
    if (error) {
      console.error('[WebhookHandler] Error updating message status:', error)
    }
  }

  /**
   * Mark messages as read
   */
  private async markMessagesAsRead(
    senderId: string, 
    watermark: number,
    supabase: SupabaseClient
  ) {
    const { error } = await supabase
      .from('messages')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('sender_id', senderId)
      .lte('created_at', new Date(watermark).toISOString())
      .eq('sender_type', 'agent')
      .in('status', ['sent', 'delivered'])
    
    if (error) {
      console.error('[WebhookHandler] Error marking messages as read:', error)
    }
  }
}

// Export new instance (not singleton)
export const webhookHandler = new WebhookHandler()