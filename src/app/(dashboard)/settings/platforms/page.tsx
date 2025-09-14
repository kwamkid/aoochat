// src/app/(dashboard)/settings/platforms/page.tsx
"use client"

import { useState } from 'react'
import { Facebook, Instagram, MessageSquare, Send, ShoppingBag, Music } from 'lucide-react'
import { FacebookPagesManager } from '@/components/settings/facebook-pages-manager'
import { cn } from '@/lib/utils'

type Platform = 'facebook' | 'instagram' | 'line' | 'whatsapp' | 'shopee' | 'tiktok'

const platforms = [
  {
    id: 'facebook' as Platform,
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    description: 'เชื่อมต่อกับ Facebook Pages และ Messenger',
    available: true
  },
  {
    id: 'instagram' as Platform,
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-600 to-pink-500',
    description: 'จัดการข้อความจาก Instagram Direct',
    available: false
  },
  {
    id: 'line' as Platform,
    name: 'LINE',
    icon: MessageSquare,
    color: 'bg-green-500',
    description: 'เชื่อมต่อกับ LINE Official Account',
    available: false
  },
  {
    id: 'whatsapp' as Platform,
    name: 'WhatsApp',
    icon: Send,
    color: 'bg-green-600',
    description: 'รับส่งข้อความผ่าน WhatsApp Business',
    available: false
  },
  {
    id: 'shopee' as Platform,
    name: 'Shopee',
    icon: ShoppingBag,
    color: 'bg-orange-500',
    description: 'จัดการแชทจาก Shopee',
    available: false
  },
  {
    id: 'tiktok' as Platform,
    name: 'TikTok',
    icon: Music,
    color: 'bg-black',
    description: 'รับข้อความจาก TikTok Shop',
    available: false
  }
]

export default function PlatformsSettingsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('facebook')
  
  const currentPlatform = platforms.find(p => p.id === selectedPlatform)
  
  return (
    <div className="h-full flex">
      {/* Sidebar - Platform List */}
      <div className="w-80 border-r bg-card">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Platform Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการการเชื่อมต่อกับแพลตฟอร์มต่างๆ
          </p>
        </div>
        
        <div className="p-4">
          <div className="space-y-2">
            {platforms.map((platform) => {
              const Icon = platform.icon
              return (
                <button
                  key={platform.id}
                  onClick={() => platform.available && setSelectedPlatform(platform.id)}
                  disabled={!platform.available}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                    selectedPlatform === platform.id
                      ? "bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800"
                      : "hover:bg-muted",
                    !platform.available && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                    platform.color
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{platform.name}</p>
                      {!platform.available && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {platform.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Main Content - Platform Settings */}
      <div className="flex-1 overflow-y-auto">
        {selectedPlatform === 'facebook' && <FacebookPagesManager />}
        
        {selectedPlatform !== 'facebook' && currentPlatform && (
          <div className="p-12 text-center">
            <div className={cn(
              "w-20 h-20 rounded-xl mx-auto mb-6 flex items-center justify-center text-white",
              currentPlatform.color
            )}>
              <currentPlatform.icon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">{currentPlatform.name}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {currentPlatform.description}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                🚧 กำลังพัฒนา - เร็วๆ นี้
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}