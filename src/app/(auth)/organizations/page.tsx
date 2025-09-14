// src/app/(auth)/organizations/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { organizationService } from "@/services/organizations/organization.service"
import type { UserOrganization } from "@/types/organization.types"
import { 
  Building, 
  Plus, 
  ChevronRight, 
  Loader2, 
  LogOut,
  CheckCircle,
  Users,
  Calendar,
  Settings
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

export default function OrganizationsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setUser(user)

      // Load user's organizations
      const orgs = await organizationService.getUserOrganizations()
      setOrganizations(orgs)

      // If user has only one org and it's default, auto-select it
      if (orgs.length === 1 && orgs[0].is_default) {
        await selectOrganization(orgs[0].organization_id)
      }
    } catch (error) {
      console.error("Error loading organizations:", error)
      toast.error("Failed to load organizations")
    } finally {
      setLoading(false)
    }
  }

  const selectOrganization = async (orgId: string) => {
    setSelecting(orgId)
    try {
      // Set as default organization
      await organizationService.setDefaultOrganization(orgId)
      
      // Store in localStorage for quick access
      localStorage.setItem("current_organization_id", orgId)
      
      // Navigate to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error selecting organization:", error)
      toast.error("Failed to select organization")
      setSelecting(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-background dark:via-brand-950/20 dark:to-background">
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl mb-4 shadow-lg">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">เลือกองค์กร</h1>
          <p className="text-muted-foreground">
            สวัสดี {user?.email} 👋
          </p>
        </motion.div>

        {/* Organizations Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-4xl"
        >
          {organizations.length === 0 ? (
            // No organizations - show create button
            <div className="bg-card rounded-2xl p-12 text-center border shadow-xl">
              <Building className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">ยังไม่มีองค์กร</h2>
              <p className="text-muted-foreground mb-6">
                เริ่มต้นใช้งานด้วยการสร้างองค์กรแรกของคุณ
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-medium hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                สร้างองค์กรใหม่
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Organization Cards */}
              {organizations.map((org) => (
                <motion.button
                  key={org.organization_id}
                  onClick={() => selectOrganization(org.organization_id)}
                  disabled={selecting !== null}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative bg-card rounded-xl p-6 text-left border shadow-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {/* Default Badge */}
                  {org.is_default && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Default
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {org.organization_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {org.user_role}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          เข้าร่วม {new Date(org.joined_at).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand-500 transition-colors" />
                  </div>

                  {/* Loading state */}
                  {selecting === org.organization_id && (
                    <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    </div>
                  )}
                </motion.button>
              ))}

              {/* Create New Organization Card */}
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-xl p-6 border-2 border-dashed border-muted-foreground/20 hover:border-brand-500 transition-all group"
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors">
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-brand-500 transition-colors" />
                    </div>
                    <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      สร้างองค์กรใหม่
                    </p>
                  </div>
                </div>
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
          {organizations.length > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <button
                onClick={() => router.push("/settings/organizations")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                จัดการองค์กร
              </button>
            </>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateOrganizationModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              loadOrganizations()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Create Organization Modal Component
function CreateOrganizationModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void
  onSuccess: () => void 
}) {
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    size: ""
  })
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อองค์กร")
      return
    }

    setCreating(true)
    try {
      await organizationService.createOrganization({
        name: formData.name,
        industry: formData.industry || undefined,
        size: formData.size || undefined
      })
      
      toast.success("สร้างองค์กรสำเร็จ!")
      onSuccess()
    } catch (error: any) {
      console.error("Error creating organization:", error)
      toast.error(error.message || "Failed to create organization")
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <h2 className="text-xl font-semibold mb-4">สร้างองค์กรใหม่</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                ชื่อองค์กร <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="บริษัท ABC จำกัด"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                อุตสาหกรรม
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">เลือกอุตสาหกรรม</option>
                <option value="retail">ค้าปลีก</option>
                <option value="wholesale">ค้าส่ง</option>
                <option value="manufacturing">การผลิต</option>
                <option value="service">บริการ</option>
                <option value="technology">เทคโนโลยี</option>
                <option value="finance">การเงิน</option>
                <option value="healthcare">สุขภาพ</option>
                <option value="education">การศึกษา</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ขนาดองค์กร
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">เลือกขนาด</option>
                <option value="1-10">1-10 คน</option>
                <option value="11-50">11-50 คน</option>
                <option value="51-200">51-200 คน</option>
                <option value="201-500">201-500 คน</option>
                <option value="500+">มากกว่า 500 คน</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="flex-1 py-2.5 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg font-medium hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 transition-all"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังสร้าง...
                  </span>
                ) : (
                  "สร้างองค์กร"
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}