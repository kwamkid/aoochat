// src/components/conversations/customer-info.tsx
"use client"

import { useState } from "react"
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
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import type { Customer, Conversation, Platform } from "@/types/conversation.types"

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !customerTags.includes(newTag.trim())) {
      setCustomerTags([...customerTags, newTag.trim()])
      setNewTag("")
      setShowTagInput(false)
    }
  }

  const handleRemoveTag = (tag: string) => {
    setCustomerTags(customerTags.filter(t => t !== tag))
  }

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">ข้อมูลลูกค้า</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Customer Avatar & Name */}
      <div className="px-4 py-4 text-center border-b">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-medium mx-auto">
            {customer.avatar_url ? (
              <img 
                src={customer.avatar_url} 
                alt={customer.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              customer.name[0]?.toUpperCase()
            )}
          </div>
          {customerTags.includes('vip') && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-lg mt-3">{customer.name}</h3>
        
        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="text-center">
            <p className="text-2xl font-bold">{customer.total_conversations}</p>
            <p className="text-xs text-muted-foreground">การสนทนา</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold">
              {customer.total_spent ? `฿${customer.total_spent.toLocaleString()}` : '฿0'}
            </p>
            <p className="text-xs text-muted-foreground">ยอดซื้อ</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className={cn("text-2xl font-bold", getEngagementColor(customer.engagement_score))}>
              {customer.engagement_score}
            </p>
            <p className="text-xs text-muted-foreground">คะแนน</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-1.5 px-3 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors">
            <UserCheck className="w-4 h-4 inline mr-1" />
            Assign
          </button>
          <button className="flex-1 py-1.5 px-3 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors">
            <Ban className="w-4 h-4 inline mr-1" />
            Block
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
            <span className="font-medium text-sm">ข้อมูลพื้นฐาน</span>
            {expandedSection === 'info' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'info' && (
            <div className="px-4 pb-4 space-y-3">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{customer.email}</p>
                  </div>
                </div>
              )}
              
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{customer.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">
                    เข้าร่วม {format(new Date(customer.created_at), 'd MMMM yyyy', { locale: th })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">
                    ติดต่อล่าสุด {format(new Date(customer.last_contact_at), 'd MMM HH:mm', { locale: th })}
                  </p>
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
            <span className="font-medium text-sm">บัญชีแพลตฟอร์ม</span>
            {expandedSection === 'platforms' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'platforms' && (
            <div className="px-4 pb-4 space-y-2">
              {Object.entries(customer.platform_identities).map(([platform, identity]) => (
                <div key={platform} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <PlatformIcon platform={platform as Platform} className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{platform}</p>
                    <p className="text-xs text-muted-foreground">
                      @{identity.username || identity.displayName || identity.id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('tags')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm">แท็ก</span>
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
                      placeholder="แท็กใหม่..."
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
                    เพิ่มแท็ก
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
            <span className="font-medium text-sm">ประวัติการซื้อ</span>
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ยอดซื้อรวม</span>
                    <span className="font-medium">฿{customer.total_spent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">จำนวนคำสั่งซื้อ</span>
                    <span className="font-medium">5 ครั้ง</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ซื้อล่าสุด</span>
                    <span className="font-medium">3 วันที่แล้ว</span>
                  </div>
                  <button className="w-full py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-muted rounded-lg transition-colors">
                    ดูประวัติทั้งหมด
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ยังไม่มีประวัติการซื้อ
                </p>
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
            <span className="font-medium text-sm">บันทึก</span>
            {expandedSection === 'notes' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSection === 'notes' && (
            <div className="px-4 pb-4">
              <textarea
                placeholder="เพิ่มบันทึกเกี่ยวกับลูกค้า..."
                className="w-full p-3 text-sm bg-muted/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={4}
              />
              <button className="mt-2 px-4 py-1.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors">
                บันทึก
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}