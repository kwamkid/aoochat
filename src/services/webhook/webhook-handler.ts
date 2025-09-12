// src/services/webhook/webhook-handler.ts

import { Platform } from '@/types/conversation.types'
import { 
  WebhookEvent, 
  WebhookResponse, 
  ProcessedWebhookData,
  WebhookProcessor 
} from '@/types/webhook.types'
import { MetaWebhookProcessor } from './processors/meta-processor'
import { LineWebhookProcessor } from './processors/line-processor'
import { WhatsAppWebhookProcessor } from './processors/whatsapp-processor'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export class WebhookHandler {
  private processors: Map<Platform, WebhookProcessor>
  
  constructor() {
    this.processors = new Map()
    this.registerProcessors()
  }
  
  private registerProcessors() {
    // Register platform-specific processors
    this.processors.set('facebook', new MetaWebhookProcessor('facebook'))
    this.processors.set('instagram', new MetaWebhookProcessor('instagram'))
    this.processors.set('line', new LineWebhookProcessor())
    this.processors.set('whatsapp', new WhatsAppWebhookProcessor())
  }
  
  /**
   * Verify webhook challenge (for initial setup)
   */
  async verifyChallenge(
    platform: Platform, 
    params: any, 
    requestHeaders: any
  ): Promise<any> {
    const processor = this.processors.get(platform)
    if (!processor) {
      throw new Error(`No processor found for platform: ${platform}`)
    }
    
    // Platform-specific verification
    switch (platform) {
      case 'facebook':
      case 'instagram':
        // Meta platforms use hub.challenge verification
        const mode = params['hub.mode']
        const token = params['hub.verify_token']
        const challenge = params['hub.challenge']
        
        if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
          return challenge
        }
        throw new Error('Invalid verification token')
        
      case 'line':
        // LINE doesn't use challenge verification
        return { success: true }
        
      case 'whatsapp':
        // WhatsApp uses same as Meta
        const waMode = params['hub.mode']
        const waToken = params['hub.verify_token']
        const waChallenge = params['hub.challenge']
        
        if (waMode === 'subscribe' && waToken === process.env.WHATSAPP_VERIFY_TOKEN) {
          return waChallenge
        }
        throw new Error('Invalid verification token')
        
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }
  
  /**
   * Process incoming webhook
   */
  async processWebhook(
    platform: Platform,
    payload: any,
    requestHeaders: any
  ): Promise<WebhookResponse> {
    const processor = this.processors.get(platform)
    if (!processor) {
      throw new Error(`No processor found for platform: ${platform}`)
    }
    
    try {
      // Verify webhook signature
      const isValid = processor.verify(payload, requestHeaders)
      if (!isValid) {
        throw new Error('Invalid webhook signature')
      }
      
      // Process webhook data
      const processedData = await processor.process(payload)
      
      // Store in database
      await this.storeWebhookData(processedData)
      
      // Trigger real-time update
      await this.triggerRealtimeUpdate(processedData)
      
      // Process business logic
      await this.processBusinessLogic(processedData)
      
      return {
        success: true,
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      console.error('Webhook processing error:', error)
      
      // Log error to database
      await this.logWebhookError(platform, payload, error)
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Store webhook data in database
   */
  private async storeWebhookData(data: ProcessedWebhookData) {
    try {
      // Use createClient with service role to bypass RLS
      const supabase = await createClient()
      
      // For webhook operations, we need to bypass RLS
      // Check if we're using the service role key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      if (!supabaseServiceKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY not configured - webhooks may fail due to RLS')
      }
      
      // Create a service client that bypasses RLS
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
      // Log the data we're trying to store
      console.log('Storing webhook data:', {
        platform: data.platform,
        conversationId: data.conversationId,
        customerId: data.customerId,
        messageType: data.messageType
      })
      
      // Check if conversation exists
      const { data: existingConv, error: fetchError } = await serviceClient
        .from('conversations')
        .select('id')
        .eq('platform', data.platform)
        .eq('platform_conversation_id', data.conversationId)
        .single()
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is ok
        console.error('Error fetching conversation:', fetchError)
      }
      
      let conversationId: string
      
      if (existingConv) {
        conversationId = existingConv.id
        console.log('Found existing conversation:', conversationId)
        
        // Update last message time
        const { error: updateError } = await serviceClient
          .from('conversations')
          .update({
            last_message_at: data.timestamp,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId)
        
        if (updateError) {
          console.error('Error updating conversation:', updateError)
        }
      } else {
        // Create new conversation
        console.log('Creating new conversation...')
        
        const conversationData: any = {
          platform: data.platform,
          platform_conversation_id: data.conversationId,
          status: 'new',
          priority: 'normal',
          last_message_at: data.timestamp,
          message_count: 1,
          unread_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { data: newConv, error } = await serviceClient
          .from('conversations')
          .insert(conversationData)
          .select()
          .single()
        
        if (error) {
          console.error('Error creating conversation:', error)
          console.warn('Continuing without conversation record')
          return
        }
        
        if (!newConv) {
          console.error('No conversation returned after insert')
          return
        }
        
        conversationId = newConv.id
        console.log('Created new conversation:', conversationId)
      }
      
      // Store message if present
      if (data.messageId && data.messageType) {
        console.log('Storing message...')
        
        const messageData: any = {
          conversation_id: conversationId,
          platform_message_id: data.messageId,
          sender_type: 'customer',
          sender_id: data.customerId,
          sender_name: data.customerName || 'Customer',
          message_type: data.messageType,
          content: data.messageContent || {},
          status: 'delivered',
          is_private: false,
          is_automated: false,
          created_at: data.timestamp,
          updated_at: data.timestamp
        }
        
        const { error: messageError } = await serviceClient
          .from('messages')
          .insert(messageData)
        
        if (messageError) {
          console.error('Error storing message:', messageError)
        } else {
          console.log('Message stored successfully')
        }
      }
      
      // Update or create customer with service client
      await this.updateCustomerData(data, serviceClient)
      
    } catch (error) {
      console.error('Error in storeWebhookData:', error)
      // Don't throw - we want to continue processing even if storage fails
    }
  }
  
  /**
   * Update customer data
   */
  private async updateCustomerData(data: ProcessedWebhookData, serviceClient?: any) {
    try {
      // Use provided service client or create new one
      if (!serviceClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      }
      
      console.log('Updating customer data:', {
        customerId: data.customerId,
        customerName: data.customerName,
        platform: data.platform
      })
      
      const customerData: any = {
        name: data.customerName || `Customer ${data.customerId}`,
        platform_identities: {
          [data.platform]: {
            id: data.customerId,
            displayName: data.customerName
          }
        },
        first_contact_at: data.timestamp,
        last_contact_at: data.timestamp,
        total_conversations: 1,
        total_messages: 1,
        engagement_score: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: customer, error: insertError } = await serviceClient
        .from('customers')
        .insert(customerData)
        .select()
        .single()
      
      if (insertError) {
        console.log('Customer might exist, skipping creation:', insertError.message)
      } else {
        console.log('Customer created/updated successfully:', customer?.id)
      }
      
    } catch (error) {
      console.error('Error in updateCustomerData:', error)
    }
  }
  
  /**
   * Trigger real-time update via Supabase Realtime or WebSocket
   */
  private async triggerRealtimeUpdate(data: ProcessedWebhookData) {
    // This would trigger real-time updates to connected clients
    // Implementation depends on your real-time solution (Supabase Realtime, Pusher, Socket.io, etc.)
    
    const supabase = await createClient()
    
    // Broadcast to channel
    const channel = supabase.channel('conversations')
    channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: {
        platform: data.platform,
        conversationId: data.conversationId,
        messageId: data.messageId,
        timestamp: data.timestamp
      }
    })
  }
  
  /**
   * Process business logic (auto-reply, routing, etc.)
   */
  private async processBusinessLogic(data: ProcessedWebhookData) {
    // Check for auto-reply rules
    await this.checkAutoReply(data)
    
    // Check for routing rules
    await this.checkRoutingRules(data)
    
    // Check for automation triggers
    await this.checkAutomationTriggers(data)
  }
  
  private async checkAutoReply(data: ProcessedWebhookData) {
    // Implementation for auto-reply logic
    // Check business hours, keywords, etc.
  }
  
  private async checkRoutingRules(data: ProcessedWebhookData) {
    // Implementation for conversation routing
    // Assign to team/agent based on rules
  }
  
  private async checkAutomationTriggers(data: ProcessedWebhookData) {
    // Implementation for automation flows
    // Trigger workflows based on conditions
  }
  
  /**
   * Log webhook errors for debugging
   */
  private async logWebhookError(platform: Platform, payload: any, error: any) {
    const supabase = await createClient()
    
    await supabase
      .from('webhook_logs')
      .insert({
        platform,
        payload,
        error: error instanceof Error ? error.message : String(error),
        created_at: new Date().toISOString()
      })
  }
}

// Export singleton instance
export const webhookHandler = new WebhookHandler()