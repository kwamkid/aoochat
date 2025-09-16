// src/services/webhook/webhook-handler-v2.ts
// Version ที่แก้ปัญหา cookies outside request scope

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
  // ไม่เก็บ supabase client ไว้ใน class
  
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
   * ✅ รับ supabase client มาจากข้างนอก
   */
  async processWebhook(
    platform: Platform, 
    payload: any, 
    supabaseClient?: SupabaseClient
  ) {
    console.log(`[WebhookHandler] Processing ${platform} webhook`)
    
    // สร้าง supabase client ถ้าไม่ได้ส่งมา
    const supabase = supabaseClient || await createClient() // ← เพิ่ม await
    
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
            // Process Instagram comment/mention
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
    const recipientId = messaging.recipient?.id

    console.log('[DEBUG] processFacebookMessaging called with:', {
      hasMessage: !!messaging.message,
      isEcho: messaging.message?.is_echo,
      attachments: messaging.message?.attachments
    })
    
    // Handle incoming message
    if (messaging.message && !messaging.message.is_echo) {
      // ✅ Use processor to detect correct message type
      const processed = FacebookMessageProcessor.processMessage(messaging.message)
      
      console.log(`[WebhookHandler] Processed message:`, {
        type: processed.messageType,
        hasStickerId: !!processed.content.sticker_id,
        hasMediaUrl: !!processed.content.media_url,
        text: processed.content.text?.substring(0, 50)
      })
      
      // Get or create customer
      const customer = await this.getOrCreateCustomer('facebook', senderId, supabase)
      
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        'facebook',
        customer.id,
        recipientId,
        senderId,
        supabase
      )
      
      // Save message with CORRECT message_type
      const message = await this.saveMessage({
        conversation_id: conversation.id,
        platform_message_id: processed.platformMessageId,
        message_type: processed.messageType, // ✅ ใช้ type ที่ถูกต้อง!
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
      // Update our sent message status
      await this.updateMessageStatus([messaging.message.mid], 'sent', supabase)
    }
    
    // Handle postback (button clicks)
    if (messaging.postback) {
      const processed = FacebookMessageProcessor.processPostback(messaging.postback)
      console.log('[WebhookHandler] Postback:', processed)
      
      // Save as message
      const customer = await this.getOrCreateCustomer('facebook', senderId, supabase)
      const conversation = await this.getOrCreateConversation(
        'facebook',
        customer.id,
        recipientId,
        senderId,
        supabase
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
   * Get or create customer
   */
  private async getOrCreateCustomer(
    platform: Platform, 
    platformUserId: string,
    supabase: SupabaseClient
  ) {
    // Check existing customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq(`platform_identities->${platform}->id`, platformUserId)
      .single()
    
    if (existingCustomer) {
      return existingCustomer
    }
    
    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`,
        platform_identities: {
          [platform]: { id: platformUserId }
        },
        organization_id: await this.getOrganizationId(platform, supabase),
        last_contact_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('[WebhookHandler] Error creating customer:', error)
      throw error
    }
    
    console.log('[WebhookHandler] Created new customer:', newCustomer.id)
    return newCustomer
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(
    platform: Platform,
    customerId: string,
    pageId: string,
    userId: string,
    supabase: SupabaseClient
  ) {
    // Check existing open conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('platform', platform)
      .eq('customer_id', customerId)
      .eq('status', 'open')
      .single()
    
    if (existingConv) {
      return existingConv
    }
    
    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        platform,
        customer_id: customerId,
        platform_conversation_id: `${pageId}_${userId}`,
        status: 'open',
        priority: 'normal',
        organization_id: await this.getOrganizationId(platform, supabase),
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('[WebhookHandler] Error creating conversation:', error)
      throw error
    }
    
    console.log('[WebhookHandler] Created new conversation:', newConv.id)
    return newConv
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
   * Get organization ID for platform
   */
  private async getOrganizationId(
    platform: Platform,
    supabase: SupabaseClient
  ): Promise<string> {
    // Get from platform_accounts
    const { data } = await supabase
      .from('platform_accounts')
      .select('organization_id')
      .eq('platform', platform)
      .eq('is_active', true)
      .single()
    
    return data?.organization_id || process.env.DEFAULT_ORG_ID || 'default-org-id'
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
    // Update all messages before watermark timestamp as read
    const { error } = await supabase
      .from('messages')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('sender_id', senderId)
      .lte('created_at', new Date(watermark).toISOString())
      .eq('sender_type', 'agent') // Only mark agent messages as read
      .in('status', ['sent', 'delivered'])
    
    if (error) {
      console.error('[WebhookHandler] Error marking messages as read:', error)
    }
  }
}

// Export instance ใหม่ทุกครั้ง (ไม่ใช่ singleton)
export const webhookHandler = new WebhookHandler()