// src/types/organization.types.ts

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  website?: string
  industry?: string
  size?: string
  timezone: string
  settings: Record<string, any>
  subscription_plan: string
  subscription_expires_at?: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  invited_by?: string
  invitation_token?: string
  invitation_expires_at?: string
  invitation_accepted_at?: string
  is_active: boolean
  is_default: boolean
  permissions: Record<string, any>
  settings: Record<string, any>
  joined_at: string
  created_at: string
  updated_at: string
  // Relations
  organization?: Organization
  user?: UserProfile
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: OrganizationRole
  token: string
  invited_by: string
  accepted_by?: string
  status: InvitationStatus
  expires_at: string
  accepted_at?: string
  message?: string
  permissions: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  organization?: Organization
  inviter?: UserProfile
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar_url?: string
  phone?: string
  role: string
  language: string
  timezone: string
  is_active: boolean
  last_active_at?: string
  last_accessed_organization_id?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateOrganizationInput {
  name: string
  slug?: string  // ทำให้ slug เป็น optional
  industry?: string
  size?: string
  website?: string
  timezone?: string
}

export interface InviteMemberInput {
  email: string
  role: OrganizationRole
  message?: string
  permissions?: Record<string, any>
}

export interface AcceptInvitationInput {
  token: string
  user_id?: string
}

export interface UserOrganization {
  organization_id: string
  organization_name: string
  organization_slug: string
  user_role: OrganizationRole
  is_default: boolean
  joined_at: string
}

// Permissions structure
export interface OrganizationPermissions {
  // Organization management
  can_manage_organization: boolean
  can_manage_billing: boolean
  can_invite_members: boolean
  can_remove_members: boolean
  can_manage_roles: boolean
  
  // Conversations
  can_view_all_conversations: boolean
  can_assign_conversations: boolean
  can_delete_conversations: boolean
  
  // Customers
  can_view_all_customers: boolean
  can_manage_customers: boolean
  can_export_customers: boolean
  
  // Automation
  can_create_automations: boolean
  can_manage_automations: boolean
  
  // Broadcast
  can_send_broadcasts: boolean
  can_manage_campaigns: boolean
  
  // Reports
  can_view_reports: boolean
  can_export_reports: boolean
  
  // Integrations
  can_manage_integrations: boolean
  can_manage_webhooks: boolean
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<OrganizationRole, Partial<OrganizationPermissions>> = {
  owner: {
    can_manage_organization: true,
    can_manage_billing: true,
    can_invite_members: true,
    can_remove_members: true,
    can_manage_roles: true,
    can_view_all_conversations: true,
    can_assign_conversations: true,
    can_delete_conversations: true,
    can_view_all_customers: true,
    can_manage_customers: true,
    can_export_customers: true,
    can_create_automations: true,
    can_manage_automations: true,
    can_send_broadcasts: true,
    can_manage_campaigns: true,
    can_view_reports: true,
    can_export_reports: true,
    can_manage_integrations: true,
    can_manage_webhooks: true,
  },
  admin: {
    can_manage_organization: true,
    can_invite_members: true,
    can_remove_members: true,
    can_manage_roles: true,
    can_view_all_conversations: true,
    can_assign_conversations: true,
    can_delete_conversations: true,
    can_view_all_customers: true,
    can_manage_customers: true,
    can_export_customers: true,
    can_create_automations: true,
    can_manage_automations: true,
    can_send_broadcasts: true,
    can_manage_campaigns: true,
    can_view_reports: true,
    can_export_reports: true,
    can_manage_integrations: true,
    can_manage_webhooks: true,
  },
  manager: {
    can_invite_members: true,
    can_view_all_conversations: true,
    can_assign_conversations: true,
    can_view_all_customers: true,
    can_manage_customers: true,
    can_create_automations: true,
    can_send_broadcasts: true,
    can_view_reports: true,
    can_export_reports: true,
  },
  agent: {
    can_view_all_conversations: false,
    can_assign_conversations: false,
    can_view_all_customers: false,
    can_manage_customers: false,
    can_view_reports: false,
  },
  viewer: {
    can_view_all_conversations: false,
    can_view_all_customers: false,
    can_view_reports: true,
  },
}