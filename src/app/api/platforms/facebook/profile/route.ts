// src/app/api/platforms/facebook/profile/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { facebookAPIClient } from '@/services/platforms/facebook/facebook-api-client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const conversationId = searchParams.get('conversationId')
    
    if (!userId && !conversationId) {
      return NextResponse.json(
        { error: 'Either userId or conversationId is required' },
        { status: 400 }
      )
    }
    
    let fbUserId = userId
    
    // If conversationId provided, get userId from database
    if (conversationId && !userId) {
      const supabase = await createClient()
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('platform_conversation_id')
        .eq('id', conversationId)
        .single()
      
      if (error || !conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      
      // Extract Facebook user ID from platform_conversation_id
      const parts = conversation.platform_conversation_id.split('_')
      fbUserId = parts[parts.length - 1]
    }
    
    if (!fbUserId) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }
    
    console.log('Fetching Facebook profile for:', fbUserId)
    
    // Get profile from Facebook
    const profile = await facebookAPIClient.getUserProfile(fbUserId)
    
    // Update customer in database if conversationId provided
    if (conversationId) {
      const supabase = await createClient()
      
      // Check if customer exists
      const { data: conversation } = await supabase
        .from('conversations')
        .select('customer_id')
        .eq('id', conversationId)
        .single()
      
      if (conversation?.customer_id) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: profile.name,
            avatar_url: profile.profilePic,
            platform_identities: {
              facebook: {
                id: profile.id,
                name: profile.name,
                firstName: profile.firstName,
                lastName: profile.lastName,
                locale: profile.locale,
                timezone: profile.timezone,
                gender: profile.gender
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.customer_id)
        
        if (updateError) {
          console.error('Error updating customer:', updateError)
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            name: profile.name,
            avatar_url: profile.profilePic,
            platform_identities: {
              facebook: {
                id: profile.id,
                name: profile.name,
                firstName: profile.firstName,
                lastName: profile.lastName,
                locale: profile.locale,
                timezone: profile.timezone,
                gender: profile.gender
              }
            },
            first_contact_at: new Date().toISOString(),
            last_contact_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (!createError && newCustomer) {
          // Link customer to conversation
          await supabase
            .from('conversations')
            .update({
              customer_id: newCustomer.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      profile
    })
    
  } catch (error) {
    console.error('Error fetching Facebook profile:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to refresh/sync profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId } = body
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get customer's Facebook ID
    const { data: customer, error } = await supabase
      .from('customers')
      .select('platform_identities')
      .eq('id', customerId)
      .single()
    
    if (error || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const fbUserId = customer.platform_identities?.facebook?.id
    
    if (!fbUserId) {
      return NextResponse.json(
        { error: 'Customer does not have Facebook identity' },
        { status: 400 }
      )
    }
    
    // Fetch updated profile from Facebook
    const profile = await facebookAPIClient.getUserProfile(fbUserId)
    
    // Update customer in database
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        name: profile.name,
        avatar_url: profile.profilePic,
        platform_identities: {
          ...customer.platform_identities,
          facebook: {
            id: profile.id,
            name: profile.name,
            firstName: profile.firstName,
            lastName: profile.lastName,
            locale: profile.locale,
            timezone: profile.timezone,
            gender: profile.gender,
            lastUpdated: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
    
    if (updateError) {
      console.error('Error updating customer:', updateError)
      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      profile
    })
    
  } catch (error) {
    console.error('Error syncing Facebook profile:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}