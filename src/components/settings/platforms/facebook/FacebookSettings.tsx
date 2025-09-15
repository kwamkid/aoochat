// src/components/settings/platforms/facebook/FacebookSettings.tsx

"use client"

import { useState, useEffect } from 'react'
import { useOrganization } from '@/contexts/organization-context'
import { Facebook, Loader2, Trash2, Power } from 'lucide-react'
import { toast } from 'sonner'

interface FacebookPage {
  id: string
  account_id: string
  account_name: string
  is_active: boolean
  last_sync_at?: string
}

export function FacebookSettings() {
  const { currentOrganization } = useOrganization()
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [loading, setLoading] = useState(true)
  
  // Load connected pages
  useEffect(() => {
    if (currentOrganization) {
      loadPages()
    }
  }, [currentOrganization])
  
  const loadPages = async () => {
    try {
      const res = await fetch(`/api/platforms/facebook/pages?orgId=${currentOrganization?.id}`)
      const data = await res.json()
      if (data.success) {
        setPages(data.pages)
      }
    } catch (error) {
      toast.error('Failed to load pages')
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = () => {
    window.location.href = `/api/platforms/facebook/connect?action=auth&orgId=${currentOrganization?.id}`
  }
  
  const handleToggle = async (pageId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/platforms/facebook/pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          isActive: !isActive,
          organizationId: currentOrganization?.id
        })
      })
      
      if (res.ok) {
        toast.success(isActive ? 'Page disabled' : 'Page enabled')
        loadPages()
      }
    } catch (error) {
      toast.error('Failed to update page')
    }
  }
  
  const handleDelete = async (pageId: string) => {
    if (!confirm('Remove this page connection?')) return
    
    try {
      const res = await fetch(
        `/api/platforms/facebook/connect?pageId=${pageId}&orgId=${currentOrganization?.id}`,
        { method: 'DELETE' }
      )
      
      if (res.ok) {
        toast.success('Page removed')
        loadPages()
      }
    } catch (error) {
      toast.error('Failed to remove page')
    }
  }
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      </div>
    )
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Check organization first */}
      {!currentOrganization ? (
        <div className="text-center py-12 text-gray-500">
          <p>Please select an organization first</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Facebook Pages</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage pages for {currentOrganization.name}
                  </p>
                </div>
              </div>
              
              {pages.length === 0 && !loading && (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Facebook
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="text-sm text-muted-foreground">Loading pages...</p>
              </div>
            ) : pages.length > 0 ? (
              <div className="space-y-3">
                {pages.map(page => (
                  <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg bg-background">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        page.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <h3 className="font-medium">{page.account_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {page.is_active ? 'Receiving messages' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggle(page.account_id, page.is_active)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          page.is_active 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' 
                            : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                        }`}
                      >
                        <Power className="w-3 h-3 inline mr-1" />
                        {page.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(page.account_id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={handleConnect}
                  className="w-full py-3 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                  + Add Another Page
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Facebook className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-muted-foreground mb-4">No pages connected yet</p>
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Your First Page
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}