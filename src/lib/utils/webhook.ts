// src/lib/utils/webhook.ts

import { NextRequest } from 'next/server'

/**
 * Safely extract headers from NextRequest
 * Compatible with Next.js 15 read-only restrictions
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
 * Compatible with Next.js 15 read-only restrictions
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
 * Compatible with Next.js 15
 */
export function createVerificationParams(searchParams: URLSearchParams): Record<string, string | null> {
  return {
    'hub.mode': searchParams.get('hub.mode'),
    'hub.verify_token': searchParams.get('hub.verify_token'),
    'hub.challenge': searchParams.get('hub.challenge')
  }
}

/**
 * Create headers object with raw body
 * Compatible with Next.js 15
 */
export function createHeadersWithRawBody(
  request: NextRequest, 
  rawBody: string
): Record<string, string> {
  const headers = extractHeaders(request)
  // Add raw body for signature verification
  headers['x-raw-body'] = rawBody
  return headers
}