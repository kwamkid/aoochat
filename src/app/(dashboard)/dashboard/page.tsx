// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
          <p className="text-muted-foreground">
            You are logged in as: {user.email}
          </p>
          <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
          
          <form action="/api/auth/signout" method="post">
            <button 
              type="submit"
              className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}