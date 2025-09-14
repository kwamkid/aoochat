// src/app/(dashboard)/layout.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Toaster } from 'sonner'
import { OrganizationProvider, useOrganization } from '@/contexts/organization-context'
import { Loader2 } from 'lucide-react'

// Layout content component that uses organization context
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentOrganization, loading, user } = useOrganization()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state while checking auth and organization
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  if (!user) {
    router.push('/login')
    return null
  }

  // Check if user has organization (skip for organizations page itself)
  if (!currentOrganization && pathname !== '/organizations') {
    router.push('/organizations')
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <Sidebar 
        className="fixed inset-y-0 z-50 w-72 lg:hidden" 
        organization={currentOrganization}
      />
      
      {/* Desktop Sidebar */}
      <Sidebar 
        className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col" 
        organization={currentOrganization}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-72 flex flex-col">
        <Header 
          user={user} 
          organization={currentOrganization}
        />
        
        {/* Page Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        expand={false}
        duration={4000}
        toastOptions={{
          style: {
            marginTop: '4rem', // Account for header
          },
        }}
      />
    </div>
  )
}

// Main layout component with provider
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OrganizationProvider>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </OrganizationProvider>
  )
}