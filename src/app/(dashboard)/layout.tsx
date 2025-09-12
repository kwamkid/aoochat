// src/app/(dashboard)/layout.tsx
"use client"

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { Toaster } from 'sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // For now, skip auth check to focus on real-time features
  // In production, handle auth properly
  
  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <Sidebar className="fixed inset-y-0 z-50 w-72 lg:hidden" />
      
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col" />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-72 flex flex-col">
        <Header user={null} />
        
        {/* Page Content - No padding for full-width pages */}
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