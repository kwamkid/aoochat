"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Mail, Lock, Loader2, MessageCircle, Users, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedBackground } from "@/components/auth/animated-background"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: MessageCircle, text: "รวมแชททุกแพลตฟอร์ม" },
    { icon: Users, text: "จัดการทีมได้ง่าย" },
    { icon: Zap, text: "ตอบกลับอัตโนมัติ" },
  ]

  return (
    <div className="min-h-screen flex relative">
      <AnimatedBackground />
      
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
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
              AooChat
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              รวมทุกแชทไว้ในที่เดียว
            </p>
          </div>

          {/* Features Pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/30 rounded-full text-xs sm:text-sm text-brand-700 dark:text-brand-300"
              >
                <feature.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border shadow-xl"
          >
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2"
                >
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  อีเมล
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  รหัสผ่าน
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm">จดจำฉัน</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-brand-500 hover:text-brand-600 transition-colors"
                >
                  ลืมรหัสผ่าน?
                </Link>
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
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                ยังไม่มีบัญชี?{" "}
              </span>
              <Link
                href="/register"
                className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                สมัครสมาชิกฟรี
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}