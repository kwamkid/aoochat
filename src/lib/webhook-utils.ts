// src/lib/webhook-utils.ts

import { NextRequest } from 'next/server'

/**
 * Safely extract headers from NextRequest
 * Avoids mutation of read-only objects in Next.js 15
 */
export function extractHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  
  // Use forEach to safely iterate headers
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  return headers
}

/**
 * Safely extract search params from NextRequest
 * Avoids mutation of read-only objects in Next.js 15
 */
export function extractSearchParams(request: NextRequest): Record<string, string | null> {
  const params: Record<string, string | null> = {}
  const searchParams = request.nextUrl.searchParams
  
  // Iterate through all params
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

/**
 * Parse webhook body safely
 */
export async function parseWebhookBody(request: NextRequest): Promise<{
  body: any
  rawBody: string
  error?: string
}> {
  try {
    const rawBody = await request.text()
    
    if (!rawBody) {
      return { body: null, rawBody: '', error: 'Empty body' }
    }
    
    try {
      const body = JSON.parse(rawBody)
      return { body, rawBody }
    } catch (parseError) {
      return { 
        body: null, 
        rawBody, 
        error: 'Invalid JSON' 
      }
    }
  } catch (error) {
    return { 
      body: null, 
      rawBody: '', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Create webhook verification params
 */
export function createVerificationParams(searchParams: URLSearchParams): Record<string, string | null> {
  return {
    'hub.mode': searchParams.get('hub.mode'),
    'hub.verify_token': searchParams.get('hub.verify_token'),
    'hub.challenge': searchParams.get('hub.challenge')
  }
}