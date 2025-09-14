// src/contexts/organization-context.tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { organizationService } from '@/services/organizations/organization.service'
import type { Organization, OrganizationMember, UserOrganization } from '@/types/organization.types'
import { toast } from 'sonner'

interface OrganizationContextType {
  // Current organization
  currentOrganization: Organization | null
  currentMember: OrganizationMember | null
  
  // User's organizations
  userOrganizations: UserOrganization[]
  
  // Loading states
  loading: boolean
  switching: boolean
  
  // Actions
  switchOrganization: (orgId: string) => Promise<void>
  refreshOrganizations: () => Promise<void>
  refreshCurrentOrganization: () => Promise<void>
  hasPermission: (permission: string) => boolean
  
  // User
  user: any | null
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

// Pages that don't need organization context
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/organizations',
  '/invite',
]

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null)
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  // Check if current path requires organization
  const requiresOrganization = !PUBLIC_PATHS.some(path => pathname?.startsWith(path))

  // Initialize organization context
  useEffect(() => {
    initializeContext()
  }, [pathname])

  const initializeContext = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Not logged in
        if (requiresOrganization) {
          router.push('/login')
        }
        setLoading(false)
        return
      }
      
      setUser(user)
      
      // Skip organization loading for public paths
      if (!requiresOrganization) {
        setLoading(false)
        return
      }
      
      // Load user's organizations
      const orgs = await organizationService.getUserOrganizations()
      setUserOrganizations(orgs)
      
      // Check for stored organization ID
      const storedOrgId = localStorage.getItem('current_organization_id')
      
      // Find organization to use
      let targetOrgId: string | null = null
      
      if (storedOrgId && orgs.find(o => o.organization_id === storedOrgId)) {
        // Use stored organization if valid
        targetOrgId = storedOrgId
      } else if (orgs.length > 0) {
        // Use default organization or first one
        const defaultOrg = orgs.find(o => o.is_default)
        targetOrgId = defaultOrg?.organization_id || orgs[0].organization_id
      }
      
      if (targetOrgId) {
        await loadOrganization(targetOrgId)
      } else {
        // No organizations found
        console.log('No organizations found, redirecting to organizations page')
        router.push('/organizations')
      }
    } catch (error) {
      console.error('Error initializing organization context:', error)
      toast.error('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganization = async (orgId: string) => {
    try {
      // Load organization details
      const org = await organizationService.getOrganization(orgId)
      if (!org) {
        throw new Error('Organization not found')
      }
      
      setCurrentOrganization(org)
      
      // Load member details
      const { data: member } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single()
      
      setCurrentMember(member)
      
      // Store in localStorage
      localStorage.setItem('current_organization_id', orgId)
      
      // Update user's last accessed organization
      await supabase
        .from('users')
        .update({ last_accessed_organization_id: orgId })
        .eq('id', user?.id)
      
    } catch (error) {
      console.error('Error loading organization:', error)
      throw error
    }
  }

  const switchOrganization = async (orgId: string) => {
    if (switching || orgId === currentOrganization?.id) return
    
    setSwitching(true)
    try {
      await loadOrganization(orgId)
      
      // Set as default organization
      await organizationService.setDefaultOrganization(orgId)
      
      toast.success('เปลี่ยนองค์กรสำเร็จ')
      
      // Refresh the page to reload all data with new organization context
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error switching organization:', error)
      toast.error('Failed to switch organization')
    } finally {
      setSwitching(false)
    }
  }

  const refreshOrganizations = async () => {
    try {
      const orgs = await organizationService.getUserOrganizations()
      setUserOrganizations(orgs)
    } catch (error) {
      console.error('Error refreshing organizations:', error)
    }
  }

  const refreshCurrentOrganization = async () => {
    if (!currentOrganization) return
    
    try {
      const org = await organizationService.getOrganization(currentOrganization.id)
      if (org) {
        setCurrentOrganization(org)
      }
    } catch (error) {
      console.error('Error refreshing current organization:', error)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentMember) return false
    
    // Owner has all permissions
    if (currentMember.role === 'owner') return true
    
    // Check custom permissions first
    if (currentMember.permissions && currentMember.permissions[permission] !== undefined) {
      return currentMember.permissions[permission]
    }
    
    // Check role-based permissions
    // Import DEFAULT_PERMISSIONS from types
    const { DEFAULT_PERMISSIONS } = require('@/types/organization.types')
    const rolePermissions = DEFAULT_PERMISSIONS[currentMember.role]
    return rolePermissions?.[permission] || false
  }

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear organization context
        setCurrentOrganization(null)
        setCurrentMember(null)
        setUserOrganizations([])
        setUser(null)
        localStorage.removeItem('current_organization_id')
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session) {
        // Reload context when user signs in
        initializeContext()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const value: OrganizationContextType = {
    currentOrganization,
    currentMember,
    userOrganizations,
    loading,
    switching,
    switchOrganization,
    refreshOrganizations,
    refreshCurrentOrganization,
    hasPermission,
    user,
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

// Hook to use organization context
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}

// Hook to get current organization with loading state
export function useCurrentOrganization() {
  const { currentOrganization, loading } = useOrganization()
  return { organization: currentOrganization, loading }
}

// Hook to check permissions
export function usePermission(permission: string): boolean {
  const { hasPermission } = useOrganization()
  return hasPermission(permission)
}