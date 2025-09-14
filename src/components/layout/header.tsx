// src/components/layout/header.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  Bell, 
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  CreditCard,
  Shield,
  Moon,
  Sun,
  Monitor,
  Check,
  Clock,
  MessageCircle,
  Users,
  ShoppingCart,
  AlertCircle,
  X,
  Command,
  Building,
  ArrowRightLeft,
  Loader2
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { UserOrganization } from "@/types/organization.types"

// Import useOrganization - it should handle cases where context doesn't exist
import { useOrganization } from "@/contexts/organization-context"

// Notification Types
type NotificationType = "message" | "customer" | "order" | "system"

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  time: string
  read: boolean
  icon?: React.ReactNode
  actionUrl?: string
}

// Mock Notifications Data
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "message",
    title: "ข้อความใหม่จาก Facebook",
    description: "คุณลูกค้าสอบถามเกี่ยวกับสินค้ารหัส #1234",
    time: "5 นาทีที่แล้ว",
    read: false,
    icon: <MessageCircle className="w-4 h-4" />,
    actionUrl: "/conversations/123"
  },
  {
    id: "2",
    type: "customer",
    title: "ลูกค้าใหม่",
    description: "มีลูกค้าใหม่ 3 คนจาก LINE Official",
    time: "1 ชั่วโมงที่แล้ว",
    read: false,
    icon: <Users className="w-4 h-4" />,
    actionUrl: "/customers"
  },
  {
    id: "3",
    type: "order",
    title: "คำสั่งซื้อใหม่",
    description: "คำสั่งซื้อ #5678 จาก Shopee มูลค่า ฿1,250",
    time: "2 ชั่วโมงที่แล้ว",
    read: true,
    icon: <ShoppingCart className="w-4 h-4" />,
    actionUrl: "/orders/5678"
  },
  {
    id: "4",
    type: "system",
    title: "อัพเดตระบบ",
    description: "ระบบจะทำการอัพเดตในวันที่ 15 ม.ค. เวลา 02:00 น.",
    time: "เมื่อวาน",
    read: true,
    icon: <AlertCircle className="w-4 h-4" />,
  }
]

interface HeaderProps {
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  } | null
  organization?: any
}

