// src/app/(dashboard)/settings/platforms/page.tsx
"use client"

import { useState } from 'react'
import { Facebook, Instagram, MessageSquare, Send, ShoppingBag, Music } from 'lucide-react'
import { FacebookSettings } from '@/components/settings/platforms/facebook/FacebookSettings'
import { cn } from '@/lib/utils'

type Platform = 'facebook' | 'instagram' | 'line' | 'whatsapp' | 'shopee' | 'tiktok'

interface PlatformConfig {
  id: Platform
  name: string
  icon: React.ReactNode
  description: string
  color: string
  bgColor: string
  status: 'connected' | 'available' | 'coming-soon'
}

const platforms: PlatformConfig[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    description: 'Connect Facebook Pages and Messenger',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    status: 'available'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    description: 'Manage Instagram Direct Messages',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    status: 'coming-soon'
  },
  {
    id: 'line',
    name: 'LINE',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Connect LINE Official Account',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    status: 'coming-soon'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: <Send className="w-5 h-5" />,
    description: 'WhatsApp Business API',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    status: 'coming-soon'
  },
  {
    id: 'shopee',
    name: 'Shopee',
    icon: <ShoppingBag className="w-5 h-5" />,
    description: 'Shopee Chat Integration',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    status: 'coming-soon'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <Music className="w-5 h-5" />,
    description: 'TikTok Shop Messages',
    color: 'text-gray-900',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    status: 'coming-soon'
  }
]

export default function PlatformSettingsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>('facebook')

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your social media and e-commerce platforms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform List */}
        <div className="lg:col-span-1">
          <div className="space-y-2">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                disabled={platform.status === 'coming-soon'}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left",
                  selectedPlatform === platform.id
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                    : "border-border hover:bg-muted/50",
                  platform.status === 'coming-soon' && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn("p-2 rounded-lg", platform.bgColor)}>
                  <div className={platform.color}>
                    {platform.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {platform.description}
                  </p>
                </div>
                {platform.status === 'connected' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
                {platform.status === 'coming-soon' && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">Soon</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Settings */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg">
            {selectedPlatform === 'facebook' && (
              <FacebookSettings />
            )}
            
            {selectedPlatform && selectedPlatform !== 'facebook' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  {platforms.find(p => p.id === selectedPlatform)?.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {platforms.find(p => p.id === selectedPlatform)?.name}
                </h3>
                <p className="text-muted-foreground">
                  {platforms.find(p => p.id === selectedPlatform)?.status === 'coming-soon'
                    ? 'This integration is coming soon!'
                    : 'Select this platform to configure settings'}
                </p>
              </div>
            )}
            
            {!selectedPlatform && (
              <div className="p-8 text-center text-muted-foreground">
                Select a platform to view settings
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}