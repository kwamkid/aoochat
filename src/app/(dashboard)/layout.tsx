// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <Sidebar className="fixed inset-y-0 z-50 w-72 lg:hidden" />
      
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col" />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-72 flex flex-col">
        <Header user={user} />
        
        {/* Page Content - No padding for full-width pages */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}