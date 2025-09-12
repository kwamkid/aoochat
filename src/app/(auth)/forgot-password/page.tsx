"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Mail, Loader2, ArrowLeft, CheckCircle, MessageCircle } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedBackground } from "@/components/auth/animated-background"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AnimatedBackground />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-card/80 backdrop-blur-xl p-8 rounded-2xl border shadow-xl text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">ส่งลิงก์เรียบร้อย!</h2>
          <p className="text-muted-foreground mb-6">
            เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล {email} แล้ว
            กรุณาตรวจสอบอีเมลของคุณ
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl mb-4 shadow-lg"
          >
            <MessageCircle className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            ลืมรหัสผ่าน?
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            ไม่ต้องกังวล เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ
          </p>
        </div>

        {/* Reset Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border shadow-xl"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                อีเมลที่ลงทะเบียน
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลนี้
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  กำลังส่งลิงก์...
                </span>
              ) : (
                "ส่งลิงก์รีเซ็ตรหัสผ่าน"
              )}
            </motion.button>
          </form>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <Link
              href="/auth/login"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
            <span className="hidden sm:block text-muted-foreground">•</span>
            <Link
              href="/auth/register"
              className="text-brand-500 hover:text-brand-600 transition-colors"
            >
              สมัครสมาชิกใหม่
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}