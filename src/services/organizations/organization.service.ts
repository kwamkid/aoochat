// src/services/organizations/organization.service.ts

import { createClient } from '@/lib/supabase/client'
import type { 
  Organization, 
  OrganizationMember, 
  OrganizationInvitation,
  CreateOrganizationInput,
  InviteMemberInput,
  UserOrganization,
  OrganizationRole,
  OrganizationPermissions
} from '@/types/organization.types'
import { DEFAULT_PERMISSIONS } from '@/types/organization.types'
import { nanoid } from 'nanoid'

export class OrganizationService {
  private supabase = createClient()

  /**
   * Get all organizations for current user
   */
  async getUserOrganizations(): Promise<UserOrganization[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    console.log('Fetching organizations for user:', user.id)
    
    // First, try using the RPC function
    const { data: rpcData, error: rpcError } = await this.supabase
      .rpc('get_user_organizations', { p_user_id: user.id })

    if (!rpcError && rpcData) {
      console.log('Organizations from RPC:', rpcData)
      return rpcData || []
    }

    // If RPC fails, fallback to direct query
    console.log('RPC failed, trying direct query. Error:', rpcError)
    
    // Define the expected type for the query result
    type MemberWithOrg = {
      organization_id: string
      user_role: string
      is_default: boolean
      joined_at: string
      organization: {
        name: string
        slug: string
      } | null
    }
    
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(`
        organization_id,
        user_role: role,
        is_default,
        joined_at,
        organization:organizations!inner(
          name,
          slug
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .returns<MemberWithOrg[]>()

    if (error) {
      console.error('Direct query also failed:', error)
      throw error
    }

    // Transform the data to match UserOrganization type
    const organizations: UserOrganization[] = (data || []).map(item => ({
      organization_id: item.organization_id,
      organization_name: item.organization?.name || 'Unknown',
      organization_slug: item.organization?.slug || 'unknown',
      user_role: (item.user_role || 'member') as OrganizationRole,
      is_default: item.is_default || false,
      joined_at: item.joined_at || new Date().toISOString()
    }))

    console.log('Organizations from direct query:', organizations)
    return organizations
  }

  /**
   * Get organization details
   */
  async getOrganization(orgId: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Create new organization
   */
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate unique slug if not provided
    const slug = input.slug || this.generateSlug(input.name)

    // Use the database function to create org with owner
    const { data, error } = await this.supabase
      .rpc('create_organization_with_owner', {
        p_user_id: user.id,
        p_org_name: input.name,
        p_org_slug: slug,
        p_org_industry: input.industry,
        p_org_size: input.size
      })

    if (error) throw error

    // Fetch and return the created organization
    return await this.getOrganization(data) as Organization
  }

  /**
   * Update organization
   */
  async updateOrganization(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(`
        *,
        user:users(id, email, name, avatar_url)
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Invite member to organization
   */
  async inviteMember(orgId: string, input: InviteMemberInput): Promise<OrganizationInvitation> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate invitation token
    const token = nanoid(32)

    const { data, error } = await this.supabase
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        email: input.email,
        role: input.role,
        token,
        invited_by: user.id,
        message: input.message,
        permissions: input.permissions || DEFAULT_PERMISSIONS[input.role] || {},
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Send invitation email
    await this.sendInvitationEmail(input.email, token, orgId)

    return data
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string): Promise<OrganizationMember> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get invitation
    const { data: invitation, error: invError } = await this.supabase
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (invError || !invitation) throw new Error('Invalid or expired invitation')

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update invitation status
      await this.supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      
      throw new Error('Invitation has expired')
    }

    // Start transaction
    const { data: member, error: memberError } = await this.supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        invitation_token: token,
        invitation_accepted_at: new Date().toISOString(),
        is_active: true,
        is_default: false, // User can set default later
        permissions: invitation.permissions
      })
      .select()
      .single()

    if (memberError) {
      // Check if user is already a member
      if (memberError.code === '23505') {
        throw new Error('You are already a member of this organization')
      }
      throw memberError
    }

    // Update invitation status
    await this.supabase
      .from('organization_invitations')
      .update({ 
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    return member
  }

  /**
   * Remove member from organization
   */
  async removeMember(orgId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId)

    if (error) throw error
  }

  /**
   * Update member role
   */
  async updateMemberRole(orgId: string, userId: string, role: OrganizationRole): Promise<void> {
    const { error } = await this.supabase
      .from('organization_members')
      .update({ 
        role,
        permissions: DEFAULT_PERMISSIONS[role] || {}
      })
      .eq('organization_id', orgId)
      .eq('user_id', userId)

    if (error) throw error
  }

  /**
   * Set default organization
   */
  async setDefaultOrganization(orgId: string): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .rpc('set_default_organization', {
        p_user_id: user.id,
        p_organization_id: orgId
      })

    if (error) throw error
    return data
  }

  /**
   * Check if user has permission in organization
   */
  async hasPermission(orgId: string, permission: keyof OrganizationPermissions): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role, permissions')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error || !data) return false

    // Check custom permissions first
    if (data.permissions && data.permissions[permission] !== undefined) {
      return data.permissions[permission]
    }

    // Fall back to role-based permissions
    const rolePermissions = DEFAULT_PERMISSIONS[data.role as OrganizationRole]
    return rolePermissions?.[permission] || false
  }

  /**
   * Get pending invitations for an email
   */
  async getPendingInvitations(email: string): Promise<OrganizationInvitation[]> {
    const { data, error } = await this.supabase
      .from('organization_invitations')
      .select(`
        *,
        organization:organizations(id, name, slug, logo_url)
      `)
      .eq('email', email)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Leave organization
   */
  async leaveOrganization(orgId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if user is the owner
    const { data: member } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (member?.role === 'owner') {
      // Check if there are other owners
      const { data: owners } = await this.supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('role', 'owner')
        .eq('is_active', true)

      if (!owners || owners.length <= 1) {
        throw new Error('Cannot leave organization as the only owner. Please assign another owner first.')
      }
    }

    await this.removeMember(orgId, user.id)
  }

  /**
   * Helper: Generate unique slug
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    return `${baseSlug}-${nanoid(6)}`
  }

  /**
   * Send invitation email (placeholder)
   */
  private async sendInvitationEmail(email: string, token: string, orgId: string): Promise<void> {
    // TODO: Implement email sending
    console.log('Sending invitation email to:', email)
    console.log('Invitation link:', `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`)
  }
}

// Export singleton instance
export const organizationService = new OrganizationService()