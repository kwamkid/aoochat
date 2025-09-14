// src/components/layout/sidebar.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  Users, 
  UserCircle,
  Settings, 
  BarChart3,
  Zap,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
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
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"

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

// Navigation Items
const navigationItems = [
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
        badge: "12", // จำนวนข้อความใหม่
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
        badge: null
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
        badgeType: "info"
      },
      {
        name: "แคมเปญ",
        href: "/campaigns",
        icon: Megaphone,
        badge: null
      },
      {
        name: "รายงาน",
        href: "/reports",
        icon: FileText,
        badge: null
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
        description: "จัดการ Platform integrations"
      },
      {
        name: "องค์กร",
        href: "/settings/organization",
        icon: Building,
        badge: null
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
        badge: null
      },
      {
        name: "API & Webhooks",
        href: "/settings/api",
        icon: Globe,
        badge: null
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
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isPlatformOpen, setIsPlatformOpen] = useState(false)
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(["หลัก"])

  // Auto-expand section if current path is in it
  useEffect(() => {
    navigationItems.forEach(section => {
      const hasActiveItem = section.items.some(item => pathname.startsWith(item.href))
      if (hasActiveItem && !expandedSections.includes(section.title)) {
        setExpandedSections(prev => [...prev, section.title])
      }
    })
  }, [pathname])

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

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionTitle) 
        ? prev.filter(t => t !== sectionTitle)
        : [...prev, sectionTitle]
    )
  }

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

      {/* Team Selector */}
      <div className="px-4 py-3 border-b">
        <button
          onClick={() => setIsTeamMenuOpen(!isTeamMenuOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">บริษัท ABC</p>
              <p className="text-xs text-muted-foreground">Pro Plan</p>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isTeamMenuOpen && "rotate-180"
          )} />
        </button>
        
        <AnimatePresence>
          {isTeamMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 space-y-1 overflow-hidden"
            >
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors">
                เปลี่ยนองค์กร
              </button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors">
                ตั้งค่าองค์กร
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navigationItems.map((section) => {
          const isExpanded = expandedSections.includes(section.title)
          
          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{section.title}</span>
                <ChevronRight className={cn(
                  "w-3 h-3 transition-transform",
                  isExpanded && "rotate-90"
                )} />
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 space-y-1 overflow-hidden"
                  >
                    {section.items.map((item) => {
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
                            <div>
                              <span className="text-sm font-medium">{item.name}</span>
                              {item.description && (
                                <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  {item.description}
                                </p>
                              )}
                            </div>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Quick Platform Status */}
        <div>
          <button
            onClick={() => setIsPlatformOpen(!isPlatformOpen)}
            className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <span>สถานะแพลตฟอร์ม</span>
            <ChevronRight className={cn(
              "w-3 h-3 transition-transform",
              isPlatformOpen && "rotate-90"
            )} />
          </button>
          
          <AnimatePresence>
            {isPlatformOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {platformConnections.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
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
              </motion.div>
            )}
          </AnimatePresence>
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
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-xl flex flex-col"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

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