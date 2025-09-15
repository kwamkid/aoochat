// src/types/facebook.types.ts

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  category?: string
  tasks?: string[]
}

export interface FacebookWebhookEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: {
    mid: string
    text?: string
    attachments?: Array<{
      type: string
      payload: { url?: string }
    }>
  }
  postback?: {
    title: string
    payload: string
  }
}

export interface FacebookMessage {
  id: string
  message?: string
  created_time: string
  from?: {
    id: string
    name: string
  }
  attachments?: {
    data: Array<{
      type: string
      url?: string
    }>
  }
}

export interface StoredFacebookPage {
  id: string
  organization_id: string
  account_id: string
  account_name: string
  access_token: string
  is_active: boolean
  webhook_subscribed: boolean
  last_sync_at?: string
}