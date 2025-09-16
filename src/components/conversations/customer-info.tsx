// src/components/conversations/customer-info.tsx
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  ShoppingBag,
  MessageCircle,
  DollarSign,
  TrendingUp,
  Tag,
  Edit,
  MoreVertical,
  Star,
  Ban,
  UserCheck,
  Clock,
  Hash,
  Plus,
  ChevronDown,
  ChevronRight,
  Facebook,
  Instagram,
  Send,
  MessageSquare,
  Globe,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Shield,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import type { Customer, Conversation, Platform } from "@/types/conversation.types"
import { usePlatformInfo, usePlatformTheme } from '@/hooks/use-platform-info'
import { PlatformAvatar } from './platform-avatar'
import { toast } from "sonner"
import { customerProfileSyncService } from '@/services/customers/profile-sync.service'

// Platform Icon Component
const PlatformIcon = ({ platform, className }: { platform: Platform; className?: string }) => {
  const icons: Record<Platform, React.ReactElement> = {
    facebook: <Facebook className={className} />,
    instagram: <Instagram className={className} />,
    line: <MessageSquare className={className} />,
    whatsapp: <Send className={className} />,
    shopee: <ShoppingBag className={className} />,
    lazada: <ShoppingBag className={className} />,
    tiktok: <MessageSquare className={className} />
  }
  return icons[platform] || <MessageCircle className={className} />
}

// Platform Identity Item Component (to fix hooks rule)
function PlatformIdentityItem({ 
  platform, 
  identity, 
  isCurrentPlatform 
}: { 
  platform: Platform
  identity: any
  isCurrentPlatform: boolean 
}) {
  const theme = usePlatformTheme(platform)
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-lg transition-colors",
        isCurrentPlatform 
          ? `${theme.hoverBg} ${theme.darkBg} border-2 ${theme.borderColor}` 
          : "bg-muted/50 hover:bg-muted"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-white",
          theme.bgColor
        )}>
          <PlatformIcon platform={platform} className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium capitalize flex items-center gap-2">
            {platform}
            {isCurrentPlatform && (
              <span className="text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            @{identity.username || identity.displayName || identity.id}
          </p>
        </div>
      </div>
      <button className="p-1 hover:bg-background rounded transition-colors">
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  )
}

interface CustomerInfoProps {
  customer: Customer
  conversation: Conversation
  onClose: () => void
}