export function Header({ user, organization }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isOrgSwitcherOpen, setIsOrgSwitcherOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(mockNotifications)
  
  // Try to use organization context
  let orgContext: any = {
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
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    orgContext = useOrganization()
  } catch (error) {
    // Context not available, use default values
  }
  
  const { userOrganizations, switchOrganization, switching } = orgContext || {}
  
  // Refs for click outside
  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const orgSwitcherRef = useRef<HTMLDivElement>(null)

  // Check if mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (orgSwitcherRef.current && !orgSwitcherRef.current.contains(event.target as Node)) {
        setIsOrgSwitcherOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        setIsSearchOpen(true)
      }
      // Escape to close
      if (event.key === "Escape") {
        setIsSearchOpen(false)
        setIsNotificationOpen(false)
        setIsUserMenuOpen(false)
        setIsOrgSwitcherOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ))
    
    // Navigate if has action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
      setIsNotificationOpen(false)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    const iconClass = "w-4 h-4"
    switch (type) {
      case "message":
        return <MessageCircle className={iconClass} />
      case "customer":
        return <Users className={iconClass} />
      case "order":
        return <ShoppingCart className={iconClass} />
      case "system":
        return <AlertCircle className={iconClass} />
      default:
        return <Bell className={iconClass} />
    }
  }

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "message":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
      case "customer":
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
      case "order":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
      case "system":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleSwitchOrganization = async (org: UserOrganization) => {
    if (switchOrganization && org.organization_id !== organization?.id) {
      await switchOrganization(org.organization_id)
      setIsOrgSwitcherOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 md:px-6">
      {/* Search Section */}
      <div className="flex-1 flex items-center gap-4">
        {/* Organization Switcher (Quick Access) */}
        {organization && userOrganizations && userOrganizations.length > 1 && (
          <div ref={orgSwitcherRef} className="relative">
            <button
              onClick={() => setIsOrgSwitcherOpen(!isOrgSwitcherOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
            >
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">{organization.name}</span>
              <ArrowRightLeft className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {isOrgSwitcherOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute left-0 mt-2 w-64 bg-card border rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="p-2">
                    <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">
                      เปลี่ยนองค์กร
                    </p>
                    {userOrganizations.map((org: UserOrganization) => (
                      <button
                        key={org.organization_id}
                        onClick={() => handleSwitchOrganization(org)}
                        disabled={switching || org.organization_id === organization.id}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between",
                          org.organization_id === organization.id
                            ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400"
                            : "hover:bg-muted"
                        )}
                      >
                        <div>
                          <p className="font-medium">{org.organization_name}</p>
                          <p className="text-xs text-muted-foreground">{org.user_role}</p>
                        </div>
                        {org.organization_id === organization.id && (
                          <Check className="w-4 h-4" />
                        )}
                        {switching && org.organization_id !== organization.id && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t p-2">
                    <button
                      onClick={() => {
                        router.push("/organizations")
                        setIsOrgSwitcherOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                    >
                      จัดการองค์กรทั้งหมด
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Search Bar */}
        <div ref={searchRef} className="relative w-full max-w-md">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">ค้นหา...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-background border rounded">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>

          {/* Search Modal */}
          <AnimatePresence>
            {isSearchOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black z-50"
                  onClick={() => setIsSearchOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-card border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="ค้นหาลูกค้า, การสนทนา, หรือคำสั่งซื้อ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">การทำงานด่วน</p>
                    <div className="space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors text-left">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        <span>เปิดการสนทนาล่าสุด</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors text-left">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>เพิ่มลูกค้าใหม่</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors text-left">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span>ตั้งค่าระบบ</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle - Only render after mount to avoid hydration mismatch */}
        {mounted && (
          <div className="hidden sm:flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "p-1.5 rounded transition-colors",
                theme === "light" 
                  ? "bg-background text-brand-500 shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Light mode"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "p-1.5 rounded transition-colors",
                theme === "dark" 
                  ? "bg-background text-brand-500 shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Dark mode"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "p-1.5 rounded transition-colors",
                theme === "system" 
                  ? "bg-background text-brand-500 shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="System mode"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {isNotificationOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border rounded-xl shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="font-semibold">การแจ้งเตือน</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      อ่านทั้งหมด
                    </button>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left",
                          !notification.read && "bg-brand-50/50 dark:bg-brand-950/20"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          getNotificationColor(notification.type)
                        )}>
                          {notification.icon || getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      ไม่มีการแจ้งเตือน
                    </div>
                  )}
                </div>
                
                <div className="px-4 py-2 border-t">
                  <button className="w-full text-sm text-brand-600 dark:text-brand-400 hover:underline">
                    ดูทั้งหมด
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">
                {user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* User Dropdown */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 w-56 bg-card border rounded-xl shadow-xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium">
                    {user?.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  {organization && (
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {organization.name}
                    </p>
                  )}
                </div>
                
                <div className="p-1">
                  <button
                    onClick={() => {
                      router.push("/profile")
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    โปรไฟล์
                  </button>
                  <button
                    onClick={() => {
                      router.push("/organizations")
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <Building className="w-4 h-4" />
                    เปลี่ยนองค์กร
                  </button>
                  <button
                    onClick={() => {
                      router.push("/settings")
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    ตั้งค่า
                  </button>
                  <button
                    onClick={() => {
                      router.push("/billing")
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    การเรียกเก็บเงิน
                  </button>
                  <button
                    onClick={() => {
                      router.push("/security")
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    ความปลอดภัย
                  </button>
                  
                  <div className="my-1 border-t" />
                  
                  <button
                    onClick={() => {
                      router.push("/help")
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    ช่วยเหลือ
                  </button>
                  
                  <div className="my-1 border-t" />
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    ออกจากระบบ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}