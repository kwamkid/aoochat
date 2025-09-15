// src/app/api/platforms/facebook/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { facebookAPIClient } from '@/services/platforms/facebook/facebook-api-client'
import { facebookMessageBuilder } from '@/services/platforms/facebook/facebook-message-builder'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, message, messageType = 'text' } = body
    
    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log('Sending Facebook message:', { conversationId, messageType, message })
    
    // Get conversation details from database
    const supabase = await createClient()
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()
    
    if (convError || !conversation) {
      console.error('Conversation not found:', convError)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }
    
    // Extract Facebook user ID from platform_conversation_id
    // Format: pageId_userId
    const parts = conversation.platform_conversation_id.split('_')
    const pageId = parts[0]
    const recipientId = parts[parts.length - 1]
    
    if (!recipientId || !pageId) {
      console.error('Invalid conversation ID format:', conversation.platform_conversation_id)
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 400 }
      )
    }
    
    console.log('Page ID:', pageId, 'Recipient ID:', recipientId)
    
    // Get page access token from database
    const { data: pageAccount, error: pageError } = await supabase
      .from('platform_accounts')
      .select('access_token')
      .eq('platform', 'facebook')
      .eq('account_id', pageId)
      .single()
    
    if (pageError || !pageAccount?.access_token) {
      console.error('Page access token not found in database, trying environment variable')
      
      // Fallback to environment variable if available
      const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      if (!envToken) {
        return NextResponse.json(
          { error: 'Page access token not found. Please reconnect Facebook.' },
          { status: 401 }
        )
      }
      
      console.log('Using access token from environment variable')
      facebookAPIClient.setPageAccessToken(envToken)
    } else {
      // Set the page access token from database
      facebookAPIClient.setPageAccessToken(pageAccount.access_token)
    }
    
    // Build message based on type
    let fbMessage
    switch (messageType) {
      case 'text':
        fbMessage = facebookMessageBuilder.text(message.text)
        break
        
      case 'image':
        fbMessage = facebookMessageBuilder.image(message.url, message.caption)
        break
        
      case 'video':
        fbMessage = facebookMessageBuilder.video(message.url, message.caption)
        break
        
      case 'file':
        fbMessage = facebookMessageBuilder.file(message.url, message.filename)
        break
        
      case 'quick_replies':
        fbMessage = facebookMessageBuilder.quickReplies(message.text, message.options)
        break
        
      case 'buttons':
        fbMessage = facebookMessageBuilder.buttons(message.text, message.buttons)
        break
        
      case 'carousel':
        fbMessage = facebookMessageBuilder.carousel(message.items)
        break
        
      default:
        fbMessage = facebookMessageBuilder.text(message.text || message)
    }
    
    // Send typing indicator first
    try {
      await facebookAPIClient.sendTypingIndicator(recipientId, true)
    } catch (e) {
      console.log('Could not send typing indicator:', e)
    }
    
    // Handle array of messages (e.g., caption + image)
    const results = []
    if (Array.isArray(fbMessage)) {
      for (const msg of fbMessage) {
        try {
          const result = await facebookAPIClient.sendMessage(recipientId, msg)
          results.push(result)
          
          // Small delay between messages
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error('Error sending individual message:', error)
          throw error
        }
      }
    } else {
      try {
        const result = await facebookAPIClient.sendMessage(recipientId, fbMessage)
        results.push(result)
      } catch (error) {
        console.error('Error sending message:', error)
        throw error
      }
    }
    
    // Turn off typing indicator
    try {
      await facebookAPIClient.sendTypingIndicator(recipientId, false)
    } catch (e) {
      console.log('Could not turn off typing indicator:', e)
    }
    
    // Store message in database
    const messageData = {
      conversation_id: conversationId,
      platform_message_id: results[0]?.message_id,
      sender_type: 'agent',
      sender_id: 'system',
      sender_name: 'Agent',
      message_type: messageType,
      content: {
        text: message.text,
        ...message
      },
      status: 'sent',
      is_private: false,
      is_automated: false,
      created_at: new Date().toISOString()
    }
    
    const { data: savedMessage, error: msgError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()
    
    if (msgError) {
      console.error('Error saving message to database:', msgError)
    }
    
    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
    
    return NextResponse.json({
      success: true,
      messageId: results[0]?.message_id,
      message: savedMessage,
      results
    })
    
  } catch (error) {
    console.error('Error sending Facebook message:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}