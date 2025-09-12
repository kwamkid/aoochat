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
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      <Sidebar className="fixed inset-y-0 z-50 w-72 lg:hidden" />
      
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col" />
      
      {/* Main Content */}
      <div className="lg:pl-72">
        <Header user={user} />
        
        {/* Page Content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}