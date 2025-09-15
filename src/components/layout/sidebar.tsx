// src/components/layout/sidebar.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  MessageCircle, 
  Users, 
  UserCircle,
  Settings, 
  BarChart3,
  Zap,
  Menu,
  X,
  Bell,
  Plus,
  Circle,
  Facebook,
  Instagram,
  MessageSquare,
  Send,
  HelpCircle,
  LogOut,
  Building,
  Tag,
  Megaphone,
  FileText,
  Palette,
  Plug,
  Shield,
  CreditCard,
  Database,
  Globe,
  UserPlus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useOrganization } from "@/contexts/organization-context"

// Platform Icons Component
const PlatformIcon = ({ platform, className }: { platform: string; className?: string }) => {
  const icons: Record<string, React.ReactElement> = {
    facebook: <Facebook className={className} />,
    instagram: <Instagram className={className} />,
    line: <MessageSquare className={className} />,
    whatsapp: <Send className={className} />
  }
  return icons[platform] || <Circle className={className} />
}

// Navigation Item Type
interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string | null
  badgeType?: string
  permission?: string
  description?: string
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
}

// Navigation Items
const navigationItems: NavigationSection[] = [
  {
    title: "หลัก",
    items: [
      {
        name: "แดชบอร์ด",
        href: "/dashboard",
        icon: BarChart3,
        badge: null
      },
      {
        name: "การสนทนา",
        href: "/conversations",
        icon: MessageCircle,
        badge: "12",
        badgeType: "error"
      },
      {
        name: "ลูกค้า",
        href: "/customers",
        icon: Users,
        badge: null
      }
    ]
  },
  {
    title: "การจัดการ",
    items: [
      {
        name: "ทีม",
        href: "/team",
        icon: UserCircle,
        badge: null,
        permission: "can_view_all_conversations"
      },
      {
        name: "แท็ก",
        href: "/tags",
        icon: Tag,
        badge: null
      },
      {
        name: "ออโตเมชั่น",
        href: "/automation",
        icon: Zap,
        badge: "PRO",
        badgeType: "info",
        permission: "can_create_automations"
      },
      {
        name: "แคมเปญ",
        href: "/campaigns",
        icon: Megaphone,
        badge: null,
        permission: "can_send_broadcasts"
      },
      {
        name: "รายงาน",
        href: "/reports",
        icon: FileText,
        badge: null,
        permission: "can_view_reports"
      }
    ]
  },
  {
    title: "ตั้งค่า",
    items: [
      {
        name: "การเชื่อมต่อ",
        href: "/settings/platforms",
        icon: Plug,
        badge: "New",
        badgeType: "success",
        description: "จัดการ Platform integrations",
        permission: "can_manage_integrations"
      },
      {
        name: "สมาชิก",
        href: "/settings/members",
        icon: UserPlus,
        badge: null,
        permission: "can_invite_members"
      },
      {
        name: "องค์กร",
        href: "/settings/organization",
        icon: Building,
        badge: null,
        permission: "can_manage_organization"
      },
      {
        name: "ความปลอดภัย",
        href: "/settings/security",
        icon: Shield,
        badge: null
      },
      {
        name: "การเรียกเก็บเงิน",
        href: "/settings/billing",
        icon: CreditCard,
        badge: null,
        permission: "can_manage_billing"
      },
      {
        name: "API & Webhooks",
        href: "/settings/api",
        icon: Globe,
        badge: null,
        permission: "can_manage_webhooks"
      },
      {
        name: "ตั้งค่าทั่วไป",
        href: "/settings",
        icon: Settings,
        badge: null
      }
    ]
  }
]

// Platform Connections (for quick status)
const platformConnections = [
  {
    id: "facebook",
    name: "Facebook",
    status: "connected",
    accounts: 2
  },
  {
    id: "instagram",
    name: "Instagram", 
    status: "connected",
    accounts: 1
  },
  {
    id: "line",
    name: "LINE OA",
    status: "disconnected",
    accounts: 0
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    status: "pending",
    accounts: 0
  }
]

interface SidebarProps {
  className?: string
  organization?: any
}

export function Sidebar({ className, organization }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Create a safe wrapper for the organization context
  function useSafeOrganization() {
    try {
      return useOrganization()
    } catch {
      return {
        currentOrganization: null,
        currentMember: null,
        userOrganizations: [],
        loading: false,
        switching: false,
        switchOrganization: async () => {},
        refreshOrganizations: async () => {},
        refreshCurrentOrganization: async () => {},
        hasPermission: () => true,
        user: null
      }
    }
  }
  
  const orgContext = useSafeOrganization()
  const hasPermission = orgContext?.hasPermission || (() => true)

  // Check if mounted to avoid SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileOpen])

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            AooChat
          </span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Organization Info */}
      <div className="px-4 py-3 border-b">
        <Link
          href="/organizations"
          className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium truncate">
              {organization?.name || 'Select Organization'}
            </p>
            <p className="text-xs text-muted-foreground">
              {organization?.subscription_plan || 'Free'} Plan
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation - All sections visible */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navigationItems.map((section) => {
          // Filter items based on permissions
          const visibleItems = section.items.filter(item => 
            !item.permission || hasPermission(item.permission)
          )
          
          if (visibleItems.length === 0) return null
          
          return (
            <div key={section.title}>
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
              
              <div className="mt-2 space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || 
                                  (item.href !== '/settings' && pathname.startsWith(item.href))
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg transition-all group",
                        isActive
                          ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-full",
                          item.badgeType === "error" 
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : item.badgeType === "info"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : item.badgeType === "success"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Platform Status Section */}
        <div>
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            สถานะแพลตฟอร์ม
          </p>
          
          <div className="mt-2 space-y-1">
            {platformConnections.map((platform) => (
              <div
                key={platform.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors group cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    platform.status === "connected" 
                      ? "bg-green-100 dark:bg-green-900/30"
                      : platform.status === "pending"
                      ? "bg-yellow-100 dark:bg-yellow-900/30"
                      : "bg-gray-100 dark:bg-gray-900/30"
                  )}>
                    <PlatformIcon 
                      platform={platform.id} 
                      className={cn(
                        "w-4 h-4",
                        platform.status === "connected"
                          ? "text-green-600 dark:text-green-400"
                          : platform.status === "pending"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-gray-400"
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {platform.status === "connected" 
                        ? `${platform.accounts} เพจ`
                        : platform.status === "pending"
                        ? "รอการอนุมัติ"
                        : "ยังไม่เชื่อมต่อ"
                      }
                    </p>
                  </div>
                </div>
                {platform.status === "connected" && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            ))}
            
            <Link 
              href="/settings/platforms"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              จัดการการเชื่อมต่อ
            </Link>
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t space-y-2">
        <Link
          href="/help"
          className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          ช่วยเหลือ
        </Link>
        
        {/* Storage Usage */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>พื้นที่ใช้งาน</span>
            <span>2.5 GB / 10 GB</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-gradient-to-r from-brand-400 to-brand-600 rounded-full" />
          </div>
        </div>
      </div>
    </>
  )

  // Don't render anything on server side
  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border rounded-lg shadow-sm hover:bg-muted transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <>
          <div
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
          />
          <div className={cn(
            "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-xl flex flex-col transition-transform duration-300",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <SidebarContent />
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col bg-card border-r",
        className
      )}>
        <SidebarContent />
      </div>
    </>
  )
}