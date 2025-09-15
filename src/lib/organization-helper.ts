// src/lib/organization-helper.ts

import { createClient } from '@/lib/supabase/server'

export async function getCurrentOrganizationId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  
  // 1. Try to get from user's last accessed
  const { data: userData } = await supabase
    .from('users')
    .select('last_accessed_organization_id')
    .eq('id', userId)
    .single()
  
  if (userData?.last_accessed_organization_id) {
    return userData.last_accessed_organization_id
  }
  
  // 2. Try to get default organization
  const { data: defaultMembership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()
  
  if (defaultMembership?.organization_id) {
    return defaultMembership.organization_id
  }
  
  // 3. Get first available organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()
  
  return membership?.organization_id || null
}