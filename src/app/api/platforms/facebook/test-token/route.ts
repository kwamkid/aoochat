// src/app/api/platforms/facebook/test-token/route.ts

import { NextRequest, NextResponse } from 'next/server'

const FACEBOOK_API_VERSION = 'v18.0'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    
    console.log('=== Testing Facebook Token ===')
    
    // 1. Test token permissions
    const debugUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token?input_token=${token}&access_token=${token}`
    const debugResponse = await fetch(debugUrl)
    const debugData = await debugResponse.json()
    
    console.log('Token Debug Info:', JSON.stringify(debugData, null, 2))
    
    // 2. Get user info
    const meUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me?fields=id,name,email&access_token=${token}`
    const meResponse = await fetch(meUrl)
    const meData = await meResponse.json()
    
    console.log('User Info:', JSON.stringify(meData, null, 2))
    
    // 3. Get pages with different approaches
    console.log('\n=== Method 1: Standard accounts endpoint ===')
    const pages1Url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?access_token=${token}`
    const pages1Response = await fetch(pages1Url)
    const pages1Data = await pages1Response.json()
    console.log('Result:', JSON.stringify(pages1Data, null, 2))
    
    console.log('\n=== Method 2: With fields parameter ===')
    const pages2Url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?fields=id,name,access_token,category&access_token=${token}`
    const pages2Response = await fetch(pages2Url)
    const pages2Data = await pages2Response.json()
    console.log('Result:', JSON.stringify(pages2Data, null, 2))
    
    console.log('\n=== Method 3: User ID based ===')
    if (meData.id) {
      const pages3Url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${meData.id}/accounts?access_token=${token}`
      const pages3Response = await fetch(pages3Url)
      const pages3Data = await pages3Response.json()
      console.log('Result:', JSON.stringify(pages3Data, null, 2))
    }
    
    // 4. Check permissions
    console.log('\n=== Method 4: Check permissions ===')
    const permUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/permissions?access_token=${token}`
    const permResponse = await fetch(permUrl)
    const permData = await permResponse.json()
    console.log('Permissions:', JSON.stringify(permData, null, 2))
    
    return NextResponse.json({
      success: true,
      tokenInfo: debugData.data,
      userInfo: meData,
      permissions: permData.data,
      pages: {
        method1: pages1Data,
        method2: pages2Data,
        method3: meData.id ? pages3Data : null
      }
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}