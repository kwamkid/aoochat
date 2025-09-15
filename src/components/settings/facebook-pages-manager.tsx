// src/components/settings/facebook-pages-manager.tsx
"use client"

import { useState, useEffect } from 'react'
import { useOrganization } from '@/contexts/organization-context'
import { useRouter } from 'next/navigation'
import { 
  Facebook, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Link2, 
  Unlink,
  AlertCircle,
  Settings,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FacebookPage {
  id: string
  account_id: string
  account_name: string
  category?: string
  access_token?: string
  is_active: boolean
  last_sync_at?: string
  metadata?: any
}

export function FacebookPagesManager() {
  const router = useRouter()
  const { currentOrganization, loading: orgLoading } = useOrganization()
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)

  // Check URL params for OAuth callback
  useEffect(() => {
    if (!currentOrganization) return
    
    const params = new URLSearchParams(window.location.search)
    
    // Check for success callback
    const success = params.get('success')
    const pageCount = params.get('pages')
    if (success === 'true' && pageCount) {
      toast.success(`Successfully connected ${pageCount} Facebook page(s)`)
      // Clean URL
      router.replace('/settings/platforms')
      // Reload pages
      loadConnectedPages()
      return
    }
    
    // Check for error
    const error = params.get('error')
    if (error) {
      toast.error(`Facebook connection failed: ${error}`)
      router.replace('/settings/platforms')
      return
    }
    
    // Check for token (manual processing)
    const token = params.get('token')
    if (token) {
      setUserToken(token)
      loadAvailablePages(token)
      // Clean URL
      router.replace('/settings/platforms')
    }
  }, [currentOrganization, router])

  // Load connected pages on mount
  useEffect(() => {
    if (currentOrganization) {
      loadConnectedPages()
    }
  }, [currentOrganization])

  // Load pages from Facebook using token
  const loadAvailablePages = async (token: string) => {
    if (!currentOrganization) {
      toast.error('Organization not loaded')
      return
    }
    
    console.log('Loading available pages with token...')
    setLoading(true)
    try {
      const response = await fetch('/api/platforms/facebook/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAccessToken: token,
          organizationId: currentOrganization.id
        })
      })
      
      const data = await response.json()
      console.log('POST response:', data)
      
      if (data.success && data.pages && data.pages.length > 0) {
        console.log(`Setting ${data.pages.length} available pages:`, data.pages)
        setAvailablePages(data.pages)
        toast.success(`Found ${data.count || data.pages.length} Facebook page(s)`)
      } else if (data.pages && data.pages.length === 0) {
        // No pages found - likely user didn't select any
        toast.error(
          'No Facebook pages found. This usually happens when you choose "Opt in to current Pages only" but don\'t select any pages. Please reconnect and either choose "Opt in to all current and future Pages" or make sure to select specific pages.',
          { duration: 8000 }
        )
        setUserToken(null)
        
        // Show reconnect button
        setTimeout(() => {
          if (confirm('Would you like to reconnect to Facebook and select your pages?')) {
            handleConnect()
          }
        }, 2000)
      } else {
        console.error('Failed to load pages:', data)
        toast.error(data.error || 'Failed to load Facebook pages')
        setUserToken(null)
      }
    } catch (error) {
      console.error('Error loading pages:', error)
      toast.error('Failed to connect to Facebook')
      setUserToken(null)
    } finally {
      setLoading(false)
    }
  }

  // Load already connected pages from database
  const loadConnectedPages = async () => {
    if (!currentOrganization) {
      console.log('No organization, skipping page load')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/platforms/facebook/pages?orgId=${currentOrganization.id}`)
      const data = await response.json()
      
      console.log('Loaded pages response:', data)
      
      if (data.success) {
        setPages(data.pages || [])
        if (data.pages && data.pages.length > 0) {
          console.log(`Loaded ${data.pages.length} connected pages`)
        }
      } else {
        console.error('Failed to load pages:', data.error)
        toast.error('Failed to load connected pages')
      }
    } catch (error) {
      console.error('Error loading connected pages:', error)
      toast.error('Failed to load connected pages')
    } finally {
      setLoading(false)
    }
  }

  // Connect to Facebook - pass organization ID
  const handleConnect = () => {
    if (!currentOrganization) {
      toast.error('Please select an organization first')
      return
    }
    
    // Pass organization ID in the OAuth flow
    window.location.href = `/api/platforms/facebook/connect?action=auth&orgId=${currentOrganization.id}`
  }

  // Save selected pages
  const handleSavePages = async () => {
    if (!currentOrganization) {
      toast.error('Organization not loaded')
      return
    }
    
    // Get selected pages from checkboxes
    const checkboxes = document.querySelectorAll('input[name="page-select"]:checked')
    const selectedPages = Array.from(checkboxes).map(cb => {
      const pageId = (cb as HTMLInputElement).value
      return availablePages.find(p => p.id === pageId)
    }).filter(Boolean)
    
    if (selectedPages.length === 0) {
      toast.error('Please select at least one page')
      return
    }
    
    setConnecting(true)
    try {
      const response = await fetch('/api/platforms/facebook/connect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pages: selectedPages,
          organizationId: currentOrganization.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Connected ${data.savedCount} page(s) successfully`)
        
        if (data.errorCount > 0) {
          toast.warning(`Failed to save ${data.errorCount} page(s)`)
        }
        
        // Clear selection and reload
        setAvailablePages([])
        setUserToken(null)
        await loadConnectedPages()
      } else {
        toast.error(data.error || 'Failed to save pages')
      }
    } catch (error) {
      console.error('Error saving pages:', error)
      toast.error('Failed to save pages')
    } finally {
      setConnecting(false)
    }
  }

  // Toggle page active status
  const togglePageStatus = async (pageId: string, isActive: boolean) => {
    if (!currentOrganization) return
    
    try {
      const response = await fetch('/api/platforms/facebook/connect', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId, 
          isActive,
          organizationId: currentOrganization.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(isActive ? 'Page activated' : 'Page deactivated')
        await loadConnectedPages()
      } else {
        toast.error(data.error || 'Failed to update page status')
      }
    } catch (error) {
      console.error('Error toggling page:', error)
      toast.error('Failed to update page status')
    }
  }

  // Sync page data
  const syncPage = async (pageId: string) => {
    if (!currentOrganization) return
    
    setSyncing(pageId)
    try {
      const response = await fetch('/api/platforms/facebook/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId,
          organizationId: currentOrganization.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Page synced successfully')
        await loadConnectedPages()
      } else {
        toast.error(data.error || 'Failed to sync page')
      }
    } catch (error) {
      console.error('Error syncing page:', error)
      toast.error('Failed to sync page')
    } finally {
      setSyncing(null)
    }
  }

  // Delete page connection
  const deletePage = async (pageId: string) => {
    if (!currentOrganization) return
    
    if (!confirm('Are you sure you want to remove this page connection?')) {
      return
    }
    
    try {
      const response = await fetch(
        `/api/platforms/facebook/connect?pageId=${pageId}&orgId=${currentOrganization.id}`,
        { method: 'DELETE' }
      )
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Page removed successfully')
        await loadConnectedPages()
      } else {
        toast.error(data.error || 'Failed to remove page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      toast.error('Failed to remove page')
    }
  }

  // Show loading state if organization not loaded
  if (orgLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No organization selected</p>
          <button
            onClick={() => router.push('/organizations')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Select Organization
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-card rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Facebook className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Facebook Pages</h2>
                <p className="text-sm text-muted-foreground">
                  Manage Facebook pages for {currentOrganization.name}
                </p>
              </div>
            </div>
            
            {!userToken && pages.length === 0 && !loading && (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Connect Facebook Pages
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && pages.length === 0 && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-muted-foreground">Loading pages...</p>
          </div>
        )}

        {/* Debug info */}
        {userToken && (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded m-6">
            <p className="text-xs font-mono">
              Token: {userToken.substring(0, 20)}...
              <br />
              Available Pages: {availablePages.length}
              <br />
              Loading: {loading ? 'Yes' : 'No'}
            </p>
          </div>
        )}

        {/* Page selection (after OAuth) */}
        {!loading && availablePages.length > 0 && (
          <div className="p-6">
            <h3 className="font-medium mb-4">Select pages to connect:</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availablePages.map((page) => (
                <label
                  key={page.account_id || page.id}
                  className="flex items-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    name="page-select"
                    value={page.account_id || page.id}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    defaultChecked
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium">{page.account_name}</p>
                    {page.category && (
                      <p className="text-sm text-muted-foreground">{page.category}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSavePages}
                disabled={connecting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Save Selected Pages
              </button>
              <button
                onClick={() => {
                  setAvailablePages([])
                  setUserToken(null)
                }}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Connected pages list */}
        {!loading && !userToken && pages.length > 0 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Connected Pages ({pages.length})</h3>
              <button
                onClick={handleConnect}
                className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
              >
                <Link2 className="w-3 h-3" />
                Add More Pages
              </button>
            </div>
            
            <div className="space-y-3">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg transition-all",
                    page.is_active ? "bg-background" : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      page.is_active ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <div>
                      <p className="font-medium">{page.account_name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {page.is_active ? 'Receiving messages' : 'Inactive'}
                        </p>
                        {page.last_sync_at && (
                          <p className="text-xs text-muted-foreground">
                            Last sync: {new Date(page.last_sync_at).toLocaleString('th-TH')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePageStatus(page.account_id, !page.is_active)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1",
                        page.is_active
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                          : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                      )}
                    >
                      {page.is_active ? (
                        <>
                          <Unlink className="w-3 h-3" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3" />
                          Activate
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => syncPage(page.account_id)}
                      disabled={syncing === page.account_id}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                      title="Sync page"
                    >
                      <RefreshCw className={cn(
                        "w-4 h-4 text-muted-foreground",
                        syncing === page.account_id && "animate-spin"
                      )} />
                    </button>
                    
                    <button
                      onClick={() => deletePage(page.account_id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title="Remove page"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !userToken && pages.length === 0 && (
          <div className="p-12 text-center">
            <Facebook className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No Facebook pages connected yet</p>
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Connect Your First Page
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">How to connect:</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Click "Connect Facebook Pages"</li>
              <li>Login with your Facebook account</li>
              <li>Authorize the app to access your pages</li>
              <li>Your pages will be automatically saved</li>
              <li>Activate the pages you want to receive messages from</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}