export function CustomerInfo({ customer, conversation, onClose }: CustomerInfoProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('info')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [customerTags, setCustomerTags] = useState(customer.tags)
  const [notes, setNotes] = useState("")
  const [editingNotes, setEditingNotes] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  // Get platform info
  const pageId = conversation.platform_conversation_id?.split('_')[0]
  const customerId = customer.platform_identities[conversation.platform]?.id
  
  const { pageInfo, customerInfo } = usePlatformInfo({
    platform: conversation.platform,
    pageId: pageId || null,
    customerId: customerId || null
  })
  
  const platformTheme = usePlatformTheme(conversation.platform)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !customerTags.includes(newTag.trim())) {
      setCustomerTags([...customerTags, newTag.trim()])
      setNewTag("")
      setShowTagInput(false)
      toast.success('Tag added successfully')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setCustomerTags(customerTags.filter(t => t !== tag))
    toast.success('Tag removed')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleSyncProfile = async () => {
    setSyncing(true)
    
    try {
      const success = await customerProfileSyncService.syncCustomerProfile(customer.id)
      
      if (success) {
        toast.success('Profile synced successfully')
        // Reload page to get updated data
        window.location.reload()
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

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return "🔥"
    if (score >= 60) return "⭐"
    if (score >= 40) return "📈"
    return "⚠️"
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">Customer Information</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Enhanced Customer Profile */}
      <div className="px-4 py-6 text-center border-b bg-gradient-to-b from-muted/30 to-transparent">
        <div className="relative inline-block">
          {/* Main Avatar - Customer Profile (Not Page!) */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600">
              {(customerInfo?.profilePic || customer.avatar_url) ? (
                <img
                  src={customerInfo?.profilePic || customer.avatar_url || ''}
                  alt={customerInfo?.name || customer.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-2xl font-medium">${(customerInfo?.name || customer.name)[0]?.toUpperCase()}</div>`
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-medium">
                  {(customerInfo?.name || customer.name)[0]?.toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Platform Badge - Bottom Right */}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md",
              platformTheme.bgColor
            )}>
              <PlatformIcon platform={conversation.platform} className="w-3.5 h-3.5" />
            </div>
            
            {/* Page Logo - Top Left (Small) */}
            {pageInfo?.pageAvatar && (
              <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                <img
                  src={pageInfo.pageAvatar}
                  alt={pageInfo.pageName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          
          {/* VIP Badge */}
          {customerTags.includes('vip') && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-xl mt-4 flex items-center justify-center gap-2">
          {customerInfo?.name || customer.name}
          {customerInfo?.firstName && customerInfo?.lastName && (
            <span className="text-sm text-muted-foreground">
              ({customerInfo.firstName} {customerInfo.lastName})
            </span>
          )}
        </h3>
        
        {/* Platform Username */}
        <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
          <PlatformIcon platform={conversation.platform} className="w-4 h-4" />
          @{customer.platform_identities[conversation.platform]?.username || customerId}
          <button
            onClick={() => copyToClipboard(
              customer.platform_identities[conversation.platform]?.username || customerId || '',
              'Username'
            )}
            className="hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
        </p>
        
        {/* Quick Stats with Icons */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-background rounded-lg p-3">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              {customer.total_conversations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Conversations</p>
          </div>
          <div className="bg-background rounded-lg p-3">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <DollarSign className="w-5 h-5 text-green-500" />
              {customer.total_spent ? `${(customer.total_spent/1000).toFixed(1)}k` : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Spent</p>
          </div>
          <div className="bg-background rounded-lg p-3">
            <div className={cn("text-2xl font-bold flex items-center justify-center gap-1", getEngagementColor(customer.engagement_score))}>
              <span>{getScoreIcon(customer.engagement_score)}</span>
              {customer.engagement_score}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Engagement</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-1.5 px-3 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-1">
            <UserCheck className="w-4 h-4" />
            Assign
          </button>
          
          {/* Sync Profile Button */}
          <button
            onClick={handleSyncProfile}
            disabled={syncing}
            className="py-1.5 px-3 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          
          <button className="flex-1 py-1.5 px-3 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-1">
            <Shield className="w-4 h-4" />
            VIP
          </button>
          <button className="p-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Basic Information */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('info')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Basic Information
            </span>
            {expandedSection === 'info' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'info' && (
            <div className="px-4 pb-4 space-y-3">
              {/* Email */}
              {(customer.email || customerInfo?.userId) && (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{customer.email || `${customerInfo?.userId}@facebook.com`}</p>
                      <p className="text-xs text-muted-foreground">Email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(customer.email || '', 'Email')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {/* Phone */}
              {customer.phone && (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{customer.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(customer.phone || '', 'Phone')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {/* Location */}
              {customerInfo?.locale && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{customerInfo.locale}</p>
                    <p className="text-xs text-muted-foreground">Locale</p>
                  </div>
                </div>
              )}
              
              {/* Timezone */}
              {customerInfo?.timezone !== undefined && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">GMT{customerInfo.timezone >= 0 ? '+' : ''}{customerInfo.timezone}</p>
                    <p className="text-xs text-muted-foreground">Timezone</p>
                  </div>
                </div>
              )}
              
              {/* First Contact */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">
                    {format(new Date(customer.created_at), 'd MMMM yyyy', { locale: th })}
                  </p>
                  <p className="text-xs text-muted-foreground">First Contact</p>
                </div>
              </div>
              
              {/* Last Active */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">
                    {format(new Date(customer.last_contact_at), 'd MMM HH:mm', { locale: th })}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Active</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Platform Accounts */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('platforms')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Connected Platforms
            </span>
            {expandedSection === 'platforms' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'platforms' && (
            <div className="px-4 pb-4 space-y-2">
              {Object.entries(customer.platform_identities).map(([platform, identity]) => {
                const isCurrentPlatform = platform === conversation.platform
                
                return (
                  <PlatformIdentityItem
                    key={platform}
                    platform={platform as Platform}
                    identity={identity}
                    isCurrentPlatform={isCurrentPlatform}
                  />
                )
              })}
              
              {/* Page Info */}
              {pageInfo && (
                <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-950/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img 
                      src={pageInfo.pageAvatar || ''} 
                      alt={pageInfo.pageName}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-1">
                        {pageInfo.pageName}
                        {pageInfo.pageVerified && (
                          <CheckCircle className="w-3 h-3 text-blue-500" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pageInfo.pageCategory} • {pageInfo.pageFollowers?.toLocaleString()} followers
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('tags')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags & Labels
            </span>
            {expandedSection === 'tags' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'tags' && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {customerTags.map(tag => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-full text-sm"
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
                
                {showTagInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      onBlur={() => setShowTagInput(false)}
                      placeholder="New tag..."
                      className="px-2 py-1 text-sm bg-transparent border rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-dashed rounded-full text-sm hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Tag
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Purchase History */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('purchases')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Purchase History
            </span>
            {expandedSection === 'purchases' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'purchases' && (
            <div className="px-4 pb-4">
              {customer.total_spent && customer.total_spent > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                      <p className="text-lg font-bold">฿{customer.total_spent.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Orders</p>
                      <p className="text-lg font-bold">5</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average Order Value</span>
                      <span className="font-medium">฿{(customer.total_spent / 5).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Purchase</span>
                      <span className="font-medium">3 days ago</span>
                    </div>
                  </div>
                  
                  <button className="w-full py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-muted rounded-lg transition-colors">
                    View All Orders →
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No purchase history yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('notes')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Internal Notes
            </span>
            {expandedSection === 'notes' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'notes' && (
            <div className="px-4 pb-4">
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this customer..."
                    className="w-full p-3 text-sm bg-muted/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingNotes(false)
                        toast.success('Notes saved')
                      }}
                      className="px-3 py-1.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => {
                        setEditingNotes(false)
                        setNotes('')
                      }}
                      className="px-3 py-1.5 bg-muted text-sm rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {notes ? (
                    <div 
                      onClick={() => setEditingNotes(true)}
                      className="p-3 bg-muted/50 rounded-lg text-sm cursor-pointer hover:bg-muted transition-colors"
                    >
                      {notes}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setEditingNotes(true)}
                      className="w-full p-3 text-sm text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      Click to add notes...
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}