// src/components/customers/sync-profile-button.tsx
"use client"

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { customerProfileSyncService } from '@/services/customers/profile-sync.service'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SyncProfileButtonProps {
  customerId: string
  onSuccess?: () => void
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}

export function SyncProfileButton({
  customerId,
  onSuccess,
  className,
  size = 'sm',
  variant = 'ghost'
}: SyncProfileButtonProps) {
  const [syncing, setSyncing] = useState(false)
  
  const handleSync = async () => {
    setSyncing(true)
    
    try {
      const success = await customerProfileSyncService.syncCustomerProfile(customerId)
      
      if (success) {
        toast.success('Profile synced successfully')
        onSuccess?.()
      } else {
        toast.error('Failed to sync profile')
      }
    } catch (error) {
      console.error('Error syncing profile:', error)
      toast.error('Error syncing profile')
    } finally {
      setSyncing(false)
    }
  }
  
  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      size={size}
      variant={variant}
      className={cn('gap-2', className)}
    >
      <RefreshCw className={cn(
        'w-4 h-4',
        syncing && 'animate-spin'
      )} />
      {syncing ? 'Syncing...' : 'Sync Profile'}
    </Button>
  )
}