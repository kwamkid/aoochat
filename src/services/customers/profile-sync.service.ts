// src/services/customers/profile-sync.service.ts

import { createClient } from '@/lib/supabase/client'
import type { Platform } from '@/types/conversation.types'

interface ProfileData {
  id: string
  name: string
  firstName?: string
  lastName?: string
  profilePic?: string
  locale?: string
  timezone?: number
  gender?: string
  email?: string
  phone?: string
}

class CustomerProfileSyncService {
  private supabase = createClient()
  private API_VERSION = 'v18.0'
  
  /**
   * Sync single customer profile
   */
  async syncCustomerProfile(customerId: string): Promise<boolean> {
    try {
      // Get customer data
      const { data: customer, error } = await this.supabase
        .from('customers')
        .select('*, organization_id')
        .eq('id', customerId)
        .single()
      
      if (error || !customer) {
        console.error('Customer not found:', customerId)
        return false
      }
      
      let updated = false
      
      // Check each platform identity
      for (const [platform, identity] of Object.entries(customer.platform_identities || {})) {
        if (platform === 'facebook' && identity.id) {
          const profile = await this.fetchFacebookProfile(
            identity.id,
            identity.page_id,
            customer.organization_id
          )
          
          if (profile) {
            await this.updateCustomerProfile(customerId, platform as Platform, profile)
            updated = true
          }
        }
        // Add other platforms here (Instagram, LINE, etc.)
      }
      
      return updated
    } catch (error) {
      console.error('Error syncing customer profile:', error)
      return false
    }
  }
  
  /**
   * Sync all customers for an organization
   */
  async syncOrganizationCustomers(organizationId: string): Promise<{
    total: number
    updated: number
    failed: number
  }> {
    try {
      // Get all customers for organization
      const { data: customers, error } = await this.supabase
        .from('customers')
        .select('id, platform_identities')
        .eq('organization_id', organizationId)
        .limit(100) // Process in batches
      
      if (error || !customers) {
        console.error('Error fetching customers:', error)
        return { total: 0, updated: 0, failed: 0 }
      }
      
      let updated = 0
      let failed = 0
      
      // Process each customer
      for (const customer of customers) {
        const success = await this.syncCustomerProfile(customer.id)
        if (success) {
          updated++
        } else {
          failed++
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      return {
        total: customers.length,
        updated,
        failed
      }
    } catch (error) {
      console.error('Error syncing organization customers:', error)
      return { total: 0, updated: 0, failed: 0 }
    }
  }
  
  /**
   * Fetch Facebook profile
   */
  private async fetchFacebookProfile(
    userId: string,
    pageId: string,
    organizationId: string
  ): Promise<ProfileData | null> {
    try {
      // Get access token from platform_accounts
      const { data: platformAccount } = await this.supabase
        .from('platform_accounts')
        .select('access_token')
        .eq('platform', 'facebook')
        .eq('account_id', pageId)
        .eq('organization_id', organizationId)
        .single()
      
      if (!platformAccount?.access_token) {
        console.log('No access token for page:', pageId)
        return null
      }
      
      // Call Facebook API
      const response = await fetch(
        `https://graph.facebook.com/${this.API_VERSION}/${userId}?fields=id,name,first_name,last_name,profile_pic,locale,timezone,gender,email&access_token=${platformAccount.access_token}`
      )
      
      if (!response.ok) {
        console.error('Facebook API error:', await response.text())
        return null
      }
      
      const data = await response.json()
      
      return {
        id: data.id,
        name: data.name,
        firstName: data.first_name,
        lastName: data.last_name,
        profilePic: data.profile_pic,
        locale: data.locale,
        timezone: data.timezone,
        gender: data.gender,
        email: data.email
      }
    } catch (error) {
      console.error('Error fetching Facebook profile:', error)
      return null
    }
  }
  
  /**
   * Update customer profile in database
   */
  private async updateCustomerProfile(
    customerId: string,
    platform: Platform,
    profileData: ProfileData
  ): Promise<boolean> {
    try {
      // Get current customer data
      const { data: customer } = await this.supabase
        .from('customers')
        .select('platform_identities')
        .eq('id', customerId)
        .single()
      
      const currentIdentities = customer?.platform_identities || {}
      
      // Update customer
      const { error } = await this.supabase
        .from('customers')
        .update({
          name: profileData.name,
          avatar_url: profileData.profilePic,
          email: profileData.email || undefined,
          platform_identities: {
            ...currentIdentities,
            [platform]: {
              ...currentIdentities[platform],
              ...profileData,
              lastSynced: new Date().toISOString()
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
      
      if (error) {
        console.error('Error updating customer:', error)
        return false
      }
      
      console.log(`Updated customer ${customerId} with ${platform} profile`)
      return true
    } catch (error) {
      console.error('Error updating customer profile:', error)
      return false
    }
  }
  
  /**
   * Check if profile needs update (older than 7 days)
   */
  async needsProfileUpdate(customerId: string): Promise<boolean> {
    try {
      const { data: customer } = await this.supabase
        .from('customers')
        .select('platform_identities, avatar_url')
        .eq('id', customerId)
        .single()
      
      if (!customer) return false
      
      // Check if missing avatar
      if (!customer.avatar_url) return true
      
      // Check last sync time for each platform
      for (const identity of Object.values(customer.platform_identities || {})) {
        if (identity.lastSynced) {
          const lastSync = new Date(identity.lastSynced)
          const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceSync > 7) return true
        } else {
          return true // Never synced
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking profile update need:', error)
      return false
    }
  }
}

// Export singleton instance
export const customerProfileSyncService = new CustomerProfileSyncService()